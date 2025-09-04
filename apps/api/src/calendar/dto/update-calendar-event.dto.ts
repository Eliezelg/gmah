import { PartialType } from '@nestjs/swagger';
import { CreateCalendarEventDto } from './create-calendar-event.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventStatus } from '@prisma/client';

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {
  @ApiPropertyOptional({ enum: CalendarEventStatus, description: 'Event status' })
  @IsOptional()
  @IsEnum(CalendarEventStatus)
  status?: CalendarEventStatus;
}