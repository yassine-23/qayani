import type { LLMMessage } from '../llm/types.js';

export type { LLMMessage };

export interface AgentConfig {
  name: string;
  version: string;
  description: string;
  model: {
    provider: string;
    name: string;
    temperature?: number;
    maxTokens?: number;
  };
  memory: {
    backend: string;
    maxHistory?: number;
  };
  persona?: {
    traits?: Record<string, number>;
    voice?: string;
    expertise?: string[];
  };
  tools?: string[];
  vars?: Record<string, string>;
}

export interface AgentRuntime {
  config: AgentConfig;
  systemPrompt: string;
  conversationId: string;
}
