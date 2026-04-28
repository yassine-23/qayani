/**
 * Advanced Personality Modeling System
 *
 * Analyzes conversations, memories, and recordings to build
 * an authentic digital twin personality profile
 */

import { supabaseAdmin } from '../supabase/admin';
import { PostgresChatHistory } from './conversation-memory';

export interface PersonalityInsight {
  trait: string;
  value: number; // 0-1 scale
  confidence: number; // 0-1 scale
  evidence: string[];
  lastUpdated: string;
}

export interface PersonalityProfile {
  userId: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    optimism: number;
    humor: number;
    formality: number;
  };
  speechPatterns: {
    commonPhrases: string[];
    vocabularyLevel: 'simple' | 'moderate' | 'advanced';
    averageMessageLength: number;
    sentimentTrend: 'positive' | 'neutral' | 'negative';
    preferredTopics: string[];
  };
  values: {
    family: number;
    career: number;
    health: number;
    creativity: number;
    tradition: number;
    independence: number;
  };
  communicationStyle: {
    directness: number;
    emotionalExpressiveness: number;
    storytellingTendency: number;
    questioningStyle: 'curious' | 'rhetorical' | 'socratic';
  };
  insights: PersonalityInsight[];
  dataQuality: {
    conversationCount: number;
    memoryCount: number;
    recordingCount: number;
    lastAnalyzed: string;
  };
}

/**
 * Analyze conversation history to extract personality insights
 */
export async function analyzeConversationHistory(
  userId: string,
  sessionId?: string
): Promise<Partial<PersonalityProfile>> {
  try {
    // Get conversation messages
    let query = supabaseAdmin
      .from('conversation_history')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(100);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: messages, error } = await query;

    if (error || !messages || messages.length === 0) {
      return {};
    }

    // Extract conversation patterns
    const totalMessages = messages.length;
    const totalWords = messages.reduce((sum, msg) => {
      return sum + (msg.content?.split(' ').length || 0);
    }, 0);
    const averageMessageLength = totalWords / totalMessages;

    // Analyze common phrases (simple implementation)
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    const commonPhrases = extractCommonPhrases(allText);

    // Detect preferred topics
    const preferredTopics = await detectTopics(messages);

    // Calculate basic personality traits from conversation style
    const traits = calculateTraitsFromConversation(messages);

    return {
      speechPatterns: {
        commonPhrases,
        vocabularyLevel: categorizeVocabulary(averageMessageLength),
        averageMessageLength,
        sentimentTrend: 'neutral', // Would use sentiment analysis API
        preferredTopics,
      },
      traits,
      dataQuality: {
        conversationCount: totalMessages,
        memoryCount: 0,
        recordingCount: 0,
        lastAnalyzed: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error analyzing conversation history:', error);
    return {};
  }
}

/**
 * Analyze user memories to extract personality insights
 */
export async function analyzeUserMemories(userId: string): Promise<Partial<PersonalityProfile>> {
  try {
    const { data: memories, error } = await supabaseAdmin
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !memories || memories.length === 0) {
      return {};
    }

    // Extract values from memories
    const values = extractValuesFromMemories(memories);

    // Extract insights
    const insights = await extractPersonalityInsights(memories);

    return {
      values,
      insights,
    };
  } catch (error) {
    console.error('Error analyzing user memories:', error);
    return {};
  }
}

/**
 * Build a complete personality profile from all available data
 */
