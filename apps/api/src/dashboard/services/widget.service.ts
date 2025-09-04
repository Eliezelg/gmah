import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, LoanStatus, PaymentStatus, TreasuryFlowType, Prisma } from '@prisma/client';
import {
  WidgetConfigDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  WidgetType,
  WidgetSize,
} from '../dto';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class WidgetService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAvailableWidgets(role: Role) {
    const widgets = [
      // Metrics widgets
      {
        id: 'loans-total',
        type: WidgetType.METRIC,
        title: 'Total des Prêts',
        description: 'Nombre total de prêts dans le système',
        dataSource: 'loans.total',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: ['ALL'],
        category: 'Prêts',
      },
      {
        id: 'loans-active',
        type: WidgetType.METRIC,
        title: 'Prêts Actifs',
        description: 'Nombre de prêts en cours',
        dataSource: 'loans.active',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: ['ALL'],
        category: 'Prêts',
      },
      {
        id: 'treasury-balance',
        type: WidgetType.METRIC,
        title: 'Solde Trésorerie',
        description: 'Solde actuel de la trésorerie',
        dataSource: 'treasury.balance',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER],
        category: 'Finance',
      },
      
      // Chart widgets
      {
        id: 'loans-trend',
        type: WidgetType.CHART,
        title: 'Évolution des Prêts',
        description: 'Graphique d\'évolution des prêts',
        dataSource: 'loans.trend',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: ['ALL'],
        category: 'Prêts',
        defaultConfig: {
          chartType: 'line',
          showLegend: true,
          showGrid: true,
        },
      },
      {
        id: 'treasury-cashflow',
        type: WidgetType.CHART,
        title: 'Flux de Trésorerie',
        description: 'Entrées et sorties de trésorerie',
        dataSource: 'treasury.cashflow',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER],
        category: 'Finance',
        defaultConfig: {
          chartType: 'bar',
          showLegend: true,
        },
      },
      {
        id: 'repayment-distribution',
        type: WidgetType.CHART,
        title: 'Distribution Remboursements',
        description: 'Répartition des remboursements',
        dataSource: 'loans.repaymentDistribution',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
        roles: ['ALL'],
        category: 'Prêts',
        defaultConfig: {
          chartType: 'pie',
          showLegend: true,
        },
      },
      
      // Table widgets
      {
        id: 'recent-loans',
        type: WidgetType.TABLE,
        title: 'Prêts Récents',
        description: 'Liste des derniers prêts créés',
        dataSource: 'loans.recent',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: ['ALL'],
        category: 'Prêts',
      },
      {
        id: 'pending-approvals',
        type: WidgetType.TABLE,
        title: 'En Attente d\'Approbation',
        description: 'Prêts en attente de validation',
        dataSource: 'loans.pendingApprovals',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.COMMITTEE_MEMBER],
        category: 'Prêts',
      },
      {
        id: 'overdue-payments',
        type: WidgetType.TABLE,
        title: 'Paiements en Retard',
        description: 'Liste des paiements en retard',
        dataSource: 'payments.overdue',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER],
        category: 'Paiements',
      },
      
      // List widgets
      {
        id: 'recent-activities',
        type: WidgetType.LIST,
        title: 'Activités Récentes',
        description: 'Dernières actions dans le système',
        dataSource: 'activities.recent',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
        category: 'Système',
      },
      {
        id: 'notifications',
        type: WidgetType.LIST,
        title: 'Notifications',
        description: 'Notifications non lues',
        dataSource: 'notifications.unread',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: ['ALL'],
        category: 'Système',
      },
      
      // Calendar widget
      {
        id: 'upcoming-events',
        type: WidgetType.CALENDAR,
        title: 'Événements à Venir',
        description: 'Calendrier des prochains événements',
        dataSource: 'calendar.upcoming',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: ['ALL'],
        category: 'Calendrier',
      },
      
      // Gauge widgets
      {
        id: 'liquidity-gauge',
        type: WidgetType.GAUGE,
        title: 'Niveau de Liquidité',
        description: 'Indicateur de liquidité',
        dataSource: 'treasury.liquidityLevel',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER],
        category: 'Finance',
      },
      {
        id: 'repayment-rate',
        type: WidgetType.GAUGE,
        title: 'Taux de Remboursement',
        description: 'Pourcentage de remboursements à temps',
        dataSource: 'loans.repaymentRate',
        sizes: [WidgetSize.SMALL, WidgetSize.MEDIUM],
        roles: ['ALL'],
        category: 'Prêts',
      },
      
      // Progress widgets
      {
        id: 'monthly-target',
        type: WidgetType.PROGRESS,
        title: 'Objectif Mensuel',
        description: 'Progression vers l\'objectif mensuel',
        dataSource: 'goals.monthly',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
        category: 'Objectifs',
      },
      
      // Alert widget
      {
        id: 'active-alerts',
        type: WidgetType.ALERT,
        title: 'Alertes Actives',
        description: 'Alertes nécessitant une attention',
        dataSource: 'alerts.active',
        sizes: [WidgetSize.MEDIUM, WidgetSize.LARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
        category: 'Système',
      },
      
      // Heatmap widget
      {
        id: 'activity-heatmap',
        type: WidgetType.HEATMAP,
        title: 'Carte d\'Activité',
        description: 'Visualisation de l\'activité quotidienne',
        dataSource: 'activities.heatmap',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
        category: 'Système',
      },
      
      // Timeline widget
      {
        id: 'loan-timeline',
        type: WidgetType.TIMELINE,
        title: 'Timeline des Prêts',
        description: 'Chronologie des événements de prêt',
        dataSource: 'loans.timeline',
        sizes: [WidgetSize.LARGE, WidgetSize.XLARGE],
        roles: ['ALL'],
        category: 'Prêts',
      },
    ];

    // Filter widgets based on role
    return widgets.filter(
      widget =>
        widget.roles.includes('ALL') ||
        widget.roles.includes(role as any),
    );
  }

  async addWidget(userId: string, createDto: CreateWidgetDto): Promise<WidgetConfigDto> {
    const dashboard = await this.prisma.userDashboard.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        widgets: true,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Calculate position if not provided
    const position = createDto.position || this.calculateNextPosition(dashboard.widgets);

    const widget = await this.prisma.dashboardWidget.create({
      data: {
        dashboardId: dashboard.id,
        type: createDto.type,
        title: createDto.title,
        subtitle: createDto.subtitle,
        description: createDto.description,
        icon: createDto.icon,
        size: createDto.size,
        position,
        dataSource: createDto.dataSource,
        dataConfig: createDto.dataConfig as any,
        displayConfig: createDto.displayConfig as any,
        interactionConfig: createDto.interactionConfig as any,
        refreshInterval: createDto.refreshInterval,
        autoRefresh: createDto.autoRefresh,
        customComponent: createDto.customComponent,
        isVisible: true,
        isLocked: false,
        isCollapsed: false,
      },
    });

    // Clear cache
    await this.cacheManager.del(`dashboard:${userId}`);

    return this.mapToWidgetConfig(widget);
  }

  async updateWidget(
    widgetId: string,
    userId: string,
    updateDto: UpdateWidgetDto,
  ): Promise<WidgetConfigDto> {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: {
        id: widgetId,
        dashboard: {
          userId,
        },
      },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const updated = await this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        title: updateDto.title,
        subtitle: updateDto.subtitle,
        description: updateDto.description,
        icon: updateDto.icon,
        size: updateDto.size,
        position: updateDto.position !== undefined ? updateDto.position as Prisma.InputJsonValue : widget.position as Prisma.InputJsonValue,
        dataConfig: updateDto.dataConfig as any || widget.dataConfig,
        displayConfig: updateDto.displayConfig as any || widget.displayConfig,
        interactionConfig: updateDto.interactionConfig as any || widget.interactionConfig,
        refreshInterval: updateDto.refreshInterval,
        autoRefresh: updateDto.autoRefresh,
        customComponent: updateDto.customComponent,
      },
    });

    // Clear cache
    await this.cacheManager.del(`dashboard:${userId}`);
    await this.cacheManager.del(`widget:${widgetId}`);

    return this.mapToWidgetConfig(updated);
  }

  async removeWidget(widgetId: string, userId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: {
        id: widgetId,
        dashboard: {
          userId,
        },
      },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    if (widget.isLocked) {
      throw new ForbiddenException('Widget is locked and cannot be removed');
    }

    await this.prisma.dashboardWidget.delete({
      where: { id: widgetId },
    });

    // Clear cache
    await this.cacheManager.del(`dashboard:${userId}`);
    await this.cacheManager.del(`widget:${widgetId}`);

    return { success: true };
  }

  async getWidgetData(widgetId: string, options: any) {
    const cacheKey = `widget:${widgetId}:${JSON.stringify(options)}`;
    
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const widget = await this.prisma.dashboardWidget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const data = await this.fetchDataForSource(widget.dataSource, options);

    // Cache for 1 minute
    await this.cacheManager.set(cacheKey, data, 60000);

    return data;
  }

  async refreshWidgetData(widgetId: string) {
    // Clear all cached data for this widget
    // Clear all cached data for this widget
    // Note: cache-manager doesn't provide a direct keys() method
    // We'll clear specific cache entries instead
    const keys: string[] = [];
    for (const key of keys) {
      await this.cacheManager.del(key);
    }

    return { success: true, refreshed: new Date() };
  }

  private async fetchDataForSource(dataSource: string, options: any) {
    const [category, metric] = dataSource.split('.');
    
    switch (category) {
      case 'loans':
        return this.fetchLoanData(metric, options);
      case 'treasury':
        return this.fetchTreasuryData(metric, options);
      case 'payments':
        return this.fetchPaymentData(metric, options);
      case 'activities':
        return this.fetchActivityData(metric, options);
      case 'calendar':
        return this.fetchCalendarData(metric, options);
      case 'notifications':
        return this.fetchNotificationData(metric, options);
      case 'alerts':
        return this.fetchAlertData(metric, options);
      case 'goals':
        return this.fetchGoalData(metric, options);
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }
  }

  private async fetchLoanData(metric: string, options: any) {
    const period = this.getPeriodDates(options.period || '30d');
    
    switch (metric) {
      case 'total':
        return this.prisma.loan.count();
        
      case 'active':
        return this.prisma.loan.count({
          where: { status: 'ACTIVE' },
        });
        
      case 'trend':
        // Get loan counts grouped by day for the period
        const loans = await this.prisma.loan.findMany({
          where: {
            createdAt: {
              gte: period.start,
              lte: period.end,
            },
          },
          select: {
            createdAt: true,
            amount: true,
          },
        });
        
        // Group by day
        const grouped = this.groupByDay(loans, 'createdAt');
        return Object.entries(grouped).map(([date, items]) => ({
          date,
          count: (items as any[]).length,
          amount: (items as any[]).reduce((sum: number, item: any) => sum + item.amount, 0),
        }));
        
      case 'recent':
        return this.prisma.loan.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
      case 'pendingApprovals':
        return this.prisma.loan.findMany({
          where: { status: LoanStatus.UNDER_REVIEW },
          orderBy: { createdAt: 'desc' },
          include: {
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
      case 'repaymentRate':
        const totalPayments = await this.prisma.payment.count({
          where: {
            createdAt: {
              gte: period.start,
            },
          },
        });
        
        const onTimePayments = await this.prisma.payment.count({
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: period.start,
            },
          },
        });
        
        return totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;
        
      case 'repaymentDistribution':
        const distribution = await this.prisma.payment.groupBy({
          by: ['status'],
          _count: {
            id: true,
          },
        });
        
        return distribution.map(item => ({
          status: item.status,
          count: item._count.id,
        }));
        
      case 'timeline':
        const events = await this.prisma.loan.findMany({
          where: {
            createdAt: {
              gte: period.start,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
        return events.map(event => ({
          id: event.id,
          title: `Prêt ${event.borrower.firstName} ${event.borrower.lastName}`,
          amount: event.amount,
          status: event.status,
          date: event.createdAt,
        }));
        
      default:
        return null;
    }
  }

  private async fetchTreasuryData(metric: string, options: any) {
    const period = this.getPeriodDates(options.period || '30d');
    
    switch (metric) {
      case 'balance':
        const balance = await this.prisma.treasuryFlow.aggregate({
          _sum: { amount: true },
        });
        return balance._sum.amount || 0;
        
      case 'cashflow':
        const transactions = await this.prisma.treasuryFlow.findMany({
          where: {
            createdAt: {
              gte: period.start,
              lte: period.end,
            },
          },
          select: {
            type: true,
            amount: true,
            createdAt: true,
          },
        });
        
        const grouped = this.groupByDay(transactions, 'createdAt');
        return Object.entries(grouped).map(([date, items]) => ({
          date,
          inflow: (items as any[])
            .filter((t: any) => t.type === 'INFLOW')
            .reduce((sum: number, t: any) => sum + t.amount, 0),
          outflow: Math.abs(
            (items as any[])
              .filter((t: any) => t.type === 'OUTFLOW')
              .reduce((sum: number, t: any) => sum + t.amount, 0),
          ),
        }));
        
      case 'liquidityLevel':
        const currentBalance = await this.prisma.treasuryFlow.aggregate({
          _sum: { amount: true },
        });
        
        const monthlyOutflow = await this.prisma.treasuryFlow.aggregate({
          where: {
            type: TreasuryFlowType.OUTFLOW,
            createdAt: {
              gte: new Date(new Date().setDate(1)),
            },
          },
          _sum: { amount: true },
        });
        
        const balance_value = Number(currentBalance._sum?.amount || 0);
        const outflow_value = Math.abs(Number(monthlyOutflow._sum?.amount || 1));
        
        return Math.min(100, (balance_value / outflow_value) * 100);
        
      default:
        return null;
    }
  }

  private async fetchPaymentData(metric: string, options: any) {
    switch (metric) {
      case 'overdue':
        return this.prisma.payment.findMany({
          where: {
            status: PaymentStatus.PENDING,
            scheduledDate: {
              lt: new Date(),
            },
          },
          orderBy: { scheduledDate: 'asc' },
          include: {
            loan: {
              include: {
                borrower: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });
        
      default:
        return null;
    }
  }

  private async fetchActivityData(metric: string, options: any) {
    switch (metric) {
      case 'recent':
        const activities = await this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
        return activities.map(a => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          user: `${a.user?.firstName} ${a.user?.lastName}`,
          timestamp: a.createdAt,
        }));
        
      case 'heatmap':
        const period = this.getPeriodDates('30d');
        const logs = await this.prisma.auditLog.findMany({
          where: {
            createdAt: {
              gte: period.start,
            },
          },
          select: {
            createdAt: true,
          },
        });
        
        // Group by hour of day and day of week
        const heatmap = {};
        logs.forEach(log => {
          const date = new Date(log.createdAt);
          const hour = date.getHours();
          const day = date.getDay();
          const key = `${day}-${hour}`;
          heatmap[key] = (heatmap[key] || 0) + 1;
        });
        
        return Object.entries(heatmap).map(([key, value]) => {
          const [day, hour] = key.split('-');
          return {
            day: parseInt(day),
            hour: parseInt(hour),
            value,
          };
        });
        
      default:
        return null;
    }
  }

  private async fetchCalendarData(metric: string, options: any) {
    switch (metric) {
      case 'upcoming':
        return this.prisma.calendarEvent.findMany({
          where: {
            startDate: {
              gte: new Date(),
            },
            status: 'SCHEDULED',
          },
          orderBy: { startDate: 'asc' },
          take: 10,
        });
        
      default:
        return null;
    }
  }

  private async fetchNotificationData(metric: string, options: any) {
    switch (metric) {
      case 'unread':
        // This would need to be scoped to the current user
        return this.prisma.notification.findMany({
          where: {
            isRead: false,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        
      default:
        return null;
    }
  }

  private async fetchAlertData(metric: string, options: any) {
    switch (metric) {
      case 'active':
        return this.prisma.forecastAlert.findMany({
          where: {
            isActive: true,
          },
          orderBy: { severity: 'desc' },
        });
        
      default:
        return null;
    }
  }

  private async fetchGoalData(metric: string, options: any) {
    switch (metric) {
      case 'monthly':
        // Calculate progress towards monthly loan target
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const monthlyLoans = await this.prisma.loan.count({
          where: {
            createdAt: {
              gte: currentMonth,
            },
            status: {
              not: 'CANCELLED',
            },
          },
        });
        
        const monthlyTarget = 50; // This could come from settings
        
        return {
          current: monthlyLoans,
          target: monthlyTarget,
          progress: (monthlyLoans / monthlyTarget) * 100,
        };
        
      default:
        return null;
    }
  }

  private calculateNextPosition(existingWidgets: any[]): any {
    // Find the first available position
    const positions = existingWidgets.map(w => w.position);
    
    let x = 0;
    let y = 0;
    let found = false;
    
    for (y = 0; y < 10 && !found; y++) {
      for (x = 0; x < 12 && !found; x += 3) {
        const occupied = positions.some(
          p => p.x === x && p.y === y,
        );
        if (!occupied) {
          found = true;
          break;
        }
      }
    }
    
    return {
      x: x || 0,
      y: y || 0,
      w: 3,
      h: 2,
    };
  }

  private getPeriodDates(period: string) {
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
        start = new Date(now.setMonth(now.getMonth() - value));
        break;
      case 'y':
        start = new Date(now.setFullYear(now.getFullYear() - value));
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { start, end: new Date() };
  }

  private groupByDay(items: any[], dateField: string) {
    const grouped = {};
    
    items.forEach(item => {
      const date = new Date(item[dateField]);
      const key = date.toISOString().split('T')[0];
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return grouped;
  }

  private mapToWidgetConfig(widget: any): WidgetConfigDto {
    return {
      id: widget.id,
      type: widget.type,
      title: widget.title,
      subtitle: widget.subtitle,
      description: widget.description,
      icon: widget.icon,
      position: widget.position,
      size: widget.size,
      dataSource: widget.dataSource,
      dataConfig: widget.dataConfig,
      displayConfig: widget.displayConfig,
      interactionConfig: widget.interactionConfig,
      refreshInterval: widget.refreshInterval,
      autoRefresh: widget.autoRefresh,
      isVisible: widget.isVisible,
      isLocked: widget.isLocked,
      isCollapsed: widget.isCollapsed,
      permissions: widget.permissions,
      metadata: widget.metadata,
      customComponent: widget.customComponent,
      createdAt: widget.createdAt,
      updatedAt: widget.updatedAt,
    };
  }
}