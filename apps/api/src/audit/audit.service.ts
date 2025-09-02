import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Loan Operations
  LOAN_CREATED = 'LOAN_CREATED',
  LOAN_SUBMITTED = 'LOAN_SUBMITTED',
  LOAN_APPROVED = 'LOAN_APPROVED',
  LOAN_REJECTED = 'LOAN_REJECTED',
  LOAN_DISBURSED = 'LOAN_DISBURSED',
  LOAN_CANCELLED = 'LOAN_CANCELLED',
  LOAN_COMPLETED = 'LOAN_COMPLETED',
  LOAN_DEFAULTED = 'LOAN_DEFAULTED',
  
  // Payment Operations
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REVERSED = 'PAYMENT_REVERSED',
  
  // Guarantee Operations
  GUARANTEE_REQUESTED = 'GUARANTEE_REQUESTED',
  GUARANTEE_SIGNED = 'GUARANTEE_SIGNED',
  GUARANTEE_RELEASED = 'GUARANTEE_RELEASED',
  GUARANTEE_INVOKED = 'GUARANTEE_INVOKED',
  
  // Document Operations
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  
  // Committee Operations
  VOTE_CAST = 'VOTE_CAST',
  VOTE_CHANGED = 'VOTE_CHANGED',
  COMMITTEE_DECISION = 'COMMITTEE_DECISION',
  
  // System Operations
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  
  // Security Events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  entityId?: string;
  entityType?: string;
  loanId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  entityId?: string;
  entityType?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Store severity in oldValues if provided
      const oldValuesWithSeverity = entry.severity 
        ? { ...entry.oldValues, _severity: entry.severity }
        : entry.oldValues;

      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId,
          entityId: entry.entityId,
          entityType: entry.entityType || 'SYSTEM',
          loanId: entry.loanId,
          oldValues: oldValuesWithSeverity || Prisma.JsonNull,
          newValues: entry.newValues || Prisma.JsonNull,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });

      // Also log to application logger
      this.logToConsole(entry);
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Don't throw - audit logging should not break the application
    }
  }

  async logInfo(action: AuditAction, userId?: string, details?: any): Promise<void> {
    await this.log({
      action,
      userId,
      oldValues: details,
      severity: AuditSeverity.INFO,
    });
  }

  async logWarning(action: AuditAction, userId?: string, details?: any): Promise<void> {
    await this.log({
      action,
      userId,
      oldValues: details,
      severity: AuditSeverity.WARNING,
    });
  }

  async logError(action: AuditAction, userId?: string, details?: any): Promise<void> {
    await this.log({
      action,
      userId,
      oldValues: details,
      severity: AuditSeverity.ERROR,
    });
  }

  async logCritical(action: AuditAction, userId?: string, details?: any): Promise<void> {
    await this.log({
      action,
      userId,
      oldValues: details,
      severity: AuditSeverity.CRITICAL,
    });
  }

  async logLogin(userId: string, ipAddress: string, userAgent: string, success: boolean): Promise<void> {
    await this.log({
      action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
      userId,
      ipAddress,
      userAgent,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    });
  }

  async logLoanOperation(
    action: AuditAction,
    userId: string,
    loanId: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      action,
      userId,
      entityId: loanId,
      entityType: 'loan',
      loanId,
      oldValues: details,
      severity: AuditSeverity.INFO,
    });
  }

  async logPaymentOperation(
    action: AuditAction,
    userId: string,
    paymentId: string,
    amount: number,
    details?: any,
  ): Promise<void> {
    await this.log({
      action,
      userId,
      entityId: paymentId,
      entityType: 'payment',
      oldValues: { amount, ...details },
      severity: AuditSeverity.INFO,
    });
  }

  async logSecurityEvent(
    action: AuditAction,
    ipAddress: string,
    userAgent: string,
    details?: any,
  ): Promise<void> {
    await this.log({
      action,
      ipAddress,
      userAgent,
      oldValues: details,
      severity: AuditSeverity.WARNING,
    });
  }

  async getAuditLogs(filter: AuditLogFilter): Promise<any[]> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.action) where.action = filter.action;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.entityType) where.entityType = filter.entityType;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    // If filtering by severity, look in oldValues JSON
    if (filter.severity) {
      where.oldValues = {
        path: ['_severity'],
        equals: filter.severity,
      };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getUserActivity(userId: string, days = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getAuditLogs({
      userId,
      startDate,
      limit: 500,
    });
  }

  async getSecurityEvents(days = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
        // Look for security-related actions
        action: {
          in: [
            AuditAction.LOGIN_FAILED,
            AuditAction.UNAUTHORIZED_ACCESS,
            AuditAction.SUSPICIOUS_ACTIVITY,
            AuditAction.RATE_LIMIT_EXCEEDED,
            AuditAction.PERMISSION_DENIED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getAuditStatistics(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalLogs,
      logsByAction,
      topUsers,
      securityEvents,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          userId: {
            not: null,
          },
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          action: {
            in: [
              AuditAction.LOGIN_FAILED,
              AuditAction.UNAUTHORIZED_ACCESS,
              AuditAction.SUSPICIOUS_ACTIVITY,
              AuditAction.RATE_LIMIT_EXCEEDED,
              AuditAction.PERMISSION_DENIED,
            ],
          },
        },
      }),
    ]);

    return {
      totalLogs,
      logsByAction,
      topUsers,
      securityEvents,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async cleanOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        // Only delete non-critical logs
        action: {
          notIn: [
            AuditAction.LOGIN_FAILED,
            AuditAction.UNAUTHORIZED_ACCESS,
            AuditAction.SUSPICIOUS_ACTIVITY,
            AuditAction.PERMISSION_DENIED,
            AuditAction.USER_DELETED,
            AuditAction.LOAN_APPROVED,
            AuditAction.LOAN_REJECTED,
          ],
        },
      },
    });

    this.logger.log(`Cleaned ${result.count} old audit logs`);
    return result.count;
  }

  private logToConsole(entry: AuditLogEntry): void {
    const message = `[AUDIT] ${entry.action} - User: ${entry.userId || 'system'} - Entity: ${entry.entityType}/${entry.entityId || 'none'}`;
    
    switch (entry.severity) {
      case AuditSeverity.ERROR:
      case AuditSeverity.CRITICAL:
        this.logger.error(message, entry.oldValues);
        break;
      case AuditSeverity.WARNING:
        this.logger.warn(message, entry.oldValues);
        break;
      default:
        this.logger.log(message, entry.oldValues);
    }
  }
}