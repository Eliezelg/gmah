import { ApiProperty } from '@nestjs/swagger';

export class MetricDataPointDto {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  value: number;

  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty({ required: false })
  metadata?: any;
}

export class MetricSeriesDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  type: 'line' | 'bar' | 'area' | 'scatter' | 'pie' | 'donut';

  @ApiProperty({ type: [MetricDataPointDto] })
  data: MetricDataPointDto[];

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  unit?: string;
}

export class MetricDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  value: number | string;

  @ApiProperty({ required: false })
  previousValue?: number | string;

  @ApiProperty({ required: false })
  change?: number;

  @ApiProperty({ required: false })
  changePercent?: number;

  @ApiProperty({ required: false })
  trend?: 'up' | 'down' | 'stable';

  @ApiProperty({ required: false })
  target?: number;

  @ApiProperty({ required: false })
  targetProgress?: number;

  @ApiProperty({ type: [MetricSeriesDto], required: false })
  series?: MetricSeriesDto[];

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  format?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  updatedAt: Date;
}

export class MetricsCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  icon: string;

  @ApiProperty({ type: [MetricDto] })
  metrics: MetricDto[];

  @ApiProperty({ required: false })
  summary?: {
    total: number;
    improved: number;
    declined: number;
    stable: number;
  };
}

export class MetricsResponseDto {
  @ApiProperty({ type: [MetricsCategoryDto] })
  categories: MetricsCategoryDto[];

  @ApiProperty()
  summary: {
    totalMetrics: number;
    lastUpdated: Date;
    nextUpdate: Date;
    dataQuality: number; // 0-100
  };

  @ApiProperty()
  period: {
    start: Date;
    end: Date;
    label: string;
  };

  @ApiProperty({ required: false })
  alerts?: Array<{
    metric: string;
    type: 'threshold' | 'anomaly' | 'trend';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;

  @ApiProperty({ required: false })
  recommendations?: Array<{
    metric: string;
    action: string;
    impact: string;
    priority: number;
  }>;
}