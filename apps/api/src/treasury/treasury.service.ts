import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoanStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { ProcessDisbursementDto, RecordPaymentDto, GenerateReportDto } from './dto/treasury.dto';

@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Get treasury dashboard statistics
  async getDashboardStats(userId: string) {
    const [
      totalFunds,
      pendingDisbursements,
      activeLoans,
      overduePayments,
      monthlyStats,
    ] = await Promise.all([
      this.getTotalFunds(),
      this.getPendingDisbursements(),
      this.getActiveLoansCount(),
      this.getOverduePayments(),
      this.getMonthlyStatistics(),
    ]);

    return {
      totalFunds,
      availableFunds: totalFunds.total - totalFunds.allocated,
      pendingDisbursements: pendingDisbursements.total,
      pendingCount: pendingDisbursements.count,
      activeLoans,
      overduePayments: overduePayments.count,
      overdueAmount: overduePayments.total,
      monthlyInflow: monthlyStats.inflow,
      monthlyOutflow: monthlyStats.outflow,
      defaultRate: await this.calculateDefaultRate(),
    };
  }

  // Get all pending disbursements
  async getPendingDisbursements() {
    const loans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.APPROVED,
        disbursementDate: null,
      },
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        approvalDate: 'asc',
      },
    });

    const total = loans.reduce((sum, loan) => sum + loan.amount.toNumber(), 0);

    return {
      loans,
      count: loans.length,
      total,
    };
  }

  // Process loan disbursement
  async processDisbursement(
    loanId: string,
    dto: ProcessDisbursementDto,
    treasurerId: string,
  ) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException('Loan must be approved to disburse funds');
    }

    if (loan.disbursementDate) {
      throw new BadRequestException('Loan has already been disbursed');
    }

    // Create disbursement record
    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: await this.generatePaymentNumber(),
        loanId,
        amount: loan.amount,
        status: PaymentStatus.PROCESSING,
        method: dto.paymentMethod,
        transactionRef: dto.transactionReference,
        description: `Disbursement for loan ${loan.loanNumber}`,
        metadata: {
          treasurerId,
          notes: dto.notes,
          bankAccount: dto.bankAccount,
          bankName: dto.bankName,
        },
      },
    });

    // Update loan status
    await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.DISBURSED,
        disbursementDate: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: treasurerId,
        action: 'DISBURSE_LOAN',
        entityType: 'Loan',
        entityId: loanId,
        newValues: {
          status: LoanStatus.DISBURSED,
          disbursementDate: new Date(),
          paymentId: payment.id,
        },
      },
    });

    // Send notification
    await this.notificationsService.createNotification({
      userId: loan.borrowerId,
      type: 'LOAN_DISBURSED',
      title: 'Prêt décaissé',
      message: `Votre prêt ${loan.loanNumber} a été décaissé. Les fonds seront disponibles sous 24-48h.`,
      metadata: {
        loanId,
        amount: loan.amount,
        paymentId: payment.id,
      },
    });

    return payment;
  }

  // Get payment tracking data
  async getPayments(filters?: {
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
  }) {
    const where: Prisma.PaymentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledDate = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    if (filters?.searchTerm) {
      where.OR = [
        { paymentNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
        { loan: { loanNumber: { contains: filters.searchTerm, mode: 'insensitive' } } },
        {
          loan: {
            borrower: {
              OR: [
                { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
                { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        loan: {
          include: {
            borrower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return payments;
  }

  // Record a payment
  async recordPayment(dto: RecordPaymentDto, treasurerId: string) {
    const repaymentSchedule = await this.prisma.repaymentSchedule.findUnique({
      where: { id: dto.scheduleId },
      include: { loan: true },
    });

    if (!repaymentSchedule) {
      throw new NotFoundException('Repayment schedule not found');
    }

    if (repaymentSchedule.isPaid) {
      throw new BadRequestException('This installment has already been paid');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: await this.generatePaymentNumber(),
        loanId: repaymentSchedule.loanId,
        amount: dto.amount,
        status: PaymentStatus.COMPLETED,
        method: dto.paymentMethod,
        transactionRef: dto.transactionReference,
        processedDate: new Date(),
        description: `Payment for installment ${repaymentSchedule.installmentNumber}`,
        metadata: {
          treasurerId,
          scheduleId: dto.scheduleId,
        },
      },
    });

    // Update repayment schedule
    await this.prisma.repaymentSchedule.update({
      where: { id: dto.scheduleId },
      data: {
        isPaid: true,
        paidDate: new Date(),
        paidAmount: dto.amount,
      },
    });

    // Update loan totals
    await this.prisma.loan.update({
      where: { id: repaymentSchedule.loanId },
      data: {
        totalRepaid: { increment: dto.amount },
        outstandingAmount: { decrement: dto.amount },
      },
    });

    // Check if loan is fully repaid
    const remainingSchedules = await this.prisma.repaymentSchedule.count({
      where: {
        loanId: repaymentSchedule.loanId,
        isPaid: false,
      },
    });

    if (remainingSchedules === 0) {
      await this.prisma.loan.update({
        where: { id: repaymentSchedule.loanId },
        data: {
          status: LoanStatus.COMPLETED,
          actualEndDate: new Date(),
        },
      });

      await this.notificationsService.createNotification({
        userId: repaymentSchedule.loan.borrowerId,
        type: 'LOAN_COMPLETED',
        title: 'Prêt remboursé',
        message: `Félicitations! Votre prêt ${repaymentSchedule.loan.loanNumber} a été entièrement remboursé.`,
        metadata: { loanId: repaymentSchedule.loanId },
      });
    }

    return payment;
  }

  // Generate financial reports
  async generateReport(dto: GenerateReportDto) {
    const { type, startDate, endDate, format } = dto;

    let reportData: any = {};

    switch (type) {
      case 'overview':
        reportData = await this.generateOverviewReport(startDate, endDate);
        break;
      case 'loans':
        reportData = await this.generateLoansReport(startDate, endDate);
        break;
      case 'cashflow':
        reportData = await this.generateCashFlowReport(startDate, endDate);
        break;
      case 'repayments':
        reportData = await this.generateRepaymentsReport(startDate, endDate);
        break;
      case 'defaults':
        reportData = await this.generateDefaultsReport(startDate, endDate);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    // Here you would typically format the report based on the format parameter
    // For now, we'll return the raw data
    return {
      type,
      period: { startDate, endDate },
      format,
      data: reportData,
      generatedAt: new Date(),
    };
  }

  // Private helper methods
  private async getTotalFunds() {
    const contributions = await this.prisma.contribution.aggregate({
      _sum: { amount: true },
    });

    const disbursed = await this.prisma.loan.aggregate({
      where: { disbursementDate: { not: null } },
      _sum: { amount: true },
    });

    const repaid = await this.prisma.payment.aggregate({
      where: { 
        status: PaymentStatus.COMPLETED,
        loan: { isNot: null },
      },
      _sum: { amount: true },
    });

    const total = (contributions._sum.amount?.toNumber() || 0) + 
                  (repaid._sum.amount?.toNumber() || 0);
    const allocated = disbursed._sum.amount?.toNumber() || 0;

    return { total, allocated, available: total - allocated };
  }

  private async getActiveLoansCount() {
    return this.prisma.loan.count({
      where: {
        status: {
          in: [LoanStatus.DISBURSED, LoanStatus.ACTIVE],
        },
      },
    });
  }

  private async getOverduePayments() {
    const overdueSchedules = await this.prisma.repaymentSchedule.findMany({
      where: {
        isPaid: false,
        dueDate: { lt: new Date() },
      },
    });

    const total = overdueSchedules.reduce(
      (sum, schedule) => sum + schedule.amount.toNumber(),
      0,
    );

    return { count: overdueSchedules.length, total };
  }

  private async getMonthlyStatistics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inflow = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        processedDate: { gte: thirtyDaysAgo },
        loan: { isNot: null },
      },
      _sum: { amount: true },
    });

    const outflow = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        processedDate: { gte: thirtyDaysAgo },
        loan: null, // Disbursements
      },
      _sum: { amount: true },
    });

    return {
      inflow: inflow._sum.amount?.toNumber() || 0,
      outflow: outflow._sum.amount?.toNumber() || 0,
    };
  }

  private async calculateDefaultRate() {
    const totalLoans = await this.prisma.loan.count({
      where: {
        status: { in: [LoanStatus.ACTIVE, LoanStatus.COMPLETED, LoanStatus.DEFAULTED] },
      },
    });

    const defaultedLoans = await this.prisma.loan.count({
      where: { status: LoanStatus.DEFAULTED },
    });

    return totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;
  }

  private async generatePaymentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: {
        paymentNumber: { startsWith: `PAY-${year}-` },
      },
    });

    return `PAY-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateOverviewReport(startDate: Date, endDate: Date) {
    // Implementation for overview report
    return {
      summary: await this.getDashboardStats(''),
      loanActivity: await this.getLoanActivityByPeriod(startDate, endDate),
      cashFlow: await this.getCashFlowByPeriod(startDate, endDate),
    };
  }

  private async generateLoansReport(startDate: Date, endDate: Date) {
    const loans = await this.prisma.loan.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        borrower: true,
        payments: true,
        repaymentSchedule: true,
      },
    });

    return {
      totalLoans: loans.length,
      totalAmount: loans.reduce((sum, loan) => sum + loan.amount.toNumber(), 0),
      byStatus: await this.groupLoansByStatus(startDate, endDate),
      byType: await this.groupLoansByType(startDate, endDate),
    };
  }

  private async generateCashFlowReport(startDate: Date, endDate: Date) {
    return {
      inflows: await this.getInflowsByPeriod(startDate, endDate),
      outflows: await this.getOutflowsByPeriod(startDate, endDate),
      netCashFlow: await this.getNetCashFlowByPeriod(startDate, endDate),
    };
  }

  private async generateRepaymentsReport(startDate: Date, endDate: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        processedDate: {
          gte: startDate,
          lte: endDate,
        },
        loan: { isNot: null },
      },
      include: {
        loan: {
          include: { borrower: true },
        },
      },
    });

    return {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount.toNumber(), 0),
      byMethod: await this.groupPaymentsByMethod(startDate, endDate),
      onTimeRate: await this.calculateOnTimePaymentRate(startDate, endDate),
    };
  }

  private async generateDefaultsReport(startDate: Date, endDate: Date) {
    const defaultedLoans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.DEFAULTED,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        borrower: true,
        repaymentSchedule: true,
      },
    });

    return {
      totalDefaults: defaultedLoans.length,
      totalAmount: defaultedLoans.reduce((sum, loan) => sum + loan.outstandingAmount.toNumber(), 0),
      defaultRate: await this.calculateDefaultRate(),
      recoveryRate: await this.calculateRecoveryRate(defaultedLoans.map(l => l.id)),
    };
  }

  // Additional helper methods for report generation
  private async getLoanActivityByPeriod(startDate: Date, endDate: Date) {
    // Implementation details
    return [];
  }

  private async getCashFlowByPeriod(startDate: Date, endDate: Date) {
    // Implementation details
    return [];
  }

  private async groupLoansByStatus(startDate: Date, endDate: Date) {
    // Implementation details
    return {};
  }

  private async groupLoansByType(startDate: Date, endDate: Date) {
    // Implementation details
    return {};
  }

  private async getInflowsByPeriod(startDate: Date, endDate: Date) {
    // Implementation details
    return [];
  }

  private async getOutflowsByPeriod(startDate: Date, endDate: Date) {
    // Implementation details
    return [];
  }

  private async getNetCashFlowByPeriod(startDate: Date, endDate: Date) {
    // Implementation details
    return [];
  }

  private async groupPaymentsByMethod(startDate: Date, endDate: Date) {
    // Implementation details
    return {};
  }

  private async calculateOnTimePaymentRate(startDate: Date, endDate: Date) {
    // Implementation details
    return 0;
  }

  private async calculateRecoveryRate(loanIds: string[]) {
    // Implementation details
    return 0;
  }
}