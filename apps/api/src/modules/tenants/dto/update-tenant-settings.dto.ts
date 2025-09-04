import { IsString, IsOptional, IsHexColor, IsEmail, IsUrl, IsObject, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class FeaturesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  twoFactorAuth?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  emailNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  smsNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  advancedReporting?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  customFields?: boolean;
}

class LimitsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxLoans?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maxStorage?: string;
}

class LoanCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  maxAmount: number;

  @ApiProperty()
  @IsNumber()
  maxDuration: number;
}

export class UpdateTenantSettingsDto {
  // Branding
  @ApiProperty({ required: false, description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false, description: 'Favicon URL' })
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiProperty({ required: false, description: 'Primary color in hex format' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiProperty({ required: false, description: 'Secondary color in hex format' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  // Custom content
  @ApiProperty({ required: false, description: 'Homepage title' })
  @IsOptional()
  @IsString()
  homeTitle?: string;

  @ApiProperty({ required: false, description: 'Homepage description' })
  @IsOptional()
  @IsString()
  homeDescription?: string;

  @ApiProperty({ required: false, description: 'Homepage hero image URL' })
  @IsOptional()
  @IsString()
  homeHeroImage?: string;

  @ApiProperty({ required: false, description: 'Custom footer text' })
  @IsOptional()
  @IsString()
  customFooterText?: string;

  // Contact info
  @ApiProperty({ required: false, description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false, description: 'Contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false, description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false, description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  // Social links
  @ApiProperty({ required: false, description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({ required: false, description: 'Facebook URL' })
  @IsOptional()
  @IsUrl()
  facebookUrl?: string;

  @ApiProperty({ required: false, description: 'Twitter URL' })
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiProperty({ required: false, description: 'LinkedIn URL' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  // Features
  @ApiProperty({ required: false, type: FeaturesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  // Limits
  @ApiProperty({ required: false, type: LimitsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LimitsDto)
  limits?: LimitsDto;

  // Custom settings
  @ApiProperty({ required: false, type: [LoanCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanCategoryDto)
  loanCategories?: LoanCategoryDto[];
}