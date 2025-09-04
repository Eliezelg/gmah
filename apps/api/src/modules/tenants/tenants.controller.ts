import { Controller, Get, Put, Post, Body, Param, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Multer configuration for file uploads
const storage = diskStorage({
  destination: './uploads/tenants',
  filename: (req, file, callback) => {
    const tenantId = req.params.tenant;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, `${tenantId}-${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':tenant/settings')
  @Public()
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantSettings(@Param('tenant') tenant: string) {
    return this.tenantsService.getTenantSettings(tenant);
  }

  @Put(':tenant/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateTenantSettings(
    @Param('tenant') tenant: string,
    @Body() updateDto: UpdateTenantSettingsDto,
    @Req() req: Request
  ) {
    // Verify that the admin belongs to this tenant
    if (req.tenantId !== tenant && (req.user as any)?.role !== Role.SUPER_ADMIN) {
      throw new Error('Unauthorized to update this tenant');
    }
    return this.tenantsService.updateTenantSettings(tenant, updateDto);
  }

  @Post(':tenant/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('logo', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tenant logo' })
  async uploadLogo(
    @Param('tenant') tenant: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    // Verify authorization
    if (req.tenantId !== tenant && (req.user as any)?.role !== Role.SUPER_ADMIN) {
      throw new Error('Unauthorized to update this tenant');
    }
    
    const logoUrl = `/uploads/tenants/${file.filename}`;
    await this.tenantsService.updateTenantSettings(tenant, { logo: logoUrl });
    
    return { logoUrl };
  }

  @Post(':tenant/favicon')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('favicon', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tenant favicon' })
  async uploadFavicon(
    @Param('tenant') tenant: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    // Verify authorization
    if (req.tenantId !== tenant && (req.user as any)?.role !== Role.SUPER_ADMIN) {
      throw new Error('Unauthorized to update this tenant');
    }
    
    const faviconUrl = `/uploads/tenants/${file.filename}`;
    await this.tenantsService.updateTenantSettings(tenant, { favicon: faviconUrl });
    
    return { faviconUrl };
  }

  @Post(':tenant/hero-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('heroImage', { storage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tenant hero image' })
  async uploadHeroImage(
    @Param('tenant') tenant: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    // Verify authorization
    if (req.tenantId !== tenant && (req.user as any)?.role !== Role.SUPER_ADMIN) {
      throw new Error('Unauthorized to update this tenant');
    }
    
    const heroImageUrl = `/uploads/tenants/${file.filename}`;
    await this.tenantsService.updateTenantSettings(tenant, { homeHeroImage: heroImageUrl });
    
    return { heroImageUrl };
  }

  @Get(':tenant/statistics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get tenant statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getTenantStatistics(@Param('tenant') tenant: string, @Req() req: Request) {
    // Verify that the user belongs to this tenant
    if (req.tenantId !== tenant && (req.user as any)?.role !== Role.SUPER_ADMIN) {
      throw new Error('Unauthorized to view this tenant statistics');
    }
    return this.tenantsService.getTenantStatistics(tenant);
  }

  @Get(':tenant/customization')
  @Public()
  @ApiOperation({ summary: 'Get tenant customization options' })
  @ApiResponse({ status: 200, description: 'Customization options retrieved' })
  async getTenantCustomization(@Param('tenant') tenant: string) {
    return this.tenantsService.getTenantCustomization(tenant);
  }
}