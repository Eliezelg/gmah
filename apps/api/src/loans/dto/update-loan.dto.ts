import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { LoanType, LoanStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdateLoanDto {
  @ApiPropertyOptional({ description: 'Loan amount' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  @Transform(({ value }) => Number(value))
  amount?: number;

  @ApiPropertyOptional({ enum: LoanType })
  @IsOptional()
  @IsEnum(LoanType)
  type?: LoanType;

  @ApiPropertyOptional({ description: 'Purpose of the loan' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Additional purpose details' })
  @IsOptional()
  @IsObject()
  purposeDetails?: any;

  @ApiPropertyOptional({ description: 'Number of installments' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  @Transform(({ value }) => Number(value))
  numberOfInstallments?: number;

  @ApiPropertyOptional({ description: 'Expected end date' })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: Date;

  @ApiPropertyOptional({ enum: LoanStatus, description: 'Loan status (Admin only)' })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @ApiPropertyOptional({ description: 'Committee notes' })
  @IsOptional()
  @IsString()
  committeeNotes?: string;

  @ApiPropertyOptional({ description: 'ID of approver (for direct approval)' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Approval date' })
  @IsOptional()
  @IsDateString()
  approvalDate?: Date;

  @ApiPropertyOptional({ description: 'Approval comments' })
  @IsOptional()
  @IsString()
  approvalComments?: string;

  @ApiPropertyOptional({ description: 'Approval conditions' })
  @IsOptional()
  @IsString()
  approvalConditions?: string;

  @ApiPropertyOptional({ description: 'ID of rejecter (for direct rejection)' })
  @IsOptional()
  @IsString()
  rejectedBy?: string;

  @ApiPropertyOptional({ description: 'Rejection date' })
  @IsOptional()
  @IsDateString()
  rejectionDate?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Rejection comments' })
  @IsOptional()
  @IsString()
  rejectionComments?: string;
}