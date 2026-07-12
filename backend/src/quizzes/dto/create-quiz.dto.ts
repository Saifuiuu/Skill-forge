import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateQuizDto {
  @ApiProperty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 100, default: 75 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passThreshold?: number;

  @ApiProperty({ required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({ required: false, default: 30, description: 'Time limit in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;
}