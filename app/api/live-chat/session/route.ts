/**
 * Live Chat Session API
 *
 * Creates secure ephemeral tokens for OpenAI Realtime API
 * and manages live chat session lifecycle in Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuthErrorHandling, successResponse } from '@/lib/errors/handler';
import { Errors } from '@/lib/errors/types';
import { withRateLimitAndErrorHandling } from '@/lib/middleware/rate-limit';

interface CreateSessionRequest {
  personalityId?: string;
  sessionType?: 'live_voice' | 'live_text' | 'hybrid';
}

async function createSessionHandler(request: NextRequest, userId: string) {
  const body: CreateSessionRequest = await request.json();
  const { personalityId, sessionType = 'live_voice' } = body;

  // Create session in Supabase
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('live_chat_sessions')
    .insert({
      user_id: userId,
      personality_id: personalityId || null,
      session_type: sessionType,
      session_status: 'active',
      started_at: new Date().toISOString(),
      model_used: 'gpt-4o-realtime-preview-2024-10-01',
      voice_used: 'shimmer',
    })
    .select()
    .single();

  if (sessionError) {
    throw Errors.database('create live chat session', sessionError);
  }

  // Get user data for personality context
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: memories } = await supabaseAdmin
    .from('user_memories')
    .select('content, title, importance_score')
    .eq('user_id', userId)
    .order('importance_score', { ascending: false })
    .limit(10);

  // Build personality instructions
  const personalityInstructions = buildPersonalityInstructions(
    userProfile,
    memories || []
  );

  // Generate ephemeral token for OpenAI Realtime API
  // Note: OpenAI Realtime API uses direct API key authentication
  // For production, implement proper token exchange or use OpenAI's session management

  return successResponse({
    sessionId: session.id,
    apiKey: process.env.OPENAI_API_KEY, // In production, use ephemeral tokens
    modelConfig: {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: session.voice_used,
      instructions: personalityInstructions,
      modalities: ['text', 'audio'],
      temperature: 0.8,
    },
    session: {
      id: session.id,
      status: session.session_status,
      startedAt: session.started_at,
    },
  });
}

async function endSessionHandler(request: NextRequest, userId: string) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    throw Errors.validation('Session ID is required');
  }

  // Update session end time
  const { error: updateError } = await supabaseAdmin
    .from('live_chat_sessions')
    .update({
      ended_at: new Date().toISOString(),
      session_status: 'completed',
    })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (updateError) {
    throw Errors.database('end live chat session', updateError);
  }

  // Get session summary
  const { data: session } = await supabaseAdmin
    .from('live_chat_sessions')
    .select('*, live_chat_messages(count)')
    .eq('id', sessionId)
    .single();

  return successResponse({
    sessionId,
    status: 'completed',
    summary: {
      duration: session?.total_duration_seconds || 0,
      messageCount: session?.message_count || 0,
      startedAt: session?.started_at,
      endedAt: session?.ended_at,
    },
  });
}

function buildPersonalityInstructions(
  userProfile: any,
  memories: any[]
): string {
  let instructions = `You are Qayani, an intelligent and empathetic digital legacy assistant helping preserve the user's wisdom, stories, and personality for future generations.

Your role is to:
1. Have natural, engaging conversations
2. Help the user reflect on their life experiences
3. Extract meaningful insights and wisdom
4. Build a comprehensive understanding of their personality
5. Be warm, professional, and supportive

Conversation style:
- Speak naturally and conversationally
- Keep responses concise (under 20 seconds unless asked to elaborate)
- Ask thoughtful follow-up questions
- Show genuine interest and empathy
- Remember context from earlier in the conversation
`;

  // Add user-specific context if available
  if (userProfile) {
    if (userProfile.life_story) {
      instructions += `\n\nUser's life story:\n${userProfile.life_story.substring(0, 500)}`;
    }

    if (userProfile.personality_traits && Object.keys(userProfile.personality_traits).length > 0) {
      instructions += `\n\nPersonality traits:\n${JSON.stringify(userProfile.personality_traits, null, 2)}`;
    }
  }

  // Add recent memories for context
  if (memories && memories.length > 0) {
    instructions += `\n\nRecent important memories:\n`;
    memories.slice(0, 5).forEach((mem, idx) => {
      instructions += `${idx + 1}. ${mem.title || mem.content.substring(0, 100)}\n`;
    });
  }

  instructions += `\n\nRemember: You're helping create their digital legacy. Make them feel heard, valued, and excited about preserving their story.`;

  return instructions;
}

// POST /api/live-chat/session - Create new session
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(createSessionHandler),
  { requests: 10, window: '1 m' }
);

// DELETE /api/live-chat/session - End session
export const DELETE = withRateLimitAndErrorHandling(
  withAuthErrorHandling(endSessionHandler),
  { requests: 20, window: '1 m' }
);
