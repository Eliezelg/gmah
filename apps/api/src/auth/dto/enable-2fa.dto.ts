import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({ description: '6-digit TOTP code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  totpCode: string;
}