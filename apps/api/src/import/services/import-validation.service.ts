import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportType, ValidationSeverity } from '@prisma/client';
import { FieldMappingDto } from '../dto/column-mapping.dto';
import * as validator from 'validator';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'date' | 'boolean';
  min?: number;
  max?: number;
  pattern?: string;
  unique?: boolean;
  customValidator?: (value: any, rowData: any) => { isValid: boolean; message?: string };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  autoFixedCount: number;
}

export interface ValidationError {
  rowNumber: number;
  columnName?: string;
  fieldName?: string;
  severity: ValidationSeverity;
  errorCode: string;
  errorMessage: string;
  expectedValue?: string;
  actualValue?: string;
  suggestedFix?: string;
  canAutoFix: boolean;
  wasAutoFixed: boolean;
}

@Injectable()
export class ImportValidationService {
  private readonly logger = new Logger(ImportValidationService.name);

  constructor(private prisma: PrismaService) {}

  async validateData(
    data: any[][],
    mapping: FieldMappingDto[],
    importType: ImportType,
    options: {
      duplicateHandling?: 'skip' | 'update' | 'error';
      emailValidation?: boolean;
      phoneValidation?: boolean;
      customRules?: ValidationRule[];
    } = {}
  ): Promise<ValidationResult> {
    this.logger.log(`Validating ${data.length} rows for import type: ${importType}`);
    
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const infos: ValidationError[] = [];
    let autoFixedCount = 0;

    // Get validation rules based on import type
    const validationRules = this.getValidationRules(importType, options);
    
    // Track values for uniqueness validation
    const uniqueValues = new Map<string, Set<string>>();
    
    // Initialize unique value tracking
    validationRules.forEach(rule => {
      if (rule.unique) {
        uniqueValues.set(rule.field, new Set());
      }
    });

    // Validate each row
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const rowData = data[rowIndex];
      const rowNumber = rowIndex + 1;

      // Create mapped object from row data
      const mappedData: any = {};
      mapping.forEach((map, index) => {
        if (index < rowData.length) {
          mappedData[map.fieldName] = rowData[index];
        }
      });

      // Validate each field
      for (const rule of validationRules) {
        const value = mappedData[rule.field];
        const columnMapping = mapping.find(m => m.fieldName === rule.field);
        const columnName = columnMapping?.columnName || rule.field;

        const fieldValidation = this.validateField(
          value,
          rule,
          rowNumber,
          columnName,
          mappedData,
          uniqueValues.get(rule.field)
        );

        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);
        infos.push(...fieldValidation.infos);
        autoFixedCount += fieldValidation.autoFixedCount;

        // Track unique values
        if (rule.unique && value != null && value !== '') {
          uniqueValues.get(rule.field)?.add(String(value));
        }
      }
    }

    // Check for duplicate handling
    if (options.duplicateHandling) {
      const duplicateValidation = await this.validateDuplicates(
        data,
        mapping,
        importType,
        options.duplicateHandling
      );
      errors.push(...duplicateValidation.errors);
      warnings.push(...duplicateValidation.warnings);
    }

    const isValid = errors.length === 0;

    this.logger.log(`Validation completed: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} infos`);

    return {
      isValid,
      errors,
      warnings,
      infos,
      autoFixedCount
    };
  }

  private validateField(
    value: any,
    rule: ValidationRule,
    rowNumber: number,
    columnName: string,
    rowData: any,
    uniqueTracker?: Set<string>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const infos: ValidationError[] = [];
    let autoFixedCount = 0;

    // Required validation
    if (rule.required && (value == null || value === '')) {
      errors.push({
        rowNumber,
        columnName,
        fieldName: rule.field,
        severity: ValidationSeverity.ERROR,
        errorCode: 'REQUIRED_FIELD',
        errorMessage: `${rule.field} is required`,
        actualValue: String(value || ''),
        canAutoFix: false,
        wasAutoFixed: false
      });
      return { isValid: false, errors, warnings, infos, autoFixedCount };
    }

    // Skip further validation if value is empty and not required
    if (value == null || value === '') {
      return { isValid: true, errors, warnings, infos, autoFixedCount };
    }

    const stringValue = String(value).trim();

    // Type validation
    switch (rule.type) {
      case 'email':
        if (!validator.isEmail(stringValue)) {
          errors.push({
            rowNumber,
            columnName,
            fieldName: rule.field,
            severity: ValidationSeverity.ERROR,
            errorCode: 'INVALID_EMAIL',
            errorMessage: 'Invalid email format',
            actualValue: stringValue,
            suggestedFix: this.suggestEmailFix(stringValue),
            canAutoFix: false,
            wasAutoFixed: false
          });
        }
        break;

      case 'phone':
        const cleanPhone = this.cleanPhoneNumber(stringValue);
        if (!this.isValidPhoneNumber(cleanPhone)) {
          errors.push({
            rowNumber,
            columnName,
            fieldName: rule.field,
            severity: ValidationSeverity.ERROR,
            errorCode: 'INVALID_PHONE',
            errorMessage: 'Invalid phone number format',
            actualValue: stringValue,
            suggestedFix: cleanPhone,
            canAutoFix: true,
            wasAutoFixed: false
          });
        }
        break;

      case 'number':
        if (!validator.isNumeric(stringValue)) {
          errors.push({
            rowNumber,
            columnName,
            fieldName: rule.field,
            severity: ValidationSeverity.ERROR,
            errorCode: 'INVALID_NUMBER',
            errorMessage: 'Value must be a number',
            actualValue: stringValue,
            canAutoFix: false,
            wasAutoFixed: false
          });
        } else {
          const numValue = parseFloat(stringValue);
          if (rule.min != null && numValue < rule.min) {
            errors.push({
              rowNumber,
              columnName,
              fieldName: rule.field,
              severity: ValidationSeverity.ERROR,
              errorCode: 'VALUE_TOO_SMALL',
              errorMessage: `Value must be at least ${rule.min}`,
              actualValue: stringValue,
              expectedValue: String(rule.min),
              canAutoFix: false,
              wasAutoFixed: false
            });
          }
          if (rule.max != null && numValue > rule.max) {
            errors.push({
              rowNumber,
              columnName,
              fieldName: rule.field,
              severity: ValidationSeverity.ERROR,
              errorCode: 'VALUE_TOO_LARGE',
              errorMessage: `Value must be at most ${rule.max}`,
              actualValue: stringValue,
              expectedValue: String(rule.max),
              canAutoFix: false,
              wasAutoFixed: false
            });
          }
        }
        break;

      case 'date':
        if (!validator.isISO8601(stringValue) && !validator.isDate(stringValue)) {
          const suggestedDate = this.suggestDateFix(stringValue);
          errors.push({
            rowNumber,
            columnName,
            fieldName: rule.field,
            severity: ValidationSeverity.ERROR,
            errorCode: 'INVALID_DATE',
            errorMessage: 'Invalid date format',
            actualValue: stringValue,
            suggestedFix: suggestedDate,
            canAutoFix: suggestedDate !== null,
            wasAutoFixed: false
          });
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0', 'yes', 'no', 'oui', 'non'].includes(stringValue.toLowerCase())) {
          errors.push({
            rowNumber,
            columnName,
            fieldName: rule.field,
            severity: ValidationSeverity.ERROR,
            errorCode: 'INVALID_BOOLEAN',
            errorMessage: 'Value must be true/false, yes/no, or 1/0',
            actualValue: stringValue,
            canAutoFix: false,
            wasAutoFixed: false
          });
        }
        break;
    }

    // Pattern validation
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(stringValue)) {
        errors.push({
          rowNumber,
          columnName,
          fieldName: rule.field,
          severity: ValidationSeverity.ERROR,
          errorCode: 'PATTERN_MISMATCH',
          errorMessage: `Value does not match required pattern: ${rule.pattern}`,
          actualValue: stringValue,
          canAutoFix: false,
          wasAutoFixed: false
        });
      }
    }

    // Length validation for strings
    if (rule.type === 'string' || !rule.type) {
      if (rule.min != null && stringValue.length < rule.min) {
        warnings.push({
          rowNumber,
          columnName,
          fieldName: rule.field,
          severity: ValidationSeverity.WARNING,
          errorCode: 'STRING_TOO_SHORT',
          errorMessage: `Value should be at least ${rule.min} characters`,
          actualValue: stringValue,
          canAutoFix: false,
          wasAutoFixed: false
        });
      }
      if (rule.max != null && stringValue.length > rule.max) {
        warnings.push({
          rowNumber,
          columnName,
          fieldName: rule.field,
          severity: ValidationSeverity.WARNING,
          errorCode: 'STRING_TOO_LONG',
          errorMessage: `Value should be at most ${rule.max} characters`,
          actualValue: stringValue,
          suggestedFix: stringValue.substring(0, rule.max),
          canAutoFix: true,
          wasAutoFixed: false
        });
      }
    }

    // Uniqueness validation within the import
    if (rule.unique && uniqueTracker?.has(stringValue)) {
      errors.push({
        rowNumber,
        columnName,
        fieldName: rule.field,
        severity: ValidationSeverity.ERROR,
        errorCode: 'DUPLICATE_VALUE',
        errorMessage: `Duplicate value found in import data`,
        actualValue: stringValue,
        canAutoFix: false,
        wasAutoFixed: false
      });
    }

    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(value, rowData);
      if (!customResult.isValid) {
        errors.push({
          rowNumber,
          columnName,
          fieldName: rule.field,
          severity: ValidationSeverity.ERROR,
          errorCode: 'CUSTOM_VALIDATION',
          errorMessage: customResult.message || 'Custom validation failed',
          actualValue: stringValue,
          canAutoFix: false,
          wasAutoFixed: false
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
      autoFixedCount
    };
  }

  private async validateDuplicates(
    data: any[][],
    mapping: FieldMappingDto[],
    importType: ImportType,
    duplicateHandling: 'skip' | 'update' | 'error'
  ): Promise<{ errors: ValidationError[]; warnings: ValidationError[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // This is a simplified version - in a real implementation, you would check against the database
    // based on the import type and unique fields for that entity type

    return { errors, warnings };
  }

  private getValidationRules(importType: ImportType, options: any): ValidationRule[] {
    const rules: ValidationRule[] = [];

    switch (importType) {
      case ImportType.USERS:
        rules.push(
          { field: 'email', required: true, type: 'email', unique: true },
          { field: 'firstName', required: true, type: 'string', min: 2, max: 50 },
          { field: 'lastName', required: true, type: 'string', min: 2, max: 50 },
          { field: 'phone', required: false, type: 'phone' }
        );
        break;

      case ImportType.LOANS:
        rules.push(
          { field: 'amount', required: true, type: 'number', min: 1 },
          { field: 'borrowerEmail', required: true, type: 'email' },
          { field: 'purpose', required: true, type: 'string', min: 10, max: 500 }
        );
        break;

      case ImportType.CONTRIBUTIONS:
        rules.push(
          { field: 'amount', required: true, type: 'number', min: 1 },
          { field: 'contributorEmail', required: true, type: 'email' },
          { field: 'type', required: true, type: 'string' }
        );
        break;

      // Add other import types as needed
    }

    // Add custom rules
    if (options.customRules) {
      rules.push(...options.customRules);
    }

    return rules;
  }

  private suggestEmailFix(email: string): string | undefined {
    // Simple email fix suggestions
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailParts = email.split('@');
    
    if (emailParts.length === 2) {
      const domain = emailParts[1];
      // Check for common typos
      for (const commonDomain of commonDomains) {
        if (this.levenshteinDistance(domain, commonDomain) <= 2) {
          return `${emailParts[0]}@${commonDomain}`;
        }
      }
    }
    
    return undefined;
  }

  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust based on your requirements
    const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\d{8,14}$/;
    return phoneRegex.test(phone);
  }

  private suggestDateFix(dateStr: string): string | null {
    // Try common date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        // Try to parse and return ISO format
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Continue to next format
        }
      }
    }

    return null;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}