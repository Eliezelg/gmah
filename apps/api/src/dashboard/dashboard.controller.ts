import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './services/dashboard.service';
import { WidgetService } from './services/widget.service';
import { MetricsService } from './services/metrics.service';
import { InsightsService } from './services/insights.service';
import {
  DashboardConfigDto,
  WidgetConfigDto,
  DashboardResponseDto,
  MetricsResponseDto,
  InsightResponseDto,
  UpdateDashboardLayoutDto,
  CreateWidgetDto,
  UpdateWidgetDto,
} from './dto';
import { Role } from '@prisma/client';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly widgetService: WidgetService,
    private readonly metricsService: MetricsService,
    private readonly insightsService: InsightsService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get dashboard configuration for current user' })
  @ApiResponse({ status: 200, type: DashboardConfigDto })
  async getDashboardConfig(@Req() req: any): Promise<DashboardConfigDto> {
    return this.dashboardService.getUserDashboardConfig(req.user.id);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update dashboard configuration' })
  @ApiResponse({ status: 200, type: DashboardConfigDto })
  async updateDashboardConfig(
    @Req() req: any,
    @Body() updateDto: UpdateDashboardLayoutDto,
  ): Promise<DashboardConfigDto> {
    return this.dashboardService.updateDashboardLayout(req.user.id, updateDto);
  }

  @Get('data')
  @ApiOperation({ summary: 'Get complete dashboard data' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  async getDashboardData(
    @Req() req: any,
    @Query('period') period?: string,
    @Query('refresh') refresh?: boolean,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboardData(req.user.id, req.user.role, {
      period: period || '30d',
      refresh: refresh === true,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, type: MetricsResponseDto })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER)
  async getMetrics(
    @Query('category') category?: string,
    @Query('period') period?: string,
  ): Promise<MetricsResponseDto> {
    return this.metricsService.getMetrics({
      category,
      period: period || '30d',
    });
  }

  @Get('metrics/live')
  @ApiOperation({ summary: 'Get live streaming metrics' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getLiveMetrics(@Req() req: any) {
    return this.metricsService.streamLiveMetrics(req.user.id);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-powered insights' })
  @ApiResponse({ status: 200, type: InsightResponseDto, isArray: true })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TREASURER)
  async getInsights(
    @Query('type') type?: string,
    @Query('priority') priority?: string,
  ): Promise<InsightResponseDto[]> {
    return this.insightsService.generateInsights({
      type,
      priority,
    });
  }

  @Get('insights/:id/actions')
  @ApiOperation({ summary: 'Get suggested actions for an insight' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getInsightActions(@Param('id') id: string) {
    return this.insightsService.getSuggestedActions(id);
  }

  @Post('insights/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss an insight' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async dismissInsight(@Param('id') id: string, @Req() req: any) {
    return this.insightsService.dismissInsight(id, req.user.id);
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get available widgets for user role' })
  async getAvailableWidgets(@Req() req: any) {
    return this.widgetService.getAvailableWidgets(req.user.role);
  }

  @Post('widgets')
  @ApiOperation({ summary: 'Add a new widget to dashboard' })
  @ApiResponse({ status: 201, type: WidgetConfigDto })
  async addWidget(
    @Req() req: any,
    @Body() createDto: CreateWidgetDto,
  ): Promise<WidgetConfigDto> {
    return this.widgetService.addWidget(req.user.id, createDto);
  }

  @Put('widgets/:id')
  @ApiOperation({ summary: 'Update widget configuration' })
  @ApiResponse({ status: 200, type: WidgetConfigDto })
  async updateWidget(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: UpdateWidgetDto,
  ): Promise<WidgetConfigDto> {
    return this.widgetService.updateWidget(id, req.user.id, updateDto);
  }

  @Delete('widgets/:id')
  @ApiOperation({ summary: 'Remove widget from dashboard' })
  async removeWidget(@Param('id') id: string, @Req() req: any) {
    return this.widgetService.removeWidget(id, req.user.id);
  }

  @Get('widgets/:id/data')
  @ApiOperation({ summary: 'Get widget data' })
  async getWidgetData(
    @Param('id') id: string,
    @Query('period') period?: string,
    @Query('filters') filters?: string,
  ) {
    return this.widgetService.getWidgetData(id, {
      period: period || '30d',
      filters: filters ? JSON.parse(filters) : {},
    });
  }

  @Post('widgets/:id/refresh')
  @ApiOperation({ summary: 'Force refresh widget data' })
  async refreshWidget(@Param('id') id: string) {
    return this.widgetService.refreshWidgetData(id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get dashboard templates' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getDashboardTemplates() {
    return this.dashboardService.getTemplates();
  }

  @Post('templates/:templateId/apply')
  @ApiOperation({ summary: 'Apply a dashboard template' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async applyTemplate(
    @Param('templateId') templateId: string,
    @Req() req: any,
  ) {
    return this.dashboardService.applyTemplate(req.user.id, templateId);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export dashboard configuration' })
  async exportDashboard(@Req() req: any) {
    return this.dashboardService.exportConfiguration(req.user.id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import dashboard configuration' })
  async importDashboard(
    @Req() req: any,
    @Body() config: DashboardConfigDto,
  ) {
    return this.dashboardService.importConfiguration(req.user.id, config);
  }

  @Get('quick-actions')
  @ApiOperation({ summary: 'Get quick actions for dashboard' })
  async getQuickActions(@Req() req: any) {
    return this.dashboardService.getQuickActions(req.user.role);
  }

  @Post('quick-actions/:actionId/execute')
  @ApiOperation({ summary: 'Execute a quick action' })
  async executeQuickAction(
    @Param('actionId') actionId: string,
    @Req() req: any,
    @Body() params?: any,
  ) {
    return this.dashboardService.executeQuickAction(actionId, req.user.id, params);
  }
}