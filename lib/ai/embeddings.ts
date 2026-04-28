/**
 * Vector Embeddings Service
 *
 * Generates and manages vector embeddings for semantic search
 * Uses OpenAI's text-embedding-ada-002 model (1536 dimensions)
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../supabase/admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface EmbeddingResult {
  id: string;
  contentType: string;
  contentId: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

export interface SearchResult {
  id: string;
  contentType: string;
  contentId: string;
  contentSnippet: string;
  similarity: number;
  metadata: any;
  createdAt: string;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Clean and truncate text (OpenAI has 8191 token limit for ada-002)
    const cleanText = text.replace(/\n/g, ' ').substring(0, 8000);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: cleanText,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    // Clean texts
    const cleanTexts = texts.map((text) =>
      text.replace(/\n/g, ' ').substring(0, 8000)
    );

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: cleanTexts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}

/**
 * Store embedding for memory
 */
export async function storeMemoryEmbedding(
  userId: string,
  memoryId: string,
  content: string,
  metadata?: any
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    const contentSnippet = content.substring(0, 500);

    await supabaseAdmin.from('memory_embeddings').upsert({
      user_id: userId,
      memory_id: memoryId,
      content_type: 'memory',
      content_id: memoryId,
      content_snippet: contentSnippet,
      embedding: JSON.stringify(embedding),
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error storing memory embedding:', error);
    throw error;
  }
}

/**
 * Store embedding for conversation message
 */
export async function storeConversationEmbedding(
  userId: string,
  sessionId: string,
  messageId: string,
  role: string,
  content: string,
  metadata?: any
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    const contentSnippet = content.substring(0, 500);

    await supabaseAdmin.from('conversation_embeddings').upsert({
      user_id: userId,
      session_id: sessionId,
      message_id: messageId,
      role,
      content_snippet: contentSnippet,
      embedding: JSON.stringify(embedding),
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Error storing conversation embedding:', error);
    throw error;
  }
}

/**
 * Process embedding queue (background job)
 */
export async function processEmbeddingQueue(
  limit: number = 10
): Promise<EmbeddingResult[]> {
  try {
    // Get pending items from queue
    const { data: queueItems, error: fetchError } = await supabaseAdmin
      .from('embedding_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchError || !queueItems || queueItems.length === 0) {
      return [];
    }

    const results: EmbeddingResult[] = [];

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('embedding_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Generate and store embedding
        if (item.content_type === 'memory') {
          await storeMemoryEmbedding(
            item.user_id,
            item.content_id,
            item.content_text
          );
        } else if (item.content_type === 'conversation') {
          // Get conversation details
          const { data: message } = await supabaseAdmin
            .from('conversation_history')
            .select('session_id, role')
            .eq('id', item.content_id)
            .single();

          if (message) {
            await storeConversationEmbedding(
              item.user_id,
              message.session_id,
              item.content_id,
              message.role,
              item.content_text
            );
          }
        }

        // Mark as completed
        await supabaseAdmin
          .from('embedding_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          embedding: [],
          success: true,
        });
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);

        // Mark as failed
        await supabaseAdmin
          .from('embedding_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({
          id: item.id,
          contentType: item.content_type,
          contentId: item.content_id,
          embedding: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing embedding queue:', error);
    return [];
  }
}

/**
 * Search memories by semantic similarity
 */
export async function searchMemories(
  userId: string,
  query: string,
  options?: {
    matchThreshold?: number;
    matchCount?: number;
    contentType?: string;
  }
): Promise<SearchResult[]> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Call database function for similarity search
    const { data, error } = await supabaseAdmin.rpc('search_memories_by_similarity', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_threshold: options?.matchThreshold || 0.7,
      p_match_count: options?.matchCount || 10,
      p_content_type: options?.contentType || null,
    });

    if (error) {
      console.error('Error searching memories:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in semantic search:', error);
    return [];
  }
}

