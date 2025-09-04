import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import {
  DashboardConfigDto,
  DashboardResponseDto,
  UpdateDashboardLayoutDto,
  DashboardStatisticsDto,
} from '../dto';
import { WidgetService } from './widget.service';
import { MetricsService } from './metrics.service';
import { InsightsService } from './insights.service';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private widgetService: WidgetService,
    private metricsService: MetricsService,
    private insightsService: InsightsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserDashboardConfig(userId: string): Promise<DashboardConfigDto> {
    // Try to get user's custom dashboard
    let dashboard = await this.prisma.userDashboard.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        widgets: true,
      },
    });

    // If no custom dashboard, create default based on role
    if (!dashboard) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      dashboard = await this.createDefaultDashboard(userId, user.role);
    }

    return this.mapToDashboardConfig(dashboard);
  }

  async createDefaultDashboard(userId: string, role: Role) {
    const defaultWidgets = this.getDefaultWidgetsByRole(role);
    
    return this.prisma.userDashboard.create({
      data: {
        userId,
        name: 'Dashboard Principal',
        description: 'Dashboard par défaut',
        theme: 'light',
        layout: {
          columns: 12,
          rows: 8,
          breakpoints: {
            lg: 1200,
            md: 996,
            sm: 768,
            xs: 480,
          },
        },
        widgets: {
          create: defaultWidgets,
        },
        preferences: {
          autoRefresh: true,
          refreshInterval: 60000,
          compactMode: false,
          showNotifications: true,
          defaultPeriod: '30d',
        },
        isDefault: true,
        isActive: true,
      },
      include: {
        widgets: true,
      },
    });
  }

  getDefaultWidgetsByRole(role: Role) {
    const baseWidgets = [
      {
        type: 'METRIC',
        title: 'Total Prêts',
        dataSource: 'loans.total',
        size: 'SMALL',
        position: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        type: 'METRIC',
        title: 'Prêts Actifs',
        dataSource: 'loans.active',
        size: 'SMALL',
        position: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        type: 'CHART',
        title: 'Évolution des Prêts',
        dataSource: 'loans.trend',
        size: 'LARGE',
        position: { x: 0, y: 2, w: 6, h: 4 },
        displayConfig: {
          chartType: 'line',
          showLegend: true,
          showGrid: true,
        },
      },
    ];

    const adminWidgets = [
      ...baseWidgets,
      {
        type: 'METRIC',
        title: 'Trésorerie',
        dataSource: 'treasury.balance',
        size: 'SMALL',
        position: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        type: 'METRIC',
        title: 'Taux de Remboursement',
        dataSource: 'loans.repaymentRate',
        size: 'SMALL',
        position: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        type: 'TABLE',
        title: 'Dernières Activités',
        dataSource: 'activities.recent',
        size: 'LARGE',
        position: { x: 6, y: 2, w: 6, h: 4 },
      },
      {
        type: 'ALERT',
        title: 'Alertes',
        dataSource: 'alerts.active',
        size: 'MEDIUM',
        position: { x: 0, y: 6, w: 6, h: 2 },
      },
      {
        type: 'CALENDAR',
        title: 'Événements',
        dataSource: 'calendar.upcoming',
        size: 'MEDIUM',
        position: { x: 6, y: 6, w: 6, h: 2 },
      },
    ];

    const treasurerWidgets = [
      ...baseWidgets,
      {
        type: 'GAUGE',
        title: 'Liquidité',
        dataSource: 'treasury.liquidity',
        size: 'MEDIUM',
        position: { x: 6, y: 0, w: 3, h: 3 },
      },
      {
        type: 'CHART',
        title: 'Flux de Trésorerie',
        dataSource: 'treasury.cashflow',
        size: 'LARGE',
        position: { x: 6, y: 3, w: 6, h: 3 },
        displayConfig: {
          chartType: 'bar',
          showLegend: true,
        },
      },
    ];

    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
        return adminWidgets;
      case Role.TREASURER:
        return treasurerWidgets;
      default:
        return baseWidgets.slice(0, 3);
    }
  }

  async updateDashboardLayout(
    userId: string,
    updateDto: UpdateDashboardLayoutDto,
  ): Promise<DashboardConfigDto> {
    const dashboard = await this.prisma.userDashboard.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Update widget positions if provided
    if (updateDto.widgets) {
      for (const widgetLayout of updateDto.widgets) {
        await this.prisma.dashboardWidget.update({
          where: { id: widgetLayout.id },
          data: {
            position: widgetLayout.position,
          },
        });
      }
    }

    // Update dashboard preferences
    const updated = await this.prisma.userDashboard.update({
      where: { id: dashboard.id },
      data: {
        theme: updateDto.theme || dashboard.theme,
        preferences: updateDto.preferences
          ? { ...dashboard.preferences as any, ...updateDto.preferences }
          : dashboard.preferences,
        filters: updateDto.filters || (dashboard.filters as any) || undefined,
      },
      include: {
        widgets: true,
      },
    });

    // Clear cache
    await this.cacheManager.del(`dashboard:${userId}`);

    return this.mapToDashboardConfig(updated);
  }

  async getDashboardData(
    userId: string,
    role: Role,
    options: { period?: string; refresh?: boolean },
  ): Promise<DashboardResponseDto> {
    const cacheKey = `dashboard:data:${userId}:${options.period}`;
    
    if (!options.refresh) {
      const cached = await this.cacheManager.get<DashboardResponseDto>(cacheKey);
      if (cached) return cached;
    }

    const [config, statistics, metrics, insights, notifications, activities, events] =
      await Promise.all([
        this.getUserDashboardConfig(userId),
        this.getStatistics(options.period),
        this.metricsService.getMetrics({ period: options.period }),
        this.insightsService.generateInsights({}),
        this.getNotifications(userId),
        this.getRecentActivities(),
        this.getUpcomingEvents(),
      ]);

    // Get data for each widget
    const widgetsData = await Promise.all(
      config.widgets.map(async (widget) => {
        try {
          const data = await this.widgetService.getWidgetData(widget.id, {
            period: options.period,
          });
          return {
            widgetId: widget.id,
            type: widget.type,
            data,
            lastUpdated: new Date(),
          };
        } catch (error) {
          return {
            widgetId: widget.id,
            type: widget.type,
            data: null,
            lastUpdated: new Date(),
            error: error.message,
          };
        }
      }),
    );

    const quickStats = this.generateQuickStats(statistics);

    const response: DashboardResponseDto = {
      config,
      statistics,
      widgetsData,
      metrics,
      insights,
      notifications,
      activities,
      quickStats,
      upcomingEvents: events,
      timestamp: new Date(),
      refreshInterval: config.preferences.refreshInterval,
    };

    // Cache for 1 minute
    await this.cacheManager.set(cacheKey, response, 60000);

    return response;
  }

  async getStatistics(period?: string): Promise<DashboardStatisticsDto> {
    const now = new Date();
    const startDate = this.getStartDateFromPeriod(period || '30d');

    const [
      totalLoans,
      activeLoans,
      totalAmount,
      outstandingAmount,
      overdueLoans,
      totalUsers,
      activeUsers,
      treasuryBalance,
    ] = await Promise.all([
      this.prisma.loan.count(),
      this.prisma.loan.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.loan.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.loan.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.loan.count({
        where: {
          status: 'ACTIVE',
          repaymentSchedule: {
            some: {
              dueDate: { lt: now },
              isPaid: false,
            },
          },
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: { gte: startDate },
        },
      }),
      this.prisma.treasuryFlow.aggregate({
        _sum: { amount: true },
      }),
    ]);

    const overdueAmount = await this.prisma.repaymentSchedule.aggregate({
      where: {
        dueDate: { lt: now },
        isPaid: false,
        loan: {
          status: 'ACTIVE',
        },
      },
      _sum: { amount: true },
    });

    const newUsersThisMonth = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    });

    const repaymentStats = await this.calculateRepaymentRate();
    const cashFlows = await this.calculateCashFlows(startDate);

    return {
      totalLoans,
      activeLoans,
      totalAmount: Number(totalAmount._sum.amount || 0),
      outstandingAmount: Number(outstandingAmount._sum.amount || 0),
      overdueLoans,
      overdueAmount: Number(overdueAmount._sum.amount || 0),
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      repaymentRate: repaymentStats.rate,
      defaultRate: repaymentStats.defaultRate,
      averageLoanAmount: Number(repaymentStats.avgAmount || 0),
      averageLoanDuration: repaymentStats.avgDuration,
      treasuryBalance: Number(treasuryBalance._sum.amount || 0),
      monthlyInflow: Number(cashFlows.inflow || 0),
      monthlyOutflow: Number(cashFlows.outflow || 0),
    };
  }

  private async calculateRepaymentRate() {
    const totalPayments = await this.prisma.payment.count();
    const onTimePayments = await this.prisma.payment.count({
      where: { status: 'COMPLETED' },
    });

    const defaultedLoans = await this.prisma.loan.count({
      where: { status: 'DEFAULTED' },
    });

    const totalLoansCount = await this.prisma.loan.count();

    const avgLoan = await this.prisma.loan.aggregate({
      _avg: {
        amount: true,
        numberOfInstallments: true,
      },
    });

    return {
      rate: totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0,
      defaultRate: totalLoansCount > 0 ? (defaultedLoans / totalLoansCount) * 100 : 0,
      avgAmount: Number(avgLoan._avg?.amount || 0),
      avgDuration: Number(avgLoan._avg?.numberOfInstallments || 0),
    };
  }

  private async calculateCashFlows(startDate: Date) {
    const inflow = await this.prisma.treasuryFlow.aggregate({
      where: {
        createdAt: { gte: startDate },
        type: 'INFLOW',
      },
      _sum: { amount: true },
    });

    const outflow = await this.prisma.treasuryFlow.aggregate({
      where: {
        createdAt: { gte: startDate },
        type: 'OUTFLOW',
      },
      _sum: { amount: true },
    });

    return {
      inflow: inflow._sum.amount || 0,
      outflow: Math.abs(Number(outflow._sum.amount || 0)),
    };
  }

  private async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: this.mapNotificationSeverity(n.type),
      timestamp: n.createdAt,
      isRead: n.isRead,
    }));
  }

  private mapNotificationSeverity(type: string): 'info' | 'warning' | 'error' | 'success' {
    switch (type) {
      case 'ALERT':
      case 'OVERDUE':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'SUCCESS':
      case 'PAYMENT_RECEIVED':
        return 'success';
      default:
        return 'info';
    }
  }

  private async getRecentActivities() {
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

    return activities.map((a) => ({
      id: a.id,
      type: a.action,
      description: this.formatActivityDescription(a),
      user: `${a.user?.firstName} ${a.user?.lastName}`,
      timestamp: a.createdAt,
      metadata: (a as any).metadata || {},
    }));
  }

  private formatActivityDescription(log: any): string {
    switch (log.action) {
      case 'CREATE':
        return `Création ${log.entityType}`;
      case 'UPDATE':
        return `Modification ${log.entityType}`;
      case 'DELETE':
        return `Suppression ${log.entityType}`;
      case 'LOGIN':
        return 'Connexion';
      case 'LOGOUT':
        return 'Déconnexion';
      default:
        return log.action;
    }
  }

  private async getUpcomingEvents() {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: new Date(),
        },
        status: 'SCHEDULED',
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startDate,
      type: e.type,
      priority: e.priority,
    }));
  }

  private generateQuickStats(stats: DashboardStatisticsDto) {
    return [
      {
        label: 'Prêts Actifs',
        value: stats.activeLoans,
        change: 12,
        changeType: 'increase' as const,
        icon: 'TrendingUp',
        color: 'green',
      },
      {
        label: 'Trésorerie',
        value: `${(stats.treasuryBalance / 1000).toFixed(1)}k €`,
        change: 5,
        changeType: stats.monthlyInflow > stats.monthlyOutflow ? 'increase' as const : 'decrease' as const,
        icon: 'Euro',
        color: 'blue',
      },
      {
        label: 'Taux de Remboursement',
        value: `${stats.repaymentRate.toFixed(1)}%`,
        change: 2,
        changeType: 'increase' as const,
        icon: 'CheckCircle',
        color: 'purple',
      },
      {
        label: 'Nouveaux Utilisateurs',
        value: stats.newUsersThisMonth,
        change: 20,
        changeType: 'increase' as const,
        icon: 'Users',
        color: 'orange',
      },
    ];
  }

  private getStartDateFromPeriod(period: string): Date {
    const now = new Date();
    const match = period.match(/(\d+)([dwmy])/);
    
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.setMonth(now.getMonth() - value));
      case 'y':
        return new Date(now.setFullYear(now.getFullYear() - value));
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private mapToDashboardConfig(dashboard: any): DashboardConfigDto {
    return {
      id: dashboard.id,
      userId: dashboard.userId,
      name: dashboard.name,
      description: dashboard.description,
      theme: dashboard.theme,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      preferences: dashboard.preferences,
      isDefault: dashboard.isDefault,
      isShared: dashboard.isShared,
      templateId: dashboard.templateId,
      quickActions: dashboard.quickActions,
      filters: dashboard.filters,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
    };
  }

  async getTemplates() {
    return [
      {
        id: 'admin-overview',
        name: 'Vue Admin Complète',
        description: 'Dashboard complet pour administrateurs',
        preview: '/templates/admin-overview.png',
        widgets: this.getDefaultWidgetsByRole(Role.ADMIN),
      },
      {
        id: 'treasurer-focus',
        name: 'Focus Trésorier',
        description: 'Vue centrée sur la gestion financière',
        preview: '/templates/treasurer-focus.png',
        widgets: this.getDefaultWidgetsByRole(Role.TREASURER),
      },
      {
        id: 'minimal',
        name: 'Vue Minimale',
        description: 'Dashboard épuré avec l\'essentiel',
        preview: '/templates/minimal.png',
        widgets: this.getDefaultWidgetsByRole(Role.BORROWER).slice(0, 4),
      },
    ];
  }

  async applyTemplate(userId: string, templateId: string) {
    const template = (await this.getTemplates()).find(t => t.id === templateId);
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Deactivate current dashboard
    await this.prisma.userDashboard.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new dashboard from template
    return this.prisma.userDashboard.create({
      data: {
        userId,
        name: template.name,
        description: template.description,
        templateId,
        theme: 'light',
        layout: {
          columns: 12,
          rows: 8,
          breakpoints: {
            lg: 1200,
            md: 996,
            sm: 768,
            xs: 480,
          },
        },
        widgets: {
          create: template.widgets,
        },
        preferences: {
          autoRefresh: true,
          refreshInterval: 60000,
          compactMode: false,
          showNotifications: true,
          defaultPeriod: '30d',
        },
        isActive: true,
      },
      include: {
        widgets: true,
      },
    });
  }

  async exportConfiguration(userId: string) {
    const config = await this.getUserDashboardConfig(userId);
    return {
      version: '1.0',
      exported: new Date(),
      config,
    };
  }

  async importConfiguration(userId: string, config: DashboardConfigDto) {
    // Validate configuration
    if (!config.widgets || !config.layout) {
      throw new BadRequestException('Invalid configuration format');
    }

    // Deactivate current dashboard
    await this.prisma.userDashboard.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new dashboard from import
    return this.prisma.userDashboard.create({
      data: {
        userId,
        name: `${config.name} (Imported)`,
        description: config.description,
        theme: config.theme,
        layout: config.layout as any,
        widgets: {
          create: config.widgets.map(w => ({
            ...w,
            id: undefined, // Let Prisma generate new IDs
            position: w.position as any,
            dataConfig: w.dataConfig as any,
            displayConfig: w.displayConfig as any,
            interactionConfig: w.interactionConfig as any,
            metadata: w.metadata as any,
          })),
        },
        preferences: config.preferences,
        filters: config.filters,
        quickActions: config.quickActions,
        isActive: true,
      },
      include: {
        widgets: true,
      },
    });
  }

  async getQuickActions(role: Role) {
    const baseActions = [
      {
        id: 'new-loan',
        label: 'Nouveau Prêt',
        icon: 'Plus',
        action: 'navigate',
        params: { path: '/loans/new' },
      },
      {
        id: 'search',
        label: 'Rechercher',
        icon: 'Search',
        action: 'openSearch',
      },
    ];

    const adminActions = [
      ...baseActions,
      {
        id: 'new-user',
        label: 'Nouvel Utilisateur',
        icon: 'UserPlus',
        action: 'navigate',
        params: { path: '/users/new' },
      },
      {
        id: 'reports',
        label: 'Rapports',
        icon: 'FileText',
        action: 'navigate',
        params: { path: '/reports' },
      },
      {
        id: 'settings',
        label: 'Paramètres',
        icon: 'Settings',
        action: 'navigate',
        params: { path: '/settings' },
      },
    ];

    const treasurerActions = [
      ...baseActions,
      {
        id: 'treasury-forecast',
        label: 'Prévisions',
        icon: 'TrendingUp',
        action: 'navigate',
        params: { path: '/treasury-forecast' },
      },
      {
        id: 'export',
        label: 'Export',
        icon: 'Download',
        action: 'openExport',
      },
    ];

    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
        return adminActions;
      case Role.TREASURER:
        return treasurerActions;
      default:
        return baseActions;
    }
  }

  async executeQuickAction(actionId: string, userId: string, params?: any) {
    // Log the action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'QUICK_ACTION',
        entityType: 'DASHBOARD',
        entityId: actionId,
        newValues: params as any,
      },
    });

    // Return action result
    return {
      success: true,
      actionId,
      params,
      timestamp: new Date(),
    };
  }
}