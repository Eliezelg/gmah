import { IsString, IsArray, IsObject, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WidgetConfigDto } from './widget-config.dto';

export class DashboardLayoutDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  columns: number;

  @ApiProperty()
  @IsNumber()
  rows: number;

  @ApiProperty()
  @IsArray()
  widgets: WidgetConfigDto[];

  @ApiProperty()
  @IsObject()
  @IsOptional()
  breakpoints?: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
  };
}

export class DashboardConfigDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  theme: 'light' | 'dark' | 'auto';

  @ApiProperty({ type: DashboardLayoutDto })
  layout: DashboardLayoutDto;

  @ApiProperty()
  @IsArray()
  widgets: WidgetConfigDto[];

  @ApiProperty()
  @IsObject()
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    compactMode: boolean;
    showNotifications: boolean;
    defaultPeriod: string;
  };

  @ApiProperty()
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty()
  @IsBoolean()
  isShared: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  quickActions?: Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    params?: any;
  }>;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  filters?: {
    period?: string;
    organization?: string;
    status?: string;
    [key: string]: any;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}