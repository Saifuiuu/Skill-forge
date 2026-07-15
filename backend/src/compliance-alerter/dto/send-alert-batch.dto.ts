import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class SendAlertBatchDto {
  @ApiPropertyOptional({
    description: 'Optional subset of draft IDs to send. If omitted, all DRAFT items are sent.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  draftIds?: string[];
}
