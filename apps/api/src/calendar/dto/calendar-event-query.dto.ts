import { IsOptional, IsDateString, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType, CalendarEventStatus, CalendarEventPriority } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CalendarEventQueryDto {
  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CalendarEventType, isArray: true, description: 'Event types to filter by' })
  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  types?: CalendarEventType[];

  @ApiPropertyOptional({ enum: CalendarEventStatus, isArray: true, description: 'Event statuses to filter by' })
  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  statuses?: CalendarEventStatus[];

  @ApiPropertyOptional({ enum: CalendarEventPriority, isArray: true, description: 'Event priorities to filter by' })
  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  priorities?: CalendarEventPriority[];

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by loan ID' })
  @IsOptional()
  @IsString()
  loanId?: string;

  @ApiPropertyOptional({ description: 'Filter by withdrawal ID' })
  @IsOptional()
  @IsString()
  withdrawalId?: string;

  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Include only public events' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Include only system generated events' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSystemGenerated?: boolean;

  @ApiPropertyOptional({ description: 'Include only recurring events' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Include only Hebrew date events' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isHebrewDate?: boolean;

  @ApiPropertyOptional({ description: 'Search text in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}