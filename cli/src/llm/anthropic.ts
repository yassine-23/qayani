/**
 * Anthropic LLM provider — uses raw fetch() against the Anthropic Messages API.
 *
 * No SDK dependency required; we speak the HTTP + SSE protocol directly.
 */

import type {
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
  LLMStreamChunk,
  LLMToolCall,
} from './types.js';
import { registerProvider } from './registry.js';

/**
 * Register the Anthropic provider in the global registry.
 */
export function registerAnthropic(): void {
  registerProvider('anthropic', (c) => new AnthropicProvider(c), 'ANTHROPIC_API_KEY');
}

const API_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

const MODELS = [
  'claude-opus-4-0520',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
] as const;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// ── Anthropic-specific API shapes ──────────────────────────────────────────────

interface AnthropicRequestBody {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
  tools?: AnthropicToolDefinition[];
}

interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: object;
}

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicNonStreamResponse {
  id: string;
  type: 'message';
  model: string;
  content: AnthropicContentBlock[];
  usage: AnthropicUsage;
}

interface AnthropicErrorResponse {
  type: 'error';
  error: { type: string; message: string };
}

// ── Provider ───────────────────────────────────────────────────────────────────

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  // ── Non-streaming chat ───────────────────────────────────────────────────────

  async chat(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model ?? this.config.model ?? DEFAULT_MODEL;
    const apiKey = config?.apiKey ?? this.config.apiKey;
    const baseUrl = config?.baseUrl ?? this.config.baseUrl ?? API_BASE;

    const body = this.buildRequestBody(messages, model, config, false);

    const response = await this.fetchAPI(baseUrl, apiKey, body);

    if (!response.ok) {
      await this.handleHTTPError(response);
    }

    const json = (await response.json()) as AnthropicNonStreamResponse | AnthropicErrorResponse;

    if ('error' in json && json.type === 'error') {
      throw new Error(`Anthropic API error (${json.error.type}): ${json.error.message}`);
    }

    const msg = json as AnthropicNonStreamResponse;
    const textBlocks = msg.content.filter((b): b is AnthropicTextBlock => b.type === 'text');
    const content = textBlocks.map((b) => b.text).join('');

    if (!content) {
      throw new Error('Anthropic returned an empty response.');
    }

    return {
      content,
      model: msg.model,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
    };
  }

  // ── Chat with tools ─────────────────────────────────────────────────────────

  async chatWithTools(
    messages: LLMMessage[],
    tools: unknown[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse> {
    const model = config?.model ?? this.config.model ?? DEFAULT_MODEL;
    const apiKey = config?.apiKey ?? this.config.apiKey;
    const baseUrl = config?.baseUrl ?? this.config.baseUrl ?? API_BASE;

    const body = this.buildRequestBody(messages, model, config, false);
    body.tools = tools as AnthropicToolDefinition[];

    const response = await this.fetchAPI(baseUrl, apiKey, body);

    if (!response.ok) {
      await this.handleHTTPError(response);
    }

    const json = (await response.json()) as AnthropicNonStreamResponse | AnthropicErrorResponse;

    if ('error' in json && json.type === 'error') {
      throw new Error(`Anthropic API error (${json.error.type}): ${json.error.message}`);
    }

    const msg = json as AnthropicNonStreamResponse;

    // Extract text content from text blocks.
    const textBlocks = msg.content.filter((b): b is AnthropicTextBlock => b.type === 'text');
    const content = textBlocks.map((b) => b.text).join('');

    // Extract tool calls from tool_use blocks.
    const toolUseBlocks = msg.content.filter(
      (b): b is AnthropicToolUseBlock => b.type === 'tool_use',
    );

    let toolCalls: LLMToolCall[] | undefined;
    if (toolUseBlocks.length > 0) {
      toolCalls = toolUseBlocks.map((block) => ({
        id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input),
      }));
    }

    return {
      content,
      model: msg.model,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
      toolCalls,
    };
  }

  // ── Streaming chat ───────────────────────────────────────────────────────────

  async *chatStream(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const model = config?.model ?? this.config.model ?? DEFAULT_MODEL;
    const apiKey = config?.apiKey ?? this.config.apiKey;
    const baseUrl = config?.baseUrl ?? this.config.baseUrl ?? API_BASE;

    const body = this.buildRequestBody(messages, model, config, true);

    const response = await this.fetchAPI(baseUrl, apiKey, body);

    if (!response.ok) {
      await this.handleHTTPError(response);
    }

    if (!response.body) {
      throw new Error('Anthropic returned no response body for streaming request.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from the buffer.
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer.
        buffer = lines.pop() ?? '';

        let eventType = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (eventType === 'content_block_delta') {
              try {
                const parsed = JSON.parse(data) as {
                  type: 'content_block_delta';
                  delta: { type: 'text_delta'; text: string };
                };
                if (parsed.delta?.text) {
                  yield { content: parsed.delta.text, done: false };
                }
              } catch {
                // Non-JSON data line; skip.
              }
            }

            if (eventType === 'message_stop') {
              yield { content: '', done: true };
              return;
            }

            if (eventType === 'error') {
              try {
                const parsed = JSON.parse(data) as { error: { message: string } };
                throw new Error(`Anthropic stream error: ${parsed.error.message}`);
              } catch (e) {
                if (e instanceof Error && e.message.startsWith('Anthropic stream error')) throw e;
                throw new Error(`Anthropic stream error: ${data}`);
              }
            }

            // Reset event type after processing the data line.
            eventType = '';
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Stream ended without an explicit message_stop event.
    yield { content: '', done: true };
  }

  // ── Model discovery ──────────────────────────────────────────────────────────

  listModels(): string[] {
    return [...MODELS];
  }

  defaultModel(): string {
    return DEFAULT_MODEL;
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private buildRequestBody(
    messages: LLMMessage[],
    model: string,
    config?: Partial<LLMProviderConfig>,
    stream?: boolean,
  ): AnthropicRequestBody {
    // Anthropic separates the system prompt from conversation messages.
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Anthropic requires alternating user/assistant turns.  If we have
    // consecutive same-role messages we merge them.
    const mergedMessages = this.mergeConsecutiveRoles(conversationMessages);

    const body: AnthropicRequestBody = {
      model,
      messages: mergedMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: config?.maxTokens ?? this.config.maxTokens ?? 4096,
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join('\n\n');
    }

    const temperature = config?.temperature ?? this.config.temperature;
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (stream) {
      body.stream = true;
    }

    return body;
  }

  /**
   * Merge consecutive messages with the same role, which the Anthropic API
   * does not allow.
   */
  private mergeConsecutiveRoles(messages: LLMMessage[]): LLMMessage[] {
    if (messages.length === 0) return [];

    const merged: LLMMessage[] = [{ ...messages[0] }];

    for (let i = 1; i < messages.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = messages[i];
      if (prev.role === curr.role) {
        prev.content += '\n\n' + curr.content;
      } else {
        merged.push({ ...curr });
      }
    }

    return merged;
  }

  private async fetchAPI(
    baseUrl: string,
    apiKey: string,
    body: AnthropicRequestBody,
  ): Promise<Response> {
    try {
      return await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            'Could not connect to Anthropic API. Check your network connection and any proxy or firewall settings.',
          );
        }
      }
      throw error;
    }
  }

  private async handleHTTPError(response: Response): Promise<never> {
    let detail = '';
    try {
      const errorJson = (await response.json()) as AnthropicErrorResponse;
      if (errorJson.error?.message) {
        detail = errorJson.error.message;
      }
    } catch {
      detail = await response.text().catch(() => '');
    }

    if (response.status === 401) {
      throw new Error(
        'Anthropic authentication failed. Verify that your ANTHROPIC_API_KEY is correct and has not expired.',
      );
    }
    if (response.status === 429) {
      throw new Error(
        'Anthropic rate limit exceeded. Wait a moment and try again, or check your usage limits at https://console.anthropic.com',
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Anthropic model not found. The requested model may not be available on your account. Available models: ${MODELS.join(', ')}`,
      );
    }

    throw new Error(
      `Anthropic API error (${response.status}): ${detail || response.statusText}`,
    );
  }
}
