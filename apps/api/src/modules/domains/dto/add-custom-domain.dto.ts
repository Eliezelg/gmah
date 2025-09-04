import { IsString, IsBoolean, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DomainVerificationMethod {
  DNS_TXT = 'DNS_TXT',
  DNS_CNAME = 'DNS_CNAME',
  FILE_UPLOAD = 'FILE_UPLOAD',
  META_TAG = 'META_TAG'
}

export class AddCustomDomainDto {
  @ApiProperty({ 
    description: 'The custom domain to add',
    example: 'gmah-paris.org'
  })
  @IsString()
  @Matches(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
    { message: 'Invalid domain format' }
  )
  domain: string;

  @ApiProperty({ 
    description: 'Verification method to use',
    enum: DomainVerificationMethod,
    default: DomainVerificationMethod.DNS_TXT,
    required: false
  })
  @IsOptional()
  @IsEnum(DomainVerificationMethod)
  verificationMethod?: DomainVerificationMethod;

  @ApiProperty({ 
    description: 'Set as primary domain',
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
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