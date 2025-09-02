import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import {
  ProcessDisbursementDto,
  RecordPaymentDto,
  GenerateReportDto,
  PaymentFilterDto,
} from './dto/treasury.dto';

@ApiTags('Treasury')
@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('dashboard')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get treasurer dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboard(@CurrentUser() user: User) {
    return this.treasuryService.getDashboardStats(user.id);
  }

  @Get('disbursements/pending')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all pending disbursements' })
  @ApiResponse({ status: 200, description: 'Pending disbursements retrieved successfully' })
  async getPendingDisbursements() {
    return this.treasuryService.getPendingDisbursements();
  }

  @Post('disbursements/:loanId/process')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process loan disbursement' })
  @ApiResponse({ status: 200, description: 'Disbursement processed successfully' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  @ApiResponse({ status: 400, description: 'Invalid disbursement request' })
  async processDisbursement(
    @Param('loanId') loanId: string,
    @Body() dto: ProcessDisbursementDto,
    @CurrentUser() user: User,
  ) {
    return this.treasuryService.processDisbursement(loanId, dto, user.id);
  }

  @Get('payments')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get payment tracking data' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getPayments(@Query() filters: PaymentFilterDto) {
    return this.treasuryService.getPayments(filters);
  }

  @Post('payments/record')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 404, description: 'Repayment schedule not found' })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.treasuryService.recordPayment(dto, user.id);
  }

  @Post('reports/generate')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate financial report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid report parameters' })
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.treasuryService.generateReport(dto);
  }

  @Get('reports/overview')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get financial overview report' })
  @ApiResponse({ status: 200, description: 'Overview report retrieved successfully' })
  async getOverviewReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.treasuryService.generateReport({
      type: 'overview',
      startDate: start,
      endDate: end,
      format: 'json',
    });
  }

  @Get('reports/cash-flow')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get cash flow report' })
  @ApiResponse({ status: 200, description: 'Cash flow report retrieved successfully' })
  async getCashFlowReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.treasuryService.generateReport({
      type: 'cashflow',
      startDate: start,
      endDate: end,
      format: 'json',
    });
  }

  @Get('reports/loans')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get loans report' })
  @ApiResponse({ status: 200, description: 'Loans report retrieved successfully' })
  async getLoansReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.treasuryService.generateReport({
      type: 'loans',
      startDate: start,
      endDate: end,
      format: 'json',
    });
  }

  @Get('reports/repayments')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get repayments report' })
  @ApiResponse({ status: 200, description: 'Repayments report retrieved successfully' })
  async getRepaymentsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.treasuryService.generateReport({
      type: 'repayments',
      startDate: start,
      endDate: end,
      format: 'json',
    });
  }

  @Get('reports/defaults')
  @Roles(Role.TREASURER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get loan defaults report' })
  @ApiResponse({ status: 200, description: 'Defaults report retrieved successfully' })
  async getDefaultsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.treasuryService.generateReport({
      type: 'defaults',
      startDate: start,
      endDate: end,
      format: 'json',
    });
  }
}