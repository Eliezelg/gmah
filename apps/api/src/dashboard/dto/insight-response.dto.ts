import { ApiProperty } from '@nestjs/swagger';

export enum InsightType {
  TREND = 'TREND',
  ANOMALY = 'ANOMALY',
  PREDICTION = 'PREDICTION',
  RECOMMENDATION = 'RECOMMENDATION',
  WARNING = 'WARNING',
  OPPORTUNITY = 'OPPORTUNITY',
  RISK = 'RISK',
}

export enum InsightPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum InsightStatus {
  NEW = 'NEW',
  VIEWED = 'VIEWED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export class InsightActionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  type: 'primary' | 'secondary' | 'danger';

  @ApiProperty()
  action: string;

  @ApiProperty({ required: false })
  params?: any;

  @ApiProperty({ required: false })
  confirmation?: {
    required: boolean;
    title: string;
    message: string;
  };
}

export class InsightDataDto {
  @ApiProperty()
  metric: string;

  @ApiProperty()
  value: number | string;

  @ApiProperty({ required: false })
  previousValue?: number | string;

  @ApiProperty({ required: false })
  change?: number;

  @ApiProperty({ required: false })
  changePercent?: number;

  @ApiProperty({ required: false })
  threshold?: number;

  @ApiProperty({ required: false })
  chart?: {
    type: string;
    data: any[];
  };
}

export class InsightResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: InsightType })
  type: InsightType;

  @ApiProperty({ enum: InsightPriority })
  priority: InsightPriority;

  @ApiProperty({ enum: InsightStatus })
  status: InsightStatus;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  details?: string;

  @ApiProperty({ type: InsightDataDto })
  data: InsightDataDto;

  @ApiProperty({ type: [InsightActionDto], required: false })
  actions?: InsightActionDto[];

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  affectedEntities?: Array<{
    type: string;
    id: string;
    name: string;
  }>;

  @ApiProperty()
  impact: {
    score: number; // 0-100
    description: string;
    affectedMetrics: string[];
  };

  @ApiProperty()
  confidence: number; // 0-100

  @ApiProperty({ required: false })
  source?: {
    type: string;
    algorithm?: string;
    dataPoints?: number;
  };

  @ApiProperty({ required: false })
  relatedInsights?: string[];

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty({ required: false })
  viewedAt?: Date;

  @ApiProperty({ required: false })
  viewedBy?: string;

  @ApiProperty({ required: false })
  dismissedAt?: Date;

  @ApiProperty({ required: false })
  dismissedBy?: string;

  @ApiProperty({ required: false })
  resolvedAt?: Date;

  @ApiProperty({ required: false })
  resolvedBy?: string;

  @ApiProperty({ required: false })
  metadata?: any;
}