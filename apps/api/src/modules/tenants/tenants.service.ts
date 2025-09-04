import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantsService {
  private masterPrisma: PrismaClient;

  private settingsCache = new Map<string, any>();

  constructor() {
    // Initialize master database connection
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const masterDb = process.env.MASTER_DB || 'gmah_master';
    const masterDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${masterDb}`;
    
    this.masterPrisma = new PrismaClient({
      datasources: {
        db: { url: masterDbUrl }
      }
    });
  }

  async getTenantSettings(tenantSlug: string) {
    // Try to get from cache first
    const cached = this.settingsCache.get(tenantSlug);
    if (cached) {
      return cached;
    }

    try {
      // Get organization from master database
      const org = await this.masterPrisma.$queryRaw`
        SELECT 
          slug, name, domain, settings, limits,
          admin_email, phone_number, address, city, postal_code, country
        FROM organizations 
        WHERE slug = ${tenantSlug} AND status = 'ACTIVE'
        LIMIT 1
      `;

      if (!org || (Array.isArray(org) && org.length === 0)) {
        throw new NotFoundException('Tenant not found');
      }

      const organization = Array.isArray(org) ? org[0] : org;
      
      // Parse settings JSON
      const settings = organization.settings || {};
      const limits = organization.limits || {};

      const tenantSettings = {
        // Basic information
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain,
        
        // Branding
        logo: settings.logo || null,
        favicon: settings.favicon || null,
        primaryColor: settings.primaryColor || '#4F46E5',
        secondaryColor: settings.secondaryColor || '#7C3AED',
        
        // Custom content
        homeTitle: settings.homeTitle || `Bienvenue chez ${organization.name}`,
        homeDescription: settings.homeDescription || 'Plateforme de gestion de prêts communautaires',
        homeHeroImage: settings.homeHeroImage || null,
        customFooterText: settings.customFooterText || `© 2024 ${organization.name}. Tous droits réservés.`,
        
        // Contact info
        contactEmail: organization.admin_email,
        contactPhone: organization.phone_number,
        address: organization.address,
        city: organization.city,
        postalCode: organization.postal_code,
        country: organization.country,
        
        // Social links
        websiteUrl: settings.websiteUrl || null,
        facebookUrl: settings.facebookUrl || null,
        twitterUrl: settings.twitterUrl || null,
        linkedinUrl: settings.linkedinUrl || null,
        
        // Features
        features: settings.features || {
          twoFactorAuth: true,
          emailNotifications: true,
          smsNotifications: false,
          advancedReporting: true,
          customFields: false,
        },
        
        // Limits
        limits: {
          maxUsers: limits.maxUsers || 100,
          maxLoans: limits.maxLoans || 1000,
          maxStorage: limits.maxStorage || '1GB',
        },
        
        // Custom settings
        loanCategories: settings.loanCategories || null,
      };

      // Cache the settings for 1 hour
      this.settingsCache.set(tenantSlug, tenantSettings);

      return tenantSettings;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching tenant settings:', error);
      
      // Return default settings as fallback
      return this.getDefaultSettings(tenantSlug);
    }
  }

  async updateTenantSettings(tenantSlug: string, updateDto: UpdateTenantSettingsDto) {
    try {
      // Get current organization
      const org = await this.masterPrisma.$queryRaw`
        SELECT id, settings, limits
        FROM organizations 
        WHERE slug = ${tenantSlug}
        LIMIT 1
      `;

      if (!org || (Array.isArray(org) && org.length === 0)) {
        throw new NotFoundException('Tenant not found');
      }

      const organization = Array.isArray(org) ? org[0] : org;
      const currentSettings = organization.settings || {};
      const currentLimits = organization.limits || {};

      // Merge settings
      const newSettings = {
        ...currentSettings,
        ...(updateDto.logo && { logo: updateDto.logo }),
        ...(updateDto.favicon && { favicon: updateDto.favicon }),
        ...(updateDto.primaryColor && { primaryColor: updateDto.primaryColor }),
        ...(updateDto.secondaryColor && { secondaryColor: updateDto.secondaryColor }),
        ...(updateDto.homeTitle && { homeTitle: updateDto.homeTitle }),
        ...(updateDto.homeDescription && { homeDescription: updateDto.homeDescription }),
        ...(updateDto.homeHeroImage && { homeHeroImage: updateDto.homeHeroImage }),
        ...(updateDto.customFooterText && { customFooterText: updateDto.customFooterText }),
        ...(updateDto.websiteUrl && { websiteUrl: updateDto.websiteUrl }),
        ...(updateDto.facebookUrl && { facebookUrl: updateDto.facebookUrl }),
        ...(updateDto.twitterUrl && { twitterUrl: updateDto.twitterUrl }),
        ...(updateDto.linkedinUrl && { linkedinUrl: updateDto.linkedinUrl }),
        ...(updateDto.features && { features: { ...currentSettings.features, ...updateDto.features } }),
        ...(updateDto.loanCategories && { loanCategories: updateDto.loanCategories }),
      };

      // Update limits if provided
      const newLimits = updateDto.limits ? {
        ...currentLimits,
        ...updateDto.limits
      } : currentLimits;

      // Update in database
      await this.masterPrisma.$executeRaw`
        UPDATE organizations 
        SET 
          settings = ${JSON.stringify(newSettings)}::jsonb,
          limits = ${JSON.stringify(newLimits)}::jsonb,
          updated_at = NOW()
        WHERE slug = ${tenantSlug}
      `;

      // Update contact info if provided
      if (updateDto.contactEmail || updateDto.contactPhone || updateDto.address) {
        const updateFields: string[] = [];
        const values: any[] = [];
        
        if (updateDto.contactEmail) {
          updateFields.push('admin_email = $1');
          values.push(updateDto.contactEmail);
        }
        if (updateDto.contactPhone) {
          updateFields.push('phone_number = $2');
          values.push(updateDto.contactPhone);
        }
        if (updateDto.address) {
          updateFields.push('address = $3');
          values.push(updateDto.address);
        }
        if (updateDto.city) {
          updateFields.push('city = $4');
          values.push(updateDto.city);
        }
        if (updateDto.postalCode) {
          updateFields.push('postal_code = $5');
          values.push(updateDto.postalCode);
        }
        if (updateDto.country) {
          updateFields.push('country = $6');
          values.push(updateDto.country);
        }

        if (updateFields.length > 0) {
          const query = `UPDATE organizations SET ${updateFields.join(', ')}, updated_at = NOW() WHERE slug = $7`;
          await this.masterPrisma.$executeRawUnsafe(query, ...values, tenantSlug);
        }
      }

      // Invalidate cache
      this.settingsCache.delete(tenantSlug);

      // Return updated settings
      return this.getTenantSettings(tenantSlug);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update tenant settings: ${error.message}`);
    }
  }

  async getTenantStatistics(tenantSlug: string) {
    try {
      // Get tenant database name
      const org = await this.masterPrisma.$queryRaw`
        SELECT database_name 
        FROM organizations 
        WHERE slug = ${tenantSlug}
        LIMIT 1
      `;

      if (!org || (Array.isArray(org) && org.length === 0)) {
        throw new NotFoundException('Tenant not found');
      }

      const dbName = (Array.isArray(org) ? org[0] : org).database_name;

      // Connect to tenant database
      const tenantPrisma = new PrismaClient({
        datasources: {
          db: { url: `${process.env.DATABASE_URL_BASE}/${dbName}` }
        }
      });

      try {
        // Get statistics
        const [
          userCount,
          loanCount,
          activeLoanCount,
          totalAmount,
          monthlyLoans
        ] = await Promise.all([
          tenantPrisma.user.count(),
          tenantPrisma.loan.count(),
          tenantPrisma.loan.count({ where: { status: 'ACTIVE' } }),
          tenantPrisma.loan.aggregate({
            _sum: { amount: true }
          }),
          tenantPrisma.loan.count({
            where: {
              createdAt: {
                gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
              }
            }
          })
        ]);

        return {
          totalUsers: userCount,
          totalLoans: loanCount,
          activeLoans: activeLoanCount,
          totalAmount: totalAmount._sum.amount || 0,
          monthlyLoans: monthlyLoans,
          lastUpdated: new Date()
        };
      } finally {
        await tenantPrisma.$disconnect();
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to fetch tenant statistics: ${error.message}`);
    }
  }

  async getTenantCustomization(tenantSlug: string) {
    const settings = await this.getTenantSettings(tenantSlug);
    
    return {
      branding: {
        logo: settings.logo,
        favicon: settings.favicon,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
      },
      content: {
        homeTitle: settings.homeTitle,
        homeDescription: settings.homeDescription,
        homeHeroImage: settings.homeHeroImage,
        customFooterText: settings.customFooterText,
      },
      social: {
        websiteUrl: settings.websiteUrl,
        facebookUrl: settings.facebookUrl,
        twitterUrl: settings.twitterUrl,
        linkedinUrl: settings.linkedinUrl,
      },
      contact: {
        email: settings.contactEmail,
        phone: settings.contactPhone,
        address: settings.address,
        city: settings.city,
        postalCode: settings.postalCode,
        country: settings.country,
      }
    };
  }

  private getDefaultSettings(tenantSlug: string) {
    return {
      name: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
      slug: tenantSlug,
      domain: `${tenantSlug}.gmah.com`,
      logo: null,
      favicon: null,
      primaryColor: '#4F46E5',
      secondaryColor: '#7C3AED',
      homeTitle: `Bienvenue chez ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}`,
      homeDescription: 'Plateforme de gestion de prêts communautaires',
      homeHeroImage: null,
      customFooterText: `© 2024 ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}. Tous droits réservés.`,
      contactEmail: null,
      contactPhone: null,
      address: null,
      city: null,
      postalCode: null,
      country: null,
      websiteUrl: null,
      facebookUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      features: {
        twoFactorAuth: true,
        emailNotifications: true,
        smsNotifications: false,
        advancedReporting: true,
        customFields: false,
      },
      limits: {
        maxUsers: 100,
        maxLoans: 1000,
        maxStorage: '1GB',
      },
      loanCategories: null,
    };
  }

  async onModuleDestroy() {
    await this.masterPrisma.$disconnect();
  }
}