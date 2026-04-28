import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Only run middleware on specific protected routes
  const pathname = req.nextUrl.pathname;

  // Skip middleware for public paths and API routes
  // Allow preview access to dashboard, capture, and eternal (chat) pages
  if (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/capture') ||
    pathname.startsWith('/eternal')
  ) {
    return res;
  }

  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    // Protected routes that require authentication (excluding preview pages)
    const isProtectedRoute =
      pathname.startsWith('/profile') ||
      pathname.startsWith('/recordings');

    // Redirect to auth if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/auth';
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    // On any error, allow the request to continue
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};