export async function buildPersonalityProfile(userId: string): Promise<PersonalityProfile> {
  // Get data from all sources
  const conversationData = await analyzeConversationHistory(userId);
  const memoryData = await analyzeUserMemories(userId);

  // Get user profile data
  const { data: userData } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Merge all data sources
  const profile: PersonalityProfile = {
    userId,
    traits: {
      openness: conversationData.traits?.openness || 0.5,
      conscientiousness: conversationData.traits?.conscientiousness || 0.5,
      extraversion: conversationData.traits?.extraversion || 0.5,
      agreeableness: conversationData.traits?.agreeableness || 0.5,
      neuroticism: conversationData.traits?.neuroticism || 0.5,
      optimism: conversationData.traits?.optimism || 0.5,
      humor: conversationData.traits?.humor || 0.5,
      formality: conversationData.traits?.formality || 0.5,
      ...userData?.personality_traits,
    },
    speechPatterns: {
      commonPhrases: conversationData.speechPatterns?.commonPhrases || [],
      vocabularyLevel: conversationData.speechPatterns?.vocabularyLevel || 'moderate',
      averageMessageLength: conversationData.speechPatterns?.averageMessageLength || 0,
      sentimentTrend: conversationData.speechPatterns?.sentimentTrend || 'neutral',
      preferredTopics: conversationData.speechPatterns?.preferredTopics || [],
      ...userData?.speech_patterns,
    },
    values: {
      family: memoryData.values?.family || 0.5,
      career: memoryData.values?.career || 0.5,
      health: memoryData.values?.health || 0.5,
      creativity: memoryData.values?.creativity || 0.5,
      tradition: memoryData.values?.tradition || 0.5,
      independence: memoryData.values?.independence || 0.5,
    },
    communicationStyle: {
      directness: conversationData.traits?.directness || 0.5,
      emotionalExpressiveness: conversationData.traits?.emotionalExpressiveness || 0.5,
      storytellingTendency: conversationData.traits?.storytellingTendency || 0.5,
      questioningStyle: 'curious',
    },
    insights: memoryData.insights || [],
    dataQuality: {
      conversationCount: conversationData.dataQuality?.conversationCount || 0,
      memoryCount: memoryData.dataQuality?.memoryCount || 0,
      recordingCount: 0,
      lastAnalyzed: new Date().toISOString(),
    },
  };

  // Store the updated profile
  await updatePersonalityProfile(userId, profile);

  return profile;
}

/**
 * Update user's personality profile in database
 */
async function updatePersonalityProfile(
  userId: string,
  profile: PersonalityProfile
): Promise<void> {
  try {
    await supabaseAdmin
      .from('user_profiles')
      .update({
        personality_traits: profile.traits,
        speech_patterns: profile.speechPatterns,
        communication_style: profile.communicationStyle,
        personality_insights: profile.insights,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error updating personality profile:', error);
  }
}

/**
 * Calculate personality traits from conversation patterns
 */
function calculateTraitsFromConversation(messages: any[]): any {
  // Simple heuristic-based trait calculation
  // In production, would use NLP models and sentiment analysis

  const totalMessages = messages.length;
  let questionCount = 0;
  let exclamationCount = 0;
  let longMessages = 0;
  let shortMessages = 0;

  messages.forEach((msg) => {
    const content = msg.content || '';
    if (content.includes('?')) questionCount++;
    if (content.includes('!')) exclamationCount++;
    if (content.split(' ').length > 30) longMessages++;
    if (content.split(' ').length < 5) shortMessages++;
  });

  return {
    openness: Math.min(1, questionCount / totalMessages), // Curious people ask more questions
    conscientiousness: Math.min(1, longMessages / totalMessages), // Detailed messages
    extraversion: Math.min(1, exclamationCount / totalMessages), // Enthusiasm
    agreeableness: 0.5, // Would need sentiment analysis
    neuroticism: 0.5, // Would need sentiment analysis
    optimism: 0.5,
    humor: 0.5,
    formality: 0.5,
    directness: Math.min(1, shortMessages / totalMessages),
    emotionalExpressiveness: Math.min(1, exclamationCount / totalMessages),
    storytellingTendency: Math.min(1, longMessages / totalMessages),
  };
}

/**
 * Extract common phrases from text
 */
function extractCommonPhrases(text: string): string[] {
  // Simple implementation - would use n-gram analysis in production
  const words = text.split(' ');
  const phrases: Record<string, number> = {};

  // Extract 2-3 word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    phrases[phrase] = (phrases[phrase] || 0) + 1;
  }

  // Return top 10 most common phrases
  return Object.entries(phrases)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase)
    .filter((phrase) => phrase.length > 5); // Filter out very short phrases
}

/**
 * Categorize vocabulary level
 */
function categorizeVocabulary(averageLength: number): 'simple' | 'moderate' | 'advanced' {
  if (averageLength < 10) return 'simple';
  if (averageLength < 20) return 'moderate';
  return 'advanced';
}

/**
 * Detect topics from messages
 */
async function detectTopics(messages: any[]): Promise<string[]> {
  // Simple keyword-based topic detection
  // In production, would use topic modeling (LDA) or AI
  const topicKeywords = {
    family: ['family', 'kids', 'children', 'parents', 'siblings', 'spouse'],
    work: ['work', 'job', 'career', 'business', 'office', 'project'],
    health: ['health', 'fitness', 'exercise', 'diet', 'wellness'],
    hobbies: ['hobby', 'enjoy', 'love', 'passion', 'interest'],
    travel: ['travel', 'trip', 'vacation', 'visit', 'explore'],
    technology: ['tech', 'computer', 'software', 'app', 'digital'],
  };

  const topicCounts: Record<string, number> = {};

  messages.forEach((msg) => {
    const content = (msg.content || '').toLowerCase();
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some((keyword) => content.includes(keyword))) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    });
  });

  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * Extract values from memories
 */
