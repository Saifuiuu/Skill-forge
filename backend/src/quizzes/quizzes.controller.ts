import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { GrantOverrideDto } from './dto/grant-override.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Create a quiz for a course (Content Admin only)' })
  create(@Body() dto: CreateQuizDto) {
    return this.quizzesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all quizzes' })
  findAll() {
    return this.quizzesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single quiz with its questions' })
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Update quiz settings (Content Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CONTENT_ADMIN)
  @ApiOperation({ summary: 'Delete a quiz (Content Admin only)' })
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }

  @Post(':id/attempts/start')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.CONTENT_ADMIN, UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Start a new randomised, timed quiz attempt' })
  startAttempt(@Param('id') id: string, @Request() req: { user: { userId: string } }) {
    return this.quizzesService.startAttempt(id, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.CONTENT_ADMIN, UserRole.HR_ADMIN)
  @ApiOperation({ summary: 'Submit answers for an in-progress attempt' })
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.quizzesService.submitAttempt(attemptId, req.user.userId, dto);
  }

  @Post(':id/override')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Grant an employee one extra attempt beyond the default limit (Manager only)' })
  grantOverride(@Param('id') id: string, @Body() dto: GrantOverrideDto) {
    return this.quizzesService.grantOverride(id, dto.employeeId);
  }
}