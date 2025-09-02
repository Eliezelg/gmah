import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignGuaranteeDto {
  @ApiProperty({ description: 'Digital signature hash' })
  @IsString()
  @IsNotEmpty()
  signatureHash: string;

  @ApiProperty({ description: 'IP address from which the signature was made' })
  @IsString()
  @IsNotEmpty()
  signatureIp: string;
}