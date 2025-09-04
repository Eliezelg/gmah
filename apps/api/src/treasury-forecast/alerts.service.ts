import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TreasuryForecastService } from './treasury-forecast.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForecastScenario, AlertSeverity, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TreasuryAlertsService {
  private readonly logger = new Logger(TreasuryAlertsService.name);

  constructor(
    private prisma: PrismaService,
    private treasuryForecastService: TreasuryForecastService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Automated daily treasury check
   * Runs every day at 8:00 AM
   */
  @Cron('0 8 * * *', {
    name: 'daily-treasury-check',
    timeZone: 'Europe/Paris',
  })
  async dailyTreasuryCheck() {
    this.logger.log('Running daily treasury check...');
    
    try {
      // Generate quick 30-day forecast
      const currentBalance = await this.getCurrentTreasuryBalance();
      
      const forecast = await this.treasuryForecastService.generateForecast({
        forecastDate: new Date(),
        periodDays: 30,
        scenario: ForecastScenario.REALISTIC,
        currentBalance,
      });

      // Process critical alerts
      const criticalAlerts = forecast.alerts.filter(
        alert => alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.URGENT
      );

      if (criticalAlerts.length > 0) {
        await this.sendCriticalAlertNotifications(criticalAlerts);
      }

      // Check for liquidity risk
      if (forecast.liquidityRisk > 75) {
        await this.sendLiquidityRiskAlert(forecast);
      }

      this.logger.log(`Daily treasury check completed. Found ${criticalAlerts.length} critical alerts.`);
    } catch (error) {
      this.logger.error(`Error during daily treasury check: ${error.message}`, error.stack);
    }
  }

  /**
   * Weekly treasury report
   * Runs every Monday at 9:00 AM
   */
  @Cron('0 9 * * 1', {
    name: 'weekly-treasury-report',
    timeZone: 'Europe/Paris',
  })
  async weeklyTreasuryReport() {
    this.logger.log('Generating weekly treasury report...');

    try {
      const currentBalance = await this.getCurrentTreasuryBalance();
      
      // Generate forecasts for different scenarios
      const scenarios = [
        ForecastScenario.OPTIMISTIC,
        ForecastScenario.REALISTIC,
        ForecastScenario.PESSIMISTIC,
      ];

      const forecasts = await Promise.all(
        scenarios.map(scenario =>
          this.treasuryForecastService.generateForecast({
            forecastDate: new Date(),
            periodDays: 90,
            scenario,
            currentBalance,
          })
        )
      );

      // Get summary statistics
      const summary = await this.treasuryForecastService.getForecastSummary();

      // Send weekly report to admins and treasurers
      await this.sendWeeklyReport(forecasts, summary);

      this.logger.log('Weekly treasury report sent successfully.');
    } catch (error) {
      this.logger.error(`Error generating weekly report: ${error.message}`, error.stack);
    }
  }

  /**
   * Real-time balance monitoring
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorTreasuryBalance() {
    this.logger.debug('Monitoring treasury balance...');

    try {
      const currentBalance = await this.getCurrentTreasuryBalance();
      const criticalThreshold = new Decimal('10000');
      const warningThreshold = new Decimal('25000');

      if (currentBalance.lt(criticalThreshold)) {
        await this.sendUrgentBalanceAlert(currentBalance, 'CRITICAL');
      } else if (currentBalance.lt(warningThreshold)) {
        await this.sendUrgentBalanceAlert(currentBalance, 'WARNING');
      }
    } catch (error) {
      this.logger.error(`Error monitoring treasury balance: ${error.message}`, error.stack);
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string) {
    return await this.prisma.forecastAlert.update({
      where: { id: alertId },
      data: {
        isAcknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Get active alerts for dashboard
   */
  async getActiveAlerts(limit = 10) {
    return await this.prisma.forecastAlert.findMany({
      where: { isActive: true },
      orderBy: [
        { severity: 'desc' },
        { triggeredAt: 'desc' },
      ],
      take: limit,
      include: {
        forecast: {
          select: {
            periodDays: true,
            scenario: true,
          },
        },
      },
    });
  }

  /**
   * Private helper methods
   */
  private async getCurrentTreasuryBalance(): Promise<Decimal> {
    // This is a simplified calculation
    // In a real implementation, you would calculate from actual treasury data
    
    // Get total contributions
    const totalContributions = await this.prisma.contribution.aggregate({
      _sum: { amount: true },
    });

    // Get total disbursed loans
    const totalDisbursed = await this.prisma.loan.aggregate({
      where: { status: 'DISBURSED' },
      _sum: { amount: true },
    });

    // Get total repayments
    const totalRepayments = await this.prisma.payment.aggregate({
      where: { 
        status: 'COMPLETED',
        loanId: { not: null },
      },
      _sum: { amount: true },
    });

    const contributions = totalContributions._sum.amount || new Decimal(0);
    const disbursed = totalDisbursed._sum.amount || new Decimal(0);
    const repayments = totalRepayments._sum.amount || new Decimal(0);

    // Simple balance calculation: contributions + repayments - disbursed
    return contributions.add(repayments).sub(disbursed);
  }

  private async sendCriticalAlertNotifications(alerts: any[]) {
    // Get admin and treasurer users
    const recipients = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER] },
        isActive: true,
      },
    });

    for (const alert of alerts) {
      for (const user of recipients) {
        // Send in-app notification
        await this.notificationsService.createNotification({
          userId: user.id,
          type: 'IN_APP',
          title: `Alerte Critique: ${alert.title}`,
          message: alert.message,
          metadata: {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity,
          },
        });

        // Send email for urgent alerts
        if (alert.severity === AlertSeverity.URGENT) {
          await this.emailService.sendEmail({
            to: user.email,
            subject: `🚨 ALERTE URGENTE - Trésorerie GMAH`,
            html: this.generateAlertEmailHtml({
              userName: `${user.firstName} ${user.lastName}`,
              alert,
              recommendations: alert.recommendations || [],
            }),
          });
        }
      }
    }
  }

  private async sendLiquidityRiskAlert(forecast: any) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER] },
        isActive: true,
      },
    });

    const alertMessage = `Risque de liquidité élevé détecté: ${Math.round(forecast.liquidityRisk)}%. Balance minimum projetée: ${forecast.minBalance}€`;

    for (const admin of admins) {
      await this.notificationsService.createNotification({
        userId: admin.id,
        type: 'IN_APP',
        title: 'Risque de Liquidité Élevé',
        message: alertMessage,
        metadata: {
          forecastId: forecast.id,
          liquidityRisk: forecast.liquidityRisk,
          minBalance: forecast.minBalance,
        },
      });
    }
  }

  private async sendUrgentBalanceAlert(balance: Decimal, severity: 'CRITICAL' | 'WARNING') {
    const lastAlert = await this.prisma.forecastAlert.findFirst({
      where: {
        type: 'LOW_CASH_FLOW',
        triggeredAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
        },
      },
      orderBy: { triggeredAt: 'desc' },
    });

    // Don't spam alerts - only send if no similar alert in the last 2 hours
    if (lastAlert) return;

    const recipients = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER] },
        isActive: true,
      },
    });

    const message = severity === 'CRITICAL' 
      ? `URGENT: Balance de trésorerie critique (${balance}€). Action immédiate requise.`
      : `Attention: Balance de trésorerie faible (${balance}€). Surveillance recommandée.`;

    for (const user of recipients) {
      await this.notificationsService.createNotification({
        userId: user.id,
        type: 'IN_APP',
        title: severity === 'CRITICAL' ? 'Balance Critique' : 'Balance Faible',
        message,
        metadata: {
          currentBalance: balance.toString(),
          alertType: 'BALANCE_MONITOR',
          severity,
        },
      });

      if (severity === 'CRITICAL') {
        await this.emailService.sendEmail({
          to: user.email,
          subject: '🚨 ALERTE CRITIQUE - Balance Trésorerie',
          html: this.generateCriticalBalanceEmailHtml({
            userName: `${user.firstName} ${user.lastName}`,
            currentBalance: balance.toString(),
            timestamp: new Date().toISOString(),
          }),
        });
      }
    }
  }

  private async sendWeeklyReport(forecasts: any[], summary: any) {
    const recipients = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER, Role.COMMITTEE_MEMBER] },
        isActive: true,
      },
    });

    for (const user of recipients) {
      await this.emailService.sendEmail({
        to: user.email,
        subject: '📊 Rapport Hebdomadaire - Trésorerie GMAH',
        html: this.generateWeeklyReportEmailHtml({
          userName: `${user.firstName} ${user.lastName}`,
          forecasts,
          summary,
          reportDate: new Date().toISOString(),
        }),
      });
    }
  }

  private generateAlertEmailHtml(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">🚨 Alerte Urgente - Trésorerie GMAH</h2>
          <p>Bonjour ${data.userName},</p>
          <p><strong>${data.alert.title}</strong></p>
          <p>${data.alert.message}</p>
          ${data.recommendations?.length > 0 ? `
            <div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #92400e;">Recommandations:</h3>
              <ul>${data.recommendations.map((r: string) => `<li>${r}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion GMAH.
        </p>
      </div>
    `;
  }

  private generateWeeklyReportEmailHtml(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1f2937;">📊 Rapport Hebdomadaire - Trésorerie GMAH</h2>
        <p>Bonjour ${data.userName},</p>
        <p>Voici votre rapport hebdomadaire de prévisions de trésorerie pour la semaine du ${new Date(data.reportDate).toLocaleDateString('fr-FR')}.</p>
        <div style="margin: 20px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <h3 style="margin-top: 0;">Résumé</h3>
          <ul>
            <li>Balance actuelle: ${data.summary?.currentBalance || 'N/A'}€</li>
            <li>Prévision à 30 jours: ${data.summary?.forecast30 || 'N/A'}€</li>
            <li>Nombre d'alertes actives: ${data.summary?.activeAlerts || 0}</li>
          </ul>
        </div>
        <p>Pour plus de détails, veuillez vous connecter à la plateforme GMAH.</p>
        <p style="color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par le système de gestion GMAH.
        </p>
      </div>
    `;
  }

  private generateCriticalBalanceEmailHtml(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px;">
          <h1 style="color: #ef4444; margin-top: 0;">🚨 ALERTE CRITIQUE - Balance Trésorerie</h1>
          <p>Bonjour ${data.userName},</p>
          <div style="margin: 20px 0; padding: 16px; background-color: #fee2e2; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold;">
              Balance actuelle: <span style="color: #dc2626;">${data.currentBalance}€</span>
            </p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d;">
              La balance de trésorerie est critique et nécessite une action immédiate.
            </p>
          </div>
          <h3>Actions recommandées:</h3>
          <ul>
            <li>Suspendre temporairement les nouveaux prêts</li>
            <li>Accélérer le recouvrement des créances</li>
            <li>Contacter les dépositaires pour des fonds supplémentaires</li>
            <li>Convoquer une réunion d'urgence du comité</li>
          </ul>
          <p style="margin-top: 20px;">
            <strong>Date et heure:</strong> ${new Date(data.timestamp).toLocaleString('fr-FR')}
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Cet email a été envoyé automatiquement par le système de gestion GMAH.
        </p>
      </div>
    `;
  }
}