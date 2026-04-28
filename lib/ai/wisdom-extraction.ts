/**
 * Wisdom Highlights Extraction System
 *
 * Extracts meaningful quotes, insights, and life lessons
 * from conversations, memories, and recordings
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../supabase/admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface WisdomHighlight {
  id?: string;
  userId: string;
  sourceType: 'memory' | 'conversation' | 'recording';
  sourceId: string;
  quote: string;
  context?: string;
  category: string;
  importance: number; // 1-10
  topics: string[];
  emotionalTone: 'inspiring' | 'reflective' | 'humorous' | 'profound' | 'practical';
  extractedAt: string;
  metadata?: any;
}

export interface WisdomCategory {
  name: string;
  description: string;
  keywords: string[];
}

// Predefined wisdom categories
export const WISDOM_CATEGORIES: WisdomCategory[] = [
  {
    name: 'Life Lessons',
    description: 'Lessons learned from experiences',
    keywords: ['learned', 'realized', 'understand', 'lesson', 'experience'],
  },
  {
    name: 'Family Values',
    description: 'Insights about family and relationships',
    keywords: ['family', 'children', 'love', 'parents', 'siblings', 'relationships'],
  },
  {
    name: 'Career & Success',
    description: 'Professional wisdom and work ethic',
    keywords: ['work', 'career', 'success', 'business', 'professional', 'achievement'],
  },
  {
    name: 'Personal Growth',
    description: 'Self-improvement and character development',
    keywords: ['grow', 'improve', 'change', 'develop', 'better', 'stronger'],
  },
  {
    name: 'Health & Wellness',
    description: 'Physical and mental health insights',
    keywords: ['health', 'wellness', 'fitness', 'mental', 'body', 'mind'],
  },
  {
    name: 'Relationships',
    description: 'Wisdom about human connections',
    keywords: ['friend', 'relationship', 'trust', 'communication', 'connection'],
  },
  {
    name: 'Overcoming Challenges',
    description: 'Resilience and problem-solving',
    keywords: ['challenge', 'difficult', 'overcome', 'persevere', 'resilient', 'struggle'],
  },
  {
    name: 'Gratitude & Joy',
    description: 'Appreciation and happiness',
    keywords: ['grateful', 'thankful', 'blessed', 'happy', 'joy', 'appreciate'],
  },
  {
    name: 'Life Philosophy',
    description: 'Core beliefs and worldview',
    keywords: ['believe', 'philosophy', 'principle', 'value', 'meaning', 'purpose'],
  },
  {
    name: 'Humor & Wit',
    description: 'Funny and lighthearted moments',
    keywords: ['funny', 'laugh', 'humor', 'joke', 'hilarious', 'amusing'],
  },
];

/**
 * Extract wisdom highlights from text using AI
 */
