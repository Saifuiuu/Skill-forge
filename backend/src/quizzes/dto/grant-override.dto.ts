import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GrantOverrideDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;
}