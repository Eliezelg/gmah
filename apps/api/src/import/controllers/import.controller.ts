import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, ImportStatus, ImportType } from '@prisma/client';
import { ImportService } from '../services/import.service';
import { CreateImportSessionDto } from '../dto/create-import-session.dto';
import { UpdateColumnMappingDto } from '../dto/column-mapping.dto';
import { 
  ImportSessionResponseDto, 
  ImportPreviewDto, 
  ValidationResultDto,
  ImportReportDto 
} from '../dto/import-response.dto';
import * as multer from 'multer';

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('sessions')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, callback) => {
      const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
      }
    }
  }))
  @ApiOperation({ summary: 'Create a new import session by uploading a file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Import session created', type: ImportSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or request data' })
  @Roles(Role.ADMIN, Role.SECRETARY, Role.SUPER_ADMIN)
  async createImportSession(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportSessionDto
  ): Promise<ImportSessionResponseDto> {
    if (!file) {
      throw new Error('File is required');
    }

    // Update DTO with file information
    dto.fileSize = file.size;
    
    return this.importService.createImportSession(req.user.sub, file, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get import sessions for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ImportStatus })
  @ApiQuery({ name: 'importType', required: false, enum: ImportType })
  @ApiResponse({ status: 200, description: 'Import sessions retrieved' })
  async getImportSessions(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: ImportStatus,
    @Query('importType') importType?: ImportType
  ) {
    return this.importService.getImportSessions(req.user.sub, {
      page,
      limit,
      status,
      importType
    });
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get import session details' })
  @ApiResponse({ status: 200, description: 'Import session details', type: ImportSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Import session not found' })
  async getImportSession(
    @Param('sessionId') sessionId: string
  ): Promise<ImportSessionResponseDto> {
    const sessions = await this.importService.getImportSessions('', {});
    const session = sessions.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error('Import session not found');
    }
    
    return session;
  }

  @Post('sessions/:sessionId/preview')
  @ApiOperation({ summary: 'Generate preview of import data' })
  @ApiResponse({ status: 200, description: 'Preview generated', type: ImportPreviewDto })
  @ApiResponse({ status: 404, description: 'Import session not found' })
  async generatePreview(
    @Param('sessionId') sessionId: string
  ): Promise<ImportPreviewDto> {
    return this.importService.generatePreview(sessionId);
  }

  @Put('sessions/:sessionId/mapping')
  @ApiOperation({ summary: 'Update column mapping for import session' })
  @ApiResponse({ status: 200, description: 'Column mapping updated', type: ImportSessionResponseDto })
  @ApiResponse({ status: 404, description: 'Import session not found' })
  async updateColumnMapping(
    @Param('sessionId') sessionId: string,
    @Body() mappingDto: UpdateColumnMappingDto
  ): Promise<ImportSessionResponseDto> {
    return this.importService.updateColumnMapping(sessionId, mappingDto);
  }

  @Post('sessions/:sessionId/validate')
  @ApiOperation({ summary: 'Validate import data' })
  @ApiResponse({ status: 200, description: 'Validation completed', type: [ValidationResultDto] })
  @ApiResponse({ status: 400, description: 'Column mapping required' })
  async validateImportData(
    @Param('sessionId') sessionId: string
  ): Promise<ValidationResultDto[]> {
    return this.importService.validateImportData(sessionId);
  }

  @Post('sessions/:sessionId/start')
  @ApiOperation({ summary: 'Start import process' })
  @ApiResponse({ status: 200, description: 'Import started', schema: { properties: { jobId: { type: 'string' } } } })
  @ApiResponse({ status: 400, description: 'Validation errors exist' })
  async startImport(
    @Param('sessionId') sessionId: string
  ): Promise<{ jobId: string }> {
    return this.importService.startImport(sessionId);
  }

  @Get('sessions/:sessionId/report')
  @ApiOperation({ summary: 'Get import report' })
  @ApiResponse({ status: 200, description: 'Import report', type: ImportReportDto })
  @ApiResponse({ status: 404, description: 'Import session not found' })
  async getImportReport(
    @Param('sessionId') sessionId: string
  ): Promise<ImportReportDto> {
    return this.importService.getImportReport(sessionId);
  }

  @Post('sessions/:sessionId/rollback')
  @ApiOperation({ summary: 'Rollback import' })
  @ApiResponse({ status: 200, description: 'Import rolled back' })
  @ApiResponse({ status: 400, description: 'Import cannot be rolled back' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async rollbackImport(
    @Request() req: any,
    @Param('sessionId') sessionId: string
  ): Promise<{ message: string }> {
    await this.importService.rollbackImport(sessionId, req.user.sub);
    return { message: 'Import rolled back successfully' };
  }

  @Put('sessions/:sessionId/cancel')
  @ApiOperation({ summary: 'Cancel import process' })
  @ApiResponse({ status: 200, description: 'Import cancelled' })
  @ApiResponse({ status: 400, description: 'Import cannot be cancelled' })
  async cancelImport(
    @Request() req: any,
    @Param('sessionId') sessionId: string
  ): Promise<{ message: string }> {
    await this.importService.cancelImport(sessionId, req.user.sub);
    return { message: 'Import cancelled successfully' };
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete import session' })
  @ApiResponse({ status: 200, description: 'Import session deleted' })
  @ApiResponse({ status: 404, description: 'Import session not found' })
  async deleteImportSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string
  ): Promise<{ message: string }> {
    await this.importService.deleteImportSession(sessionId, req.user.sub);
    return { message: 'Import session deleted successfully' };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get import templates' })
  @ApiResponse({ status: 200, description: 'Import templates retrieved' })
  async getImportTemplates(
    @Query('importType') importType?: ImportType
  ) {
    // This would be implemented in a template service
    return { templates: [] };
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create import template' })
  @ApiResponse({ status: 201, description: 'Import template created' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async createImportTemplate(
    @Request() req: any,
    @Body() templateDto: any
  ) {
    // This would be implemented in a template service
    return { message: 'Template creation not yet implemented' };
  }

  @Get('status/:sessionId')
  @ApiOperation({ summary: 'Get real-time import status' })
  @ApiResponse({ status: 200, description: 'Import status' })
  async getImportStatus(
    @Param('sessionId') sessionId: string
  ) {
    const sessions = await this.importService.getImportSessions('', {});
    const session = sessions.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error('Import session not found');
    }

    return {
      sessionId: session.id,
      status: session.status,
      progress: {
        totalRows: session.totalRows,
        processedRows: session.processedRows,
        successRows: session.successRows,
        failedRows: session.failedRows,
        percentage: session.totalRows > 0 ? Math.round((session.processedRows / session.totalRows) * 100) : 0
      },
      startedAt: session.startedAt,
      estimatedCompletion: this.estimateCompletion(session)
    };
  }

  private estimateCompletion(session: ImportSessionResponseDto): Date | null {
    if (!session.startedAt || session.processedRows === 0) {
      return null;
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    const rate = session.processedRows / elapsed; // rows per millisecond
    const remaining = session.totalRows - session.processedRows;
    
    if (remaining <= 0) {
      return new Date();
    }

    return new Date(Date.now() + (remaining / rate));
  }
}