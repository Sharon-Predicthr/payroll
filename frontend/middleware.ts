import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use locale prefix in URLs (prevents redirect loops)
  localePrefix: 'always',
  
  // Enable locale detection
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  // Handle /login redirect to /en/login (before intl middleware processes it)
  const pathname = request.nextUrl.pathname;
  if (pathname === '/login' || pathname === '/login/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}/login`;
    return NextResponse.redirect(url);
  }

  // Let next-intl handle all other routes
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames (exclude API routes, static files, etc.)
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next`, `/_vercel`, or `/.well-known`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)',
  ],
};