export async function extractWisdomFromText(
  userId: string,
  text: string,
  sourceType: 'memory' | 'conversation' | 'recording',
  sourceId: string
): Promise<WisdomHighlight[]> {
  try {
    const prompt = `Analyze the following text and extract meaningful wisdom, insights, life lessons, or memorable quotes.

Text: "${text}"

For each piece of wisdom you find, provide:
1. The exact quote (or rephrased if needed for clarity)
2. A brief context explanation (1 sentence)
3. Category (Life Lessons, Family Values, Career & Success, Personal Growth, Health & Wellness, Relationships, Overcoming Challenges, Gratitude & Joy, Life Philosophy, or Humor & Wit)
4. Importance score (1-10, where 10 is most profound/meaningful)
5. Emotional tone (inspiring, reflective, humorous, profound, or practical)
6. 2-3 relevant topic keywords

Return ONLY a JSON array of wisdom objects. If no significant wisdom is found, return an empty array.

Format:
[
  {
    "quote": "exact quote here",
    "context": "brief context",
    "category": "category name",
    "importance": 8,
    "topics": ["topic1", "topic2"],
    "emotionalTone": "inspiring"
  }
]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at identifying meaningful wisdom, insights, and life lessons from personal narratives. Extract only genuinely meaningful content, not generic statements.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    const wisdomArray = Array.isArray(parsed) ? parsed : parsed.wisdom || [];

    // Map to WisdomHighlight format
    const highlights: WisdomHighlight[] = wisdomArray.map((item: any) => ({
      userId,
      sourceType,
      sourceId,
      quote: item.quote || '',
      context: item.context || '',
      category: item.category || 'Life Philosophy',
      importance: item.importance || 5,
      topics: item.topics || [],
      emotionalTone: item.emotionalTone || 'reflective',
      extractedAt: new Date().toISOString(),
      metadata: {},
    }));

    return highlights.filter((h) => h.quote.length > 10); // Filter out very short quotes
  } catch (error) {
    console.error('Error extracting wisdom from text:', error);
    return [];
  }
}

/**
 * Store wisdom highlight in database
 */
export async function storeWisdomHighlight(highlight: WisdomHighlight): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wisdom_highlights')
      .insert({
        user_id: highlight.userId,
        source_type: highlight.sourceType,
        source_id: highlight.sourceId,
        quote: highlight.quote,
        context: highlight.context,
        category: highlight.category,
        importance: highlight.importance,
        topics: highlight.topics,
        emotional_tone: highlight.emotionalTone,
        metadata: highlight.metadata || {},
        extracted_at: highlight.extractedAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing wisdom highlight:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error storing wisdom highlight:', error);
    return null;
  }
}

/**
 * Extract and store wisdom from a memory
 */
export async function processMemoryForWisdom(
  userId: string,
  memoryId: string,
  content: string
): Promise<number> {
  try {
    const highlights = await extractWisdomFromText(userId, content, 'memory', memoryId);

    let stored = 0;
    for (const highlight of highlights) {
      const id = await storeWisdomHighlight(highlight);
      if (id) stored++;
    }

    return stored;
  } catch (error) {
    console.error('Error processing memory for wisdom:', error);
    return 0;
  }
}

/**
 * Extract and store wisdom from a conversation
 */
export async function processConversationForWisdom(
  userId: string,
  messageId: string,
  content: string
): Promise<number> {
  try {
    const highlights = await extractWisdomFromText(userId, content, 'conversation', messageId);

    let stored = 0;
    for (const highlight of highlights) {
      const id = await storeWisdomHighlight(highlight);
      if (id) stored++;
    }

    return stored;
  } catch (error) {
    console.error('Error processing conversation for wisdom:', error);
    return 0;
  }
}

/**
 * Get wisdom highlights for a user
 */
export async function getUserWisdomHighlights(
  userId: string,
  options?: {
    category?: string;
    minImportance?: number;
    limit?: number;
    sortBy?: 'importance' | 'date';
  }
): Promise<WisdomHighlight[]> {
  try {
    let query = supabaseAdmin
      .from('wisdom_highlights')
      .select('*')
      .eq('user_id', userId);

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.minImportance) {
      query = query.gte('importance', options.minImportance);
    }

    const sortField = options?.sortBy === 'importance' ? 'importance' : 'extracted_at';
    query = query.order(sortField, { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching wisdom highlights:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      sourceType: item.source_type,
      sourceId: item.source_id,
      quote: item.quote,
      context: item.context,
      category: item.category,
      importance: item.importance,
      topics: item.topics,
      emotionalTone: item.emotional_tone,
      extractedAt: item.extracted_at,
      metadata: item.metadata,
    }));
  } catch (error) {
    console.error('Error getting wisdom highlights:', error);
    return [];
  }
}

/**
 * Get wisdom highlights by category
 */
export async function getWisdomByCategory(
  userId: string
): Promise<Record<string, WisdomHighlight[]>> {
  try {
    const allHighlights = await getUserWisdomHighlights(userId, {
      sortBy: 'importance',
    });

    const byCategory: Record<string, WisdomHighlight[]> = {};

    allHighlights.forEach((highlight) => {
      if (!byCategory[highlight.category]) {
        byCategory[highlight.category] = [];
      }
      byCategory[highlight.category].push(highlight);
    });

    return byCategory;
  } catch (error) {
    console.error('Error getting wisdom by category:', error);
    return {};
  }
}

/**
 * Get top wisdom highlights
 */
export async function getTopWisdom(
  userId: string,
  count: number = 10
): Promise<WisdomHighlight[]> {
  return getUserWisdomHighlights(userId, {
    minImportance: 7,
    limit: count,
    sortBy: 'importance',
  });
}

/**
 * Search wisdom highlights by keyword
 */
export async function searchWisdom(
  userId: string,
  keyword: string
): Promise<WisdomHighlight[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wisdom_highlights')
      .select('*')
      .eq('user_id', userId)
      .or(`quote.ilike.%${keyword}%,context.ilike.%${keyword}%`)
      .order('importance', { ascending: false });

    if (error) {
      console.error('Error searching wisdom:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      sourceType: item.source_type,
      sourceId: item.source_id,
      quote: item.quote,
      context: item.context,
      category: item.category,
      importance: item.importance,
      topics: item.topics,
      emotionalTone: item.emotional_tone,
      extractedAt: item.extracted_at,
      metadata: item.metadata,
    }));
  } catch (error) {
    console.error('Error searching wisdom:', error);
    return [];
  }
}

/**
 * Get wisdom statistics for a user
 */
export async function getWisdomStats(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('wisdom_highlights')
      .select('category, importance, emotional_tone')
      .eq('user_id', userId);

    if (error || !data) {
      return null;
    }

    const stats = {
      total: data.length,
      byCategory: {} as Record<string, number>,
      byTone: {} as Record<string, number>,
      averageImportance: 0,
      highImportance: data.filter((h) => h.importance >= 8).length,
    };

    let totalImportance = 0;

    data.forEach((highlight) => {
      // Count by category
      stats.byCategory[highlight.category] =
        (stats.byCategory[highlight.category] || 0) + 1;

      // Count by tone
      stats.byTone[highlight.emotional_tone] =
        (stats.byTone[highlight.emotional_tone] || 0) + 1;

      totalImportance += highlight.importance;
    });

    stats.averageImportance = data.length > 0 ? totalImportance / data.length : 0;

    return stats;
  } catch (error) {
    console.error('Error getting wisdom stats:', error);
    return null;
  }
}

/**
 * Batch process existing memories for wisdom extraction
 */
export async function batchExtractWisdomFromMemories(
  userId: string,
  limit: number = 50
): Promise<{ processed: number; extracted: number }> {
  try {
    const { data: memories, error } = await supabaseAdmin
      .from('user_memories')
      .select('id, content')
      .eq('user_id', userId)
      .gte('importance_score', 6) // Only process important memories
      .limit(limit);

    if (error || !memories) {
      return { processed: 0, extracted: 0 };
    }

    let processed = 0;
    let extracted = 0;

    for (const memory of memories) {
      const count = await processMemoryForWisdom(userId, memory.id, memory.content);
      processed++;
      extracted += count;
    }

    return { processed, extracted };
  } catch (error) {
    console.error('Error batch extracting wisdom:', error);
    return { processed: 0, extracted: 0 };
  }
}
