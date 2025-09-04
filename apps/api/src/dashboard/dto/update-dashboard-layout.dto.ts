import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WidgetLayoutDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsObject()
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export class UpdateDashboardLayoutDto {
  @ApiProperty({ type: [WidgetLayoutDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WidgetLayoutDto)
  widgets?: WidgetLayoutDto[];

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  preferences?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    compactMode?: boolean;
    showNotifications?: boolean;
    defaultPeriod?: string;
  };

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  theme?: 'light' | 'dark' | 'auto';

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  filters?: {
    period?: string;
    organization?: string;
    status?: string;
    [key: string]: any;
  };
}