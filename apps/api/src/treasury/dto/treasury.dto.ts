import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ProcessDisbursementDto {
  @ApiProperty({ enum: PaymentMethod, description: 'Payment method for disbursement' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Transaction reference number' })
  @IsString()
  transactionReference: string;

  @ApiPropertyOptional({ description: 'Bank account details' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Processing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Repayment schedule ID' })
  @IsUUID()
  scheduleId: string;

  @ApiProperty({ description: 'Payment amount' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Transaction reference' })
  @IsString()
  transactionReference: string;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateReportDto {
  @ApiProperty({ 
    enum: ['overview', 'loans', 'cashflow', 'repayments', 'defaults'],
    description: 'Type of report to generate' 
  })
  @IsString()
  type: 'overview' | 'loans' | 'cashflow' | 'repayments' | 'defaults';

  @ApiProperty({ description: 'Start date for report period' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'End date for report period' })
  @IsDateString()
  endDate: Date;

  @ApiPropertyOptional({ 
    enum: ['pdf', 'excel', 'csv', 'json'],
    default: 'json',
    description: 'Output format for the report' 
  })
  @IsOptional()
  @IsString()
  format?: 'pdf' | 'excel' | 'csv' | 'json';
}

export class PaymentFilterDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by payment status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Search term for filtering' })
  @IsOptional()
  @IsString()
  searchTerm?: string;
}