export type ImportStatus = 'PENDING' | 'PARSING' | 'MAPPED' | 'VALIDATING' | 'IMPORTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ImportType = 'USERS' | 'LOANS' | 'CONTRIBUTIONS' | 'GUARANTEES' | 'PAYMENTS';
export type ImportFileType = 'CSV' | 'EXCEL';
export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ImportSession {
  id: string;
  sessionNumber: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: ImportFileType;
  importType: ImportType;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number;
  canRollback: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportPreview {
  columns: string[];
  sampleData: any[][];
  totalRows: number;
  encoding: string;
  hasHeaders: boolean;
  suggestedMapping: ColumnSuggestion[];
}

export interface ColumnSuggestion {
  columnName: string;
  suggestedField: string;
  confidence: number;
}

export interface FieldMapping {
  columnName: string;
  fieldName: string;
  transform?: {
    type?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean';
    format?: string;
    defaultValue?: any;
  };
  required?: boolean;
}

export interface ValidationResult {
  id: string;
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

export interface ImportReport {
  sessionId: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  processingTime: number;
  validations: ValidationResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    autoFixed: number;
  };
  errorReport?: any;
  successReport?: any;
}

export interface CreateImportSession {
  originalName: string;
  fileSize: number;
  fileType: ImportFileType;
  importType: ImportType;
  hasHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
  templateId?: string;
  metadata?: any;
}

export interface UpdateColumnMapping {
  mapping: FieldMapping[];
  validationRules?: {
    duplicateHandling?: 'skip' | 'update' | 'error';
    emailValidation?: boolean;
    phoneValidation?: boolean;
    customRules?: any[];
  };
}

export interface ImportProgress {
  sessionId: string;
  status: ImportStatus;
  progress: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    percentage: number;
  };
  startedAt?: Date;
  estimatedCompletion?: Date;
}

// Wizard steps
export enum ImportWizardStep {
  UPLOAD = 0,
  PREVIEW = 1,
  MAPPING = 2,
  VALIDATION = 3,
  IMPORT = 4,
  COMPLETE = 5
}

export interface ImportWizardState {
  currentStep: ImportWizardStep;
  sessionId?: string;
  session?: ImportSession;
  preview?: ImportPreview;
  mapping?: FieldMapping[];
  validations?: ValidationResult[];
  report?: ImportReport;
  isLoading: boolean;
  error?: string;
}