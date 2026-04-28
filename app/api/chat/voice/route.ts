import { NextRequest, NextResponse } from 'next/server';
import { withRateLimitAndErrorHandling } from '../../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../../lib/errors/handler';
import { validateRequest, chatMessageSchema } from '../../../../lib/validation/schemas';
import { Errors } from '../../../../lib/errors/types';
import { generatePersonalityResponse } from '../../../../lib/openai/client';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import {
  PostgresChatHistory,
  getConversationSummary,
} from '../../../../lib/ai/conversation-memory';
import {
  buildPersonalityProfile,
  generatePersonalitySystemPrompt,
} from '../../../../lib/ai/personality-modeling';
import { getRelevantContext } from '../../../../lib/ai/embeddings';
import { elevenLabsClient } from '../../../../lib/elevenlabs/client';

/**
 * POST /api/chat/voice
 * Chat with voice response - combines chat + TTS
 * Returns both text response and audio URL
 */
async function voiceChatHandler(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const validatedData = validateRequest(chatMessageSchema, body);

    const { message, sessionId: providedSessionId, personalityId } = validatedData;

    // Get or create session ID
    let sessionId = providedSessionId;
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from('conversation_sessions')
        .insert({
          user_id: userId,
          personality_id: personalityId || null,
          title: message.substring(0, 50),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        throw Errors.database('create conversation session', sessionError);
      }

      sessionId = newSession.id;
    }

    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw Errors.database('fetch user profile', userError);
    }

    // Get user's voice profile (if exists)
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('training_status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: memories, count: memoriesCount } = await supabaseAdmin
      .from('user_memories')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    const hasPersonalData = userData && (userData.personality_traits || userData.life_story);
    const hasMemories = (memoriesCount || 0) > 0;
    const isInitialPhase = !hasPersonalData && !hasMemories;

    // Build personality profile
    let personalityProfile;
    let personalitySystemPrompt = '';

    if (!isInitialPhase) {
      try {
        personalityProfile = await buildPersonalityProfile(userId);
        personalitySystemPrompt = generatePersonalitySystemPrompt(personalityProfile);
      } catch (error) {
        console.error('Error building personality profile:', error);
      }
    }

    // Create personality data
    const personalityData = await createUserDigitalSelf(userId, userData, isInitialPhase);

    // Initialize conversation memory
    const chatHistory = new PostgresChatHistory(sessionId, userId);
    const previousMessages = await chatHistory.getMessages();

    const conversationHistory = previousMessages.map((msg) => ({
      role: msg._getType() === 'human' ? 'user' : msg._getType() === 'ai' ? 'assistant' : 'system',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    await chatHistory.addUserMessage(message);

    // Get relevant context (RAG)
    let relevantContext;
    let enhancedSystemPrompt = personalitySystemPrompt;

    if (!isInitialPhase) {
      try {
        relevantContext = await getRelevantContext(userId, message, 5);

        if (relevantContext.combinedContext) {
          enhancedSystemPrompt = personalitySystemPrompt
            ? `${personalitySystemPrompt}\n\n${relevantContext.combinedContext}`
            : relevantContext.combinedContext;
        }
      } catch (error) {
        console.error('Error retrieving relevant context:', error);
      }
    }

    // Generate AI response
    let aiResponse: string;
    try {
      aiResponse = await generatePersonalityResponse(
        message,
        personalityData,
        conversationHistory,
        userId,
        enhancedSystemPrompt || undefined
      );
    } catch (error) {
      console.error('AI generation error:', error);

      if (isInitialPhase) {
        aiResponse =
          "I'm just getting started as your digital self. I'd love to learn more about you!";
      } else {
        aiResponse =
          "I'm having some difficulty accessing my thoughts right now. Could you try again?";
      }
    }

    // Add AI response to history
    await chatHistory.addAIChatMessage(aiResponse);

    // Generate voice if voice profile exists
    let audioUrl = null;
    let lipSyncData = null;

    if (voiceProfile && voiceProfile.elevenlabs_voice_id) {
      try {
        // Generate speech using ElevenLabs
        const audioUrl = await elevenLabsClient.generateAndUploadSpeech(
          aiResponse,
          voiceProfile.elevenlabs_voice_id,
          userId,
          sessionId,
          voiceProfile.voice_settings
        );

        // Note: Lip sync data generation would happen client-side
        // using the rhubarb-lip-sync-wasm library we already have
      } catch (error) {
        console.error('Voice generation error:', error);
        // Continue without voice
      }
    }

    const summary = await getConversationSummary(sessionId, userId);

    return successResponse({
      response: aiResponse,
      audioUrl,
      hasVoice: !!voiceProfile,
      voiceId: voiceProfile?.elevenlabs_voice_id || null,
      timestamp: new Date().toISOString(),
      learning_phase: isInitialPhase,
      needs_data: isInitialPhase,
      sessionId: sessionId,
      messageCount: summary?.messageCount || 0,
      personalityQuality: personalityProfile?.dataQuality || null,
      ragContext: relevantContext
        ? {
            memoriesUsed: relevantContext.memories.length,
            conversationsUsed: relevantContext.conversations.length,
            hasContext: !!relevantContext.combinedContext,
          }
        : null,
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    throw Errors.internalServer('voice chat', error);
  }
}

// Helper function to create user's digital self personality
async function createUserDigitalSelf(userId: string, userData: any, isInitialPhase: boolean) {
  if (isInitialPhase) {
    return {
      id: `digital-self-${userId}`,
      name: 'Your Digital Self',
      relationshipToCreator: 'digital-self',
      personalityTraits: {},
      memories: [],
      lifeEvents: [],
      speechPatterns: {},
      preferences: {},
      isLearning: true,
      phase: 'initial',
    };
  }

  const { data: memories } = await supabaseAdmin
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .limit(10);

  return {
    id: `digital-self-${userId}`,
    name: 'Your Digital Self',
    relationshipToCreator: 'digital-self',
    personalityTraits: userData?.personality_traits || {},
    memories: memories?.map((m) => m.content) || [],
    lifeEvents: userData?.life_events || [],
    speechPatterns: userData?.speech_patterns || {},
    preferences: userData?.preferences || {},
    isLearning: false,
    phase: 'trained',
    lifeStory: userData?.life_story,
  };
}

export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(voiceChatHandler),
  { requests: 20, window: '1 m' }
);
