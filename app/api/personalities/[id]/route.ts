import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest, updatePersonalitySchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';

async function getPersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const personalityId = params.id;

  // Get personality with related data
  const { data: personality, error: personalityError } = await supabaseAdmin
    .from('personalities')
    .select(`
      *,
      recordings (
        id,
        file_url,
        duration,
        transcript,
        processing_status,
        created_at
      ),
      voice_profiles (
        id,
        voice_name,
        training_status,
        quality_score
      )
    `)
    .eq('id', personalityId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (personalityError) {
    if (personalityError.code === 'PGRST116') {
      throw Errors.notFound('Personality', personalityId);
    }
    throw Errors.database('fetch personality', personalityError);
  }

  if (!personality) {
    throw Errors.notFound('Personality', personalityId);
  }

  // Get conversation count
  const { count: conversationCount, error: conversationError } = await supabaseAdmin
    .from('conversations')
    .select('id', { count: 'exact' })
    .eq('personality_id', personalityId);

  if (conversationError) {
    throw Errors.database('count conversations', conversationError);
  }

  // Get family connections
  const { data: familyConnections, error: connectionsError } = await supabaseAdmin
    .from('family_connections')
    .select('id, member_email, member_name, relationship, access_level, invitation_status')
    .eq('personality_id', personalityId);

  if (connectionsError) {
    throw Errors.database('fetch family connections', connectionsError);
  }

  return successResponse({
    personality: {
      id: personality.id,
      name: personality.name,
      dateOfBirth: personality.date_of_birth,
      dateOfPassing: personality.date_of_passing,
      relationshipToCreator: personality.relationship_to_creator,
      personalityTraits: personality.personality_traits,
      memories: personality.memories,
      lifeEvents: personality.life_events,
      preferences: personality.preferences,
      speechPatterns: personality.speech_patterns,
      voiceProfile: personality.voice_profiles?.[0] || null,
      recordings: personality.recordings || [],
      familyConnections: familyConnections || [],
      conversationCount: conversationCount || 0,
      createdAt: personality.created_at,
      updatedAt: personality.updated_at
    }
  });
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getPersonalityHandler),
  { requests: 60, window: '1 m' }
);

async function updatePersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const personalityId = params.id;

  // Validate request body
  const body = await request.json();
  const validatedData = validateRequest(updatePersonalitySchema, body);

  // Verify ownership and existence
  const { data: existingPersonality, error: checkError } = await supabaseAdmin
    .from('personalities')
    .select('id, user_id')
    .eq('id', personalityId)
    .eq('user_id', userId)
    .single();

  if (checkError) {
    if (checkError.code === 'PGRST116') {
      throw Errors.notFound('Personality', personalityId);
    }
    throw Errors.database('verify personality ownership', checkError);
  }

  // Update personality
  const { data: updatedPersonality, error: updateError } = await supabaseAdmin
    .from('personalities')
    .update({
      ...(validatedData.name && { name: validatedData.name.trim() }),
      ...(validatedData.dateOfBirth !== undefined && { date_of_birth: validatedData.dateOfBirth }),
      ...(validatedData.dateOfPassing !== undefined && { date_of_passing: validatedData.dateOfPassing }),
      ...(validatedData.relationshipToCreator && { relationship_to_creator: validatedData.relationshipToCreator }),
      ...(validatedData.personalityTraits && { personality_traits: validatedData.personalityTraits }),
      ...(validatedData.preferences && { preferences: validatedData.preferences }),
      ...(validatedData.lifeEvents && { life_events: validatedData.lifeEvents }),
    })
    .eq('id', personalityId)
    .select()
    .single();

  if (updateError) {
    throw Errors.database('update personality', updateError);
  }

  return successResponse({
    message: 'Personality updated successfully',
    personality: {
      id: updatedPersonality.id,
      name: updatedPersonality.name,
      dateOfBirth: updatedPersonality.date_of_birth,
      dateOfPassing: updatedPersonality.date_of_passing,
      relationshipToCreator: updatedPersonality.relationship_to_creator,
      personalityTraits: updatedPersonality.personality_traits,
      lifeEvents: updatedPersonality.life_events,
      preferences: updatedPersonality.preferences,
      updatedAt: updatedPersonality.updated_at
    }
  });
}

async function deletePersonalityHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const personalityId = params.id;

  // Verify ownership and existence
  const { data: personality, error: checkError } = await supabaseAdmin
    .from('personalities')
    .select('id, user_id, name')
    .eq('id', personalityId)
    .eq('user_id', userId)
    .single();

  if (checkError) {
    if (checkError.code === 'PGRST116') {
      throw Errors.notFound('Personality', personalityId);
    }
    throw Errors.database('verify personality ownership', checkError);
  }

  // Soft delete - set is_active to false
  const { error: deleteError } = await supabaseAdmin
    .from('personalities')
    .update({ is_active: false })
    .eq('id', personalityId);

  if (deleteError) {
    throw Errors.database('delete personality', deleteError);
  }

  return successResponse({
    message: `Personality "${personality.name}" has been archived successfully`
  });
}

export const PUT = withRateLimitAndErrorHandling(
  withAuthErrorHandling(updatePersonalityHandler),
  { requests: 30, window: '1 m' }
);

export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(deletePersonalityHandler),
  { requests: 10, window: '1 m' }
);