/**
 * Search conversations by semantic similarity
 */
export async function searchConversations(
  userId: string,
  query: string,
  options?: {
    matchThreshold?: number;
    matchCount?: number;
  }
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabaseAdmin.rpc(
      'search_conversations_by_similarity',
      {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_threshold: options?.matchThreshold || 0.7,
        p_match_count: options?.matchCount || 10,
      }
    );

    if (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in conversation search:', error);
    return [];
  }
}

/**
 * Hybrid search: Search across all content types
 */
export async function searchAllContent(
  userId: string,
  query: string,
  options?: {
    matchThreshold?: number;
    matchCount?: number;
  }
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabaseAdmin.rpc(
      'search_all_content_by_similarity',
      {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_match_threshold: options?.matchThreshold || 0.7,
        p_match_count: options?.matchCount || 20,
      }
    );

    if (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in hybrid search:', error);
    return [];
  }
}

/**
 * Get relevant context for RAG (Retrieval-Augmented Generation)
 */
export async function getRelevantContext(
  userId: string,
  query: string,
  maxResults: number = 5
): Promise<{
  memories: SearchResult[];
  conversations: SearchResult[];
  combinedContext: string;
}> {
  try {
    // Search both memories and conversations
    const [memories, conversations] = await Promise.all([
      searchMemories(userId, query, { matchCount: maxResults, matchThreshold: 0.65 }),
      searchConversations(userId, query, { matchCount: maxResults, matchThreshold: 0.65 }),
    ]);

    // Combine and format context for AI
    let combinedContext = '';

    if (memories.length > 0) {
      combinedContext += 'RELEVANT MEMORIES:\n';
      memories.forEach((mem, idx) => {
        combinedContext += `${idx + 1}. ${mem.contentSnippet} (Relevance: ${(mem.similarity * 100).toFixed(0)}%)\n`;
      });
      combinedContext += '\n';
    }

    if (conversations.length > 0) {
      combinedContext += 'RELEVANT PAST CONVERSATIONS:\n';
      conversations.forEach((conv, idx) => {
        combinedContext += `${idx + 1}. ${conv.contentSnippet} (Relevance: ${(conv.similarity * 100).toFixed(0)}%)\n`;
      });
      combinedContext += '\n';
    }

    return {
      memories,
      conversations,
      combinedContext,
    };
  } catch (error) {
    console.error('Error getting relevant context:', error);
    return {
      memories: [],
      conversations: [],
      combinedContext: '',
    };
  }
}

/**
 * Batch process all existing memories (one-time migration)
 */
export async function batchProcessExistingMemories(userId: string): Promise<void> {
  try {
    const { data: memories, error } = await supabaseAdmin
      .from('user_memories')
      .select('id, content')
      .eq('user_id', userId);

    if (error || !memories) {
      console.error('Error fetching memories:', error);
      return;
    }

    console.log(`Processing ${memories.length} memories for user ${userId}`);

    // Process in batches of 10
    for (let i = 0; i < memories.length; i += 10) {
      const batch = memories.slice(i, i + 10);

      await Promise.all(
        batch.map((memory) =>
          storeMemoryEmbedding(userId, memory.id, memory.content)
        )
      );

      console.log(`Processed ${Math.min(i + 10, memories.length)}/${memories.length} memories`);
    }

    console.log('Batch processing complete');
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}

/**
 * Get embedding queue statistics
 */
export async function getEmbeddingQueueStats(userId?: string) {
  try {
    let query = supabaseAdmin.from('embedding_queue').select('status', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error getting queue stats:', error);
      return null;
    }

    const stats = {
      total: count || 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    if (data) {
      data.forEach((item) => {
        if (item.status === 'pending') stats.pending++;
        if (item.status === 'processing') stats.processing++;
        if (item.status === 'completed') stats.completed++;
        if (item.status === 'failed') stats.failed++;
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}
