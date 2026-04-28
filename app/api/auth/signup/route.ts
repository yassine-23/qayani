import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createUserProfile } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { successResponse } from '../../../../lib/errors/handler';
import { validateRequest, signUpSchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';

async function signupHandler(request: NextRequest) {
  // Validate request body
  const body = await request.json();
  const { email, password, fullName } = validateRequest(signUpSchema, body);

  // Create user account with Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for now
  });

  if (authError) {
    // Check for duplicate email
    if (authError.message?.includes('already registered')) {
      throw Errors.alreadyExists('User', email);
    }
    throw Errors.validation({ auth: authError.message }, 'Failed to create account');
  }

  if (!authData.user) {
    throw Errors.internal(new Error('User creation failed'), 'auth');
  }

  // Create user profile in our users table
  try {
    const userProfile = await createUserProfile(authData.user.id, email, fullName);

    return successResponse(
      {
        message: 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName: userProfile.full_name,
          subscriptionTier: userProfile.subscription_tier,
        },
      },
      201
    );
  } catch (profileError) {
    // If profile creation fails, clean up the auth user
    console.error('Profile creation failed:', profileError);

    try {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    } catch (deleteError) {
      console.error('Failed to cleanup auth user:', deleteError);
    }

    throw Errors.database('create user profile', profileError);
  }
}

// Apply rate limiting (3 requests per hour) to prevent spam account creation
export const POST = withRateLimitAndErrorHandling(signupHandler, {
  requests: 3,
  window: '1 h',
});