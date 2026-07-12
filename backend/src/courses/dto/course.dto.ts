import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ContentType } from '../entities/course.entity';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: '2 hours' })
  @IsString()
  estimatedDuration: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  regulatoryDeadline?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];

  @ApiProperty({ enum: ContentType, required: false })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentUrl?: string;

  @ApiProperty({ type: [String], required: false, description: 'Course IDs that must be completed first' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  prerequisiteCourseIds?: string[];
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}