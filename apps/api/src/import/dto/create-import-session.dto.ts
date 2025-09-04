import { IsEnum, IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImportType, ImportFileType } from '@prisma/client';

export class CreateImportSessionDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'users_data.xlsx'
  })
  @IsString()
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000
  })
  fileSize: number;

  @ApiProperty({
    description: 'Type of file being imported',
    enum: ImportFileType,
    example: ImportFileType.EXCEL
  })
  @IsEnum(ImportFileType)
  fileType: ImportFileType;

  @ApiProperty({
    description: 'Type of data being imported',
    enum: ImportType,
    example: ImportType.USERS
  })
  @IsEnum(ImportType)
  importType: ImportType;

  @ApiProperty({
    description: 'Whether the file has headers in the first row',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  hasHeaders?: boolean = true;

  @ApiProperty({
    description: 'CSV delimiter character (only for CSV files)',
    example: ',',
    required: false
  })
  @IsString()
  @IsOptional()
  delimiter?: string;

  @ApiProperty({
    description: 'File encoding',
    example: 'utf8',
    default: 'utf8'
  })
  @IsString()
  @IsOptional()
  encoding?: string = 'utf8';

  @ApiProperty({
    description: 'Import template ID to use',
    required: false
  })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: any;
}