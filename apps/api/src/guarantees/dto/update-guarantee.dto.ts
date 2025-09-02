import { PartialType } from '@nestjs/swagger';
import { CreateGuaranteeDto } from './create-guarantee.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuaranteeStatus } from '@prisma/client';

export class UpdateGuaranteeDto extends PartialType(CreateGuaranteeDto) {
  @ApiPropertyOptional({ enum: GuaranteeStatus })
  @IsEnum(GuaranteeStatus)
  @IsOptional()
  status?: GuaranteeStatus;
}