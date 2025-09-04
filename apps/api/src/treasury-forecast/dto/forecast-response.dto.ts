import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastScenario, AlertType, AlertSeverity, TreasuryFlowType, TreasuryFlowCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class TreasuryFlowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TreasuryFlowType })
  type: TreasuryFlowType;

  @ApiProperty({ enum: TreasuryFlowCategory })
  category: TreasuryFlowCategory;

  @ApiProperty()
  amount: Decimal;

  @ApiProperty()
  description: string;

  @ApiProperty()
  expectedDate: Date;

  @ApiPropertyOptional()
  actualDate?: Date;

  @ApiProperty()
  isActual: boolean;

  @ApiProperty({ description: 'Probability this flow will occur (0-100)' })
  probability: number;

  @ApiProperty({ description: 'Confidence in amount/timing (0-100)' })
  confidence: number;

  @ApiPropertyOptional()
  loanId?: string;

  @ApiPropertyOptional()
  paymentId?: string;

  @ApiPropertyOptional()
  contributionId?: string;

  @ApiProperty()
  source: string;

  @ApiPropertyOptional()
  tags?: string[];
}

export class ForecastAlertResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AlertType })
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  triggeredAt: Date;

  @ApiPropertyOptional()
  projectedDate?: Date;

  @ApiPropertyOptional()
  amount?: Decimal;

  @ApiPropertyOptional()
  threshold?: Decimal;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isAcknowledged: boolean;

  @ApiPropertyOptional()
  recommendations?: any[];
}

export class TreasuryForecastResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  forecastDate: Date;

  @ApiProperty()
  periodDays: number;

  @ApiProperty({ enum: ForecastScenario })
  scenario: ForecastScenario;

  @ApiProperty()
  currentBalance: Decimal;

  @ApiProperty()
  projectedBalance: Decimal;

  @ApiProperty()
  minBalance: Decimal;

  @ApiProperty()
  maxBalance: Decimal;

  @ApiProperty()
  totalInflows: Decimal;

  @ApiProperty()
  totalOutflows: Decimal;

  @ApiProperty()
  netCashFlow: Decimal;

  @ApiProperty({ description: 'Liquidity risk score (0-100)' })
  liquidityRisk: number;

  @ApiProperty({ description: 'Forecast volatility index' })
  volatilityIndex: number;

  @ApiProperty({ description: 'Confidence level (0-100)' })
  confidenceLevel: number;

  @ApiProperty()
  calculatedAt: Date;

  @ApiProperty()
  calculationTime: number;

  @ApiProperty()
  dataPoints: number;

  @ApiProperty({ type: [ForecastAlertResponseDto] })
  alerts: ForecastAlertResponseDto[];

  @ApiProperty({ type: [TreasuryFlowResponseDto] })
  flows: TreasuryFlowResponseDto[];
}

export class ForecastSummaryDto {
  @ApiProperty()
  totalForecasts: number;

  @ApiProperty()
  activeAlerts: number;

  @ApiProperty()
  criticalAlerts: number;

  @ApiProperty()
  averageLiquidityRisk: number;

  @ApiPropertyOptional()
  lastForecastDate?: Date;

  @ApiPropertyOptional()
  nextCriticalDate?: Date;
}