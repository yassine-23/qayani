export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationSession {
  id: string;
  agentName: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryBackend {
  saveMessage(agentName: string, sessionId: string, message: ConversationMessage): Promise<void>;
  getHistory(agentName: string, sessionId: string): Promise<ConversationMessage[]>;
  listSessions(agentName: string): Promise<ConversationSession[]>;
  deleteSession(agentName: string, sessionId: string): Promise<void>;
  getAgentDir(agentName: string): string;
}
