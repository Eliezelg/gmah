import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantDomain?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract tenant from multiple sources (in order of priority)
      let tenantId: string | undefined;

      // 1. Check subdomain (e.g., paris.gmah.com)
      const hostname = req.hostname || req.headers.host || '';
      const subdomain = this.extractSubdomain(hostname);
      
      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        tenantId = subdomain;
        req.tenantDomain = hostname;
      }

      // 2. Check custom header (for API access)
      if (!tenantId && req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'] as string;
      }

      // 3. Check query parameter (for development/testing)
      if (!tenantId && req.query.tenant) {
        tenantId = req.query.tenant as string;
      }

      // 4. Default tenant for local development
      if (!tenantId && process.env.NODE_ENV === 'development') {
        tenantId = process.env.DEFAULT_TENANT || 'default';
      }

      // Validate tenant ID format
      if (tenantId && !this.isValidTenantId(tenantId)) {
        throw new BadRequestException('Invalid tenant identifier');
      }

      // Attach tenant info to request
      req.tenantId = tenantId;

      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TenantMiddleware] Request for tenant: ${tenantId} from ${hostname}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private extractSubdomain(hostname: string): string | null {
    // Remove port if present
    const host = hostname.split(':')[0];
    
    // Split by dots
    const parts = host.split('.');
    
    // Check if it's a subdomain (at least 3 parts for subdomain.domain.tld)
    if (parts.length >= 3) {
      // Return the first part as subdomain
      return parts[0].toLowerCase();
    }
    
    // For localhost or development
    if (host === 'localhost' || host === '127.0.0.1') {
      return null;
    }
    
    // No subdomain found
    return null;
  }

  private isValidTenantId(tenantId: string): boolean {
    // Tenant ID validation rules:
    // - Must be 2-50 characters
    // - Only lowercase letters, numbers, and hyphens
    // - Must start with a letter
    // - Cannot end with a hyphen
    const tenantRegex = /^[a-z][a-z0-9-]{0,48}[a-z0-9]$/;
    return tenantRegex.test(tenantId);
  }
}

// Helper middleware for routes that require tenant
@Injectable()
export class RequireTenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.tenantId) {
      throw new BadRequestException('Tenant identification required');
    }
    next();
  }
}