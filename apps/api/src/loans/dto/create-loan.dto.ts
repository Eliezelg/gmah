import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { LoanType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateLoanDto {
  @ApiProperty({ description: 'Loan amount', example: 10000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  @Transform(({ value }) => Number(value))
  amount: number;

  @ApiProperty({ enum: LoanType, description: 'Type of loan' })
  @IsNotEmpty()
  @IsEnum(LoanType)
  type: LoanType;

  @ApiProperty({ description: 'Purpose of the loan', example: 'Business expansion' })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiPropertyOptional({ description: 'Additional purpose details' })
  @IsOptional()
  @IsObject()
  purposeDetails?: any;

  @ApiProperty({ description: 'Number of installments', example: 12, minimum: 1, maximum: 60 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(60)
  @Transform(({ value }) => Number(value))
  numberOfInstallments: number;

  @ApiProperty({ description: 'Expected end date for loan repayment', example: '2026-02-27T00:00:00.000Z' })
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  expectedEndDate: Date;
}