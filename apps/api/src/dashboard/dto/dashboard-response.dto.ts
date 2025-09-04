import { ApiProperty } from '@nestjs/swagger';
import { DashboardConfigDto } from './dashboard-config.dto';
import { MetricsResponseDto } from './metrics-response.dto';
import { InsightResponseDto } from './insight-response.dto';

export class DashboardStatisticsDto {
  @ApiProperty()
  totalLoans: number;

  @ApiProperty()
  activeLoans: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  outstandingAmount: number;

  @ApiProperty()
  overdueLoans: number;

  @ApiProperty()
  overdueAmount: number;

  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  newUsersThisMonth: number;

  @ApiProperty()
  repaymentRate: number;

  @ApiProperty()
  defaultRate: number;

  @ApiProperty()
  averageLoanAmount: number;

  @ApiProperty()
  averageLoanDuration: number;

  @ApiProperty()
  treasuryBalance: number;

  @ApiProperty()
  monthlyInflow: number;

  @ApiProperty()
  monthlyOutflow: number;
}

export class WidgetDataDto {
  @ApiProperty()
  widgetId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  data: any;

  @ApiProperty()
  lastUpdated: Date;

  @ApiProperty({ required: false })
  error?: string;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardConfigDto })
  config: DashboardConfigDto;

  @ApiProperty({ type: DashboardStatisticsDto })
  statistics: DashboardStatisticsDto;

  @ApiProperty({ type: [WidgetDataDto] })
  widgetsData: WidgetDataDto[];

  @ApiProperty({ type: MetricsResponseDto })
  metrics: MetricsResponseDto;

  @ApiProperty({ type: [InsightResponseDto] })
  insights: InsightResponseDto[];

  @ApiProperty()
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    timestamp: Date;
    isRead: boolean;
  }>;

  @ApiProperty()
  activities: Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: Date;
    metadata?: any;
  }>;

  @ApiProperty()
  quickStats: Array<{
    label: string;
    value: number | string;
    change: number;
    changeType: 'increase' | 'decrease' | 'stable';
    icon: string;
    color: string;
  }>;

  @ApiProperty()
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: Date;
    type: string;
    priority: string;
  }>;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  refreshInterval: number;
}