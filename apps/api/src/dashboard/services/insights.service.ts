import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InsightResponseDto,
  InsightType,
  InsightPriority,
  InsightStatus,
  InsightActionDto,
} from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InsightsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async generateInsights(filters: {
    type?: string;
    priority?: string;
  }): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Generate different types of insights
    const [
      trendInsights,
      anomalyInsights,
      predictionInsights,
      recommendationInsights,
      warningInsights,
      opportunityInsights,
      riskInsights,
    ] = await Promise.all([
      this.generateTrendInsights(),
      this.generateAnomalyInsights(),
      this.generatePredictionInsights(),
      this.generateRecommendationInsights(),
      this.generateWarningInsights(),
      this.generateOpportunityInsights(),
      this.generateRiskInsights(),
    ]);
    
    insights.push(
      ...trendInsights,
      ...anomalyInsights,
      ...predictionInsights,
      ...recommendationInsights,
      ...warningInsights,
      ...opportunityInsights,
      ...riskInsights,
    );
    
    // Filter by type if specified
    let filteredInsights = insights;
    if (filters.type) {
      filteredInsights = filteredInsights.filter(i => i.type === filters.type);
    }
    
    // Filter by priority if specified
    if (filters.priority) {
      filteredInsights = filteredInsights.filter(i => i.priority === filters.priority);
    }
    
    // Sort by priority and confidence
    filteredInsights.sort((a, b) => {
      const priorityOrder = {
        [InsightPriority.CRITICAL]: 4,
        [InsightPriority.HIGH]: 3,
        [InsightPriority.MEDIUM]: 2,
        [InsightPriority.LOW]: 1,
      };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.confidence - a.confidence;
    });
    
    return filteredInsights;
  }

  async getSuggestedActions(insightId: string): Promise<InsightActionDto[]> {
    // In a real implementation, this would fetch from database
    // For now, return mock actions based on insight type
    return [
      {
        id: '1',
        label: 'Analyser en détail',
        type: 'primary',
        action: 'analyze',
        params: { insightId },
      },
      {
        id: '2',
        label: 'Créer une tâche',
        type: 'secondary',
        action: 'createTask',
        params: { insightId },
      },
      {
        id: '3',
        label: 'Ignorer',
        type: 'secondary',
        action: 'dismiss',
        params: { insightId },
        confirmation: {
          required: true,
          title: 'Confirmer',
          message: 'Êtes-vous sûr de vouloir ignorer cette recommandation?',
        },
      },
    ];
  }

  async dismissInsight(insightId: string, userId: string) {
    // Log the dismissal
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DISMISS_INSIGHT',
        entityType: 'INSIGHT',
        entityId: insightId,
        metadata: { dismissedAt: new Date() },
      },
    });
    
    // Emit event
    this.eventEmitter.emit('insight.dismissed', {
      insightId,
      userId,
      timestamp: new Date(),
    });
    
    return { success: true };
  }

  private async generateTrendInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Loan trend analysis
    const recentLoans = await this.prisma.loan.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    if (recentLoans.length >= 7) {
      const weeklyAverage = recentLoans.length / 4;
      const lastWeek = recentLoans.slice(-7).length;
      
      if (lastWeek > weeklyAverage * 1.5) {
        insights.push({
          id: 'trend-loan-increase',
          type: InsightType.TREND,
          priority: InsightPriority.MEDIUM,
          status: InsightStatus.NEW,
          title: 'Augmentation des demandes de prêt',
          description: `Les demandes de prêt ont augmenté de ${Math.round((lastWeek / weeklyAverage - 1) * 100)}% cette semaine`,
          details: 'Cette tendance pourrait indiquer une augmentation de la demande ou une amélioration de la visibilité de la plateforme.',
          data: {
            metric: 'loan_requests',
            value: lastWeek,
            previousValue: weeklyAverage,
            change: lastWeek - weeklyAverage,
            changePercent: (lastWeek / weeklyAverage - 1) * 100,
          },
          category: 'Prêts',
          impact: {
            score: 65,
            description: 'Impact modéré sur les opérations',
            affectedMetrics: ['loan_volume', 'processing_time', 'treasury_balance'],
          },
          confidence: 85,
          source: {
            type: 'trend_analysis',
            algorithm: 'moving_average',
            dataPoints: recentLoans.length,
          },
          generatedAt: new Date(),
        });
      }
    }
    
    // User activity trend
    const activeUsers = await this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    const previousWeekActive = await this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    if (previousWeekActive > 0) {
      const changePercent = ((activeUsers - previousWeekActive) / previousWeekActive) * 100;
      
      if (Math.abs(changePercent) > 20) {
        insights.push({
          id: 'trend-user-activity',
          type: InsightType.TREND,
          priority: changePercent > 0 ? InsightPriority.LOW : InsightPriority.MEDIUM,
          status: InsightStatus.NEW,
          title: changePercent > 0 ? 'Augmentation de l\'activité utilisateur' : 'Baisse de l\'activité utilisateur',
          description: `L'activité des utilisateurs a ${changePercent > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(changePercent).toFixed(1)}% cette semaine`,
          data: {
            metric: 'active_users',
            value: activeUsers,
            previousValue: previousWeekActive,
            change: activeUsers - previousWeekActive,
            changePercent,
          },
          category: 'Utilisateurs',
          impact: {
            score: Math.abs(changePercent) > 50 ? 80 : 50,
            description: changePercent > 0 ? 'Engagement accru' : 'Risque de désengagement',
            affectedMetrics: ['user_retention', 'loan_applications'],
          },
          confidence: 90,
          source: {
            type: 'trend_analysis',
            algorithm: 'week_over_week',
          },
          generatedAt: new Date(),
        });
      }
    }
    
    return insights;
  }

  private async generateAnomalyInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Check for unusual payment patterns
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        amount: true,
        status: true,
      },
    });
    
    if (recentPayments.length > 10) {
      const amounts = recentPayments.map(p => p.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      const outliers = amounts.filter(amount => Math.abs(amount - mean) > 2 * stdDev);
      
      if (outliers.length > 0) {
        insights.push({
          id: 'anomaly-payment-amounts',
          type: InsightType.ANOMALY,
          priority: InsightPriority.MEDIUM,
          status: InsightStatus.NEW,
          title: 'Montants de paiement inhabituels détectés',
          description: `${outliers.length} paiements avec des montants significativement différents de la moyenne`,
          details: `Moyenne: ${mean.toFixed(2)}€, Écart-type: ${stdDev.toFixed(2)}€`,
          data: {
            metric: 'payment_amounts',
            value: outliers.length,
            threshold: mean + 2 * stdDev,
          },
          category: 'Paiements',
          actions: [
            {
              id: 'review',
              label: 'Examiner les paiements',
              type: 'primary',
              action: 'navigate',
              params: { path: '/payments?filter=anomalies' },
            },
          ],
          impact: {
            score: 60,
            description: 'Peut indiquer des erreurs ou des fraudes',
            affectedMetrics: ['payment_integrity', 'treasury_balance'],
          },
          confidence: 75,
          source: {
            type: 'anomaly_detection',
            algorithm: 'statistical_outlier',
            dataPoints: recentPayments.length,
          },
          generatedAt: new Date(),
        });
      }
    }
    
    // Check for unusual login patterns
    const nightLogins = await this.prisma.auditLog.count({
      where: {
        action: 'LOGIN',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    
    if (nightLogins > 10) {
      insights.push({
        id: 'anomaly-night-logins',
        type: InsightType.ANOMALY,
        priority: InsightPriority.LOW,
        status: InsightStatus.NEW,
        title: 'Activité nocturne inhabituelle',
        description: `${nightLogins} connexions détectées pendant les heures inhabituelles`,
        data: {
          metric: 'night_logins',
          value: nightLogins,
          threshold: 5,
        },
        category: 'Sécurité',
        impact: {
          score: 40,
          description: 'Peut indiquer une activité automatisée ou internationale',
          affectedMetrics: ['security_score'],
        },
        confidence: 60,
        source: {
          type: 'anomaly_detection',
          algorithm: 'time_pattern',
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async generatePredictionInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Predict treasury balance
    const treasuryTrend = await this.calculateTreasuryTrend();
    
    if (treasuryTrend.predictedShortfall) {
      insights.push({
        id: 'prediction-treasury-shortfall',
        type: InsightType.PREDICTION,
        priority: InsightPriority.HIGH,
        status: InsightStatus.NEW,
        title: 'Risque de manque de liquidité',
        description: `Basé sur les tendances actuelles, la trésorerie pourrait être insuffisante dans ${treasuryTrend.daysUntilShortfall} jours`,
        details: `Solde prévu: ${treasuryTrend.predictedBalance}€, Seuil minimum: ${treasuryTrend.minimumThreshold}€`,
        data: {
          metric: 'treasury_balance',
          value: treasuryTrend.predictedBalance,
          threshold: treasuryTrend.minimumThreshold,
          chart: {
            type: 'line',
            data: treasuryTrend.projectionData,
          },
        },
        category: 'Finance',
        actions: [
          {
            id: 'forecast',
            label: 'Voir les prévisions',
            type: 'primary',
            action: 'navigate',
            params: { path: '/treasury-forecast' },
          },
          {
            id: 'alert',
            label: 'Créer une alerte',
            type: 'secondary',
            action: 'createAlert',
            params: { type: 'treasury_low' },
          },
        ],
        impact: {
          score: 85,
          description: 'Impact critique sur les opérations',
          affectedMetrics: ['liquidity', 'loan_disbursements', 'operations'],
        },
        confidence: 70,
        source: {
          type: 'prediction',
          algorithm: 'linear_regression',
          dataPoints: 30,
        },
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + treasuryTrend.daysUntilShortfall * 24 * 60 * 60 * 1000),
      });
    }
    
    // Predict loan defaults
    const defaultRisk = await this.calculateDefaultRisk();
    
    if (defaultRisk.riskScore > 30) {
      insights.push({
        id: 'prediction-default-risk',
        type: InsightType.PREDICTION,
        priority: defaultRisk.riskScore > 50 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Risque de défaut élevé détecté',
        description: `${defaultRisk.atRiskLoans} prêts présentent un risque de défaut élevé`,
        details: `Score de risque moyen: ${defaultRisk.riskScore}%, Montant à risque: ${defaultRisk.amountAtRisk}€`,
        data: {
          metric: 'default_risk',
          value: defaultRisk.riskScore,
          threshold: 30,
        },
        category: 'Risques',
        actions: [
          {
            id: 'review',
            label: 'Examiner les prêts à risque',
            type: 'primary',
            action: 'navigate',
            params: { path: '/loans?filter=at_risk' },
          },
        ],
        impact: {
          score: defaultRisk.riskScore,
          description: 'Risque financier potentiel',
          affectedMetrics: ['default_rate', 'treasury_balance', 'portfolio_quality'],
        },
        confidence: 65,
        source: {
          type: 'prediction',
          algorithm: 'risk_scoring',
          dataPoints: defaultRisk.analyzedLoans,
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async generateRecommendationInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Recommendation for loan approval optimization
    const pendingLoans = await this.prisma.loan.count({
      where: { status: 'PENDING_APPROVAL' },
    });
    
    const avgProcessingTime = 3.5; // Mock value, would be calculated from actual data
    
    if (pendingLoans > 10 && avgProcessingTime > 3) {
      insights.push({
        id: 'recommendation-approval-optimization',
        type: InsightType.RECOMMENDATION,
        priority: InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Optimiser le processus d\'approbation',
        description: `${pendingLoans} prêts en attente avec un temps de traitement moyen de ${avgProcessingTime} jours`,
        details: 'Considérer l\'automatisation partielle ou l\'ajout de ressources pour accélérer le traitement.',
        data: {
          metric: 'pending_approvals',
          value: pendingLoans,
        },
        category: 'Processus',
        actions: [
          {
            id: 'automate',
            label: 'Configurer l\'auto-approbation',
            type: 'primary',
            action: 'navigate',
            params: { path: '/settings/approvals' },
          },
          {
            id: 'assign',
            label: 'Assigner des réviseurs',
            type: 'secondary',
            action: 'openModal',
            params: { modal: 'assign_reviewers' },
          },
        ],
        impact: {
          score: 70,
          description: 'Amélioration de l\'efficacité opérationnelle',
          affectedMetrics: ['processing_time', 'customer_satisfaction', 'approval_rate'],
        },
        confidence: 80,
        source: {
          type: 'recommendation',
          algorithm: 'process_analysis',
        },
        generatedAt: new Date(),
      });
    }
    
    // Recommendation for user engagement
    const inactiveUsers = await this.prisma.user.count({
      where: {
        lastLoginAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    const totalUsers = await this.prisma.user.count();
    const inactiveRate = (inactiveUsers / totalUsers) * 100;
    
    if (inactiveRate > 30) {
      insights.push({
        id: 'recommendation-user-engagement',
        type: InsightType.RECOMMENDATION,
        priority: InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Améliorer l\'engagement utilisateur',
        description: `${inactiveRate.toFixed(1)}% des utilisateurs sont inactifs depuis plus de 30 jours`,
        details: 'Une campagne de réengagement pourrait aider à réactiver ces utilisateurs.',
        data: {
          metric: 'inactive_users',
          value: inactiveUsers,
        },
        category: 'Utilisateurs',
        actions: [
          {
            id: 'campaign',
            label: 'Lancer une campagne',
            type: 'primary',
            action: 'navigate',
            params: { path: '/campaigns/new?type=reengagement' },
          },
          {
            id: 'export',
            label: 'Exporter la liste',
            type: 'secondary',
            action: 'export',
            params: { type: 'inactive_users' },
          },
        ],
        impact: {
          score: 60,
          description: 'Augmentation potentielle de l\'activité',
          affectedMetrics: ['user_retention', 'active_users', 'loan_volume'],
        },
        confidence: 75,
        source: {
          type: 'recommendation',
          algorithm: 'engagement_analysis',
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async generateWarningInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Warning for overdue payments
    const overduePayments = await this.prisma.payment.count({
      where: {
        status: 'OVERDUE',
        dueDate: {
          lt: new Date(),
        },
      },
    });
    
    const overdueAmount = await this.prisma.payment.aggregate({
      where: {
        status: 'OVERDUE',
        dueDate: {
          lt: new Date(),
        },
      },
      _sum: { amount: true },
    });
    
    if (overduePayments > 5) {
      insights.push({
        id: 'warning-overdue-payments',
        type: InsightType.WARNING,
        priority: overduePayments > 10 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Paiements en retard élevés',
        description: `${overduePayments} paiements en retard pour un total de ${overdueAmount._sum.amount || 0}€`,
        data: {
          metric: 'overdue_payments',
          value: overduePayments,
          threshold: 5,
        },
        category: 'Paiements',
        actions: [
          {
            id: 'view',
            label: 'Voir les paiements',
            type: 'primary',
            action: 'navigate',
            params: { path: '/payments?status=overdue' },
          },
          {
            id: 'reminder',
            label: 'Envoyer des rappels',
            type: 'secondary',
            action: 'sendReminders',
            params: { type: 'overdue' },
          },
        ],
        affectedEntities: await this.getOverdueEntities(5),
        impact: {
          score: 70,
          description: 'Impact sur la trésorerie',
          affectedMetrics: ['treasury_balance', 'default_rate', 'collection_rate'],
        },
        confidence: 95,
        source: {
          type: 'monitoring',
        },
        generatedAt: new Date(),
      });
    }
    
    // Warning for document expiry
    const expiringDocuments = await this.prisma.document.count({
      where: {
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'VALID',
      },
    });
    
    if (expiringDocuments > 0) {
      insights.push({
        id: 'warning-expiring-documents',
        type: InsightType.WARNING,
        priority: InsightPriority.LOW,
        status: InsightStatus.NEW,
        title: 'Documents bientôt expirés',
        description: `${expiringDocuments} documents vont expirer dans les 7 prochains jours`,
        data: {
          metric: 'expiring_documents',
          value: expiringDocuments,
        },
        category: 'Documents',
        actions: [
          {
            id: 'review',
            label: 'Examiner les documents',
            type: 'primary',
            action: 'navigate',
            params: { path: '/documents?filter=expiring' },
          },
          {
            id: 'notify',
            label: 'Notifier les utilisateurs',
            type: 'secondary',
            action: 'sendNotifications',
            params: { type: 'document_expiry' },
          },
        ],
        impact: {
          score: 30,
          description: 'Risque de non-conformité',
          affectedMetrics: ['compliance_score', 'document_validity'],
        },
        confidence: 100,
        source: {
          type: 'monitoring',
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async generateOpportunityInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Opportunity for cross-selling
    const activeBorrowers = await this.prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: {
          lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months old
        },
      },
      select: {
        borrowerId: true,
      },
      distinct: ['borrowerId'],
    });
    
    const eligibleForNewLoan = activeBorrowers.length * 0.3; // Assume 30% are eligible
    
    if (eligibleForNewLoan > 10) {
      insights.push({
        id: 'opportunity-cross-sell',
        type: InsightType.OPPORTUNITY,
        priority: InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Opportunité de prêts supplémentaires',
        description: `Environ ${Math.round(eligibleForNewLoan)} emprunteurs actuels pourraient être éligibles pour des prêts supplémentaires`,
        details: 'Ces emprunteurs ont un bon historique de remboursement et pourraient bénéficier de prêts complémentaires.',
        data: {
          metric: 'eligible_borrowers',
          value: Math.round(eligibleForNewLoan),
        },
        category: 'Croissance',
        actions: [
          {
            id: 'campaign',
            label: 'Créer une campagne',
            type: 'primary',
            action: 'navigate',
            params: { path: '/campaigns/new?type=cross_sell' },
          },
          {
            id: 'analyze',
            label: 'Analyser l\'éligibilité',
            type: 'secondary',
            action: 'runAnalysis',
            params: { type: 'eligibility_check' },
          },
        ],
        impact: {
          score: 65,
          description: 'Potentiel de croissance du portefeuille',
          affectedMetrics: ['loan_volume', 'revenue', 'portfolio_size'],
        },
        confidence: 60,
        source: {
          type: 'opportunity_analysis',
          algorithm: 'eligibility_scoring',
        },
        generatedAt: new Date(),
      });
    }
    
    // Opportunity for process improvement
    const avgApprovalTime = 3.2; // Mock value
    const industryBenchmark = 2.0;
    
    if (avgApprovalTime > industryBenchmark * 1.2) {
      insights.push({
        id: 'opportunity-process-improvement',
        type: InsightType.OPPORTUNITY,
        priority: InsightPriority.LOW,
        status: InsightStatus.NEW,
        title: 'Amélioration du temps de traitement',
        description: `Le temps d'approbation moyen (${avgApprovalTime} jours) est supérieur à la référence du secteur (${industryBenchmark} jours)`,
        details: `Une réduction de ${((avgApprovalTime - industryBenchmark) / avgApprovalTime * 100).toFixed(1)}% est possible.`,
        data: {
          metric: 'approval_time',
          value: avgApprovalTime,
          threshold: industryBenchmark,
        },
        category: 'Efficacité',
        actions: [
          {
            id: 'analyze',
            label: 'Analyser le processus',
            type: 'primary',
            action: 'navigate',
            params: { path: '/analytics/process' },
          },
        ],
        impact: {
          score: 50,
          description: 'Amélioration de la satisfaction client',
          affectedMetrics: ['processing_time', 'customer_satisfaction', 'operational_efficiency'],
        },
        confidence: 70,
        source: {
          type: 'benchmarking',
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async generateRiskInsights(): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];
    
    // Concentration risk
    const largestBorrowers = await this.prisma.loan.groupBy({
      by: ['borrowerId'],
      where: {
        status: 'ACTIVE',
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 5,
    });
    
    const totalActiveAmount = await this.prisma.loan.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _sum: {
        amount: true,
      },
    });
    
    if (largestBorrowers.length > 0 && totalActiveAmount._sum.amount) {
      const top5Amount = largestBorrowers.reduce((sum, b) => sum + (b._sum.amount || 0), 0);
      const concentrationRatio = (top5Amount / totalActiveAmount._sum.amount) * 100;
      
      if (concentrationRatio > 30) {
        insights.push({
          id: 'risk-concentration',
          type: InsightType.RISK,
          priority: concentrationRatio > 50 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
          status: InsightStatus.NEW,
          title: 'Risque de concentration élevé',
          description: `Les 5 plus gros emprunteurs représentent ${concentrationRatio.toFixed(1)}% du portefeuille`,
          details: 'Une concentration élevée augmente le risque en cas de défaut.',
          data: {
            metric: 'concentration_ratio',
            value: concentrationRatio,
            threshold: 30,
          },
          category: 'Risques',
          actions: [
            {
              id: 'diversify',
              label: 'Plan de diversification',
              type: 'primary',
              action: 'navigate',
              params: { path: '/risk/diversification' },
            },
            {
              id: 'limits',
              label: 'Ajuster les limites',
              type: 'secondary',
              action: 'navigate',
              params: { path: '/settings/risk-limits' },
            },
          ],
          impact: {
            score: concentrationRatio,
            description: 'Risque systémique potentiel',
            affectedMetrics: ['portfolio_risk', 'default_exposure', 'capital_adequacy'],
          },
          confidence: 90,
          source: {
            type: 'risk_analysis',
            algorithm: 'concentration_analysis',
          },
          generatedAt: new Date(),
        });
      }
    }
    
    // Compliance risk
    const missingDocuments = await this.prisma.loan.count({
      where: {
        status: 'ACTIVE',
        documents: {
          none: {
            type: 'ID_VERIFICATION',
            status: 'VALID',
          },
        },
      },
    });
    
    if (missingDocuments > 0) {
      insights.push({
        id: 'risk-compliance',
        type: InsightType.RISK,
        priority: missingDocuments > 5 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        status: InsightStatus.NEW,
        title: 'Risque de non-conformité',
        description: `${missingDocuments} prêts actifs sans vérification d'identité valide`,
        details: 'La documentation manquante peut entraîner des problèmes de conformité réglementaire.',
        data: {
          metric: 'missing_documents',
          value: missingDocuments,
        },
        category: 'Conformité',
        actions: [
          {
            id: 'request',
            label: 'Demander les documents',
            type: 'primary',
            action: 'requestDocuments',
            params: { type: 'ID_VERIFICATION' },
          },
          {
            id: 'report',
            label: 'Rapport de conformité',
            type: 'secondary',
            action: 'navigate',
            params: { path: '/reports/compliance' },
          },
        ],
        affectedEntities: await this.getNonCompliantLoans(5),
        impact: {
          score: 75,
          description: 'Risque réglementaire et légal',
          affectedMetrics: ['compliance_score', 'regulatory_risk'],
        },
        confidence: 100,
        source: {
          type: 'compliance_check',
        },
        generatedAt: new Date(),
      });
    }
    
    return insights;
  }

  private async calculateTreasuryTrend() {
    // Simplified trend calculation
    const currentBalance = await this.prisma.treasuryTransaction.aggregate({
      _sum: { amount: true },
    });
    
    const monthlyOutflow = await this.prisma.treasuryTransaction.aggregate({
      where: {
        type: 'DEBIT',
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
      _sum: { amount: true },
    });
    
    const monthlyInflow = await this.prisma.treasuryTransaction.aggregate({
      where: {
        type: 'CREDIT',
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
      _sum: { amount: true },
    });
    
    const balance = currentBalance._sum.amount || 0;
    const outflow = Math.abs(monthlyOutflow._sum.amount || 0);
    const inflow = monthlyInflow._sum.amount || 0;
    const netFlow = inflow - outflow;
    
    const minimumThreshold = outflow * 2; // 2 months of expenses
    const monthsUntilShortfall = netFlow < 0 ? Math.floor(balance / Math.abs(netFlow)) : 999;
    
    return {
      predictedShortfall: monthsUntilShortfall < 3,
      daysUntilShortfall: monthsUntilShortfall * 30,
      predictedBalance: balance + (netFlow * 3), // 3 months projection
      minimumThreshold,
      projectionData: [], // Would contain actual projection data points
    };
  }

  private async calculateDefaultRisk() {
    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        nextPaymentDate: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        amount: true,
      },
    });
    
    const totalActiveLoans = await this.prisma.loan.count({
      where: { status: 'ACTIVE' },
    });
    
    const amountAtRisk = overdueLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const riskScore = totalActiveLoans > 0 ? (overdueLoans.length / totalActiveLoans) * 100 : 0;
    
    return {
      atRiskLoans: overdueLoans.length,
      amountAtRisk,
      riskScore,
      analyzedLoans: totalActiveLoans,
    };
  }

  private async getOverdueEntities(limit: number) {
    const overduePayments = await this.prisma.payment.findMany({
      where: {
        status: 'OVERDUE',
      },
      take: limit,
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
    });
    
    return overduePayments.map(p => ({
      type: 'payment',
      id: p.id,
      name: `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}`,
    }));
  }

  private async getNonCompliantLoans(limit: number) {
    const loans = await this.prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        documents: {
          none: {
            type: 'ID_VERIFICATION',
            status: 'VALID',
          },
        },
      },
      take: limit,
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    return loans.map(l => ({
      type: 'loan',
      id: l.id,
      name: `Prêt ${l.borrower.firstName} ${l.borrower.lastName}`,
    }));
  }
}