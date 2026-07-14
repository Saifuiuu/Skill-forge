import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMinSize,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../../questions/entities/question.entity';

export class DraftQuestionDto {
  @ApiProperty()
  draftId: string;

  @ApiProperty({ enum: QuestionType })
  type: QuestionType;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional({ type: [String] })
  options?: string[];

  @ApiProperty()
  correctAnswer: string;

  @ApiPropertyOptional()
  explanation?: string;
}

export class GenerateQuizQuestionsResponseDto {
  @ApiProperty({ enum: ['ai', 'fallback'] })
  source: 'ai' | 'fallback';

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  extractedTextPreview: string;

  @ApiProperty({ type: [DraftQuestionDto] })
  questions: DraftQuestionDto[];

  @ApiPropertyOptional()
  fallbackReason?: string;
}

export class PublishQuestionItemDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  correctAnswer: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;
}

export class PublishQuizSettingsDto {
  @ApiPropertyOptional({ default: 75 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  passThreshold?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimitMinutes?: number;
}

export class PublishQuizQuestionsDto {
  @ApiProperty({ type: [PublishQuestionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublishQuestionItemDto)
  questions: PublishQuestionItemDto[];

  @ApiPropertyOptional({ type: PublishQuizSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublishQuizSettingsDto)
  quizSettings?: PublishQuizSettingsDto;
}
