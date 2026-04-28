/**
 * Groq LLM provider — fast inference via OpenAI-compatible API.
 *
 * Uses https://api.groq.com/openai/v1 as the base URL.
 */

import { OpenAIProvider } from './openai.js';
import { registerProvider } from './registry.js';
import type { LLMProviderConfig } from './types.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

export function registerGroq(): void {
  registerProvider(
    'groq',
    (c) => new GroqProvider(c),
    'GROQ_API_KEY',
  );
}

class GroqProvider extends OpenAIProvider {
  constructor(config: LLMProviderConfig) {
    super(
      { ...config, baseUrl: config.baseUrl ?? GROQ_BASE_URL },
      'groq',
    );
    this.models = MODELS;
    this.defaultModelName = 'llama-3.3-70b-versatile';
  }
}
