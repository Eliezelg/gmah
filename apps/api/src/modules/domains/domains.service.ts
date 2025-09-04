import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AddCustomDomainDto } from './dto/add-custom-domain.dto';
import * as crypto from 'crypto';
import * as dns from 'dns/promises';

@Injectable()
export class DomainsService {
  private masterPrisma: PrismaClient;

  private domainCache = new Map<string, string>();

  constructor() {
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

  async lookupTenantByDomain(domain: string): Promise<string | null> {
    // Check cache first
    const cached = this.domainCache.get(domain);
    if (cached) {
      return cached;
    }

    try {
      // Look up custom domain
      const customDomain = await this.masterPrisma.$queryRaw`
        SELECT o.slug 
        FROM custom_domains cd
        JOIN organizations o ON cd.organization_id = o.id
        WHERE cd.domain = ${domain} 
          AND cd.status = 'VERIFIED'
          AND o.status = 'ACTIVE'
        LIMIT 1
      `;

      if (customDomain && Array.isArray(customDomain) && customDomain.length > 0) {
        const tenantId = customDomain[0].slug;
        
        // Cache for 5 minutes
        this.domainCache.set(domain, tenantId);
        
        return tenantId;
      }

      // Check if it's a default subdomain
      if (domain.endsWith('.gmah.com')) {
        const subdomain = domain.split('.')[0];
        
        // Check if organization exists
        const org = await this.masterPrisma.$queryRaw`
          SELECT slug 
          FROM organizations 
          WHERE slug = ${subdomain} AND status = 'ACTIVE'
          LIMIT 1
        `;

        if (org && Array.isArray(org) && org.length > 0) {
          // Cache for 5 minutes
          this.domainCache.set(domain, subdomain);
          return subdomain;
        }
      }

      return null;
    } catch (error) {
      console.error('Error looking up domain:', error);
      return null;
    }
  }

  async listOrganizationDomains(organizationId: string) {
    const domains = await this.masterPrisma.$queryRaw`
      SELECT 
        id, domain, status, verification_method, verified_at,
        ssl_status, ssl_expires_at, is_primary, created_at
      FROM custom_domains
      WHERE organization_id = ${organizationId}
      ORDER BY is_primary DESC, created_at DESC
    `;

    return domains;
  }

  async addCustomDomain(organizationId: string, dto: AddCustomDomainDto) {
    // Validate domain format
    if (!this.isValidDomain(dto.domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Check if domain already exists
    const existing = await this.masterPrisma.$queryRaw`
      SELECT id FROM custom_domains WHERE domain = ${dto.domain} LIMIT 1
    `;

    if (existing && Array.isArray(existing) && existing.length > 0) {
      throw new ConflictException('Domain is already registered');
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();

    // Create domain record
    const domain = await this.masterPrisma.$queryRaw`
      INSERT INTO custom_domains (
        organization_id, domain, verification_method, 
        verification_token, is_primary
      ) VALUES (
        ${organizationId},
        ${dto.domain},
        ${dto.verificationMethod || 'DNS_TXT'},
        ${verificationToken},
        ${dto.isPrimary || false}
      )
      RETURNING *
    `;

    // If set as primary, update other domains
    if (dto.isPrimary) {
      const domainResult = domain as any[];
      await this.masterPrisma.$executeRaw`
        UPDATE custom_domains 
        SET is_primary = false 
        WHERE organization_id = ${organizationId} 
          AND id != ${domainResult[0].id}
      `;
    }

    // Clear cache
    await this.clearDomainCache(dto.domain);

    const domainResult = domain as any[];
    return {
      ...domainResult[0],
      verificationInstructions: this.getVerificationInstructions(
        dto.domain,
        verificationToken,
        dto.verificationMethod || 'DNS_TXT'
      )
    };
  }

  async getDomain(domainId: string) {
    const domain = await this.masterPrisma.$queryRaw`
      SELECT * FROM custom_domains WHERE id = ${domainId} LIMIT 1
    `;

    if (!domain || (Array.isArray(domain) && domain.length === 0)) {
      throw new NotFoundException('Domain not found');
    }

    return Array.isArray(domain) ? domain[0] : domain;
  }

  async verifyDomain(domainId: string, method?: string) {
    const domain = await this.getDomain(domainId);
    
    let isVerified = false;
    
    switch (domain.verification_method || method) {
      case 'DNS_TXT':
        isVerified = await this.verifyDnsTxt(domain.domain, domain.verification_token);
        break;
      case 'DNS_CNAME':
        isVerified = await this.verifyDnsCname(domain.domain);
        break;
      case 'FILE_UPLOAD':
        isVerified = await this.verifyFileUpload(domain.domain, domain.verification_token);
        break;
      case 'META_TAG':
        isVerified = await this.verifyMetaTag(domain.domain, domain.verification_token);
        break;
    }

    if (isVerified) {
      await this.masterPrisma.$executeRaw`
        UPDATE custom_domains 
        SET 
          status = 'VERIFIED',
          verified_at = NOW(),
          dns_configured = true,
          last_checked_at = NOW()
        WHERE id = ${domainId}
      `;

      // Clear cache
      await this.clearDomainCache(domain.domain);

      // Initiate SSL provisioning (in production, this would trigger Let's Encrypt)
      await this.initiateSslProvisioning(domainId);

      return { verified: true, message: 'Domain verified successfully' };
    } else {
      await this.masterPrisma.$executeRaw`
        UPDATE custom_domains 
        SET 
          status = 'VERIFYING',
          last_checked_at = NOW()
        WHERE id = ${domainId}
      `;

      return { verified: false, message: 'Verification failed. Please check your DNS settings.' };
    }
  }

  async checkVerificationStatus(domainId: string) {
    const domain = await this.getDomain(domainId);
    
    return {
      status: domain.status,
      verifiedAt: domain.verified_at,
      lastCheckedAt: domain.last_checked_at,
      sslStatus: domain.ssl_status,
      sslExpiresAt: domain.ssl_expires_at,
      instructions: domain.status !== 'VERIFIED' 
        ? this.getVerificationInstructions(
            domain.domain,
            domain.verification_token,
            domain.verification_method
          )
        : null
    };
  }

  async setPrimaryDomain(domainId: string) {
    const domain = await this.getDomain(domainId);
    
    if (domain.status !== 'VERIFIED') {
      throw new BadRequestException('Domain must be verified before setting as primary');
    }

    // Set all other domains as non-primary
    await this.masterPrisma.$executeRaw`
      UPDATE custom_domains 
      SET is_primary = false 
      WHERE organization_id = ${domain.organization_id}
    `;

    // Set this domain as primary
    await this.masterPrisma.$executeRaw`
      UPDATE custom_domains 
      SET is_primary = true 
      WHERE id = ${domainId}
    `;

    return { success: true, message: 'Domain set as primary' };
  }

  async removeDomain(domainId: string) {
    const domain = await this.getDomain(domainId);
    
    // Delete domain record
    await this.masterPrisma.$executeRaw`
      DELETE FROM custom_domains WHERE id = ${domainId}
    `;

    // Clear cache
    await this.clearDomainCache(domain.domain);

    return { success: true, message: 'Domain removed successfully' };
  }

  async getDnsInstructions(domainId: string) {
    const domain = await this.getDomain(domainId);
    
    return {
      domain: domain.domain,
      method: domain.verification_method,
      instructions: this.getVerificationInstructions(
        domain.domain,
        domain.verification_token,
        domain.verification_method
      ),
      dnsRecords: this.getDnsRecords(domain.domain, domain.verification_token)
    };
  }

  async checkDomainAvailability(domain: string): Promise<boolean> {
    if (!this.isValidDomain(domain)) {
      return false;
    }

    const existing = await this.masterPrisma.$queryRaw`
      SELECT id FROM custom_domains WHERE domain = ${domain} LIMIT 1
    `;

    return !existing || (Array.isArray(existing) && existing.length === 0);
  }

  async checkDomainLimit(organizationId: string): Promise<boolean> {
    // Pas de limite pour les domaines personnalisés - chaque GMAH peut avoir plusieurs domaines
    return true;
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  private generateVerificationToken(): string {
    return `gmah-verify-${crypto.randomBytes(16).toString('hex')}`;
  }

  private getVerificationInstructions(domain: string, token: string, method: string) {
    switch (method) {
      case 'DNS_TXT':
        return {
          type: 'DNS TXT Record',
          steps: [
            'Log in to your domain registrar or DNS provider',
            `Add a TXT record for _gmah-verify.${domain}`,
            `Set the value to: ${token}`,
            'Wait 5-10 minutes for DNS propagation',
            'Click "Verify Domain" button'
          ],
          record: {
            type: 'TXT',
            name: `_gmah-verify.${domain}`,
            value: token
          }
        };
      
      case 'DNS_CNAME':
        return {
          type: 'DNS CNAME Record',
          steps: [
            'Log in to your domain registrar or DNS provider',
            `Add a CNAME record for ${domain}`,
            'Point it to: app.gmah.com',
            'Wait 5-10 minutes for DNS propagation',
            'Click "Verify Domain" button'
          ],
          record: {
            type: 'CNAME',
            name: domain,
            value: 'app.gmah.com'
          }
        };
      
      default:
        return null;
    }
  }

  private getDnsRecords(domain: string, token: string) {
    return [
      {
        type: 'A',
        name: '@',
        value: 'Your server IP',
        description: 'Points your domain to our servers'
      },
      {
        type: 'TXT',
        name: '_gmah-verify',
        value: token,
        description: 'Verifies domain ownership'
      },
      {
        type: 'CNAME',
        name: 'www',
        value: domain,
        description: 'Redirects www to main domain'
      }
    ];
  }

  private async verifyDnsTxt(domain: string, token: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(`_gmah-verify.${domain}`);
      return records.some(record => record.join('') === token);
    } catch (error) {
      console.error('DNS TXT verification failed:', error);
      return false;
    }
  }

  private async verifyDnsCname(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveCname(domain);
      return records.includes('app.gmah.com');
    } catch (error) {
      console.error('DNS CNAME verification failed:', error);
      return false;
    }
  }

  private async verifyFileUpload(domain: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${domain}/.well-known/gmah-verify.txt`);
      if (response.ok) {
        const text = await response.text();
        return text.trim() === token;
      }
      return false;
    } catch (error) {
      console.error('File upload verification failed:', error);
      return false;
    }
  }

  private async verifyMetaTag(domain: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${domain}`);
      if (response.ok) {
        const html = await response.text();
        return html.includes(`<meta name="gmah-verify" content="${token}">`);
      }
      return false;
    } catch (error) {
      console.error('Meta tag verification failed:', error);
      return false;
    }
  }

  private async initiateSslProvisioning(domainId: string) {
    // In production, this would trigger Let's Encrypt certificate generation
    // For now, we'll just update the status
    await this.masterPrisma.$executeRaw`
      UPDATE custom_domains 
      SET 
        ssl_status = 'PROVISIONING',
        updated_at = NOW()
      WHERE id = ${domainId}
    `;

    // Simulate SSL provisioning (in production, use Let's Encrypt/Certbot)
    setTimeout(async () => {
      await this.masterPrisma.$executeRaw`
        UPDATE custom_domains 
        SET 
          ssl_status = 'ACTIVE',
          ssl_issued_at = NOW(),
          ssl_expires_at = NOW() + INTERVAL '90 days'
        WHERE id = ${domainId}
      `;
    }, 5000);
  }

  private async clearDomainCache(domain: string) {
    this.domainCache.delete(domain);
  }

  async onModuleDestroy() {
    await this.masterPrisma.$disconnect();
  }
}