import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum DocumentType {
  ID_CARD = 'ID_CARD',
  PASSPORT = 'PASSPORT',
  PROOF_OF_INCOME = 'PROOF_OF_INCOME',
  BANK_STATEMENT = 'BANK_STATEMENT',
  TAX_RETURN = 'TAX_RETURN',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  UTILITY_BILL = 'UTILITY_BILL',
  GUARANTEE_LETTER = 'GUARANTEE_LETTER',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  loanId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  guaranteeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileId?: string;
}