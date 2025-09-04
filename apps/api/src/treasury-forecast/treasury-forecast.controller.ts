import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TreasuryForecastService } from './treasury-forecast.service';
import {
  CreateTreasuryForecastDto,
  ForecastQueryDto,
  TreasuryForecastResponseDto,
  ForecastSummaryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Treasury Forecast')
@ApiBearerAuth()
@Controller('treasury/forecast')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TreasuryForecastController {
  private readonly logger = new Logger(TreasuryForecastController.name);

  constructor(private readonly treasuryForecastService: TreasuryForecastService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  @ApiOperation({ 
    summary: 'Generate treasury forecast',
    description: 'Generate a new treasury forecast for specified period and scenario'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Forecast generated successfully',
    type: TreasuryForecastResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async generateForecast(
    @Body() createForecastDto: CreateTreasuryForecastDto,
  ): Promise<TreasuryForecastResponseDto> {
    this.logger.log(`Generating forecast for ${createForecastDto.periodDays} days`);
    
    return await this.treasuryForecastService.generateForecast(createForecastDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER, Role.SECRETARY, Role.COMMITTEE_MEMBER)
  @ApiOperation({ 
    summary: 'Get treasury forecast',
    description: 'Retrieve existing treasury forecast based on query parameters'
  })
  @ApiQuery({ name: 'days', required: false, description: 'Forecast period in days' })
  @ApiQuery({ name: 'scenario', required: false, description: 'Forecast scenario' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for forecast' })
  @ApiQuery({ name: 'includeInactiveAlerts', required: false, description: 'Include inactive alerts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Forecast retrieved successfully',
    type: TreasuryForecastResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No forecast found matching criteria',
  })
  async getForecast(
    @Query() query: ForecastQueryDto,
  ): Promise<TreasuryForecastResponseDto | null> {
    return await this.treasuryForecastService.getForecast(query);
  }

  @Get('quick/:days')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  @ApiOperation({ 
    summary: 'Generate quick forecast',
    description: 'Generate a quick forecast for specified number of days using current balance'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quick forecast generated',
    type: TreasuryForecastResponseDto,
  })
  async generateQuickForecast(
    @Query('days') days: string,
  ): Promise<TreasuryForecastResponseDto> {
    const periodDays = parseInt(days) || 30;
    
    // Get current treasury balance (simplified - in real app, get from treasury service)
    const currentBalance = new Decimal('50000.00'); // This should come from treasury service
    
    const createForecastDto: CreateTreasuryForecastDto = {
      forecastDate: new Date(),
      periodDays,
      currentBalance,
    };

    return await this.treasuryForecastService.generateForecast(createForecastDto);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER, Role.SECRETARY, Role.COMMITTEE_MEMBER)
  @ApiOperation({ 
    summary: 'Get forecast summary',
    description: 'Get summary statistics of all treasury forecasts'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary retrieved successfully',
    type: ForecastSummaryDto,
  })
  async getForecastSummary(): Promise<ForecastSummaryDto> {
    return await this.treasuryForecastService.getForecastSummary();
  }

  @Post('scenarios/compare')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  @ApiOperation({ 
    summary: 'Compare forecast scenarios',
    description: 'Generate and compare optimistic, realistic, and pessimistic scenarios'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scenario comparison generated',
    type: [TreasuryForecastResponseDto],
  })
  async compareScenarios(
    @Body() baseForecastDto: Pick<CreateTreasuryForecastDto, 'forecastDate' | 'periodDays' | 'currentBalance'>,
  ): Promise<TreasuryForecastResponseDto[]> {
    this.logger.log(`Generating scenario comparison for ${baseForecastDto.periodDays} days`);
    
    const scenarios = ['OPTIMISTIC', 'REALISTIC', 'PESSIMISTIC'] as const;
    
    const forecasts = await Promise.all(
      scenarios.map(async (scenario) => {
        const dto: CreateTreasuryForecastDto = {
          ...baseForecastDto,
          scenario: scenario as any,
        };
        return await this.treasuryForecastService.generateForecast(dto);
      })
    );

    return forecasts;
  }

  @Post('alerts/:alertId/acknowledge')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TREASURER)
  @ApiOperation({ 
    summary: 'Acknowledge forecast alert',
    description: 'Mark a forecast alert as acknowledged'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert acknowledged successfully',
  })
  async acknowledgeAlert(
    @Query('alertId') alertId: string,
  ): Promise<{ success: boolean }> {
    // This would be implemented to update the alert status
    // For now, return success
    this.logger.log(`Alert ${alertId} acknowledged`);
    return { success: true };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Check the health of the treasury forecast service'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}