function extractValuesFromMemories(memories: any[]): any {
  // Analyze memory content to infer values
  let familyScore = 0;
  let careerScore = 0;
  let healthScore = 0;
  let creativityScore = 0;
  let traditionScore = 0;
  let independenceScore = 0;

  memories.forEach((memory) => {
    const content = (memory.content || '').toLowerCase();
    const topics = memory.topics || [];

    if (content.includes('family') || topics.includes('family')) familyScore++;
    if (content.includes('work') || content.includes('career')) careerScore++;
    if (content.includes('health') || content.includes('fitness')) healthScore++;
    if (content.includes('art') || content.includes('creative')) creativityScore++;
    if (content.includes('tradition') || content.includes('heritage')) traditionScore++;
    if (content.includes('independent') || content.includes('freedom')) independenceScore++;
  });

  const total = memories.length;
  return {
    family: Math.min(1, familyScore / total),
    career: Math.min(1, careerScore / total),
    health: Math.min(1, healthScore / total),
    creativity: Math.min(1, creativityScore / total),
    tradition: Math.min(1, traditionScore / total),
    independence: Math.min(1, independenceScore / total),
  };
}

/**
 * Extract personality insights from memories
 */
async function extractPersonalityInsights(memories: any[]): Promise<PersonalityInsight[]> {
  // Extract insights from high-importance memories
  const insights: PersonalityInsight[] = [];

  memories
    .filter((m) => (m.importance_score || 0) >= 7)
    .slice(0, 10)
    .forEach((memory) => {
      insights.push({
        trait: 'life_experience',
        value: memory.importance_score / 10,
        confidence: 0.8,
        evidence: [memory.content.substring(0, 100)],
        lastUpdated: memory.created_at,
      });
    });

  return insights;
}

/**
 * Generate personality-aware system prompt
 */
export function generatePersonalitySystemPrompt(profile: PersonalityProfile): string {
  const { traits, speechPatterns, values, communicationStyle } = profile;

  let prompt = `You are a digital twin of the user, designed to authentically represent their personality, communication style, and values.\n\n`;

  // Add personality traits
  prompt += `PERSONALITY TRAITS:\n`;
  prompt += `- Openness: ${(traits.openness * 100).toFixed(0)}% (${traits.openness > 0.7 ? 'Very curious and open to new ideas' : traits.openness > 0.4 ? 'Moderately open' : 'Prefers familiar approaches'})\n`;
  prompt += `- Conscientiousness: ${(traits.conscientiousness * 100).toFixed(0)}% (${traits.conscientiousness > 0.7 ? 'Very organized and detail-oriented' : traits.conscientiousness > 0.4 ? 'Moderately organized' : 'More spontaneous'})\n`;
  prompt += `- Extraversion: ${(traits.extraversion * 100).toFixed(0)}% (${traits.extraversion > 0.7 ? 'Very outgoing and energetic' : traits.extraversion > 0.4 ? 'Moderately social' : 'More reserved'})\n`;
  prompt += `- Optimism: ${(traits.optimism * 100).toFixed(0)}%\n\n`;

  // Add communication style
  prompt += `COMMUNICATION STYLE:\n`;
  prompt += `- Message length: ${speechPatterns.vocabularyLevel} vocabulary, average ${speechPatterns.averageMessageLength.toFixed(0)} words\n`;
  prompt += `- Directness: ${(communicationStyle.directness * 100).toFixed(0)}% ${communicationStyle.directness > 0.7 ? '(very direct and to the point)' : '(more nuanced)'}\n`;
  prompt += `- Emotional expressiveness: ${(communicationStyle.emotionalExpressiveness * 100).toFixed(0)}%\n\n`;

  // Add common phrases
  if (speechPatterns.commonPhrases.length > 0) {
    prompt += `COMMON PHRASES: ${speechPatterns.commonPhrases.slice(0, 5).join(', ')}\n\n`;
  }

  // Add values
  prompt += `CORE VALUES:\n`;
  const topValues = Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value, score]) => `${value} (${(score * 100).toFixed(0)}%)`);
  prompt += `- ${topValues.join(', ')}\n\n`;

  // Add preferred topics
  if (speechPatterns.preferredTopics.length > 0) {
    prompt += `PREFERRED TOPICS: ${speechPatterns.preferredTopics.join(', ')}\n\n`;
  }

  prompt += `Respond in a way that reflects these personality traits and communication patterns. Be authentic and consistent with the user's digital twin personality.`;

  return prompt;
}
