import { ApiProperty } from '@nestjs/swagger';
import { ImportStatus, ImportType, ImportFileType, ValidationSeverity } from '@prisma/client';

export class ImportSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionNumber: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty({ enum: ImportFileType })
  fileType: ImportFileType;

  @ApiProperty({ enum: ImportType })
  importType: ImportType;

  @ApiProperty({ enum: ImportStatus })
  status: ImportStatus;

  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  processedRows: number;

  @ApiProperty()
  successRows: number;

  @ApiProperty()
  failedRows: number;

  @ApiProperty()
  skippedRows: number;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  processingTime?: number;

  @ApiProperty()
  canRollback: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ImportPreviewDto {
  @ApiProperty({ description: 'Detected columns from the file' })
  columns: string[];

  @ApiProperty({ description: 'Sample data rows (first 10 rows)' })
  sampleData: any[][];

  @ApiProperty({ description: 'Total number of rows detected' })
  totalRows: number;

  @ApiProperty({ description: 'File encoding detected' })
  encoding: string;

  @ApiProperty({ description: 'Whether headers were detected' })
  hasHeaders: boolean;

  @ApiProperty({ description: 'Suggested field mappings based on column names' })
  suggestedMapping: {
    columnName: string;
    suggestedField: string;
    confidence: number;
  }[];
}

export class ValidationResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rowNumber: number;

  @ApiProperty({ required: false })
  columnName?: string;

  @ApiProperty({ required: false })
  fieldName?: string;

  @ApiProperty({ enum: ValidationSeverity })
  severity: ValidationSeverity;

  @ApiProperty()
  errorCode: string;

  @ApiProperty()
  errorMessage: string;

  @ApiProperty({ required: false })
  expectedValue?: string;

  @ApiProperty({ required: false })
  actualValue?: string;

  @ApiProperty({ required: false })
  suggestedFix?: string;

  @ApiProperty()
  canAutoFix: boolean;

  @ApiProperty()
  wasAutoFixed: boolean;
}

export class ImportReportDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  processedRows: number;

  @ApiProperty()
  successRows: number;

  @ApiProperty()
  failedRows: number;

  @ApiProperty()
  skippedRows: number;

  @ApiProperty()
  processingTime: number;

  @ApiProperty({ type: [ValidationResultDto] })
  validations: ValidationResultDto[];

  @ApiProperty()
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    autoFixed: number;
  };

  @ApiProperty({ required: false })
  errorReport?: any;

  @ApiProperty({ required: false })
  successReport?: any;
}