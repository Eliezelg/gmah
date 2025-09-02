import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { GuaranteeType } from '@prisma/client';

export class CreateGuaranteeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  guarantorId: string;

  @ApiProperty({ enum: GuaranteeType })
  @IsEnum(GuaranteeType)
  @IsNotEmpty()
  type: GuaranteeType;

  @ApiProperty({ description: 'Amount guaranteed', minimum: 100 })
  @IsNumber()
  @Min(100)
  @Transform(({ value }) => Number(value))
  amount: number;

  @ApiPropertyOptional({ description: 'Percentage of loan guaranteed', minimum: 1, maximum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => value ? Number(value) : undefined)
  percentage?: number;
}