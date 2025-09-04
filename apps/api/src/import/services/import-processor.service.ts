import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileParserService } from './file-parser.service';
import { ImportType, Role } from '@prisma/client';
import { FieldMappingDto } from '../dto/column-mapping.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ImportProcessorService {
  private readonly logger = new Logger(ImportProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private fileParser: FileParserService
  ) {}

  async processImport(sessionId: string): Promise<void> {
    this.logger.log(`Processing import for session: ${sessionId}`);

    const session = await this.prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error(`Import session not found: ${sessionId}`);
    }

    const startTime = Date.now();

    try {
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

      const mapping = session.columnMapping as any[] as FieldMappingDto[];
      if (!mapping) {
        throw new Error('Column mapping not configured');
      }

      // Process data based on import type
      let result: ProcessResult;
      switch (session.importType) {
        case ImportType.USERS:
          result = await this.processUsers(sessionId, parsedData.data, mapping);
          break;
        case ImportType.LOANS:
          result = await this.processLoans(sessionId, parsedData.data, mapping);
          break;
        case ImportType.CONTRIBUTIONS:
          result = await this.processContributions(sessionId, parsedData.data, mapping);
          break;
        case ImportType.GUARANTEES:
          result = await this.processGuarantees(sessionId, parsedData.data, mapping);
          break;
        case ImportType.PAYMENTS:
          result = await this.processPayments(sessionId, parsedData.data, mapping);
          break;
        default:
          throw new Error(`Unsupported import type: ${session.importType}`);
      }

      const processingTime = Date.now() - startTime;

      // Update session with results
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          processedRows: result.processed,
          successRows: result.success,
          failedRows: result.failed,
          skippedRows: result.skipped,
          completedAt: new Date(),
          processingTime,
          canRollback: result.canRollback,
          rollbackData: result.rollbackData,
          successReport: result.successReport,
          errorReport: result.errorReport
        }
      });

      this.logger.log(`Import completed for session: ${sessionId} - ${result.success} success, ${result.failed} failed, ${result.skipped} skipped`);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update session with error
      await this.prisma.importSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          processingTime,
          errorReport: {
            error: error.message,
            stack: error.stack
          }
        }
      });

      throw error;
    }
  }

  private async processUsers(
    sessionId: string,
    data: any[][],
    mapping: FieldMappingDto[]
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      canRollback: true,
      rollbackData: { createdUsers: [] },
      successReport: { created: [], updated: [] },
      errorReport: { errors: [] }
    };

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowNumber = i + 1;

        try {
          result.processed++;

          // Map row data to user object
          const userData = this.mapRowData(rowData, mapping);
          
          // Validate required fields
          if (!userData.email || !userData.firstName || !userData.lastName) {
            result.skipped++;
            result.errorReport.errors.push({
              row: rowNumber,
              error: 'Missing required fields (email, firstName, lastName)',
              data: userData
            });
            continue;
          }

          // Check if user already exists
          const existingUser = await tx.user.findUnique({
            where: { email: userData.email }
          });

          if (existingUser) {
            // Update existing user
            const updatedUser = await tx.user.update({
              where: { email: userData.email },
              data: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                address: userData.address,
                city: userData.city,
                postalCode: userData.postalCode,
                country: userData.country,
                role: userData.role || Role.BORROWER,
                updatedAt: new Date()
              }
            });

            result.success++;
            result.successReport.updated.push({
              row: rowNumber,
              id: updatedUser.id,
              email: updatedUser.email
            });
          } else {
            // Create new user
            const hashedPassword = await bcrypt.hash('temporary123!', 10); // Temporary password
            
            const newUser = await tx.user.create({
              data: {
                email: userData.email,
                passwordHash: hashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                address: userData.address,
                city: userData.city,
                postalCode: userData.postalCode,
                country: userData.country,
                role: userData.role || Role.BORROWER,
                isActive: true,
                emailVerified: false
              }
            });

            result.success++;
            result.rollbackData.createdUsers.push(newUser.id);
            result.successReport.created.push({
              row: rowNumber,
              id: newUser.id,
              email: newUser.email
            });
          }
        } catch (error) {
          result.failed++;
          result.errorReport.errors.push({
            row: rowNumber,
            error: error.message,
            data: rowData
          });
          this.logger.error(`Failed to process user row ${rowNumber}: ${error.message}`);
        }
      }
    });

    return result;
  }

  private async processLoans(
    sessionId: string,
    data: any[][],
    mapping: FieldMappingDto[]
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      canRollback: true,
      rollbackData: { createdLoans: [] },
      successReport: { created: [] },
      errorReport: { errors: [] }
    };

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowNumber = i + 1;

        try {
          result.processed++;

          const loanData = this.mapRowData(rowData, mapping);
          
          // Validate required fields
          if (!loanData.borrowerEmail || !loanData.amount || !loanData.purpose) {
            result.skipped++;
            result.errorReport.errors.push({
              row: rowNumber,
              error: 'Missing required fields (borrowerEmail, amount, purpose)',
              data: loanData
            });
            continue;
          }

          // Find borrower
          const borrower = await tx.user.findUnique({
            where: { email: loanData.borrowerEmail }
          });

          if (!borrower) {
            result.failed++;
            result.errorReport.errors.push({
              row: rowNumber,
              error: `Borrower not found with email: ${loanData.borrowerEmail}`,
              data: loanData
            });
            continue;
          }

          // Generate unique loan number
          const loanNumber = `LOAN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

          const newLoan = await tx.loan.create({
            data: {
              loanNumber,
              borrowerId: borrower.id,
              amount: parseFloat(loanData.amount),
              type: loanData.type || 'STANDARD',
              purpose: loanData.purpose,
              numberOfInstallments: parseInt(loanData.numberOfInstallments) || 12,
              status: 'DRAFT',
              requestDate: new Date()
            }
          });

          result.success++;
          result.rollbackData.createdLoans.push(newLoan.id);
          result.successReport.created.push({
            row: rowNumber,
            id: newLoan.id,
            loanNumber: newLoan.loanNumber
          });
        } catch (error) {
          result.failed++;
          result.errorReport.errors.push({
            row: rowNumber,
            error: error.message,
            data: rowData
          });
        }
      }
    });

    return result;
  }

  private async processContributions(
    sessionId: string,
    data: any[][],
    mapping: FieldMappingDto[]
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      canRollback: true,
      rollbackData: { createdContributions: [] },
      successReport: { created: [] },
      errorReport: { errors: [] }
    };

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowNumber = i + 1;

        try {
          result.processed++;

          const contributionData = this.mapRowData(rowData, mapping);
          
          if (!contributionData.contributorEmail || !contributionData.amount) {
            result.skipped++;
            continue;
          }

          const contributor = await tx.user.findUnique({
            where: { email: contributionData.contributorEmail }
          });

          if (!contributor) {
            result.failed++;
            result.errorReport.errors.push({
              row: rowNumber,
              error: `Contributor not found: ${contributionData.contributorEmail}`,
              data: contributionData
            });
            continue;
          }

          const newContribution = await tx.contribution.create({
            data: {
              contributorId: contributor.id,
              amount: parseFloat(contributionData.amount),
              type: contributionData.type || 'DONATION'
            }
          });

          result.success++;
          result.rollbackData.createdContributions.push(newContribution.id);
          result.successReport.created.push({
            row: rowNumber,
            id: newContribution.id
          });
        } catch (error) {
          result.failed++;
          result.errorReport.errors.push({
            row: rowNumber,
            error: error.message,
            data: rowData
          });
        }
      }
    });

    return result;
  }

  private async processGuarantees(
    sessionId: string,
    data: any[][],
    mapping: FieldMappingDto[]
  ): Promise<ProcessResult> {
    // Implementation similar to other processors
    // This is a placeholder - implement based on guarantee-specific logic
    return {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      canRollback: false,
      rollbackData: {},
      successReport: {},
      errorReport: { errors: [] }
    };
  }

  private async processPayments(
    sessionId: string,
    data: any[][],
    mapping: FieldMappingDto[]
  ): Promise<ProcessResult> {
    // Implementation similar to other processors
    // This is a placeholder - implement based on payment-specific logic
    return {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      canRollback: false,
      rollbackData: {},
      successReport: {},
      errorReport: { errors: [] }
    };
  }

  async rollbackImport(sessionId: string): Promise<void> {
    this.logger.log(`Rolling back import for session: ${sessionId}`);

    const session = await this.prisma.importSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || !session.rollbackData) {
      throw new Error('Cannot rollback: session or rollback data not found');
    }

    const rollbackData = session.rollbackData as any;

    await this.prisma.$transaction(async (tx) => {
      switch (session.importType) {
        case ImportType.USERS:
          if (rollbackData.createdUsers?.length) {
            await tx.user.deleteMany({
              where: {
                id: { in: rollbackData.createdUsers }
              }
            });
          }
          break;
        
        case ImportType.LOANS:
          if (rollbackData.createdLoans?.length) {
            await tx.loan.deleteMany({
              where: {
                id: { in: rollbackData.createdLoans }
              }
            });
          }
          break;

        case ImportType.CONTRIBUTIONS:
          if (rollbackData.createdContributions?.length) {
            await tx.contribution.deleteMany({
              where: {
                id: { in: rollbackData.createdContributions }
              }
            });
          }
          break;

        // Add other types as needed
      }
    });

    this.logger.log(`Rollback completed for session: ${sessionId}`);
  }

  private mapRowData(rowData: any[], mapping: FieldMappingDto[]): any {
    const mapped: any = {};
    
    mapping.forEach((map, index) => {
      if (index < rowData.length) {
        let value = rowData[index];
        
        // Apply transformations if defined
        if (map.transform && value != null && value !== '') {
          switch (map.transform.type) {
            case 'uppercase':
              value = String(value).toUpperCase();
              break;
            case 'lowercase':
              value = String(value).toLowerCase();
              break;
            case 'trim':
              value = String(value).trim();
              break;
            case 'number':
              value = parseFloat(value);
              break;
            case 'boolean':
              value = ['true', '1', 'yes', 'oui'].includes(String(value).toLowerCase());
              break;
            case 'date':
              value = new Date(value);
              break;
          }
        }
        
        // Use default value if value is empty and default is provided
        if ((value == null || value === '') && map.transform?.defaultValue !== undefined) {
          value = map.transform.defaultValue;
        }
        
        mapped[map.fieldName] = value;
      }
    });
    
    return mapped;
  }
}

interface ProcessResult {
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  canRollback: boolean;
  rollbackData: any;
  successReport: any;
  errorReport: any;
}