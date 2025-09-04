import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { ImportController } from './controllers/import.controller';
import { ImportService } from './services/import.service';
import { FileParserService } from './services/file-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportProcessorService } from './services/import-processor.service';
import { ImportQueueProcessor } from './processors/import.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'import',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [ImportController],
  providers: [
    PrismaService,
    ImportService,
    FileParserService,
    ImportValidationService,
    ImportProcessorService,
    ImportQueueProcessor,
  ],
  exports: [ImportService],
})
export class ImportModule {}