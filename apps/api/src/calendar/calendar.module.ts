import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService, HebrewCalendarService } from './services';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService, HebrewCalendarService],
  exports: [CalendarService, HebrewCalendarService],
})
export class CalendarModule {}