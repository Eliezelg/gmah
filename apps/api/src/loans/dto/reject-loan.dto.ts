import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectLoanDto {
  @ApiProperty({ description: 'Reason for rejection', minLength: 10 })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason: string;
}