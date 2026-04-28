import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { successResponse } from '../../../../lib/errors/handler';
import { validateRequest, signInSchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';

async function signinHandler(request: NextRequest) {
  // Validate request body
  const body = await request.json();
  const { email, password } = validateRequest(signInSchema, body);

  // Sign in with Supabase Auth
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw Errors.invalidCredentials('Invalid email or password');
  }

  if (!data.user || !data.session) {
    throw Errors.invalidCredentials('Authentication failed');
  }

  // Get user profile
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    // Log error but continue - profile might not exist for new users
    console.error('Profile fetch error:', profileError);
  }

  return successResponse({
    message: 'Signed in successfully',
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: userProfile?.full_name || data.user.email?.split('@')[0],
      subscriptionTier: userProfile?.subscription_tier || 'free',
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
}

// Apply rate limiting (5 requests per 5 minutes) for brute force protection
export const POST = withRateLimitAndErrorHandling(signinHandler, {
  requests: 5,
  window: '5 m',
});