import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService, ReportFormat, ReportOptions } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('loans')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  async generateLoansReport(
    @Res() res: Response,
    @Query('format') format: ReportFormat = ReportFormat.EXCEL,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeDetails') includeDetails?: boolean,
  ) {
    const options: ReportOptions = {
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeDetails,
    };

    return this.reportsService.generateLoansReport(options, res);
  }

  @Get('payments')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  async generatePaymentsReport(
    @Res() res: Response,
    @Query('format') format: ReportFormat = ReportFormat.EXCEL,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options: ReportOptions = {
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.reportsService.generatePaymentsReport(options, res);
  }

  @Get('defaulters')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  async generateDefaultersReport(@Res() res: Response) {
    return this.reportsService.generateDefaultersReport(res);
  }

  @Get('financial-summary')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  async generateFinancialSummary(
    @Res() res: Response,
    @Query('year') year: string,
    @Query('month') month?: string,
    @Query('export') exportFile?: boolean,
  ) {
    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : undefined;

    if (exportFile) {
      return this.reportsService.generateFinancialSummary(yearNum, monthNum, res);
    }

    const summary = await this.reportsService.generateFinancialSummary(yearNum, monthNum);
    return res.json(summary);
  }

  @Post('custom')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async generateCustomReport(
    @Res() res: Response,
    @Query('format') format: ReportFormat = ReportFormat.EXCEL,
  ) {
    // This endpoint can be extended for custom report generation
    // based on specific business requirements
    res.json({ message: 'Custom report generation endpoint' });
  }
}