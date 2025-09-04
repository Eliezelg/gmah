import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Register a new organization' })
  @ApiResponse({ status: 201, description: 'Organization registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async signup(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.createOrganization(createOrganizationDto);
  }

  @Get('check-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Check if slug is available' })
  @ApiResponse({ status: 200, description: 'Slug availability status' })
  async checkSlug(@Param('slug') slug: string) {
    const isAvailable = await this.organizationsService.checkSlugAvailability(slug);
    return { available: isAvailable };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current organization details' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async getCurrentOrganization(@Req() req: Request) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new Error('No tenant ID found');
    }
    return this.organizationsService.getOrganization(tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all organizations (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async listOrganizations() {
    return this.organizationsService.listOrganizations();
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async getOrganization(@Param('slug') slug: string) {
    return this.organizationsService.getOrganization(slug);
  }
}