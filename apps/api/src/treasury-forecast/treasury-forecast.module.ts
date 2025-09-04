import { Module } from '@nestjs/common';
import { TreasuryForecastService } from './treasury-forecast.service';
import { TreasuryForecastController } from './treasury-forecast.controller';
import { TreasuryAlertsService } from './alerts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  controllers: [TreasuryForecastController],
  providers: [TreasuryForecastService, TreasuryAlertsService],
  exports: [TreasuryForecastService, TreasuryAlertsService],
})
export class TreasuryForecastModule {}