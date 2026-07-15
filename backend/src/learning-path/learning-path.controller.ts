import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LearningPathService } from './learning-path.service';
import { RecommendLearningPathDto } from './dto/recommend-learning-path.dto';
import { LearningPathRecommendationDto } from './dto/learning-path-response.dto';

@ApiTags('learning-path')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('learning-path')
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Post('recommend')
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.CONTENT_ADMIN,
    UserRole.HR_ADMIN,
  )
  @ApiOperation({
    summary:
      'Recommend a sequenced learning path based on role, history, and career goal',
  })
  @ApiResponse({ status: 200, type: LearningPathRecommendationDto })
  recommend(
    @Body() dto: RecommendLearningPathDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.learningPathService.recommend(req.user.userId, dto);
  }
}
