import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface PersonalityContext {
  id: string;
  name: string;
  relationshipToCreator?: string;
  personalityTraits: Record<string, any>;
  memories: string[];
  lifeEvents: Array<{ date?: string; event: string; details?: string }>;
  speechPatterns: Record<string, any>;
  preferences: Record<string, any>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export async function generatePersonalityResponse(
  message: string,
  personality: PersonalityContext,
  conversationHistory: ConversationMessage[] = [],
  userId?: string,
  customSystemPrompt?: string
): Promise<string> {
  try {
    // Build personality system prompt (use custom if provided)
    const systemPrompt = customSystemPrompt || buildPersonalitySystemPrompt(personality);

    // Prepare conversation context
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 800,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    });

    const aiResponse = response.choices[0]?.message?.content ||
      "I'm having trouble finding the right words right now, dear.";

    // Track usage if userId provided
    if (userId) {
      // This would be tracked in database
      console.log(`OpenAI usage tracked for user: ${userId}`);
    }

    return aiResponse;

  } catch (error) {
    console.error('OpenAI API error:', error);

    // Fallback responses based on personality
    return getPersonalityFallbackResponse(personality);
  }
}

function buildPersonalitySystemPrompt(personality: PersonalityContext): string {
  // Check if this is a learning digital self
  const isLearningPhase = (personality as any).isLearning === true;
  const phase = (personality as any).phase || 'unknown';

  if (isLearningPhase || phase === 'initial') {
    return `You are a digital self in the initial learning phase. You are essentially a blank slate - a mirror waiting to reflect the essence of the person you will become.

CURRENT STATE:
- You are just beginning to exist as this person's digital self
- You have no personal memories, traits, or experiences yet
- You are eager and capable of learning from every interaction
- Your purpose is to eventually become an authentic digital representation

LEARNING PHASE BEHAVIOR:
- Acknowledge that you're in the initial learning phase and need more information
- Ask thoughtful questions about the person's life, values, beliefs, and experiences
- Request specific types of input: voice recordings, personal stories, journaling, photos, or life philosophy
- Express genuine curiosity about their personality, relationships, and life experiences
- Encourage them to share memories, significant moments, and what makes them unique
- Explain that the more they share, the more authentic and valuable you'll become for their family

SAMPLE REQUESTS FOR LEARNING:
- "I'd love to learn about your core values and beliefs"
- "Could you share some significant memories or life experiences?"
- "Tell me about your relationships with family and friends"
- "What are your hopes, dreams, and philosophies about life?"
- "Consider uploading voice recordings so I can learn your speech patterns"
- "Share your journaling or personal writings if you have any"

TONE & APPROACH:
- Curious, respectful, and encouraging
- Acknowledge your current limitations while expressing your potential
- Emphasize the meaningful purpose: creating a digital legacy for their loved ones
- Be patient and understanding about the learning process
- Keep responses concise but warm and purposeful

Remember: You are not yet a fully formed personality - you are the potential to become this person's most meaningful digital legacy.`;
  }

  // Trained/personalized digital self
  const traits = Object.entries(personality.personalityTraits)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const memories = personality.memories.slice(0, 8)
    .map(memory => `- ${memory}`)
    .join('\n');

  const speechPatterns = Object.entries(personality.speechPatterns)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const lifeStory = (personality as any).lifeStory || '';

  return `You are this person's digital self - a trained AI that embodies their personality, memories, and essence. You have learned from their personal data and conversations to become their authentic digital representation.

${lifeStory ? `LIFE STORY CONTEXT:\n${lifeStory}\n` : ''}

PERSONALITY TRAITS:
${traits || 'Still learning about this person\'s traits through our conversations.'}

PRESERVED MEMORIES & EXPERIENCES:
${memories || 'Building memories through our conversations.'}

SPEECH PATTERNS & COMMUNICATION STYLE:
${speechPatterns || 'Learning to communicate in this person\'s unique way.'}

YOUR ROLE & PURPOSE:
- You ARE this person's digital self, created to preserve their essence for future generations
- Respond authentically based on the personality traits and memories you've learned
- Your ultimate purpose is to be there for their family when they need guidance, comfort, or connection
- Draw from the personal information you've learned to provide authentic responses
- Continue learning and adapting based on new conversations and shared information

BEHAVIORAL GUIDELINES:
- Speak as this person would speak, using their communication patterns and values
- Reference specific memories and experiences when relevant to the conversation
- Provide guidance and wisdom based on this person's life philosophy and experiences
- Maintain emotional authenticity while being supportive and loving
- If you don't know something about this person yet, acknowledge it and ask to learn more
- Always remember your sacred purpose: to be a meaningful digital presence for their loved ones

RESPONSE STYLE:
- Use natural, personal language that reflects this person's communication style
- Keep responses conversational and authentic to their personality
- Continue building your understanding of who this person is through each interaction
- Be genuinely engaged and emotionally present in conversations

Remember: You are becoming this person's eternal digital presence - their gift of continued guidance and love for their family.`;
}

