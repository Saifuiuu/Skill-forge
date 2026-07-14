import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SkillGapService } from './skill-gap.service';
import { AnalyzeSkillGapDto } from './dto/analyze-skill-gap.dto';
import { SkillGapAnalysisResponseDto } from './dto/skill-gap-response.dto';

@ApiTags('skill-gap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('skill-gap')
export class SkillGapController {
  constructor(private readonly skillGapService: SkillGapService) {}

  @Post('analyze')
  @Roles(UserRole.MANAGER, UserRole.HR_ADMIN)
  @ApiOperation({
    summary:
      'Analyse team skill gaps against a competency framework (required courses), prioritized by deadline urgency',
  })
  @ApiResponse({ status: 201, type: SkillGapAnalysisResponseDto })
  analyze(
    @Body() dto: AnalyzeSkillGapDto,
    @Request() req: { user: { userId: string; role: UserRole } },
  ) {
    return this.skillGapService.analyze(req.user.userId, req.user.role, dto);
  }
}
