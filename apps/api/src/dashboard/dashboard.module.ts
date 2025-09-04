import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { WidgetService } from './services/widget.service';
import { MetricsService } from './services/metrics.service';
import { InsightsService } from './services/insights.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoansModule } from '../loans/loans.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { UsersModule } from '../users/users.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { CalendarModule } from '../calendar/calendar.module';
import { TreasuryForecastModule } from '../treasury-forecast/treasury-forecast.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    CacheModule.register({
      ttl: 60, // 60 seconds cache
      max: 100, // maximum number of items in cache
    }),
    LoansModule,
    TreasuryModule,
    UsersModule,
    WithdrawalsModule,
    CalendarModule,
    TreasuryForecastModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, WidgetService, MetricsService, InsightsService],
  exports: [DashboardService, WidgetService, MetricsService],
})
export class DashboardModule {}