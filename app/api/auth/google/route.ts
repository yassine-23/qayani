import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createUserProfile } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { successResponse } from '../../../../lib/errors/handler';
import { Errors } from '../../../../lib/errors/types';

// Handle OAuth code exchange
async function googleAuthHandler(request: NextRequest) {
  const { code, redirectUrl } = await request.json();

  if (!code) {
    throw Errors.missingField('code');
  }

  // Exchange code for session with Supabase
  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

  if (error) {
    throw Errors.externalService('Google OAuth', error);
  }

  if (!data.user || !data.session) {
    throw Errors.unauthorized('Failed to authenticate with Google');
  }

  // Check if user profile exists
  const { data: existingProfile, error: profileFetchError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileFetchError && profileFetchError.code !== 'PGRST116') {
    console.error('Profile fetch error:', profileFetchError);
  }

  let userProfile = existingProfile;

  // Create profile if it doesn't exist (new user via Google OAuth)
  if (!existingProfile) {
    try {
      userProfile = await createUserProfile(
        data.user.id,
        data.user.email!,
        data.user.user_metadata?.full_name || data.user.user_metadata?.name
      );
    } catch (profileError) {
      console.error('Google signup profile creation error:', profileError);
      // Continue with user metadata as fallback
      userProfile = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        subscription_tier: 'free',
      };
    }
  }

  return successResponse({
    message: 'Google authentication successful',
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: userProfile.full_name,
      avatar: data.user.user_metadata?.avatar_url,
      subscriptionTier: userProfile.subscription_tier,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
}

// Handle OAuth initiation
async function googleOAuthInitHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUrl =
    searchParams.get('redirectUrl') || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  // Get Google OAuth URL from Supabase
  const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account consent',
      },
      scopes: 'openid email profile',
    },
  });

  if (error) {
    throw Errors.externalService('Google OAuth', error);
  }

  if (!data.url) {
    throw Errors.internal(new Error('No OAuth URL returned'), 'google-oauth');
  }

  return successResponse({
    url: data.url,
  });
}

// Apply rate limiting (10 requests per hour) for OAuth flows
export const POST = withRateLimitAndErrorHandling(googleAuthHandler, {
  requests: 10,
  window: '1 h',
});

export const GET = withRateLimitAndErrorHandling(googleOAuthInitHandler, {
  requests: 10,
  window: '1 h',
});