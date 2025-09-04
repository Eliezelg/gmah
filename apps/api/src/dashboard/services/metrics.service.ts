import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsResponseDto, MetricDto, MetricsCategoryDto } from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';

@Injectable()
export class MetricsService {
  private liveMetricsSubjects = new Map<string, Subject<any>>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getMetrics(options: { category?: string; period?: string }): Promise<MetricsResponseDto> {
    const period = this.getPeriodDates(options.period || '30d');
    
    const categories: MetricsCategoryDto[] = [];
    
    // Financial Metrics
    if (!options.category || options.category === 'financial') {
      const financialMetrics = await this.getFinancialMetrics(period);
      categories.push({
        id: 'financial',
        name: 'Métriques Financières',
        icon: 'DollarSign',
        metrics: financialMetrics,
        summary: this.calculateCategorySummary(financialMetrics),
      });
    }
    
    // Loan Metrics
    if (!options.category || options.category === 'loans') {
      const loanMetrics = await this.getLoanMetrics(period);
      categories.push({
        id: 'loans',
        name: 'Métriques de Prêts',
        icon: 'FileText',
        metrics: loanMetrics,
        summary: this.calculateCategorySummary(loanMetrics),
      });
    }
    
    // User Metrics
    if (!options.category || options.category === 'users') {
      const userMetrics = await this.getUserMetrics(period);
      categories.push({
        id: 'users',
        name: 'Métriques Utilisateurs',
        icon: 'Users',
        metrics: userMetrics,
        summary: this.calculateCategorySummary(userMetrics),
      });
    }
    
    // Performance Metrics
    if (!options.category || options.category === 'performance') {
      const performanceMetrics = await this.getPerformanceMetrics(period);
      categories.push({
        id: 'performance',
        name: 'Performance',
        icon: 'Activity',
        metrics: performanceMetrics,
        summary: this.calculateCategorySummary(performanceMetrics),
      });
    }
    
    const alerts = await this.detectMetricAlerts(categories);
    const recommendations = await this.generateRecommendations(categories);
    
    return {
      categories,
      summary: {
        totalMetrics: categories.reduce((sum, cat) => sum + cat.metrics.length, 0),
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 60000), // 1 minute
        dataQuality: this.calculateDataQuality(categories),
      },
      period: {
        start: period.start,
        end: period.end,
        label: this.getPeriodLabel(options.period || '30d'),
      },
      alerts,
      recommendations,
    };
  }

  async streamLiveMetrics(userId: string) {
    if (!this.liveMetricsSubjects.has(userId)) {
      this.liveMetricsSubjects.set(userId, new Subject());
      
      // Start streaming metrics
      this.startMetricsStream(userId);
    }
    
    return this.liveMetricsSubjects.get(userId).asObservable();
  }

  private async startMetricsStream(userId: string) {
    const subject = this.liveMetricsSubjects.get(userId);
    
    // Send initial metrics
    const metrics = await this.getRealtimeMetrics();
    subject.next(metrics);
    
    // Set up interval to send updates
    const interval = setInterval(async () => {
      try {
        const updatedMetrics = await this.getRealtimeMetrics();
        subject.next(updatedMetrics);
      } catch (error) {
        console.error('Error streaming metrics:', error);
      }
    }, 5000); // Update every 5 seconds
    
    // Clean up on disconnect
    setTimeout(() => {
      clearInterval(interval);
      subject.complete();
      this.liveMetricsSubjects.delete(userId);
    }, 300000); // 5 minutes max stream time
  }

  private async getRealtimeMetrics() {
    const [activeUsers, activeLoans, pendingApprovals, recentTransactions] = await Promise.all([
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          },
        },
      }),
      this.prisma.loan.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.loan.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      this.prisma.treasuryTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      }),
    ]);
    
    return {
      timestamp: new Date(),
      metrics: {
        activeUsers,
        activeLoans,
        pendingApprovals,
        recentTransactions,
      },
    };
  }

  private async getFinancialMetrics(period: { start: Date; end: Date }): Promise<MetricDto[]> {
    const metrics: MetricDto[] = [];
    
    // Treasury Balance
    const currentBalance = await this.prisma.treasuryTransaction.aggregate({
      _sum: { amount: true },
    });
    
    const previousBalance = await this.prisma.treasuryTransaction.aggregate({
      where: {
        createdAt: {
          lt: period.start,
        },
      },
      _sum: { amount: true },
    });
    
    const balanceValue = currentBalance._sum.amount || 0;
    const previousBalanceValue = previousBalance._sum.amount || 0;
    const balanceChange = balanceValue - previousBalanceValue;
    
    metrics.push({
      id: 'treasury-balance',
      category: 'financial',
      name: 'Solde de Trésorerie',
      value: balanceValue,
      previousValue: previousBalanceValue,
      change: balanceChange,
      changePercent: previousBalanceValue ? (balanceChange / previousBalanceValue) * 100 : 0,
      trend: balanceChange > 0 ? 'up' : balanceChange < 0 ? 'down' : 'stable',
      unit: '€',
      format: 'currency',
      updatedAt: new Date(),
    });
    
    // Monthly Cash Flow
    const monthlyInflow = await this.prisma.treasuryTransaction.aggregate({
      where: {
        type: 'CREDIT',
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      _sum: { amount: true },
    });
    
    const monthlyOutflow = await this.prisma.treasuryTransaction.aggregate({
      where: {
        type: 'DEBIT',
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      _sum: { amount: true },
    });
    
    const netCashFlow = (monthlyInflow._sum.amount || 0) + (monthlyOutflow._sum.amount || 0);
    
    metrics.push({
      id: 'net-cashflow',
      category: 'financial',
      name: 'Flux de Trésorerie Net',
      value: netCashFlow,
      trend: netCashFlow > 0 ? 'up' : netCashFlow < 0 ? 'down' : 'stable',
      unit: '€',
      format: 'currency',
      description: 'Différence entre entrées et sorties',
      updatedAt: new Date(),
    });
    
    // Outstanding Amount
    const outstandingAmount = await this.prisma.loan.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _sum: { amount: true },
    });
    
    metrics.push({
      id: 'outstanding-amount',
      category: 'financial',
      name: 'Montant En Cours',
      value: outstandingAmount._sum.amount || 0,
      unit: '€',
      format: 'currency',
      description: 'Total des prêts actifs',
      updatedAt: new Date(),
    });
    
    return metrics;
  }

  private async getLoanMetrics(period: { start: Date; end: Date }): Promise<MetricDto[]> {
    const metrics: MetricDto[] = [];
    
    // Total Loans
    const totalLoans = await this.prisma.loan.count();
    const previousTotalLoans = await this.prisma.loan.count({
      where: {
        createdAt: {
          lt: period.start,
        },
      },
    });
    
    metrics.push({
      id: 'total-loans',
      category: 'loans',
      name: 'Total des Prêts',
      value: totalLoans,
      previousValue: previousTotalLoans,
      change: totalLoans - previousTotalLoans,
      changePercent: previousTotalLoans ? ((totalLoans - previousTotalLoans) / previousTotalLoans) * 100 : 0,
      trend: totalLoans > previousTotalLoans ? 'up' : 'stable',
      updatedAt: new Date(),
    });
    
    // Active Loans
    const activeLoans = await this.prisma.loan.count({
      where: { status: 'ACTIVE' },
    });
    
    metrics.push({
      id: 'active-loans',
      category: 'loans',
      name: 'Prêts Actifs',
      value: activeLoans,
      trend: 'stable',
      updatedAt: new Date(),
    });
    
    // Approval Rate
    const approvedLoans = await this.prisma.loan.count({
      where: {
        status: { in: ['ACTIVE', 'COMPLETED'] },
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
    });
    
    const rejectedLoans = await this.prisma.loan.count({
      where: {
        status: 'REJECTED',
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
    });
    
    const totalProcessed = approvedLoans + rejectedLoans;
    const approvalRate = totalProcessed > 0 ? (approvedLoans / totalProcessed) * 100 : 0;
    
    metrics.push({
      id: 'approval-rate',
      category: 'loans',
      name: 'Taux d\'Approbation',
      value: approvalRate,
      unit: '%',
      format: 'percent',
      target: 80,
      targetProgress: (approvalRate / 80) * 100,
      trend: approvalRate > 80 ? 'up' : 'down',
      updatedAt: new Date(),
    });
    
    // Average Loan Amount
    const avgLoanAmount = await this.prisma.loan.aggregate({
      where: {
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      _avg: { amount: true },
    });
    
    metrics.push({
      id: 'avg-loan-amount',
      category: 'loans',
      name: 'Montant Moyen',
      value: avgLoanAmount._avg.amount || 0,
      unit: '€',
      format: 'currency',
      updatedAt: new Date(),
    });
    
    // Repayment Rate
    const onTimePayments = await this.prisma.payment.count({
      where: {
        status: 'COMPLETED',
        paidAt: {
          lte: 'dueDate' as any, // This would need proper date comparison
        },
      },
    });
    
    const totalPayments = await this.prisma.payment.count({
      where: {
        status: { in: ['COMPLETED', 'LATE'] },
      },
    });
    
    const repaymentRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;
    
    metrics.push({
      id: 'repayment-rate',
      category: 'loans',
      name: 'Taux de Remboursement',
      value: repaymentRate,
      unit: '%',
      format: 'percent',
      target: 90,
      targetProgress: (repaymentRate / 90) * 100,
      trend: repaymentRate > 90 ? 'up' : 'down',
      updatedAt: new Date(),
    });
    
    return metrics;
  }

  private async getUserMetrics(period: { start: Date; end: Date }): Promise<MetricDto[]> {
    const metrics: MetricDto[] = [];
    
    // Total Users
    const totalUsers = await this.prisma.user.count();
    
    metrics.push({
      id: 'total-users',
      category: 'users',
      name: 'Total Utilisateurs',
      value: totalUsers,
      trend: 'up',
      updatedAt: new Date(),
    });
    
    // Active Users (logged in within period)
    const activeUsers = await this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: period.start,
        },
      },
    });
    
    const activeRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    
    metrics.push({
      id: 'active-users',
      category: 'users',
      name: 'Utilisateurs Actifs',
      value: activeUsers,
      description: `${activeRate.toFixed(1)}% du total`,
      trend: activeRate > 60 ? 'up' : 'down',
      updatedAt: new Date(),
    });
    
    // New Users
    const newUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
    });
    
    metrics.push({
      id: 'new-users',
      category: 'users',
      name: 'Nouveaux Utilisateurs',
      value: newUsers,
      trend: 'up',
      updatedAt: new Date(),
    });
    
    // User Retention
    const returningUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          lt: period.start,
        },
        lastLoginAt: {
          gte: period.start,
        },
      },
    });
    
    const previousUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          lt: period.start,
        },
      },
    });
    
    const retentionRate = previousUsers > 0 ? (returningUsers / previousUsers) * 100 : 0;
    
    metrics.push({
      id: 'retention-rate',
      category: 'users',
      name: 'Taux de Rétention',
      value: retentionRate,
      unit: '%',
      format: 'percent',
      target: 70,
      targetProgress: (retentionRate / 70) * 100,
      trend: retentionRate > 70 ? 'up' : 'down',
      updatedAt: new Date(),
    });
    
    return metrics;
  }

  private async getPerformanceMetrics(period: { start: Date; end: Date }): Promise<MetricDto[]> {
    const metrics: MetricDto[] = [];
    
    // Average Processing Time (mock data for now)
    metrics.push({
      id: 'avg-processing-time',
      category: 'performance',
      name: 'Temps de Traitement Moyen',
      value: 2.4,
      unit: 'jours',
      format: 'number',
      target: 2,
      targetProgress: (2 / 2.4) * 100,
      trend: 'down',
      description: 'Temps moyen pour approuver un prêt',
      updatedAt: new Date(),
    });
    
    // System Uptime
    metrics.push({
      id: 'system-uptime',
      category: 'performance',
      name: 'Disponibilité',
      value: 99.9,
      unit: '%',
      format: 'percent',
      target: 99.5,
      targetProgress: (99.9 / 99.5) * 100,
      trend: 'stable',
      updatedAt: new Date(),
    });
    
    // API Response Time (mock)
    metrics.push({
      id: 'api-response-time',
      category: 'performance',
      name: 'Temps de Réponse API',
      value: 145,
      unit: 'ms',
      format: 'number',
      target: 200,
      targetProgress: (145 / 200) * 100,
      trend: 'stable',
      description: 'Temps de réponse moyen des API',
      updatedAt: new Date(),
    });
    
    // Error Rate (mock)
    metrics.push({
      id: 'error-rate',
      category: 'performance',
      name: 'Taux d\'Erreur',
      value: 0.5,
      unit: '%',
      format: 'percent',
      target: 1,
      targetProgress: (0.5 / 1) * 100,
      trend: 'down',
      updatedAt: new Date(),
    });
    
    return metrics;
  }

  private calculateCategorySummary(metrics: MetricDto[]) {
    let improved = 0;
    let declined = 0;
    let stable = 0;
    
    metrics.forEach(metric => {
      if (metric.trend === 'up') improved++;
      else if (metric.trend === 'down') declined++;
      else stable++;
    });
    
    return {
      total: metrics.length,
      improved,
      declined,
      stable,
    };
  }

  private calculateDataQuality(categories: MetricsCategoryDto[]): number {
    // Simple data quality calculation based on completeness
    let totalMetrics = 0;
    let metricsWithData = 0;
    
    categories.forEach(category => {
      category.metrics.forEach(metric => {
        totalMetrics++;
        if (metric.value !== null && metric.value !== undefined) {
          metricsWithData++;
        }
      });
    });
    
    return totalMetrics > 0 ? (metricsWithData / totalMetrics) * 100 : 0;
  }

  private async detectMetricAlerts(categories: MetricsCategoryDto[]) {
    const alerts = [];
    
    categories.forEach(category => {
      category.metrics.forEach(metric => {
        // Check if metric is below target
        if (metric.target && metric.targetProgress < 80) {
          alerts.push({
            metric: metric.name,
            type: 'threshold' as const,
            severity: metric.targetProgress < 50 ? 'high' as const : 'medium' as const,
            message: `${metric.name} est en dessous de l'objectif (${metric.value}${metric.unit || ''} vs ${metric.target}${metric.unit || ''})`,
          });
        }
        
        // Check for significant decline
        if (metric.changePercent && metric.changePercent < -20) {
          alerts.push({
            metric: metric.name,
            type: 'trend' as const,
            severity: 'medium' as const,
            message: `${metric.name} a diminué de ${Math.abs(metric.changePercent).toFixed(1)}%`,
          });
        }
      });
    });
    
    return alerts;
  }

  private async generateRecommendations(categories: MetricsCategoryDto[]) {
    const recommendations = [];
    
    // Check loan approval rate
    const approvalRate = categories
      .find(c => c.id === 'loans')
      ?.metrics.find(m => m.id === 'approval-rate');
    
    if (approvalRate && approvalRate.value < 70) {
      recommendations.push({
        metric: 'Taux d\'Approbation',
        action: 'Réviser les critères d\'approbation',
        impact: 'Augmentation potentielle de 15% des prêts approuvés',
        priority: 1,
      });
    }
    
    // Check user retention
    const retentionRate = categories
      .find(c => c.id === 'users')
      ?.metrics.find(m => m.id === 'retention-rate');
    
    if (retentionRate && retentionRate.value < 60) {
      recommendations.push({
        metric: 'Taux de Rétention',
        action: 'Lancer une campagne de réengagement',
        impact: 'Amélioration de la fidélisation des utilisateurs',
        priority: 2,
      });
    }
    
    // Check treasury balance
    const treasuryBalance = categories
      .find(c => c.id === 'financial')
      ?.metrics.find(m => m.id === 'treasury-balance');
    
    if (treasuryBalance && treasuryBalance.trend === 'down') {
      recommendations.push({
        metric: 'Solde de Trésorerie',
        action: 'Analyser les flux de trésorerie',
        impact: 'Identification des sources de pertes',
        priority: 1,
      });
    }
    
    return recommendations;
  }

  private getPeriodDates(period: string): { start: Date; end: Date } {
    const now = new Date();
    const match = period.match(/(\d+)([dwmy])/);
    
    if (!match) {
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };
    }
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    let start: Date;
    switch (unit) {
      case 'd':
        start = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
        break;
      case 'w':
        start = new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'm':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - value);
        start = monthAgo;
        break;
      case 'y':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - value);
        start = yearAgo;
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { start, end: now };
  }

  private getPeriodLabel(period: string): string {
    const match = period.match(/(\d+)([dwmy])/);
    
    if (!match) return 'Derniers 30 jours';
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'd':
        return `Derniers ${value} jours`;
      case 'w':
        return `Dernières ${value} semaines`;
      case 'm':
        return `Derniers ${value} mois`;
      case 'y':
        return `Dernières ${value} années`;
      default:
        return 'Derniers 30 jours';
    }
  }
}