import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveLoanDto {
  @ApiPropertyOptional({ description: 'Approval notes from committee' })
  @IsOptional()
  @IsString()
  notes?: string;
}