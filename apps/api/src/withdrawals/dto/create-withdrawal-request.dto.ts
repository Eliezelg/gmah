import {
  IsString,
  IsOptional,
  IsDecimal,
  IsDateString,
  IsEnum,
  IsJSON,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod } from '@prisma/client';

export class CreateWithdrawalRequestDto {
  @ApiProperty({
    description: 'ID of the deposit from which to withdraw',
    example: 'cuid123',
  })
  @IsUUID()
  @IsNotEmpty()
  depositId: string;

  @ApiProperty({
    description: 'Amount to withdraw',
    example: '5000.00',
    type: 'string',
  })
  @IsDecimal({ decimal_digits: '2' }, { message: 'Amount must be a decimal with up to 2 decimal places' })
  @Transform(({ value }) => new Decimal(value))
  amount: Decimal;

  @ApiProperty({
    description: 'Reason for withdrawal',
    example: 'Emergency medical expenses',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Reason must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Category of the withdrawal reason',
    example: 'EMERGENCY',
    enum: ['EMERGENCY', 'PERSONAL', 'BUSINESS', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['EMERGENCY', 'PERSONAL', 'BUSINESS', 'OTHER'])
  reasonCategory?: string;

  @ApiPropertyOptional({
    description: 'Urgency level of the withdrawal',
    example: 'HIGH',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  urgency?: string;

  @ApiPropertyOptional({
    description: 'When the depositor needs the funds',
    example: '2024-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @ApiPropertyOptional({
    description: 'Preferred payment method',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Bank details for transfer (JSON format)',
    example: {
      bankName: 'Bank Leumi',
      accountNumber: '12345678',
      routingNumber: '123456',
      accountHolderName: 'John Doe'
    },
  })
  @IsOptional()
  @IsJSON()
  bankDetails?: any;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsJSON()
  metadata?: any;
}