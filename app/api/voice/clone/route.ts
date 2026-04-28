/**
 * Voice Cloning API
 *
 * Handles voice cloning workflow:
 * 1. Upload audio samples
 * 2. Train custom voice with ElevenLabs
 * 3. Store voice_id in user profile
 * 4. Test voice quality
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuthErrorHandling, successResponse } from '@/lib/errors/handler';
import { Errors } from '@/lib/errors/types';
import { withRateLimitAndErrorHandling } from '@/lib/middleware/rate-limit';
import { ElevenLabsClient, validateAudioFile } from '@/lib/voice/elevenlabs-client';

/**
 * POST /api/voice/clone
 * Clone user's voice from uploaded audio samples
 */
async function cloneVoiceHandler(
  request: NextRequest,
  userId: string
): Promise<NextResponse> {
  const formData = await request.formData();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const files: File[] = [];

  // Extract all audio files
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file_') && value instanceof File) {
      files.push(value);
    }
  }

  // Validate input
  if (!name || files.length < 1) {
    throw Errors.validation('Name and at least 1 audio file are required');
  }

  if (files.length > 10) {
    throw Errors.validation('Maximum 10 audio files allowed');
  }

  // Validate each file
  for (const file of files) {
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      throw Errors.validation(validation.error || 'Invalid audio file');
    }
  }

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    throw Errors.notFound('User profile not found');
  }

  // Initialize ElevenLabs client
  const elevenlabs = new ElevenLabsClient();

  try {
    // Clone voice
    const voiceProfile = await elevenlabs.cloneVoice(
      name,
      files,
      description || `Voice clone for ${profile.full_name || 'user'}`
    );

    // Save voice_id to user profile
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        voice_id: voiceProfile.voice_id,
        voice_name: name,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      throw Errors.database('update voice profile', updateError);
    }

    // Log voice training event
    await supabaseAdmin.from('user_events').insert({
      user_id: userId,
      event_type: 'voice_cloned',
      event_data: {
        voice_id: voiceProfile.voice_id,
        voice_name: name,
        sample_count: files.length,
      },
      timestamp: new Date().toISOString(),
    });

    return successResponse({
      voice_id: voiceProfile.voice_id,
      voice_name: name,
      message: 'Voice cloned successfully! Your digital twin will now sound like you.',
    });
  } catch (error: any) {
    throw Errors.externalAPI('ElevenLabs voice cloning', error.message);
  }
}

/**
 * GET /api/voice/clone
 * Get user's current voice profile
 */
async function getVoiceProfileHandler(
  request: NextRequest,
  userId: string
): Promise<NextResponse> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('voice_id, voice_name, voice_settings')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    throw Errors.notFound('User profile not found');
  }

  if (!profile.voice_id) {
    return successResponse({
      hasVoice: false,
      message: 'No custom voice configured. Upload audio to get started.',
    });
  }

  // Get voice details from ElevenLabs
  const elevenlabs = new ElevenLabsClient();

  try {
    const voiceDetails = await elevenlabs.getVoice(profile.voice_id);

    return successResponse({
      hasVoice: true,
      voice_id: profile.voice_id,
      voice_name: profile.voice_name,
      voice_settings: profile.voice_settings,
      sample_count: voiceDetails.samples?.length || 0,
      preview_url: voiceDetails.preview_url,
    });
  } catch (error: any) {
    // Voice might have been deleted from ElevenLabs
    return successResponse({
      hasVoice: false,
      error: 'Voice not found. Please train a new voice.',
    });
  }
}

/**
 * DELETE /api/voice/clone
 * Delete user's custom voice
 */
async function deleteVoiceHandler(
  request: NextRequest,
  userId: string
): Promise<NextResponse> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('voice_id')
    .eq('user_id', userId)
    .single();

  if (!profile?.voice_id) {
    throw Errors.notFound('No voice to delete');
  }

  const elevenlabs = new ElevenLabsClient();

  try {
    // Delete from ElevenLabs
    await elevenlabs.deleteVoice(profile.voice_id);

    // Clear from user profile
    await supabaseAdmin
      .from('user_profiles')
      .update({
        voice_id: null,
        voice_name: null,
        voice_settings: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return successResponse({
      message: 'Voice deleted successfully',
    });
  } catch (error: any) {
    throw Errors.externalAPI('ElevenLabs voice deletion', error.message);
  }
}

// POST /api/voice/clone - Clone voice
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(cloneVoiceHandler),
  { requests: 5, window: '1 h' } // Limit to 5 cloning attempts per hour
);

// GET /api/voice/clone - Get voice profile
export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getVoiceProfileHandler),
  { requests: 30, window: '1 m' }
);

// DELETE /api/voice/clone - Delete voice
export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(deleteVoiceHandler),
  { requests: 10, window: '1 m' }
);
