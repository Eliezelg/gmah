import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ImportProcessorService } from '../services/import-processor.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('import')
export class ImportQueueProcessor {
  private readonly logger = new Logger(ImportQueueProcessor.name);

  constructor(
    private importProcessor: ImportProcessorService,
    private prisma: PrismaService
  ) {}

  @Process('process-import')
  async handleImportProcessing(job: Job<{ sessionId: string; userId: string }>) {
    const { sessionId, userId } = job.data;
    
    this.logger.log(`Processing import job ${job.id} for session: ${sessionId}`);

    try {
      // Update job progress
      await job.progress(0);

      // Process the import
      await this.importProcessor.processImport(sessionId);

      // Complete job
      await job.progress(100);
      this.logger.log(`Import job ${job.id} completed successfully for session: ${sessionId}`);

    } catch (error) {
      this.logger.error(`Import job ${job.id} failed for session: ${sessionId}`, error.stack);
      
      // Update session status to failed
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorReport: {
            error: error.message,
            jobId: job.id,
            stack: error.stack
          }
        }
      });

      throw error;
    }
  }

  @Process('rollback-import')
  async handleImportRollback(job: Job<{ sessionId: string; userId: string }>) {
    const { sessionId, userId } = job.data;
    
    this.logger.log(`Processing rollback job ${job.id} for session: ${sessionId}`);

    try {
      await this.importProcessor.rollbackImport(sessionId);
      this.logger.log(`Rollback job ${job.id} completed successfully for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Rollback job ${job.id} failed for session: ${sessionId}`, error.stack);
      throw error;
    }
  }
}