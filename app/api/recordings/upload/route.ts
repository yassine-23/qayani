import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { processRecordingContent } from '../../../../lib/openai/client';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest, uploadRecordingMetadataSchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';
import { validateFile, throwIfInvalid } from '../../../../lib/upload/validator';

async function uploadRecordingHandler(request: NextRequest, userId: string) {
  const formData = await request.formData();

  const file = formData.get('file') as File;
  const personalityId = formData.get('personalityId') as string;
  const transcript = formData.get('transcript') as string;
  const durationStr = formData.get('duration') as string;
  const duration = durationStr ? parseInt(durationStr) : 0;

  if (!file) {
    throw Errors.missingField('file');
  }

  if (!personalityId) {
    throw Errors.missingField('personalityId');
  }

  // Validate file integrity (magic bytes, size, type)
  const validationResult = await validateFile(file, 'audio');
  throwIfInvalid(validationResult);

  // Validate metadata using schema
  validateRequest(uploadRecordingMetadataSchema, {
    personalityId,
    duration: duration > 0 ? duration : undefined,
  });

  // Check if user owns this personality
  const { data: personality, error: personalityError } = await supabaseAdmin
    .from('personalities')
    .select('id, user_id')
    .eq('id', personalityId)
    .eq('user_id', userId)
    .single();

  if (personalityError) {
    if (personalityError.code === 'PGRST116') {
      throw Errors.notFound('Personality', personalityId);
    }
    throw Errors.database('verify personality ownership', personalityError);
  }

  // Check user's subscription limits
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw Errors.database('fetch user profile', profileError);
  }

  // Count current month's recordings
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { count: monthlyCount, error: countError } = await supabaseAdmin
    .from('recordings')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', `${currentMonth}-01T00:00:00Z`);

  if (countError) {
    throw Errors.database('count monthly recordings', countError);
  }

  const subscriptionLimits = {
    free: 5,
    premium: 100,
    family: 1000
  };

  const userTier = userProfile?.subscription_tier || 'free';
  const monthlyLimit = subscriptionLimits[userTier as keyof typeof subscriptionLimits];

  if ((monthlyCount || 0) >= monthlyLimit) {
    throw new Errors.APIError(
      429,
      Errors.ErrorCode.RATE_LIMIT_EXCEEDED,
      `Monthly recording limit reached for ${userTier} plan`,
      {
        limit_reached: true,
        current_count: monthlyCount,
        limit: monthlyLimit,
        tier: userTier,
      },
      `You've reached the monthly recording limit (${monthlyLimit}) for your ${userTier} plan. Upgrade to upload more recordings.`
    );
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop() || 'webm';
  const filename = `recordings/${userId}/${personalityId}/${timestamp}.${fileExtension}`;

  // Convert file to buffer for upload
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabaseAdmin
    .storage
    .from('recordings')
    .upload(filename, buffer, {
      contentType: file.type || 'audio/webm',
      upsert: false
    });

  if (uploadError) {
    throw Errors.externalService('Supabase Storage', uploadError);
  }

  // Get the public URL
  const { data: urlData } = supabaseAdmin
    .storage
    .from('recordings')
    .getPublicUrl(filename);

  const fileUrl = urlData.publicUrl;

  // Create recording record in database
  const { data: recording, error: recordingError } = await supabaseAdmin
    .from('recordings')
    .insert({
      personality_id: personalityId,
      user_id: userId,
      file_url: fileUrl,
      file_size: file.size,
      duration: duration,
      transcript: transcript || null,
      processing_status: transcript ? 'pending' : 'completed'
    })
    .select()
    .single();

  if (recordingError) {
    // Clean up uploaded file
    await supabaseAdmin.storage.from('recordings').remove([filename]);
    throw Errors.database('create recording record', recordingError);
  }

  // Process transcript if provided (non-blocking in response, but we'll await it for consistency with old code)
  // In a real production app, this would be a background job
  if (transcript) {
    try {
      const processingResults = await processRecordingContent(
        transcript,
        personalityId
      );

      // Update recording with processing results
      await supabaseAdmin
        .from('recordings')
        .update({
          processed_content: processingResults,
          extracted_memories: processingResults.extractedMemories,
          emotion_analysis: processingResults.emotionAnalysis,
          topics: processingResults.topics,
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', recording.id);

      // Update personality with new memories
      const { data: currentPersonality } = await supabaseAdmin
        .from('personalities')
        .select('memories, personality_traits')
        .eq('id', personalityId)
        .single();

      if (currentPersonality && processingResults.extractedMemories.length > 0) {
        const updatedMemories = [
          ...(currentPersonality.memories || []),
          ...processingResults.extractedMemories
        ].slice(-50); // Keep last 50 memories

        const updatedTraits = {
          ...(currentPersonality.personality_traits as Record<string, any> || {}),
          ...processingResults.personalityInsights
        };

        await supabaseAdmin
          .from('personalities')
          .update({
            memories: updatedMemories,
            personality_traits: updatedTraits
          })
          .eq('id', personalityId);
      }
    } catch (processingError) {
      console.error('Recording processing error:', processingError);
      // Mark as failed
      await supabaseAdmin
        .from('recordings')
        .update({
          processing_status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', recording.id);
    }
  }

  // Track usage (non-blocking)
  supabaseAdmin
    .rpc('track_usage', {
      p_user_id: userId,
      p_feature: 'recording_upload',
      p_metadata: {
        personality_id: personalityId,
        file_size: file.size,
        duration: duration
      }
    })
    .catch(err => console.error('Usage tracking error:', err));

  return successResponse({
    message: 'Recording uploaded successfully',
    recording: {
      id: recording.id,
      fileUrl: fileUrl,
      duration: duration,
      transcript: transcript,
      processingStatus: recording.processing_status,
      createdAt: recording.created_at
    },
    usage: {
      monthlyCount: (monthlyCount || 0) + 1,
      monthlyLimit: monthlyLimit,
      remainingUploads: monthlyLimit - (monthlyCount || 0) - 1
    }
  });
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(uploadRecordingHandler),
  { requests: 10, window: '1 m' }
);