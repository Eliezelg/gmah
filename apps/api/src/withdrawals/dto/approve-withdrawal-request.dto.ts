import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class ApproveWithdrawalRequestDto {
  @ApiPropertyOptional({
    description: 'Comments from the approver',
    example: 'Approved after review of documentation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Comments cannot exceed 1000 characters' })
  approvalComments?: string;

  @ApiPropertyOptional({
    description: 'Payment method for processing',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Bank details for transfer if different from request',
  })
  @IsOptional()
  bankDetails?: any;
}

export class RejectWithdrawalRequestDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Insufficient documentation provided',
  })
  @IsString()
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  rejectionReason: string;
}