import { IsString, IsEnum, IsObject, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WidgetType, WidgetSize } from './widget-config.dto';

export class CreateWidgetDto {
  @ApiProperty()
  @IsEnum(WidgetType)
  type: WidgetType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty()
  @IsEnum(WidgetSize)
  size: WidgetSize;

  @ApiProperty()
  @IsString()
  dataSource: string;

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  refreshInterval?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  autoRefresh?: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customComponent?: string;
}