import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class DisburseLoanDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Payment method for disbursement' })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Transaction reference number' })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Notes about the disbursement' })
  @IsOptional()
  @IsString()
  notes?: string;
}