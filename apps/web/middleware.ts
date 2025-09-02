import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-2fa', '/about', '/terms', '/privacy', '/contact'];

const locales = ['fr', 'en', 'he'];
const defaultLocale = 'fr';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Apply internationalization
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(fr|en|he)/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};