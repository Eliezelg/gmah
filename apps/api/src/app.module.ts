import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
