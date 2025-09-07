import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(range: string = 'month') {
    const now = new Date();
    const startDate = range === 'month' ? startOfMonth(now) : startOfDay(now);
    const endDate = range === 'month' ? endOfMonth(now) : endOfDay(now);
    const previousStartDate = range === 'month' ? startOfMonth(subMonths(now, 1)) : startOfDay(new Date(now.getTime() - 86400000));

    // Get user statistics
    const [totalUsers, activeUsers, newUsers, previousNewUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } }
      })
    ]);

    const userGrowth = previousNewUsers > 0 
      ? ((newUsers - previousNewUsers) / previousNewUsers) * 100 
      : newUsers > 0 ? 100 : 0;

    // Get loan statistics
    const [
      totalLoans,
      pendingLoans,
      approvedLoans,
      activeLoans,
      completedLoans,
      defaultedLoans
    ] = await Promise.all([
      this.prisma.loan.count(),
      this.prisma.loan.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.loan.count({ where: { status: 'APPROVED' } }),
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.loan.count({ where: { status: 'COMPLETED' } }),
      this.prisma.loan.count({ where: { status: 'DEFAULTED' } })
    ]);

    // Get loan amounts
    const loanAmounts = await this.prisma.loan.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['APPROVED', 'ACTIVE', 'COMPLETED', 'DISBURSED'] } }
    });

    const disbursedAmounts = await this.prisma.loan.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['DISBURSED', 'ACTIVE', 'COMPLETED'] } }
    });

    // Get treasury data
    const payments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        processedDate: { gte: startDate, lte: endDate }
      }
    });

    const disbursements = await this.prisma.loan.aggregate({
      _sum: { amount: true },
      where: {
        status: 'DISBURSED',
        disbursementDate: { gte: startDate, lte: endDate }
      }
    });

    // Calculate current balance (simplified - in production, use actual treasury records)
    const totalInflows = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' }
    });

    const totalOutflows = await this.prisma.loan.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['DISBURSED', 'ACTIVE'] } }
    });

    const currentBalance = Number(totalInflows._sum.amount || 0) - Number(totalOutflows._sum.amount || 0);
    const monthlyInflow = Number(payments._sum.amount || 0);
    const monthlyOutflow = Number(disbursements._sum.amount || 0);
    const availableFunds = currentBalance * 0.65; // 65% available for new loans
    const projectedBalance = currentBalance + monthlyInflow - monthlyOutflow;

    // Calculate performance metrics
    const approvalRate = totalLoans > 0 
      ? ((approvedLoans + activeLoans + completedLoans) / totalLoans) * 100 
      : 0;

    const repaymentRate = (activeLoans + completedLoans) > 0
      ? (completedLoans / (activeLoans + completedLoans + defaultedLoans)) * 100
      : 0;

    const defaultRate = (activeLoans + completedLoans + defaultedLoans) > 0
      ? (defaultedLoans / (activeLoans + completedLoans + defaultedLoans)) * 100
      : 0;

    // Calculate average processing time (in days)
    const processedLoans = await this.prisma.loan.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        approvalDate: { not: undefined },
        requestDate: { not: undefined }
      },
      select: {
        requestDate: true,
        approvalDate: true,
        rejectionDate: true
      }
    });

    let totalProcessingTime = 0;
    let processedCount = 0;

    processedLoans.forEach(loan => {
      const endDate = loan.approvalDate || loan.rejectionDate;
      if (endDate) {
        const processingTime = (endDate.getTime() - loan.requestDate.getTime()) / (1000 * 60 * 60 * 24);
        totalProcessingTime += processingTime;
        processedCount++;
      }
    });

    const averageProcessingTime = processedCount > 0 
      ? totalProcessingTime / processedCount 
      : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        growth: Math.round(userGrowth * 10) / 10
      },
      loans: {
        total: totalLoans,
        pending: pendingLoans,
        approved: approvedLoans,
        active: activeLoans,
        completed: completedLoans,
        defaulted: defaultedLoans,
        totalAmount: Number(loanAmounts._sum.amount || 0),
        disbursedAmount: Number(disbursedAmounts._sum.amount || 0)
      },
      treasury: {
        currentBalance: Math.max(0, Number(currentBalance)),
        monthlyInflow: Number(monthlyInflow),
        monthlyOutflow: Number(monthlyOutflow),
        availableFunds: Math.max(0, Number(availableFunds)),
        projectedBalance: Number(projectedBalance)
      },
      performance: {
        approvalRate: Math.round(approvalRate * 10) / 10,
        averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
        repaymentRate: Math.round(repaymentRate * 10) / 10,
        defaultRate: Math.round(defaultRate * 10) / 10
      }
    };
  }

  async getRecentActivities(limit: number = 10) {
    // Get recent audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Transform audit logs to activities
    const activities = auditLogs.map(log => {
      let type: string;
      let description: string;
      let status: string | undefined;

      switch (log.action) {
        case 'CREATE':
          if (log.entityType === 'Loan') {
            type = 'loan_request';
            description = `Nouvelle demande de prêt`;
            status = 'pending';
          } else if (log.entityType === 'User') {
            type = 'user_registration';
            description = `Nouvel utilisateur inscrit`;
          } else if (log.entityType === 'Payment') {
            type = 'payment';
            description = `Paiement enregistré`;
            status = 'completed';
          } else {
            type = 'other';
            description = `${log.entityType} créé`;
          }
          break;
        case 'UPDATE':
          if (log.entityType === 'Loan' && typeof log.newValues === 'object' && log.newValues !== null && 'status' in log.newValues && log.newValues.status === 'APPROVED') {
            type = 'approval';
            description = `Prêt approuvé`;
            status = 'approved';
          } else if (log.entityType === 'Loan' && typeof log.newValues === 'object' && log.newValues !== null && 'status' in log.newValues && log.newValues.status === 'DISBURSED') {
            type = 'disbursement';
            description = `Décaissement effectué`;
          } else {
            type = 'other';
            description = `${log.entityType} modifié`;
          }
          break;
        default:
          type = 'other';
          description = `${log.action} sur ${log.entityType}`;
      }

      return {
        id: log.id,
        type,
        description,
        timestamp: log.createdAt.toISOString(),
        status,
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : undefined
      };
    });

    return activities;
  }

  async getLoanMetrics() {
    const [total, byStatus, byType] = await Promise.all([
      this.prisma.loan.count(),
      this.prisma.loan.groupBy({
        by: ['status'],
        _count: true
      }),
      this.prisma.loan.groupBy({
        by: ['type'],
        _count: true
      })
    ]);

    return {
      total,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count
      })),
      byType: byType.map(item => ({
        type: item.type,
        count: item._count
      }))
    };
  }

  async getUserMetrics() {
    const [total, byRole, activeCount, verifiedCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { emailVerified: true } })
    ]);

    return {
      total,
      active: activeCount,
      verified: verifiedCount,
      byRole: byRole.map(item => ({
        role: item.role,
        count: item._count
      }))
    };
  }

  async getTreasuryMetrics() {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    const [monthlyIncome, monthlyExpenses, pendingPayments] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          processedDate: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      this.prisma.loan.aggregate({
        _sum: { amount: true },
        where: {
          status: 'DISBURSED',
          disbursementDate: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PENDING' }
      })
    ]);

    return {
      monthlyIncome: Number(monthlyIncome._sum.amount || 0),
      monthlyExpenses: Number(monthlyExpenses._sum.amount || 0),
      pendingPayments: Number(pendingPayments._sum.amount || 0),
      netFlow: Number(monthlyIncome._sum.amount || 0) - Number(monthlyExpenses._sum.amount || 0)
    };
  }

  async getPerformanceMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get loans processed in last 30 days
    const recentLoans = await this.prisma.loan.findMany({
      where: {
        OR: [
          { approvalDate: { gte: thirtyDaysAgo } },
          { rejectionDate: { gte: thirtyDaysAgo } }
        ]
      },
      select: {
        status: true,
        requestDate: true,
        approvalDate: true,
        rejectionDate: true
      }
    });

    const approved = recentLoans.filter(l => l.status === 'APPROVED').length;
    const rejected = recentLoans.filter(l => l.status === 'REJECTED').length;
    const total = approved + rejected;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    // Calculate processing times
    let totalTime = 0;
    let count = 0;

    recentLoans.forEach(loan => {
      const endDate = loan.approvalDate || loan.rejectionDate;
      if (endDate) {
        const days = (endDate.getTime() - loan.requestDate.getTime()) / (1000 * 60 * 60 * 24);
        totalTime += days;
        count++;
      }
    });

    const avgProcessingTime = count > 0 ? totalTime / count : 0;

    // Get repayment metrics
    const [totalActive, totalCompleted, totalDefaulted] = await Promise.all([
      this.prisma.loan.count({ where: { status: 'ACTIVE' } }),
      this.prisma.loan.count({ where: { status: 'COMPLETED' } }),
      this.prisma.loan.count({ where: { status: 'DEFAULTED' } })
    ]);

    const totalForRepayment = totalActive + totalCompleted + totalDefaulted;
    const repaymentRate = totalForRepayment > 0 
      ? (totalCompleted / totalForRepayment) * 100 
      : 0;
    const defaultRate = totalForRepayment > 0 
      ? (totalDefaulted / totalForRepayment) * 100 
      : 0;

    return {
      approvalRate: Math.round(approvalRate * 10) / 10,
      averageProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      repaymentRate: Math.round(repaymentRate * 10) / 10,
      defaultRate: Math.round(defaultRate * 10) / 10,
      loansProcessedLast30Days: total
    };
  }
}