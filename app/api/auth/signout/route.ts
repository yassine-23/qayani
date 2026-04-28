import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';

async function signoutHandler(request: NextRequest, userId: string) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (token) {
    // Sign out from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.signOut(token);
    if (error) {
      console.warn('Supabase signout warning:', error.message);
      // Continue anyway - client should clear tokens
    }
  }

  return successResponse({
    message: 'Signed out successfully'
  });
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(signoutHandler),
  { requests: 10, window: '1 m' }
);