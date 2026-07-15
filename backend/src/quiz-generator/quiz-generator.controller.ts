import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { QuizGeneratorService } from './quiz-generator.service';
import {
  GenerateQuizQuestionsResponseDto,
  PublishQuizQuestionsDto,
} from './dto/quiz-generator.dto';

@ApiTags('quiz-generator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quiz-generator')
export class QuizGeneratorController {
  constructor(private readonly quizGeneratorService: QuizGeneratorService) {}

  @Post(':courseId/generate')
  @Roles(UserRole.CONTENT_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Upload a course PDF, extract text, and generate draft quiz questions via AI (or fallback template)',
  })
  @ApiResponse({ status: 201, type: GenerateQuizQuestionsResponseDto })
  generate(
    @Param('courseId') courseId: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required in the "file" field');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }
    return this.quizGeneratorService.generateFromPdf(courseId, file.buffer);
  }

  @Get(':courseId/template')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({
    summary: 'Get a blank manual-entry quiz question template (fallback mode)',
  })
  @ApiResponse({ status: 200, type: GenerateQuizQuestionsResponseDto })
  getTemplate(@Param('courseId') courseId: string) {
    return this.quizGeneratorService.generateTemplate(courseId);
  }

  @Post(':courseId/publish')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({
    summary:
      'Publish reviewed/edited questions into the course quiz (replaces existing questions)',
  })
  publish(@Param('courseId') courseId: string, @Body() dto: PublishQuizQuestionsDto) {
    return this.quizGeneratorService.publish(courseId, dto);
  }
}
