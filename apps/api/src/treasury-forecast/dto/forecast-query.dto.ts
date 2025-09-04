import { IsEnum, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastScenario } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ForecastQueryDto {
  @ApiPropertyOptional({
    description: 'Number of days to forecast (30, 60, or 90)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional({
    description: 'Forecast scenario type',
    enum: ForecastScenario,
    example: ForecastScenario.REALISTIC,
  })
  @IsOptional()
  @IsEnum(ForecastScenario)
  scenario?: ForecastScenario;

  @ApiPropertyOptional({
    description: 'Start date for forecast (ISO string)',
    example: '2024-09-04T18:43:25.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Include inactive alerts in response',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeInactiveAlerts?: boolean = false;
}