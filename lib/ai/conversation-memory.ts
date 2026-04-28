/**
 * Conversation Memory System
 *
 * Manages conversation history and sessions for the chat system.
 * This is a simplified implementation that works with our Supabase database.
 */

import { supabaseAdmin } from '../supabase/admin';

export interface ConversationSession {
  id: string;
  user_id: string;
  personality_id?: string;
  title: string;
  summary?: string;
  message_count: number;
  total_tokens?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * PostgresChatHistory - Manages conversation history in PostgreSQL
 */
export class PostgresChatHistory {
  constructor(
    private sessionId: string,
    private userId: string
  ) {}

  /**
   * Add a message to the conversation history
   */
  async addMessage(message: ChatMessage): Promise<void> {
    const { error } = await supabaseAdmin
      .from('conversation_history')
      .insert({
        session_id: this.sessionId,
        user_id: this.userId,
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Error adding message to history:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for this session
   */
  async getMessages(limit?: number): Promise<ChatMessage[]> {
    let query = supabaseAdmin
      .from('conversation_history')
      .select('role, content, timestamp')
      .eq('session_id', this.sessionId)
      .order('timestamp', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }

    return (data || []).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  /**
   * Clear conversation history
   */
  async clear(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('conversation_history')
      .delete()
      .eq('session_id', this.sessionId);

    if (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }
}

/**
 * Create conversation memory for a session
 */
export async function createConversationMemory(
  userId: string,
  personalityId?: string
): Promise<{ sessionId: string; chatHistory: PostgresChatHistory }> {
  // Create new session
  const { data: session, error } = await supabaseAdmin
    .from('conversation_sessions')
    .insert({
      user_id: userId,
      personality_id: personalityId || null,
      title: 'New Conversation',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  const chatHistory = new PostgresChatHistory(session.id, userId);

  return { sessionId: session.id, chatHistory };
}

/**
 * Get conversation summary
 */
export async function getConversationSummary(
  sessionId: string
): Promise<string> {
  const { data: session, error } = await supabaseAdmin
    .from('conversation_sessions')
    .select('summary, title')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return '';
  }

  return session.summary || session.title || '';
}

/**
 * Get user conversation sessions
 */
export async function getUserConversationSessions(
  userId: string,
  limit: number = 10
): Promise<ConversationSession[]> {
  const { data, error } = await supabaseAdmin
    .from('conversation_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting sessions:', error);
    return [];
  }

  return data as ConversationSession[];
}

/**
 * Update session metadata (message count, tokens, etc.)
 */
export async function updateSessionMetadata(
  sessionId: string,
  metadata: {
    messageCount?: number;
    totalTokens?: number;
    summary?: string;
  }
): Promise<void> {
  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (metadata.messageCount !== undefined) {
    updates.message_count = metadata.messageCount;
  }
  if (metadata.totalTokens !== undefined) {
    updates.total_tokens = metadata.totalTokens;
  }
  if (metadata.summary) {
    updates.summary = metadata.summary;
  }

  const { error } = await supabaseAdmin
    .from('conversation_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session metadata:', error);
    throw error;
  }
}

/**
 * Delete a conversation session and its history
 */
export async function deleteConversationSession(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // Delete conversation history first
    await supabaseAdmin
      .from('conversation_history')
      .delete()
      .eq('session_id', sessionId);

    // Delete session
    const { error } = await supabaseAdmin
      .from('conversation_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting session:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error };
  }
}

/**
 * Export conversation session as JSON
 */
export async function exportConversation(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Get session metadata
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: sessionError || 'Session not found' };
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('conversation_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      return { success: false, error: messagesError };
    }

    return {
      success: true,
      data: {
        session,
        messages: messages || [],
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error exporting conversation:', error);
    return { success: false, error };
  }
}
