import { IsString, IsObject, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FieldMappingDto {
  @ApiProperty({
    description: 'Column name from the import file',
    example: 'Email Address'
  })
  @IsString()
  columnName: string;

  @ApiProperty({
    description: 'Target field name in the database',
    example: 'email'
  })
  @IsString()
  fieldName: string;

  @ApiProperty({
    description: 'Data transformation rules',
    required: false
  })
  @IsObject()
  @IsOptional()
  transform?: {
    type?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean';
    format?: string; // For date formatting, etc.
    defaultValue?: any;
  };

  @ApiProperty({
    description: 'Whether this field is required',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  required?: boolean = false;
}

export class UpdateColumnMappingDto {
  @ApiProperty({
    description: 'Array of field mappings',
    type: [FieldMappingDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mapping: FieldMappingDto[];

  @ApiProperty({
    description: 'Validation rules to apply',
    required: false
  })
  @IsObject()
  @IsOptional()
  validationRules?: {
    duplicateHandling?: 'skip' | 'update' | 'error';
    emailValidation?: boolean;
    phoneValidation?: boolean;
    customRules?: any[];
  };
}