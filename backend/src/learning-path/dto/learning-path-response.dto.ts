import { ApiProperty } from '@nestjs/swagger';

export class RecommendedCourseDto {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  sequenceOrder: number;

  @ApiProperty()
  rationale: string;

  @ApiProperty()
  estimatedDuration: string;
}

export class LearningPathRecommendationDto {
  @ApiProperty({ enum: ['ai', 'fallback'] })
  source: 'ai' | 'fallback';

  @ApiProperty({ type: [RecommendedCourseDto] })
  courses: RecommendedCourseDto[];

  @ApiProperty()
  totalEstimatedTime: string;

  @ApiProperty()
  summary: string;

  @ApiProperty({ required: false })
  fallbackReason?: string;
}
