import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AnalyzeSkillGapDto {
  @ApiProperty({ description: 'Team to analyse' })
  @IsUUID()
  teamId: string;

  @ApiProperty({
    description: 'Target competency framework — list of required course IDs',
    type: [String],
    example: ['uuid-course-1', 'uuid-course-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  requiredCourseIds: string[];

  @ApiPropertyOptional({
    description: 'Optional name/label for this competency framework',
    example: 'Senior Compliance Officer track',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  frameworkName?: string;
}
