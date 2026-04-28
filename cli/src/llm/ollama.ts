/**
 * Ollama LLM provider — local models via OpenAI-compatible API.
 *
 * Runs against http://localhost:11434/v1 by default.
 * No API key required.
 */

import { OpenAIProvider } from './openai.js';
import { registerProvider } from './registry.js';
import type { LLMProviderConfig } from './types.js';

const OLLAMA_BASE_URL = 'http://localhost:11434/v1';

const MODELS = [
  'llama3.3',
  'llama3.1',
  'mistral',
  'mixtral',
  'codellama',
  'phi3',
  'gemma2',
] as const;

export function registerOllama(): void {
  registerProvider(
    'ollama',
    (c) => new OllamaProvider(c),
    'OLLAMA_API_KEY', // not actually needed, but keeps the pattern consistent
  );
}

class OllamaProvider extends OpenAIProvider {
  constructor(config: LLMProviderConfig) {
    super(
      {
        ...config,
        apiKey: config.apiKey || 'ollama', // Ollama doesn't need a real key
        baseUrl: config.baseUrl ?? OLLAMA_BASE_URL,
      },
      'ollama',
    );
    this.models = MODELS;
    this.defaultModelName = 'llama3.3';
  }
}
