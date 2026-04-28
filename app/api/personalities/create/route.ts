import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest, createPersonalitySchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';

async function createPersonalityHandler(request: NextRequest, userId: string) {
  // Validate request body
  const body = await request.json();
  const validatedData = validateRequest(createPersonalitySchema, body);

  // Check user's personality limits based on subscription tier
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw Errors.database('fetch user profile', profileError);
  }

  const { count: personalityCount, error: countError } = await supabaseAdmin
    .from('personalities')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (countError) {
    throw Errors.database('count personalities', countError);
  }

  // Enforce personality limits by subscription tier
  const personalityLimits = {
    free: 1,
    premium: 5,
    family: 20,
  };

  const userTier = userProfile?.subscription_tier || 'free';
  const limit = personalityLimits[userTier as keyof typeof personalityLimits];

  if ((personalityCount || 0) >= limit) {
    throw new Errors.APIError(
      429,
      Errors.ErrorCode.RATE_LIMIT_EXCEEDED,
      `Personality limit reached for ${userTier} plan`,
      {
        limit_reached: true,
        current_count: personalityCount,
        limit: limit,
        tier: userTier,
      },
      `You've reached the personality limit (${limit}) for your ${userTier} plan. Upgrade to create more personalities.`
    );
  }

  // Create personality
  const { data: personality, error: personalityError } = await supabaseAdmin
    .from('personalities')
    .insert({
      user_id: userId,
      name: validatedData.name.trim(),
      date_of_birth: validatedData.dateOfBirth || null,
      date_of_passing: validatedData.dateOfPassing || null,
      relationship_to_creator: validatedData.relationshipToCreator,
      personality_traits: validatedData.personalityTraits || {},
      life_events: validatedData.lifeEvents || [],
      preferences: validatedData.preferences || {},
    })
    .select()
    .single();

  if (personalityError) {
    throw Errors.database('create personality', personalityError);
  }

  // Track usage (non-blocking)
  supabaseAdmin
    .rpc('track_usage', {
      p_user_id: userId,
      p_feature: 'personality_create',
      p_metadata: { personality_id: personality.id },
    })
    .catch((error) => console.error('Usage tracking error:', error));

  return successResponse(
    {
      message: 'Personality created successfully',
      personality: {
        id: personality.id,
        name: personality.name,
        dateOfBirth: personality.date_of_birth,
        dateOfPassing: personality.date_of_passing,
        relationshipToCreator: personality.relationship_to_creator,
        personalityTraits: personality.personality_traits,
        lifeEvents: personality.life_events,
        preferences: personality.preferences,
        createdAt: personality.created_at,
      },
      usage: {
        personalityCount: (personalityCount || 0) + 1,
        personalityLimit: limit,
        remainingPersonalities: limit - (personalityCount || 0) - 1,
      },
    },
    201
  );
}

// Apply rate limiting (5 requests per minute) and authentication
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createPersonalityHandler),
  { requests: 5, window: '1 m' }
);
