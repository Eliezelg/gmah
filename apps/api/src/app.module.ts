import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LoansModule } from './loans/loans.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DocumentsModule } from './documents/documents.module';
import { GuaranteesModule } from './guarantees/guarantees.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TreasuryModule } from './treasury/treasury.module';
import { EmailModule } from './email/email.module';
import { RedisCacheModule } from './cache/cache.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { DomainsModule } from './modules/domains/domains.module';
import { TreasuryForecastModule } from './treasury-forecast/treasury-forecast.module';
// import { ImportModule } from './import/import.module'; // TODO: Enable when import models are added to Prisma schema
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { DepositsModule } from './deposits/deposits.module';
import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    RedisCacheModule,
    AuthModule,
    UsersModule,
    LoansModule,
    DocumentsModule,
    GuaranteesModule,
    NotificationsModule,
    TreasuryModule,
    EmailModule,
    ReportsModule,
    AuditModule,
    OrganizationsModule,
    TenantsModule,
    DomainsModule,
    TreasuryForecastModule,
    // ImportModule, // TODO: Enable when import models are added to Prisma schema
    WithdrawalsModule,
    DepositsModule,
    CalendarModule,
    DashboardModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
