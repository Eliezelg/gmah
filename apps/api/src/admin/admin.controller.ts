import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@Query('range') range: string = 'month') {
    return this.adminService.getDashboardStats(range);
  }

  @Get('dashboard/activities')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get recent activities' })
  async getRecentActivities(@Query('limit') limit: number = 10) {
    return this.adminService.getRecentActivities(limit);
  }

  @Get('metrics/loans')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get loan metrics' })
  async getLoanMetrics() {
    return this.adminService.getLoanMetrics();
  }

  @Get('metrics/users')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user metrics' })
  async getUserMetrics() {
    return this.adminService.getUserMetrics();
  }

  @Get('metrics/treasury')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get treasury metrics' })
  async getTreasuryMetrics() {
    return this.adminService.getTreasuryMetrics();
  }

  @Get('metrics/performance')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics() {
    return this.adminService.getPerformanceMetrics();
  }
}