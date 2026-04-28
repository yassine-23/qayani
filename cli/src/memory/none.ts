/**
 * Null memory backend — discards all messages.
 * Used when memory.backend is 'none'.
 */

import type {
  MemoryBackend,
  ConversationMessage,
  ConversationSession,
} from './types.js';

export class NoMemoryBackend implements MemoryBackend {
  getAgentDir(_agentName: string): string {
    return '';
  }
  async saveMessage(
    _agentName: string,
    _sessionId: string,
    _message: ConversationMessage,
  ): Promise<void> {
    // no-op
  }
  async getHistory(
    _agentName: string,
    _sessionId: string,
  ): Promise<ConversationMessage[]> {
    return [];
  }
  async listSessions(_agentName: string): Promise<ConversationSession[]> {
    return [];
  }
  async deleteSession(_agentName: string, _sessionId: string): Promise<void> {
    // no-op
  }
}
