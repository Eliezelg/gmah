import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumberString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WithdrawalStatus, ApprovalMode } from '@prisma/client';

export class WithdrawalQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by withdrawal status',
    enum: WithdrawalStatus,
  })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiPropertyOptional({
    description: 'Filter by approval mode',
    enum: ApprovalMode,
  })
  @IsOptional()
  @IsEnum(ApprovalMode)
  approvalMode?: ApprovalMode;

  @ApiPropertyOptional({
    description: 'Filter by depositor ID',
    example: 'cuid123',
  })
  @IsOptional()
  @IsUUID()
  depositorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by deposit ID',
    example: 'cuid123',
  })
  @IsOptional()
  @IsUUID()
  depositId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Search in reason text',
    example: 'emergency',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'requestDate',
    enum: ['requestDate', 'amount', 'plannedDate', 'status'],
    default: 'requestDate',
  })
  @IsOptional()
  sortBy?: string = 'requestDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}