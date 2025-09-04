import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileParserService, ParsedFileData } from './file-parser.service';
import { ImportValidationService, ValidationResult } from './import-validation.service';
import { ImportProcessorService } from './import-processor.service';
import { CreateImportSessionDto } from '../dto/create-import-session.dto';
import { UpdateColumnMappingDto } from '../dto/column-mapping.dto';
import { ImportPreviewDto, ImportSessionResponseDto, ImportReportDto, ValidationResultDto } from '../dto/import-response.dto';
import { ImportStatus, ImportType, ImportFileType, User } from '@prisma/client';
import type { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private prisma: PrismaService,
    private fileParser: FileParserService,
    private validationService: ImportValidationService,
    private processor: ImportProcessorService,
    @InjectQueue('import') private importQueue: Queue,
  ) {}

  async createImportSession(
    userId: string,
    file: Express.Multer.File,
    dto: CreateImportSessionDto
  ): Promise<ImportSessionResponseDto> {
    this.logger.log(`Creating import session for user: ${userId}, file: ${dto.originalName}`);

    // Generate unique session number
    const sessionNumber = `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename and save file
    const fileExtension = path.extname(dto.originalName);
    const fileName = `${sessionNumber}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, file.buffer);

    // Validate file structure
    const isValidFile = await this.fileParser.validateFileStructure(filePath, dto.fileType);
    if (!isValidFile) {
      // Clean up file
      fs.unlinkSync(filePath);
      throw new BadRequestException('Invalid file format or corrupted file');
    }

    // Create import session in database
    const importSession = await this.prisma.importSession.create({
      data: {
        sessionNumber,
        userId,
        fileName,
        originalName: dto.originalName,
        fileSize: dto.fileSize,
        fileType: dto.fileType,
        filePath,
        importType: dto.importType,
        status: ImportStatus.PENDING,
        hasHeaders: dto.hasHeaders ?? true,
        delimiter: dto.delimiter,
        encoding: dto.encoding ?? 'utf8',
        templateId: dto.templateId,
        metadata: dto.metadata
      }
    });

    this.logger.log(`Import session created: ${sessionNumber}`);
    
    return this.mapToResponseDto(importSession);
  }

  async generatePreview(sessionId: string): Promise<ImportPreviewDto> {
    this.logger.log(`Generating preview for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);
    
    try {
      const preview = await this.fileParser.generatePreview(
        session.filePath,
        session.fileType,
        {
          hasHeaders: session.hasHeaders,
          delimiter: session.delimiter || ',',
          encoding: session.encoding
        }
      );

      // Update session status
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: { status: ImportStatus.PARSING }
      });

      this.logger.log(`Preview generated for session: ${sessionId} - ${preview.totalRows} rows, ${preview.columns.length} columns`);
      
      return preview;
    } catch (error) {
      // Update session status to failed
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: { 
          status: ImportStatus.FAILED,
          errorReport: { error: error.message }
        }
      });
      
      throw error;
    }
  }

  async updateColumnMapping(
    sessionId: string, 
    mappingDto: UpdateColumnMappingDto
  ): Promise<ImportSessionResponseDto> {
    this.logger.log(`Updating column mapping for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    const updatedSession = await this.prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: ImportStatus.MAPPED,
        columnMapping: mappingDto.mapping as any,
        validationRules: mappingDto.validationRules,
        updatedAt: new Date()
      }
    });

    return this.mapToResponseDto(updatedSession);
  }

  async validateImportData(sessionId: string): Promise<ValidationResultDto[]> {
    this.logger.log(`Validating import data for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    if (!session.columnMapping) {
      throw new BadRequestException('Column mapping must be configured before validation');
    }

    try {
      // Update status to validating
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: { status: ImportStatus.VALIDATING }
      });

      // Parse the file data
      const parsedData = await this.fileParser.parseFile(
        session.filePath,
        session.fileType,
        {
          hasHeaders: session.hasHeaders,
          delimiter: session.delimiter || ',',
          encoding: session.encoding
        }
      );

      // Validate data
      const validationResult = await this.validationService.validateData(
        parsedData.data,
        session.columnMapping as any[],
        session.importType,
        session.validationRules as any || {}
      );

      // Save validation results to database
      const validationRecords = [
        ...validationResult.errors,
        ...validationResult.warnings,
        ...validationResult.infos
      ].map(validation => ({
        sessionId: sessionId,
        rowNumber: validation.rowNumber,
        columnName: validation.columnName || undefined,
        fieldName: validation.fieldName || undefined,
        severity: validation.severity,
        errorCode: validation.errorCode,
        errorMessage: validation.errorMessage,
        expectedValue: validation.expectedValue || undefined,
        actualValue: validation.actualValue || undefined,
        suggestedFix: validation.suggestedFix || undefined,
        canAutoFix: validation.canAutoFix,
        wasAutoFixed: validation.wasAutoFixed,
        rowData: undefined // We could store full row data here if needed
      }));

      // Delete existing validations and create new ones
      await this.prisma.importValidation.deleteMany({
        where: { sessionId }
      });

      if (validationRecords.length > 0) {
        await this.prisma.importValidation.createMany({
          data: validationRecords
        });
      }

      // Update session with validation results
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: {
          status: validationResult.isValid ? ImportStatus.VALIDATING : ImportStatus.FAILED,
          totalRows: parsedData.totalRows,
          errorReport: {
            totalErrors: validationResult.errors.length,
            totalWarnings: validationResult.warnings.length,
            totalInfos: validationResult.infos.length,
            autoFixedCount: validationResult.autoFixedCount,
            isValid: validationResult.isValid
          }
        }
      });

      this.logger.log(`Validation completed for session: ${sessionId} - ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`);

      // Return validation results as DTOs
      return validationRecords.map(record => ({
        id: '', // Will be filled when saved
        rowNumber: record.rowNumber,
        columnName: record.columnName,
        fieldName: record.fieldName,
        severity: record.severity,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        expectedValue: record.expectedValue,
        actualValue: record.actualValue,
        suggestedFix: record.suggestedFix,
        canAutoFix: record.canAutoFix,
        wasAutoFixed: record.wasAutoFixed
      }));
    } catch (error) {
      // Update session status to failed
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: { 
          status: ImportStatus.FAILED,
          errorReport: { error: error.message }
        }
      });
      
      throw error;
    }
  }

  async startImport(sessionId: string): Promise<{ jobId: string }> {
    this.logger.log(`Starting import for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    if (session.status !== ImportStatus.VALIDATING) {
      throw new BadRequestException('Import must be validated before starting');
    }

    // Check if there are blocking errors
    const errorCount = await this.prisma.importValidation.count({
      where: { 
        sessionId,
        severity: 'ERROR'
      }
    });

    if (errorCount > 0) {
      throw new BadRequestException(`Cannot start import with ${errorCount} validation errors. Please fix errors first.`);
    }

    // Update session status
    await this.prisma.importSession.update({
      where: { id: sessionId },
      data: { 
        status: ImportStatus.IMPORTING,
        startedAt: new Date()
      }
    });

    // Add to queue for processing
    const job = await this.importQueue.add('process-import', {
      sessionId,
      userId: session.userId
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      }
    });

    this.logger.log(`Import job queued: ${job.id} for session: ${sessionId}`);

    return { jobId: job.id.toString() };
  }

  async getImportReport(sessionId: string): Promise<ImportReportDto> {
    this.logger.log(`Getting import report for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);
    
    const validations = await this.prisma.importValidation.findMany({
      where: { sessionId },
      orderBy: { rowNumber: 'asc' }
    });

    const validationDtos: ValidationResultDto[] = validations.map(v => ({
      id: v.id,
      rowNumber: v.rowNumber,
      columnName: v.columnName || undefined,
      fieldName: v.fieldName || undefined,
      severity: v.severity,
      errorCode: v.errorCode,
      errorMessage: v.errorMessage,
      expectedValue: v.expectedValue || undefined,
      actualValue: v.actualValue || undefined,
      suggestedFix: v.suggestedFix || undefined,
      canAutoFix: v.canAutoFix,
      wasAutoFixed: v.wasAutoFixed
    }));

    const summary = {
      errors: validations.filter(v => v.severity === 'ERROR').length,
      warnings: validations.filter(v => v.severity === 'WARNING').length,
      infos: validations.filter(v => v.severity === 'INFO').length,
      autoFixed: validations.filter(v => v.wasAutoFixed).length
    };

    return {
      sessionId: sessionId,
      totalRows: session.totalRows,
      processedRows: session.processedRows,
      successRows: session.successRows,
      failedRows: session.failedRows,
      skippedRows: session.skippedRows,
      processingTime: session.processingTime || 0,
      validations: validationDtos,
      summary,
      errorReport: session.errorReport as any,
      successReport: session.successReport as any
    };
  }

  async getImportSessions(
    userId: string,
    params: {
      status?: ImportStatus;
      importType?: ImportType;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ sessions: ImportSessionResponseDto[]; total: number }> {
    const { page = 1, limit = 20, status, importType } = params;
    
    const where: any = { userId };
    if (status) where.status = status;
    if (importType) where.importType = importType;

    const [sessions, total] = await Promise.all([
      this.prisma.importSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.importSession.count({ where })
    ]);

    return {
      sessions: sessions.map(session => this.mapToResponseDto(session)),
      total
    };
  }

  async rollbackImport(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Rolling back import for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    if (session.userId !== userId) {
      throw new BadRequestException('You can only rollback your own imports');
    }

    if (!session.canRollback) {
      throw new BadRequestException('This import cannot be rolled back');
    }

    if (session.rolledBackAt) {
      throw new BadRequestException('This import has already been rolled back');
    }

    await this.processor.rollbackImport(sessionId);

    await this.prisma.importSession.update({
      where: { id: sessionId },
      data: {
        rolledBackAt: new Date(),
        rolledBackBy: userId
      }
    });

    this.logger.log(`Import rolled back: ${sessionId}`);
  }

  private async findSessionById(sessionId: string) {
    const session = await this.prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Import session not found: ${sessionId}`);
    }

    return session;
  }

  private mapToResponseDto(session: any): ImportSessionResponseDto {
    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      fileName: session.fileName,
      originalName: session.originalName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      importType: session.importType,
      status: session.status,
      totalRows: session.totalRows,
      processedRows: session.processedRows,
      successRows: session.successRows,
      failedRows: session.failedRows,
      skippedRows: session.skippedRows,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      processingTime: session.processingTime,
      canRollback: session.canRollback,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  async cancelImport(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Cancelling import for session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    if (session.userId !== userId) {
      throw new BadRequestException('You can only cancel your own imports');
    }

    if (![ImportStatus.PENDING, ImportStatus.PARSING, ImportStatus.MAPPED, ImportStatus.VALIDATING].includes(session.status as any)) {
      throw new BadRequestException('Cannot cancel import in current status');
    }

    await this.prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: ImportStatus.CANCELLED,
        completedAt: new Date()
      }
    });

    this.logger.log(`Import cancelled: ${sessionId}`);
  }

  async deleteImportSession(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting import session: ${sessionId}`);

    const session = await this.findSessionById(sessionId);

    if (session.userId !== userId) {
      throw new BadRequestException('You can only delete your own imports');
    }

    // Delete the physical file
    try {
      if (fs.existsSync(session.filePath)) {
        fs.unlinkSync(session.filePath);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${session.filePath}`, error);
    }

    // Delete from database (cascade will handle related records)
    await this.prisma.importSession.delete({
      where: { id: sessionId }
    });

    this.logger.log(`Import session deleted: ${sessionId}`);
  }
}