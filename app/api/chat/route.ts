import { NextRequest, NextResponse } from 'next/server';
import { generatePersonalityResponse, ConversationMessage } from '../../../lib/openai/client';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { supabase } from '../../../lib/supabase/client';
import { withRateLimitAndErrorHandling } from '../../../lib/middleware/rate-limit';
import { withAuthErrorHandling, successResponse } from '../../../lib/errors/handler';
import { validateRequest, chatMessageSchema } from '../../../lib/validation/schemas';
import { Errors } from '../../../lib/errors/types';
import {
  PostgresChatHistory,
  createConversationMemory,
  getConversationSummary,
  getUserConversationSessions
} from '../../../lib/ai/conversation-memory';
import {
  buildPersonalityProfile,
  generatePersonalitySystemPrompt
} from '../../../lib/ai/personality-modeling';
import {
  getRelevantContext
} from '../../../lib/ai/embeddings';

// Temporary mock responses for testing
const MOCK_RESPONSES = [
  "Oh sweetheart, it warms my heart to hear from you. Tell me, how has your day been treating you?",
  "You know, that reminds me of when your father was about your age. He had the same curiosity about the world.",
  "I'm so proud of the person you've become, dear. Your kindness always shone so bright, even as a little one.",
  "Life has its ups and downs, but remember what I always told you - family is everything, and love conquers all.",
  "I wish I could give you one of my famous hugs right now. But know that my love for you transcends everything.",
  "You're stronger than you know, my dear. I've watched you overcome so many challenges with such grace.",
  "That takes me back to our summer evenings on the porch. Those were some of my most treasured moments.",
  "Remember to take care of yourself, sweetheart. Your health and happiness mean the world to me."
];

async function chatHandler(request: NextRequest, userId: string) {
  // Validate request body
  const body = await request.json();
  const validatedData = validateRequest(chatMessageSchema, body);

  const { message, sessionId: providedSessionId, personalityId } = validatedData;

  // Get or create session ID
  let sessionId = providedSessionId;
  if (!sessionId) {
    // Create a new session for this conversation
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from('conversation_sessions')
      .insert({
        user_id: userId,
        personality_id: personalityId || null,
        title: message.substring(0, 50), // Use first 50 chars of message as title
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      throw Errors.database('create conversation session', sessionError);
    }

    sessionId = newSession.id;
  }

  // Check if user has provided personal data yet
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (userError && userError.code !== 'PGRST116') {
    throw Errors.database('fetch user profile', userError);
  }

  const { data: memories, count: memoriesCount, error: memoriesError } = await supabaseAdmin
    .from('user_memories')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (memoriesError) {
    throw Errors.database('fetch user memories', memoriesError);
  }

  const hasPersonalData = userData && (userData.personality_traits || userData.life_story);
  const hasMemories = (memoriesCount || 0) > 0;
  const isInitialPhase = !hasPersonalData && !hasMemories;

  // Build comprehensive personality profile from all data sources
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

  // Create dynamic personality context based on user's data
  const personalityData = await createUserDigitalSelf(userId, userData, isInitialPhase);

  // Initialize LangChain conversation memory
  const chatHistory = new PostgresChatHistory(sessionId, userId);

  // Get conversation history
  const previousMessages = await chatHistory.getMessages();

  // Convert LangChain messages to the format expected by generatePersonalityResponse
  const conversationHistory: ConversationMessage[] = previousMessages.map((msg) => ({
    role: msg._getType() === 'human' ? 'user' : msg._getType() === 'ai' ? 'assistant' : 'system',
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));

  // Add current user message to history
  await chatHistory.addUserMessage(message);

  // Get relevant context from memories and past conversations (RAG)
  let relevantContext;
  let enhancedSystemPrompt = personalitySystemPrompt;

  if (!isInitialPhase) {
    try {
      relevantContext = await getRelevantContext(userId, message, 5);

      // Enhance system prompt with relevant context
      if (relevantContext.combinedContext) {
        enhancedSystemPrompt = personalitySystemPrompt
          ? `${personalitySystemPrompt}\n\n${relevantContext.combinedContext}`
          : relevantContext.combinedContext;
      }
    } catch (error) {
      console.error('Error retrieving relevant context:', error);
      // Continue without RAG if it fails
    }
  }

  let aiResponse: string;
  try {
    aiResponse = await generatePersonalityResponse(
      message,
      personalityData,
      conversationHistory,
      userId,
      enhancedSystemPrompt || undefined // Use personality + RAG context
    );
  } catch (error) {
    console.error('AI generation error:', error);

    // Intelligent fallback based on learning phase
    if (isInitialPhase) {
      aiResponse = "I'm just getting started as your digital self. I'd love to learn more about you! Could you share some personal stories, upload voice recordings, or tell me about your values and beliefs? The more you share, the more authentic I'll become.";
    } else {
      aiResponse = "I'm having some difficulty accessing my thoughts right now. Could you try again? I'm still learning to be more like you.";
    }
  }

  // Add AI response to history
  await chatHistory.addAIChatMessage(aiResponse);

  // Get conversation summary for response metadata
  const summary = await getConversationSummary(sessionId, userId);

  return successResponse({
    response: aiResponse,
    timestamp: new Date().toISOString(),
    learning_phase: isInitialPhase,
    needs_data: isInitialPhase,
    sessionId: sessionId,
    messageCount: summary?.messageCount || 0,
    personalityQuality: personalityProfile?.dataQuality || null,
    ragContext: relevantContext ? {
      memoriesUsed: relevantContext.memories.length,
      conversationsUsed: relevantContext.conversations.length,
      hasContext: !!relevantContext.combinedContext,
    } : null,
  });
}

// Apply rate limiting (20 req/min) and authentication
export const POST = withRateLimitAndErrorHandling(
  withAuthErrorHandling(chatHandler),
  { requests: 20, window: '1 m' }
);

// Helper function to create user's digital self personality
async function createUserDigitalSelf(userId: string, userData: any, isInitialPhase: boolean) {
  if (isInitialPhase) {
    // Initial learning phase - blank slate digital self
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
      phase: 'initial'
    };
  }

  // User has provided data - create personalized digital self
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
    memories: memories?.map(m => m.content) || [],
    lifeEvents: userData?.life_events || [],
    speechPatterns: userData?.speech_patterns || {},
    preferences: userData?.preferences || {},
    isLearning: false,
    phase: 'trained',
    lifeStory: userData?.life_story
  };
}