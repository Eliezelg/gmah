import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsArray, IsUrl, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType, CalendarEventPriority } from '@prisma/client';

export class CreateCalendarEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CalendarEventType, description: 'Event type' })
  @IsEnum(CalendarEventType)
  type: CalendarEventType;

  @ApiProperty({ description: 'Event start date and time' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Event end date and time' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'All day event flag', default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Timezone', default: 'Asia/Jerusalem' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ enum: CalendarEventPriority, description: 'Event priority', default: CalendarEventPriority.NORMAL })
  @IsOptional()
  @IsEnum(CalendarEventPriority)
  priority?: CalendarEventPriority;

  @ApiPropertyOptional({ description: 'Is recurring event', default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'RRULE string for recurring events' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Is Hebrew date', default: false })
  @IsOptional()
  @IsBoolean()
  isHebrewDate?: boolean;

  @ApiPropertyOptional({ description: 'Hebrew date representation' })
  @IsOptional()
  @IsString()
  hebrewDate?: string;

  @ApiPropertyOptional({ description: 'Hebrew year' })
  @IsOptional()
  hebrewYear?: number;

  @ApiPropertyOptional({ description: 'Hebrew month name' })
  @IsOptional()
  @IsString()
  hebrewMonth?: string;

  @ApiPropertyOptional({ description: 'Hebrew day' })
  @IsOptional()
  hebrewDay?: number;

  @ApiPropertyOptional({ description: 'Related loan ID' })
  @IsOptional()
  @IsString()
  loanId?: string;

  @ApiPropertyOptional({ description: 'Related withdrawal ID' })
  @IsOptional()
  @IsString()
  withdrawalId?: string;

  @ApiPropertyOptional({ description: 'Related campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Has reminders', default: false })
  @IsOptional()
  @IsBoolean()
  hasReminders?: boolean;

  @ApiPropertyOptional({ description: 'Reminder times in minutes before event', isArray: true, type: Number })
  @IsOptional()
  @IsArray()
  reminderMinutes?: number[];

  @ApiPropertyOptional({ description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Virtual meeting URL' })
  @IsOptional()
  @IsUrl()
  locationUrl?: string;

  @ApiPropertyOptional({ description: 'Event attendees', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  attendees?: string[];

  @ApiPropertyOptional({ description: 'Event color', default: '#3b82f6' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Background color' })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Text color' })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @ApiPropertyOptional({ description: 'Is public event', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Source type for system generated events' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}