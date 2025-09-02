import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { AuditService, AuditAction, AuditSeverity } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.AUDITOR)
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityId') entityId?: string,
    @Query('entityType') entityType?: string,
    @Query('severity') severity?: AuditSeverity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getAuditLogs({
      userId,
      action,
      entityId,
      entityType,
      severity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.AUDITOR)
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ) {
    return this.auditService.getUserActivity(
      userId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('my-activity')
  async getMyActivity(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.auditService.getUserActivity(
      user.id,
      days ? parseInt(days) : 30,
    );
  }

  @Get('security-events')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.AUDITOR)
  async getSecurityEvents(@Query('days') days?: string) {
    return this.auditService.getSecurityEvents(
      days ? parseInt(days) : 7,
    );
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.AUDITOR)
  async getAuditStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    return this.auditService.getAuditStatistics(start, end);
  }

  @Post('clean')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async cleanOldLogs(@Body() body: { retentionDays?: number }) {
    const count = await this.auditService.cleanOldLogs(body.retentionDays);
    return { message: `Cleaned ${count} old audit logs` };
  }

  @Post('log-custom')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async logCustomEvent(
    @CurrentUser() user: any,
    @Body() body: {
      action: string;
      details?: any;
      severity?: AuditSeverity;
    },
  ) {
    await this.auditService.log({
      action: body.action as AuditAction,
      userId: user.id,
      oldValues: body.details,
      severity: body.severity || AuditSeverity.INFO,
    });

    return { message: 'Custom event logged successfully' };
  }
}