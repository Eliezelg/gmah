import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-2fa', '/about', '/terms', '/privacy', '/contact', '/signup-organization'];

const locales = ['fr', 'en', 'he'];
const defaultLocale = 'fr';

// Reserved subdomains that should not be treated as tenant subdomains
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'secure',
  'auth',
  'staging',
  'dev',
  'test',
  'demo',
  'localhost',
  '127'
];

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain from hostname
  const hostParts = hostname.split('.');
  const subdomain = hostParts[0].toLowerCase();
  
  let tenantId: string | null = null;
  let isCustomDomain = false;
  
  // Check if this is a tenant subdomain (e.g., paris.gmah.com)
  const isTenantSubdomain = 
    subdomain && 
    !RESERVED_SUBDOMAINS.includes(subdomain) &&
    hostParts.length > 1 && // Must have at least subdomain.domain
    !hostname.includes('localhost') &&
    !hostname.startsWith('127.');

  if (isTenantSubdomain) {
    tenantId = subdomain;
  } else {
    // Check if this is a custom domain
    // For custom domains, we need to look up the tenant by domain
    // This would typically be cached in Redis/Memory for performance
    const customDomainMap = await getCustomDomainMapping(hostname);
    if (customDomainMap) {
      tenantId = customDomainMap.tenantId;
      isCustomDomain = true;
    }
  }

  // Create response with intl middleware
  const response = intlMiddleware(request);
  
  // If we have a tenant (either from subdomain or custom domain)
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-tenant-domain', hostname);
    response.headers.set('x-is-custom-domain', isCustomDomain.toString());
    
    // Set tenant cookie for client-side access
    response.cookies.set('tenant-id', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // Set custom domain flag if applicable
    if (isCustomDomain) {
      response.cookies.set('custom-domain', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    }
  } else {
    // Clear tenant cookies if not on a tenant domain
    response.cookies.delete('tenant-id');
    response.cookies.delete('custom-domain');
  }

  return response;
}

// Function to get custom domain mapping
// In production, this should be cached in Redis or memory
async function getCustomDomainMapping(hostname: string): Promise<{ tenantId: string } | null> {
  // Skip for localhost and IP addresses
  if (hostname.includes('localhost') || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
    return null;
  }

  try {
    // Check if we have a cached mapping
    const cachedMapping = globalThis.__customDomainCache?.get(hostname);
    if (cachedMapping !== undefined) {
      return cachedMapping;
    }

    // Fetch from API (this should be optimized with caching)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/api/domains/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: hostname }),
      // Short timeout to not slow down requests
      signal: AbortSignal.timeout(500)
    });

    if (response.ok) {
      const data = await response.json();
      
      // Cache the result
      if (!globalThis.__customDomainCache) {
        globalThis.__customDomainCache = new Map();
      }
      globalThis.__customDomainCache.set(hostname, data.tenantId ? { tenantId: data.tenantId } : null);
      
      // Clear cache after 5 minutes
      setTimeout(() => {
        globalThis.__customDomainCache?.delete(hostname);
      }, 5 * 60 * 1000);
      
      return data.tenantId ? { tenantId: data.tenantId } : null;
    }
  } catch (error) {
    // Log error but don't break the request
    console.error('Failed to lookup custom domain:', error);
  }
  
  return null;
}

// Type declaration for global cache
declare global {
  var __customDomainCache: Map<string, { tenantId: string } | null> | undefined;
}

export const config = {
  matcher: [
    '/',
    '/(fr|en|he)/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};