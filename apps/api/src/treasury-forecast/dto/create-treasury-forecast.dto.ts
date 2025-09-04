import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsDecimal, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForecastScenario } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateTreasuryForecastDto {
  @ApiProperty({
    description: 'Date for which the forecast is generated',
    example: '2024-09-04T18:43:25.000Z',
  })
  @IsNotEmpty()
  forecastDate: Date;

  @ApiProperty({
    description: 'Forecast period in days (30, 60, or 90)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsNumber()
  @Min(1)
  @Max(365)
  periodDays: number;

  @ApiPropertyOptional({
    description: 'Forecast scenario type',
    enum: ForecastScenario,
    example: ForecastScenario.REALISTIC,
  })
  @IsOptional()
  @IsEnum(ForecastScenario)
  scenario?: ForecastScenario;

  @ApiProperty({
    description: 'Current treasury balance',
    example: '50000.00',
  })
  @IsNotEmpty()
  currentBalance: Decimal;

  @ApiPropertyOptional({
    description: 'Additional metadata for the forecast',
  })
  @IsOptional()
  metadata?: any;
}