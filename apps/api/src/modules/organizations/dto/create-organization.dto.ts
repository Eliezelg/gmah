import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ 
    description: 'Organization name',
    example: 'GMAH Paris' 
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  organizationName: string;

  @ApiProperty({ 
    description: 'Unique slug for the organization',
    example: 'paris' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message: 'Slug must start with a letter, contain only lowercase letters, numbers and hyphens, and not end with a hyphen'
  })
  slug: string;

  @ApiProperty({ 
    description: 'Admin full name',
    example: 'Jean Dupont' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  adminName: string;

  @ApiProperty({ 
    description: 'Admin email address',
    example: 'admin@organization.org' 
  })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ 
    description: 'Phone number',
    example: '+33123456789',
    required: false 
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ 
    description: 'Organization address',
    example: '123 Rue de la Paix' 
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @ApiProperty({ 
    description: 'City',
    example: 'Paris' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ 
    description: 'Postal code',
    example: '75001' 
  })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ 
    description: 'Country',
    example: 'France' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;


  @ApiProperty({ 
    description: 'Expected number of users',
    example: '50-100',
    required: false 
  })
  @IsOptional()
  @IsString()
  expectedUsers?: string;

  @ApiProperty({ 
    description: 'Organization description',
    example: 'Community loan management organization',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ 
    description: 'Accept terms and conditions',
    example: true 
  })
  @IsBoolean()
  acceptTerms: boolean;

  @ApiProperty({ 
    description: 'Accept data processing',
    example: true 
  })
  @IsBoolean()
  acceptDataProcessing: boolean;
}