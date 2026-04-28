/**
 * Live Chat Message API
 *
 * Persists live chat messages to Supabase for analytics and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuthErrorHandling, successResponse } from '@/lib/errors/handler';
import { Errors } from '@/lib/errors/types';
import { withRateLimitAndErrorHandling } from '@/lib/middleware/rate-limit';

interface SaveMessageRequest {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType?: 'text' | 'audio' | 'both';
  audioUrl?: string;
  audioDurationMs?: number;
  audioTranscript?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

async function saveMessageHandler(request: NextRequest, userId: string) {
  const body: SaveMessageRequest = await request.json();

  const {
    sessionId,
    role,
    content,
    contentType = 'text',
    audioUrl,
    audioDurationMs,
    audioTranscript,
    latencyMs,
    metadata = {},
  } = body;

  if (!sessionId || !role || !content) {
    throw Errors.validation('Session ID, role, and content are required');
  }

  // Verify session belongs to user
  const { data: session } = await supabaseAdmin
    .from('live_chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!session) {
    throw Errors.authorization('Session not found or unauthorized');
  }

  // Save message
  const { data: message, error: messageError } = await supabaseAdmin
    .from('live_chat_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      content_type: contentType,
      audio_url: audioUrl,
      audio_duration_ms: audioDurationMs,
      audio_transcript: audioTranscript,
      latency_ms: latencyMs,
      metadata,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (messageError) {
    throw Errors.database('save live chat message', messageError);
  }

  return successResponse({
    messageId: message.id,
    timestamp: message.timestamp,
  });
}

async function getMessagesHandler(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    throw Errors.validation('Session ID is required');
  }

  // Verify session belongs to user
  const { data: session } = await supabaseAdmin
    .from('live_chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!session) {
    throw Errors.authorization('Session not found or unauthorized');
  }

  // Get messages
  const { data: messages, error: messagesError } = await supabaseAdmin
    .from('live_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (messagesError) {
    throw Errors.database('fetch live chat messages', messagesError);
  }

  return successResponse({
    messages: messages || [],
    count: messages?.length || 0,
  });
}

// POST /api/live-chat/message - Save message
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(saveMessageHandler),
  { requests: 100, window: '1 m' } // High limit for real-time messages
);

// GET /api/live-chat/message - Get messages
export const GET = withRateLimitAndErrorHandling(
  withAuthErrorHandling(getMessagesHandler),
  { requests: 20, window: '1 m' }
);
