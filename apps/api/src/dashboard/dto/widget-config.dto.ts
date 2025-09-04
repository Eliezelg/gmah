import { IsString, IsObject, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WidgetType {
  CHART = 'CHART',
  METRIC = 'METRIC',
  TABLE = 'TABLE',
  LIST = 'LIST',
  CALENDAR = 'CALENDAR',
  MAP = 'MAP',
  TIMELINE = 'TIMELINE',
  GAUGE = 'GAUGE',
  HEATMAP = 'HEATMAP',
  PROGRESS = 'PROGRESS',
  ALERT = 'ALERT',
  QUICK_ACTION = 'QUICK_ACTION',
  CUSTOM = 'CUSTOM',
}

export enum WidgetSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XLARGE = 'XLARGE',
  FULL = 'FULL',
}

export class WidgetPositionDto {
  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiProperty()
  @IsNumber()
  w: number;

  @ApiProperty()
  @IsNumber()
  h: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  minW?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  minH?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  maxW?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  maxH?: number;
}

export class WidgetConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: WidgetType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ type: WidgetPositionDto })
  position: WidgetPositionDto;

  @ApiProperty()
  @IsEnum(WidgetSize)
  size: WidgetSize;

  @ApiProperty()
  @IsString()
  dataSource: string;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  dataConfig?: {
    endpoint?: string;
    query?: any;
    filters?: any;
    aggregation?: string;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
  };

  @ApiProperty()
  @IsObject()
  @IsOptional()
  displayConfig?: {
    chartType?: string;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    showLabels?: boolean;
    animation?: boolean;
    orientation?: 'horizontal' | 'vertical';
    theme?: string;
  };

  @ApiProperty()
  @IsObject()
  @IsOptional()
  interactionConfig?: {
    clickable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    refreshable?: boolean;
    exportable?: boolean;
    fullscreenable?: boolean;
    actions?: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
    }>;
  };

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  refreshInterval?: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  autoRefresh?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isCollapsed?: boolean;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @ApiProperty()
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  customComponent?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}