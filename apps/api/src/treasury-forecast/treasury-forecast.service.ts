import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateTreasuryForecastDto,
  ForecastQueryDto,
  TreasuryForecastResponseDto,
  ForecastSummaryDto
} from './dto';
import { 
  ForecastScenario, 
  AlertType, 
  AlertSeverity,
  TreasuryFlowType,
  TreasuryFlowCategory,
  LoanStatus,
  PaymentStatus
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TreasuryForecastService {
  private readonly logger = new Logger(TreasuryForecastService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate treasury forecast for specified period
   */
  async generateForecast(dto: CreateTreasuryForecastDto): Promise<TreasuryForecastResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Generating forecast for ${dto.periodDays} days, scenario: ${dto.scenario}`);

    try {
      // Calculate forecast period
      const forecastDate = new Date(dto.forecastDate);
      const endDate = new Date(forecastDate);
      endDate.setDate(endDate.getDate() + dto.periodDays);

      // Get projected cash flows
      const flows = await this.calculateCashFlows(forecastDate, endDate, dto.scenario);
      
      // Calculate balance projections
      const balanceProjection = this.calculateBalanceProjection(dto.currentBalance, flows);
      
      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(flows, balanceProjection);
      
      // Create forecast record
      const forecast = await this.prisma.treasuryForecast.create({
        data: {
          forecastDate,
          periodDays: dto.periodDays,
          scenario: dto.scenario || ForecastScenario.REALISTIC,
          currentBalance: dto.currentBalance,
          projectedBalance: balanceProjection.finalBalance,
          minBalance: balanceProjection.minBalance,
          maxBalance: balanceProjection.maxBalance,
          totalInflows: balanceProjection.totalInflows,
          totalOutflows: balanceProjection.totalOutflows,
          netCashFlow: balanceProjection.netCashFlow,
          liquidityRisk: riskMetrics.liquidityRisk,
          volatilityIndex: riskMetrics.volatilityIndex,
          confidenceLevel: riskMetrics.confidenceLevel,
          calculationTime: Date.now() - startTime,
          dataPoints: flows.length,
        },
        include: {
          alerts: true,
          flows: true,
        },
      });

      // Generate alerts based on projections
      const alerts = await this.generateAlerts(forecast.id, balanceProjection, flows);

      // Update forecast with flows
      await this.saveForecastFlows(forecast.id, flows);

      this.logger.log(`Forecast generated successfully in ${forecast.calculationTime}ms`);

      return this.mapForecastToResponse(forecast, alerts, flows);
    } catch (error) {
      this.logger.error(`Error generating forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get existing forecast by query parameters
   */
  async getForecast(query: ForecastQueryDto): Promise<TreasuryForecastResponseDto | null> {
    const whereClause: any = {};
    
    if (query.days) {
      whereClause.periodDays = query.days;
    }
    
    if (query.scenario) {
      whereClause.scenario = query.scenario;
    }
    
    if (query.startDate) {
      whereClause.forecastDate = {
        gte: new Date(query.startDate),
      };
    }

    const forecast = await this.prisma.treasuryForecast.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        alerts: query.includeInactiveAlerts ? true : { where: { isActive: true } },
        flows: true,
      },
    });

    if (!forecast) {
      return null;
    }

    return this.mapForecastToResponse(forecast, forecast.alerts, forecast.flows);
  }

  /**
   * Get forecast summary statistics
   */
  async getForecastSummary(): Promise<ForecastSummaryDto> {
    const [totalForecasts, activeAlerts, criticalAlerts, lastForecast] = await Promise.all([
      this.prisma.treasuryForecast.count(),
      this.prisma.forecastAlert.count({ where: { isActive: true } }),
      this.prisma.forecastAlert.count({ 
        where: { 
          isActive: true, 
          severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.URGENT] }
        } 
      }),
      this.prisma.treasuryForecast.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { 
          forecastDate: true, 
          liquidityRisk: true,
          alerts: {
            where: { isActive: true, severity: AlertSeverity.CRITICAL },
            orderBy: { projectedDate: 'asc' },
            take: 1,
            select: { projectedDate: true }
          }
        }
      }),
    ]);

    const avgRisk = await this.prisma.treasuryForecast.aggregate({
      _avg: { liquidityRisk: true },
      where: { 
        createdAt: { 
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        } 
      }
    });

    return {
      totalForecasts,
      activeAlerts,
      criticalAlerts,
      averageLiquidityRisk: avgRisk._avg.liquidityRisk || 0,
      lastForecastDate: lastForecast?.forecastDate,
      nextCriticalDate: lastForecast?.alerts[0]?.projectedDate || undefined,
    };
  }

  /**
   * Calculate projected cash flows for the forecast period
   */
  private async calculateCashFlows(
    startDate: Date, 
    endDate: Date, 
    scenario: ForecastScenario = ForecastScenario.REALISTIC
  ) {
    const flows: any[] = [];

    // Get scheduled loan repayments
    const scheduledRepayments = await this.prisma.repaymentSchedule.findMany({
      where: {
        dueDate: { gte: startDate, lte: endDate },
        isPaid: false,
        loan: { status: LoanStatus.ACTIVE }
      },
      include: { loan: true }
    });

    // Add repayment inflows
    scheduledRepayments.forEach(repayment => {
      const probability = this.getRepaymentProbability(repayment, scenario);
      flows.push({
        type: TreasuryFlowType.INFLOW,
        category: TreasuryFlowCategory.LOAN_REPAYMENT,
        amount: repayment.amount,
        description: `Loan repayment - ${repayment.loan.loanNumber}`,
        expectedDate: repayment.dueDate,
        probability,
        confidence: 90,
        loanId: repayment.loanId,
      });
    });

    // Get pending loan disbursements
    const pendingLoans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.APPROVED,
        disbursementDate: null,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Within last 30 days
      }
    });

    // Add loan disbursement outflows
    pendingLoans.forEach(loan => {
      const estimatedDisbursementDate = this.estimateDisbursementDate(loan, startDate);
      if (estimatedDisbursementDate <= endDate) {
        const probability = this.getDisbursementProbability(loan, scenario);
        flows.push({
          type: TreasuryFlowType.OUTFLOW,
          category: TreasuryFlowCategory.LOAN_DISBURSEMENT,
          amount: loan.amount,
          description: `Loan disbursement - ${loan.loanNumber}`,
          expectedDate: estimatedDisbursementDate,
          probability,
          confidence: 85,
          loanId: loan.id,
        });
      }
    });

    // Get expected contributions (based on historical patterns)
    const historicalContributions = await this.getHistoricalContributions();
    const projectedContributions = this.projectContributions(
      historicalContributions, 
      startDate, 
      endDate, 
      scenario
    );
    flows.push(...projectedContributions);

    // Get operational expenses (estimated based on historical data)
    const operationalExpenses = this.projectOperationalExpenses(startDate, endDate, scenario);
    flows.push(...operationalExpenses);

    return flows.sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime());
  }

  /**
   * Calculate balance projection from cash flows
   */
  private calculateBalanceProjection(currentBalance: Decimal, flows: any[]) {
    let balance = new Decimal(currentBalance.toString());
    let minBalance = balance;
    let maxBalance = balance;
    let totalInflows = new Decimal(0);
    let totalOutflows = new Decimal(0);

    flows.forEach(flow => {
      const amount = new Decimal(flow.amount.toString());
      const probabilityAdjustedAmount = amount.mul(flow.probability / 100);

      if (flow.type === TreasuryFlowType.INFLOW) {
        balance = balance.add(probabilityAdjustedAmount);
        totalInflows = totalInflows.add(probabilityAdjustedAmount);
      } else {
        balance = balance.sub(probabilityAdjustedAmount);
        totalOutflows = totalOutflows.add(probabilityAdjustedAmount);
      }

      if (balance.lt(minBalance)) minBalance = balance;
      if (balance.gt(maxBalance)) maxBalance = balance;
    });

    return {
      finalBalance: balance,
      minBalance,
      maxBalance,
      totalInflows,
      totalOutflows,
      netCashFlow: totalInflows.sub(totalOutflows),
    };
  }

  /**
   * Calculate risk metrics for the forecast
   */
  private calculateRiskMetrics(flows: any[], balanceProjection: any) {
    // Liquidity risk based on minimum balance
    const liquidityRisk = balanceProjection.minBalance.lt(0) ? 100 : 
      balanceProjection.minBalance.lt(10000) ? 75 :
      balanceProjection.minBalance.lt(25000) ? 50 :
      balanceProjection.minBalance.lt(50000) ? 25 : 0;

    // Volatility based on balance swings
    const balanceRange = balanceProjection.maxBalance.sub(balanceProjection.minBalance);
    const avgBalance = balanceProjection.finalBalance.add(balanceProjection.minBalance).div(2);
    const volatilityIndex = avgBalance.gt(0) ? 
      balanceRange.div(avgBalance).mul(100).toNumber() : 0;

    // Confidence based on data quality and flow probabilities
    const avgProbability = flows.length > 0 ? 
      flows.reduce((sum, flow) => sum + flow.probability, 0) / flows.length : 100;
    const avgConfidence = flows.length > 0 ? 
      flows.reduce((sum, flow) => sum + flow.confidence, 0) / flows.length : 100;
    const confidenceLevel = (avgProbability * 0.6 + avgConfidence * 0.4);

    return {
      liquidityRisk: Math.min(liquidityRisk, 100),
      volatilityIndex: Math.min(volatilityIndex, 100),
      confidenceLevel: Math.min(confidenceLevel, 100),
    };
  }

  /**
   * Generate alerts based on forecast results
   */
  private async generateAlerts(forecastId: string, balanceProjection: any, flows: any[]) {
    const alerts: any[] = [];

    // Low cash flow alert
    if (balanceProjection.minBalance.lt(25000)) {
      alerts.push({
        forecastId,
        type: AlertType.LOW_CASH_FLOW,
        severity: balanceProjection.minBalance.lt(10000) ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'Low Cash Flow Warning',
        message: `Projected minimum balance of ${balanceProjection.minBalance} may impact operations`,
        amount: balanceProjection.minBalance,
        threshold: new Decimal('25000'),
        recommendations: [
          'Consider delaying non-urgent loan disbursements',
          'Accelerate contribution collection efforts',
          'Review and postpone optional expenses'
        ]
      });
    }

    // Negative balance alert
    if (balanceProjection.minBalance.lt(0)) {
      alerts.push({
        forecastId,
        type: AlertType.NEGATIVE_BALANCE,
        severity: AlertSeverity.URGENT,
        title: 'Negative Balance Risk',
        message: `Projected balance may go negative: ${balanceProjection.minBalance}`,
        amount: balanceProjection.minBalance,
        threshold: new Decimal('0'),
        recommendations: [
          'IMMEDIATE ACTION REQUIRED: Secure additional funding',
          'Postpone all non-critical disbursements',
          'Contact major contributors for emergency funding'
        ]
      });
    }

    // High demand alert (many pending loans)
    const pendingDisbursements = flows.filter(
      flow => flow.category === TreasuryFlowCategory.LOAN_DISBURSEMENT
    );
    if (pendingDisbursements.length > 10) {
      const totalDemand = pendingDisbursements.reduce(
        (sum, flow) => sum.add(flow.amount), 
        new Decimal(0)
      );
      
      alerts.push({
        forecastId,
        type: AlertType.HIGH_DEMAND,
        severity: AlertSeverity.WARNING,
        title: 'High Loan Demand',
        message: `${pendingDisbursements.length} pending loan disbursements totaling ${totalDemand}`,
        amount: totalDemand,
        recommendations: [
          'Consider implementing loan approval criteria review',
          'Prioritize loans by urgency and community impact',
          'Increase fundraising activities'
        ]
      });
    }

    // Save alerts to database
    const createdAlerts = await Promise.all(
      alerts.map(alert => this.prisma.forecastAlert.create({ data: alert }))
    );

    return createdAlerts;
  }

  /**
   * Save forecast flows to database
   */
  private async saveForecastFlows(forecastId: string, flows: any[]) {
    const flowsData = flows.map(flow => ({
      ...flow,
      forecastId,
      source: 'SYSTEM',
      tags: [flow.category.toLowerCase()],
    }));

    await this.prisma.treasuryFlow.createMany({
      data: flowsData,
    });
  }

  // Helper methods
  private getRepaymentProbability(repayment: any, scenario: ForecastScenario): number {
    const baseProb = 85; // Base probability for loan repayments
    const scenarioMultiplier = {
      [ForecastScenario.OPTIMISTIC]: 1.1,
      [ForecastScenario.REALISTIC]: 1.0,
      [ForecastScenario.PESSIMISTIC]: 0.8,
    };
    return Math.min(100, baseProb * scenarioMultiplier[scenario]);
  }

  private getDisbursementProbability(loan: any, scenario: ForecastScenario): number {
    const baseProb = 90; // Base probability for approved loans
    const scenarioMultiplier = {
      [ForecastScenario.OPTIMISTIC]: 1.0,
      [ForecastScenario.REALISTIC]: 0.95,
      [ForecastScenario.PESSIMISTIC]: 0.85,
    };
    return Math.min(100, baseProb * scenarioMultiplier[scenario]);
  }

  private estimateDisbursementDate(loan: any, startDate: Date): Date {
    // Estimate disbursement date based on approval date
    const approvalDate = loan.approvalDate || loan.updatedAt;
    const estimatedDate = new Date(approvalDate);
    estimatedDate.setDate(estimatedDate.getDate() + 3); // Average 3 days after approval
    
    return estimatedDate < startDate ? startDate : estimatedDate;
  }

  private async getHistoricalContributions() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return await this.prisma.contribution.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      include: { payments: true },
    });
  }

  private projectContributions(historical: any[], startDate: Date, endDate: Date, scenario: ForecastScenario) {
    // Simple projection based on historical average
    const avgMonthlyContributions = this.calculateMonthlyAverage(historical);
    const periodMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    
    const scenarioMultiplier = {
      [ForecastScenario.OPTIMISTIC]: 1.2,
      [ForecastScenario.REALISTIC]: 1.0,
      [ForecastScenario.PESSIMISTIC]: 0.8,
    };

    const projectedAmount = avgMonthlyContributions * periodMonths * scenarioMultiplier[scenario];
    const projectedDate = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);

    return [{
      type: TreasuryFlowType.INFLOW,
      category: TreasuryFlowCategory.CONTRIBUTION,
      amount: new Decimal(projectedAmount),
      description: 'Projected contributions based on historical patterns',
      expectedDate: projectedDate,
      probability: 70,
      confidence: 60,
    }];
  }

  private projectOperationalExpenses(startDate: Date, endDate: Date, scenario: ForecastScenario) {
    const periodMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const monthlyOperationalCost = 2000; // Estimated monthly operational costs
    
    const scenarioMultiplier = {
      [ForecastScenario.OPTIMISTIC]: 0.9,
      [ForecastScenario.REALISTIC]: 1.0,
      [ForecastScenario.PESSIMISTIC]: 1.1,
    };

    const totalExpenses = monthlyOperationalCost * periodMonths * scenarioMultiplier[scenario];
    const expenseDate = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2);

    return [{
      type: TreasuryFlowType.OUTFLOW,
      category: TreasuryFlowCategory.OPERATIONAL_EXPENSE,
      amount: new Decimal(totalExpenses),
      description: 'Projected operational expenses',
      expectedDate: expenseDate,
      probability: 95,
      confidence: 85,
    }];
  }

  private calculateMonthlyAverage(contributions: any[]): number {
    if (contributions.length === 0) return 5000; // Default fallback

    const total = contributions.reduce((sum, contrib) => 
      sum + parseFloat(contrib.amount.toString()), 0
    );
    
    const months = 6; // Historical period
    return total / months;
  }

  private mapForecastToResponse(forecast: any, alerts: any[], flows: any[]): TreasuryForecastResponseDto {
    return {
      id: forecast.id,
      forecastDate: forecast.forecastDate,
      periodDays: forecast.periodDays,
      scenario: forecast.scenario,
      currentBalance: forecast.currentBalance,
      projectedBalance: forecast.projectedBalance,
      minBalance: forecast.minBalance,
      maxBalance: forecast.maxBalance,
      totalInflows: forecast.totalInflows,
      totalOutflows: forecast.totalOutflows,
      netCashFlow: forecast.netCashFlow,
      liquidityRisk: forecast.liquidityRisk,
      volatilityIndex: forecast.volatilityIndex,
      confidenceLevel: forecast.confidenceLevel,
      calculatedAt: forecast.calculatedAt,
      calculationTime: forecast.calculationTime,
      dataPoints: forecast.dataPoints,
      alerts: alerts?.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        triggeredAt: alert.triggeredAt,
        projectedDate: alert.projectedDate,
        amount: alert.amount,
        threshold: alert.threshold,
        isActive: alert.isActive,
        isAcknowledged: alert.isAcknowledged,
        recommendations: alert.recommendations,
      })) || [],
      flows: flows?.map(flow => ({
        id: flow.id,
        type: flow.type,
        category: flow.category,
        amount: flow.amount,
        description: flow.description,
        expectedDate: flow.expectedDate,
        actualDate: flow.actualDate,
        isActual: flow.isActual,
        probability: flow.probability,
        confidence: flow.confidence,
        loanId: flow.loanId,
        paymentId: flow.paymentId,
        contributionId: flow.contributionId,
        source: flow.source,
        tags: flow.tags,
      })) || [],
    };
  }
}