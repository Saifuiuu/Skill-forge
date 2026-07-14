import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecommendLearningPathDto {
  @ApiPropertyOptional({
    description: 'Employee role or job title (defaults to profile context when omitted)',
    example: 'Junior Financial Analyst',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @ApiPropertyOptional({
    description: 'Department name or focus area',
    example: 'Finance & Accounting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({
    description: 'Free-text summary of courses already completed or in progress',
    example: 'Completed AML Basics; currently taking Data Privacy Fundamentals',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionHistory?: string;

  @ApiProperty({
    description: 'Career goal the learning path should support',
    example: 'Become a senior compliance officer within 18 months',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  careerGoal: string;
}
