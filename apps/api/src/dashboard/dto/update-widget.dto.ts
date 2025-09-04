import { PartialType } from '@nestjs/swagger';
import { CreateWidgetDto } from './create-widget.dto';
import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWidgetDto extends PartialType(CreateWidgetDto) {
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}