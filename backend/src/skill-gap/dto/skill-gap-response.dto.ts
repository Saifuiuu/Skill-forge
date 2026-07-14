import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SkillCoverageStatus = 'COVERED' | 'PARTIALLY_COVERED' | 'MISSING';

export class IndividualSkillStatusDto {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty({ enum: ['COVERED', 'PARTIALLY_COVERED', 'MISSING'] })
  coverage: SkillCoverageStatus;

  @ApiProperty()
  enrolmentStatus: string;

  @ApiProperty()
  progressPercentage: number;

  @ApiPropertyOptional()
  regulatoryDeadline?: string | null;

  @ApiProperty({ description: 'Urgency rank — lower = more urgent (deadline-based)' })
  urgencyRank: number;
}

export class IndividualBreakdownDto {
  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  employeeName: string;

  @ApiProperty()
  coveredCount: number;

  @ApiProperty()
  partiallyCoveredCount: number;

  @ApiProperty()
  missingCount: number;

  @ApiProperty({ type: [IndividualSkillStatusDto] })
  skills: IndividualSkillStatusDto[];
}

export class TeamSkillSummaryDto {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty({ enum: ['COVERED', 'PARTIALLY_COVERED', 'MISSING'] })
  teamCoverage: SkillCoverageStatus;

  @ApiProperty()
  coveredCount: number;

  @ApiProperty()
  partiallyCoveredCount: number;

  @ApiProperty()
  missingCount: number;

  @ApiProperty()
  teamSize: number;

  @ApiPropertyOptional()
  regulatoryDeadline?: string | null;

  @ApiProperty()
  urgencyRank: number;

  @ApiPropertyOptional()
  aiRationale?: string;
}

export class SkillGapAnalysisResponseDto {
  @ApiProperty({ enum: ['ai', 'fallback'] })
  source: 'ai' | 'fallback';

  @ApiProperty()
  teamId: string;

  @ApiProperty()
  teamName: string;

  @ApiPropertyOptional()
  frameworkName?: string;

  @ApiProperty()
  teamSize: number;

  @ApiProperty({ type: [TeamSkillSummaryDto] })
  teamSummary: TeamSkillSummaryDto[];

  @ApiProperty({ type: [IndividualBreakdownDto] })
  individualBreakdown: IndividualBreakdownDto[];

  @ApiProperty({ type: [String], description: 'Course IDs ordered by deadline urgency' })
  priorityOrder: string[];

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  fallbackReason?: string;
}
