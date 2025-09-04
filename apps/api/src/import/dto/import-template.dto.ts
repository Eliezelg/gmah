import { IsString, IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImportType } from '@prisma/client';

export class CreateImportTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Default User Import Template'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Type of data this template is for',
    enum: ImportType,
    example: ImportType.USERS
  })
  @IsEnum(ImportType)
  importType: ImportType;

  @ApiProperty({
    description: 'Whether this is the default template for this import type',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @ApiProperty({
    description: 'Column to field mapping configuration'
  })
  @IsObject()
  columnMapping: any;

  @ApiProperty({
    description: 'Validation rules configuration',
    required: false
  })
  @IsObject()
  @IsOptional()
  validationRules?: any;

  @ApiProperty({
    description: 'Data transformation rules',
    required: false
  })
  @IsObject()
  @IsOptional()
  transformRules?: any;
}

export class UpdateImportTemplateDto {
  @ApiProperty({
    description: 'Template name',
    required: false
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Template description',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether this template is active',
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Whether this is the default template for this import type',
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Column to field mapping configuration',
    required: false
  })
  @IsObject()
  @IsOptional()
  columnMapping?: any;

  @ApiProperty({
    description: 'Validation rules configuration',
    required: false
  })
  @IsObject()
  @IsOptional()
  validationRules?: any;

  @ApiProperty({
    description: 'Data transformation rules',
    required: false
  })
  @IsObject()
  @IsOptional()
  transformRules?: any;
}