import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Req,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { DomainsService } from './domains.service';
import { AddCustomDomainDto } from './dto/add-custom-domain.dto';
import { VerifyDomainDto } from './dto/verify-domain.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('domains')
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post('lookup')
  @Public()
  @ApiOperation({ summary: 'Lookup tenant by domain (public endpoint for middleware)' })
  @ApiResponse({ status: 200, description: 'Tenant found for domain' })
  @ApiResponse({ status: 404, description: 'No tenant found for domain' })
  async lookupDomain(@Body('domain') domain: string) {
    const tenantId = await this.domainsService.lookupTenantByDomain(domain);
    return { tenantId };
  }

  @Get('organization/:organizationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all custom domains for an organization' })
  async listOrganizationDomains(
    @Param('organizationId') organizationId: string,
    @Req() req: Request
  ) {
    // Verify authorization
    await this.verifyOrganizationAccess(req, organizationId);
    return this.domainsService.listOrganizationDomains(organizationId);
  }

  @Post('organization/:organizationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a custom domain to an organization' })
  @ApiResponse({ status: 201, description: 'Domain added successfully' })
  @ApiResponse({ status: 409, description: 'Domain already exists' })
  async addCustomDomain(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddCustomDomainDto,
    @Req() req: Request
  ) {
    // Verify authorization
    await this.verifyOrganizationAccess(req, organizationId);
    
    // Check plan limits
    const canAddDomain = await this.domainsService.checkDomainLimit(organizationId);
    if (!canAddDomain) {
      throw new HttpException(
        'Domain limit reached for your plan. Please upgrade to add more domains.',
        HttpStatus.FORBIDDEN
      );
    }

    return this.domainsService.addCustomDomain(organizationId, dto);
  }

  @Get(':domainId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get domain details' })
  async getDomain(@Param('domainId') domainId: string, @Req() req: Request) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return domain;
  }

  @Put(':domainId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Trigger domain verification' })
  async verifyDomain(
    @Param('domainId') domainId: string,
    @Body() dto: VerifyDomainDto,
    @Req() req: Request
  ) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return this.domainsService.verifyDomain(domainId, dto.method);
  }

  @Get(':domainId/verification-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check domain verification status' })
  async checkVerificationStatus(@Param('domainId') domainId: string, @Req() req: Request) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return this.domainsService.checkVerificationStatus(domainId);
  }

  @Put(':domainId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Set domain as primary' })
  async setPrimaryDomain(
    @Param('domainId') domainId: string,
    @Req() req: Request
  ) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return this.domainsService.setPrimaryDomain(domainId);
  }

  @Delete(':domainId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a custom domain' })
  async removeDomain(
    @Param('domainId') domainId: string,
    @Req() req: Request
  ) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return this.domainsService.removeDomain(domainId);
  }

  @Get(':domainId/dns-instructions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get DNS configuration instructions' })
  async getDnsInstructions(@Param('domainId') domainId: string, @Req() req: Request) {
    const domain = await this.domainsService.getDomain(domainId);
    
    // Verify authorization
    await this.verifyOrganizationAccess(req, domain.organizationId);
    
    return this.domainsService.getDnsInstructions(domainId);
  }

  @Post('check-availability')
  @Public()
  @ApiOperation({ summary: 'Check if a domain is available' })
  async checkAvailability(@Body('domain') domain: string) {
    const isAvailable = await this.domainsService.checkDomainAvailability(domain);
    return { available: isAvailable };
  }

  private async verifyOrganizationAccess(req: Request, organizationId: string) {
    // For now, we'll use a simple check
    // In production, this should verify that the user belongs to the organization
    // Check if user has super admin access
    if (req.user && (req.user as any).role !== Role.SUPER_ADMIN) {
      // Additional checks would go here
      // For example: check if user's organization matches organizationId
    }
  }
}