import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 *
 * Handles OAuth callback from providers (Google, etc.) after user authorization.
 * Exchanges authorization code for session and redirects to dashboard.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors (user denied access, etc.)
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  // Exchange authorization code for session
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return NextResponse.redirect(
          new URL('/auth?error=Authentication failed. Please try again.', requestUrl.origin)
        );
      }

      // Verify user session was created
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Failed to get user after session exchange:', userError);
        return NextResponse.redirect(
          new URL('/auth?error=Failed to retrieve user information.', requestUrl.origin)
        );
      }

      console.log('✅ OAuth successful for user:', user.email);

      // Success! Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    } catch (error) {
      console.error('Unexpected error during OAuth callback:', error);
      return NextResponse.redirect(
        new URL('/auth?error=An unexpected error occurred.', requestUrl.origin)
      );
    }
  }

  // No code and no error - invalid callback
  console.error('OAuth callback called without code or error');
  return NextResponse.redirect(
    new URL('/auth?error=Invalid callback request', requestUrl.origin)
  );
}