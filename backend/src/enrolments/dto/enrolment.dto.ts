import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SelfEnrolDto {
  @ApiProperty()
  @IsUUID()
  courseId: string;
}

export class BulkEnrolDto {
  @ApiProperty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ type: [String], description: 'Employee IDs to enrol (manager\'s own team members)' })
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds: string[];
}

export class UpdateProgressDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;
}