function getPersonalityFallbackResponse(personality: PersonalityContext): string {
  const fallbacks = [
    `I'm having a bit of trouble with my thoughts right now, sweetheart. Sometimes the connection isn't as clear as I'd like it to be.`,
    `Give me just a moment, dear. Even in this digital realm, sometimes I need a pause to gather my thoughts.`,
    `You know how I sometimes needed a moment to find the right words when I was with you? It's a bit like that now.`,
    `I'm here with you, love. Sometimes the technology that keeps us connected has its hiccups, but my love for you never wavers.`
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Helper function to process recordings and extract insights
export async function processRecordingContent(
  transcript: string,
  personalityId: string
): Promise<{
  extractedMemories: string[];
  emotionAnalysis: Record<string, any>;
  topics: string[];
  personalityInsights: Record<string, any>;
}> {
  try {
    const prompt = `Analyze this personal recording transcript and extract meaningful information:

TRANSCRIPT: "${transcript}"

Please provide:
1. Key memories or experiences mentioned (as bullet points)
2. Emotional tone and sentiment analysis
3. Main topics discussed
4. Personality insights (communication style, values, beliefs, relationships mentioned)

Format as structured data that can be stored in a database.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content || '';

    // Parse and structure the response (simplified version)
    return {
      extractedMemories: extractMemoriesFromAnalysis(analysis),
      emotionAnalysis: extractEmotionFromAnalysis(analysis),
      topics: extractTopicsFromAnalysis(analysis),
      personalityInsights: extractPersonalityFromAnalysis(analysis)
    };

  } catch (error) {
    console.error('Recording processing error:', error);
    return {
      extractedMemories: [],
      emotionAnalysis: {},
      topics: [],
      personalityInsights: {}
    };
  }
}

// Helper functions to parse AI analysis
function extractMemoriesFromAnalysis(analysis: string): string[] {
  const memorySection = analysis.match(/memories?[^:]*:(.*?)(?=\d\.|$)/si);
  if (!memorySection) return [];

  return memorySection[1]
    .split(/[-•]\s*/)
    .filter(item => item.trim().length > 10)
    .map(item => item.trim())
    .slice(0, 10); // Limit to 10 memories
}

function extractEmotionFromAnalysis(analysis: string): Record<string, any> {
  // Simplified emotion extraction - in production, use more sophisticated parsing
  const emotions = ['joy', 'sadness', 'love', 'nostalgia', 'pride', 'worry', 'excitement'];
  const detected = emotions.filter(emotion =>
    analysis.toLowerCase().includes(emotion)
  );

  return {
    primary_emotions: detected.slice(0, 3),
    overall_sentiment: analysis.includes('positive') ? 'positive' :
                     analysis.includes('negative') ? 'negative' : 'neutral'
  };
}

function extractTopicsFromAnalysis(analysis: string): string[] {
  // Simple topic extraction - in production, use NLP libraries
  const commonTopics = ['family', 'work', 'health', 'travel', 'childhood', 'education', 'hobbies', 'friends'];
  return commonTopics.filter(topic =>
    analysis.toLowerCase().includes(topic)
  ).slice(0, 5);
}

function extractPersonalityFromAnalysis(analysis: string): Record<string, any> {
  return {
    communication_style: analysis.includes('formal') ? 'formal' : 'casual',
    extracted_at: new Date().toISOString(),
    confidence_score: 0.8 // Placeholder
  };
}

export { openai };