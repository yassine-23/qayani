/**
 * OpenAI LLM provider — uses the official `openai` npm package.
 */

import OpenAI from 'openai';
import type {
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
  LLMStreamChunk,
  LLMToolCall,
} from './types.js';
import { registerProvider } from './registry.js';

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] as const;
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Register the OpenAI provider in the global registry.
 */
export function registerOpenAI(): void {
  registerProvider('openai', (c) => new OpenAIProvider(c), 'OPENAI_API_KEY');
}

export class OpenAIProvider implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private config: LLMProviderConfig;
  protected models: readonly string[] = MODELS;
  protected defaultModelName = DEFAULT_MODEL;

  constructor(config: LLMProviderConfig, providerName = 'openai') {
    this.name = providerName;
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
  }

  // ── Non-streaming chat ───────────────────────────────────────────────────────

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model ?? this.config.model ?? this.defaultModelName;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...(config?.maxTokens ?? this.config.maxTokens
          ? { max_tokens: config?.maxTokens ?? this.config.maxTokens }
          : {}),
        ...(config?.temperature !== undefined || this.config.temperature !== undefined
          ? { temperature: config?.temperature ?? this.config.temperature }
          : {}),
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('OpenAI returned an empty response.');
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ── Chat with tools ──────────────────────────────────────────────────────────

  async chatWithTools(
    messages: LLMMessage[],
    tools: unknown[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model ?? this.config.model ?? this.defaultModelName;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
        ...(config?.maxTokens ?? this.config.maxTokens
          ? { max_tokens: config?.maxTokens ?? this.config.maxTokens }
          : {}),
        ...(config?.temperature !== undefined || this.config.temperature !== undefined
          ? { temperature: config?.temperature ?? this.config.temperature }
          : {}),
      });

      const choice = response.choices[0];
      if (!choice?.message) {
        throw new Error('OpenAI returned an empty response.');
      }

      const content = choice.message.content ?? '';
      let toolCalls: LLMToolCall[] | undefined;

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        toolCalls = choice.message.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }));
      }

      return {
        content,
        model: response.model,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens ?? 0,
            }
          : undefined,
        toolCalls,
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ── Streaming chat ───────────────────────────────────────────────────────────

  async *chatStream(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const model = config?.model ?? this.config.model ?? this.defaultModelName;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        ...(config?.maxTokens ?? this.config.maxTokens
          ? { max_tokens: config?.maxTokens ?? this.config.maxTokens }
          : {}),
        ...(config?.temperature !== undefined || this.config.temperature !== undefined
          ? { temperature: config?.temperature ?? this.config.temperature }
          : {}),
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield { content: delta, done: false };
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  // ── Model discovery ──────────────────────────────────────────────────────────

  listModels(): string[] {
    return [...this.models];
  }

  defaultModel(): string {
    return this.defaultModelName;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private wrapError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return new Error(
          'OpenAI authentication failed. Verify that your OPENAI_API_KEY is correct and has not expired.',
        );
      }
      if (error.status === 429) {
        return new Error(
          'OpenAI rate limit exceeded. Wait a moment and try again, or check your usage limits at https://platform.openai.com/account/limits',
        );
      }
      if (error.status === 404) {
        return new Error(
          `OpenAI model not found. The requested model may not be available on your account. Available models: ${this.models.join(', ')}`,
        );
      }
      return new Error(`OpenAI API error (${error.status}): ${error.message}`);
    }

    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return new Error(
          'Could not connect to OpenAI API. Check your network connection and any proxy or firewall settings.',
        );
      }
      return error;
    }

    return new Error(`Unknown OpenAI error: ${String(error)}`);
  }
}
