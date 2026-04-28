/**
 * OpenRouter LLM provider — access 300+ models via OpenAI-compatible API.
 *
 * Uses https://openrouter.ai/api/v1 as the base URL.
 */

import { OpenAIProvider } from './openai.js';
import { registerProvider } from './registry.js';
import type { LLMProviderConfig } from './types.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4',
  'google/gemini-2.5-pro',
  'google/gemini-2.0-flash',
  'meta-llama/llama-3.3-70b-instruct',
  'mistralai/mistral-large',
  'deepseek/deepseek-chat-v3',
] as const;

export function registerOpenRouter(): void {
  registerProvider(
    'openrouter',
    (c) => new OpenRouterProvider(c),
    'OPENROUTER_API_KEY',
  );
}

class OpenRouterProvider extends OpenAIProvider {
  constructor(config: LLMProviderConfig) {
    super(
      { ...config, baseUrl: config.baseUrl ?? OPENROUTER_BASE_URL },
      'openrouter',
    );
    this.models = MODELS;
    this.defaultModelName = 'openai/gpt-4o-mini';
  }
}
