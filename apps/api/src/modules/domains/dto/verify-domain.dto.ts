import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DomainVerificationMethod {
  DNS_TXT = 'DNS_TXT',
  DNS_CNAME = 'DNS_CNAME',
  FILE_UPLOAD = 'FILE_UPLOAD',
  META_TAG = 'META_TAG'
}

export class VerifyDomainDto {
  @ApiProperty({ 
    description: 'Verification method to use',
    enum: DomainVerificationMethod,
    required: false
  })
  @IsOptional()
  @IsEnum(DomainVerificationMethod)
  method?: DomainVerificationMethod;
}