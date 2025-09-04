export enum ForecastScenario {
  OPTIMISTIC = 'OPTIMISTIC',
  REALISTIC = 'REALISTIC',
  PESSIMISTIC = 'PESSIMISTIC'
}

export enum AlertType {
  LOW_CASH_FLOW = 'LOW_CASH_FLOW',
  NEGATIVE_BALANCE = 'NEGATIVE_BALANCE',
  HIGH_DEMAND = 'HIGH_DEMAND',
  LIQUIDITY_WARNING = 'LIQUIDITY_WARNING',
  PAYMENT_DELAY = 'PAYMENT_DELAY'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT'
}

export enum TreasuryFlowType {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW'
}

export enum TreasuryFlowCategory {
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  CONTRIBUTION = 'CONTRIBUTION',
  DEPOSIT_WITHDRAWAL = 'DEPOSIT_WITHDRAWAL',
  OPERATIONAL_EXPENSE = 'OPERATIONAL_EXPENSE',
  INTEREST_EARNED = 'INTEREST_EARNED',
  FEE_INCOME = 'FEE_INCOME',
  OTHER = 'OTHER'
}

export interface TreasuryFlowResponseDto {
  id: string;
  type: TreasuryFlowType;
  category: TreasuryFlowCategory;
  amount: number;
  description: string;
  expectedDate: string;
  actualDate?: string;
  isActual: boolean;
  probability: number;
  confidence: number;
  loanId?: string;
  paymentId?: string;
  contributionId?: string;
  source: string;
  tags?: string[];
}

export interface ForecastAlertResponseDto {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: string;
  projectedDate?: string;
  amount?: number;
  threshold?: number;
  isActive: boolean;
  isAcknowledged: boolean;
  recommendations?: string[];
}

export interface TreasuryForecastResponseDto {
  id: string;
  forecastDate: string;
  periodDays: number;
  scenario: ForecastScenario;
  currentBalance: number;
  projectedBalance: number;
  minBalance: number;
  maxBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  liquidityRisk: number;
  volatilityIndex: number;
  confidenceLevel: number;
  calculatedAt: string;
  calculationTime: number;
  dataPoints: number;
  alerts: ForecastAlertResponseDto[];
  flows: TreasuryFlowResponseDto[];
}

export interface ForecastSummaryDto {
  totalForecasts: number;
  activeAlerts: number;
  criticalAlerts: number;
  averageLiquidityRisk: number;
  lastForecastDate?: string;
  nextCriticalDate?: string;
}

export interface CreateTreasuryForecastDto {
  forecastDate: string;
  periodDays: number;
  scenario?: ForecastScenario;
  currentBalance: number;
  metadata?: any;
}

export interface ForecastQueryDto {
  days?: number;
  scenario?: ForecastScenario;
  startDate?: string;
  includeInactiveAlerts?: boolean;
}