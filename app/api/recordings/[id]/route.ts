import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { Errors } from '../../../../lib/errors/types';

async function getRecordingHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const recordingId = params.id;

  // Get recording with personality info
  const { data: recording, error: recordingError } = await supabaseAdmin
    .from('recordings')
    .select(`
      *,
      personalities (
        id,
        name,
        user_id
      )
    `)
    .eq('id', recordingId)
    .single();

  if (recordingError) {
    if (recordingError.code === 'PGRST116') {
      throw Errors.notFound('Recording', recordingId);
    }
    throw Errors.database('fetch recording', recordingError);
  }

  if (!recording) {
    throw Errors.notFound('Recording', recordingId);
  }

  // Check if user owns this recording (through personality)
  if ((recording.personalities as any)?.user_id !== userId) {
    throw Errors.forbidden('You do not have access to this recording');
  }

  return successResponse({
    recording: {
      id: recording.id,
      personalityId: recording.personality_id,
      personalityName: (recording.personalities as any)?.name,
      fileUrl: recording.file_url,
      fileSize: recording.file_size,
      duration: recording.duration,
      transcript: recording.transcript,
      extractedMemories: recording.extracted_memories,
      emotionAnalysis: recording.emotion_analysis,
      topics: recording.topics,
      processingStatus: recording.processing_status,
      createdAt: recording.created_at,
      processedAt: recording.processed_at
    }
  });
}

async function deleteRecordingHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const recordingId = params.id;

  // Get recording to verify ownership and get file path
  const { data: recording, error: fetchError } = await supabaseAdmin
    .from('recordings')
    .select(`
      *,
      personalities (
        id,
        user_id
      )
    `)
    .eq('id', recordingId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw Errors.notFound('Recording', recordingId);
    }
    throw Errors.database('fetch recording for deletion', fetchError);
  }

  if (!recording) {
    throw Errors.notFound('Recording', recordingId);
  }

  // Check if user owns this recording
  if ((recording.personalities as any)?.user_id !== userId) {
    throw Errors.forbidden('You do not have permission to delete this recording');
  }

  // Extract file path from URL for deletion
  const fileUrl = recording.file_url;
  const urlParts = fileUrl.split('/');
  const bucketIndex = urlParts.findIndex(part => part === 'recordings');

  let filePath = '';
  if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
    filePath = urlParts.slice(bucketIndex + 1).join('/');
  }

  // Delete from database first
  const { error: deleteError } = await supabaseAdmin
    .from('recordings')
    .delete()
    .eq('id', recordingId);

  if (deleteError) {
    throw Errors.database('delete recording from database', deleteError);
  }

  // Delete file from storage (non-blocking in response)
  if (filePath) {
    supabaseAdmin
      .storage
      .from('recordings')
      .remove([filePath])
      .catch(err => console.error('Storage deletion error:', err));
  }

  return successResponse({
    message: 'Recording deleted successfully'
  });
}

export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getRecordingHandler),
  { requests: 60, window: '1 m' }
);

export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(deleteRecordingHandler),
  { requests: 10, window: '1 m' }
);