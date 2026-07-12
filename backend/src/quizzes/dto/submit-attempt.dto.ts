import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsUUID, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  @IsString()
  answer: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}