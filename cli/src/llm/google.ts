/**
 * Google Gemini LLM provider — uses raw fetch() against the Generative
 * Language API (v1beta).
 *
 * No SDK dependency required.
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
 * Register the Google Gemini provider in the global registry.
 */
export function registerGoogle(): void {
  registerProvider('google', (c) => new GoogleProvider(c), 'GOOGLE_API_KEY');
}

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MODELS = ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'] as const;
const DEFAULT_MODEL = 'gemini-2.0-flash';

// ── Google-specific API shapes ─────────────────────────────────────────────────

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
}

interface GeminiToolDeclaration {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: object;
  }>;
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
  tools?: GeminiToolDeclaration[];
}

interface GeminiCandidate {
  content: { parts: GeminiPart[]; role: string };
  finishReason: string;
}

interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
}

interface GeminiErrorResponse {
  error: { code: number; message: string; status: string };
}

// ── Provider ───────────────────────────────────────────────────────────────────

export class GoogleProvider implements LLMProvider {
  readonly name = 'google';
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

    const body = this.buildRequestBody(messages, config);
    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    const response = await this.fetchAPI(url, body);

    if (!response.ok) {
      await this.handleHTTPError(response, apiKey);
    }

    const json = (await response.json()) as GeminiResponse | GeminiErrorResponse;

    if ('error' in json) {
      throw new Error(`Google API error (${json.error.code}): ${json.error.message}`);
    }

    const gemini = json as GeminiResponse;
    const candidate = gemini.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error('Google Gemini returned an empty response.');
    }

    const content = candidate.content.parts
      .filter((p): p is GeminiPart & { text: string } => p.text !== undefined)
      .map((p) => p.text)
      .join('');

    return {
      content,
      model: gemini.modelVersion ?? model,
      usage: gemini.usageMetadata
        ? {
            inputTokens: gemini.usageMetadata.promptTokenCount,
            outputTokens: gemini.usageMetadata.candidatesTokenCount,
          }
        : undefined,
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

    const body = this.buildRequestBody(messages, config);
    body.tools = tools as GeminiToolDeclaration[];

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    const response = await this.fetchAPI(url, body);

    if (!response.ok) {
      await this.handleHTTPError(response, apiKey);
    }

    const json = (await response.json()) as GeminiResponse | GeminiErrorResponse;

    if ('error' in json) {
      throw new Error(`Google API error (${json.error.code}): ${json.error.message}`);
    }

    const gemini = json as GeminiResponse;
    const candidate = gemini.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error('Google Gemini returned an empty response.');
    }

    // Extract text content from text parts.
    const textParts = candidate.content.parts.filter(
      (p): p is GeminiPart & { text: string } => p.text !== undefined,
    );
    const content = textParts.map((p) => p.text).join('');

    // Extract function calls from functionCall parts.
    const functionCallParts = candidate.content.parts.filter(
      (p): p is GeminiPart & { functionCall: GeminiFunctionCall } =>
        p.functionCall !== undefined,
    );

    let toolCalls: LLMToolCall[] | undefined;
    if (functionCallParts.length > 0) {
      toolCalls = functionCallParts.map((part, index) => ({
        id: `call_${model}_${Date.now()}_${index}`,
        name: part.functionCall.name,
        arguments: JSON.stringify(part.functionCall.args),
      }));
    }

    return {
      content,
      model: gemini.modelVersion ?? model,
      usage: gemini.usageMetadata
        ? {
            inputTokens: gemini.usageMetadata.promptTokenCount,
            outputTokens: gemini.usageMetadata.candidatesTokenCount,
          }
        : undefined,
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

    const body = this.buildRequestBody(messages, config);
    const url = `${baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await this.fetchAPI(url, body);

    if (!response.ok) {
      await this.handleHTTPError(response, apiKey);
    }

    if (!response.body) {
      throw new Error('Google Gemini returned no response body for streaming request.');
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
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data) as GeminiResponse | GeminiErrorResponse;

            if ('error' in parsed) {
              throw new Error(
                `Google Gemini stream error (${parsed.error.code}): ${parsed.error.message}`,
              );
            }

            const gemini = parsed as GeminiResponse;
            const candidate = gemini.candidates?.[0];
            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  yield { content: part.text, done: false };
                }
              }
            }
          } catch (e) {
            // Re-throw known errors, skip unparseable lines.
            if (e instanceof Error && e.message.startsWith('Google Gemini stream error')) {
              throw e;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

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

  /**
   * Map the universal LLMMessage format to Google's contents + systemInstruction
   * format.
   *
   * Google uses role "user" / "model" (not "assistant"), and system prompts are
   * provided separately via systemInstruction.
   */
  private buildRequestBody(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): GeminiRequestBody {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Google requires alternating user/model turns. Merge consecutive same-role
    // messages to satisfy this constraint.
    const merged = this.mergeConsecutiveRoles(conversationMessages);

    const contents: GeminiContent[] = merged.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: GeminiRequestBody = { contents };

    if (systemMessages.length > 0) {
      body.systemInstruction = {
        parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }],
      };
    }

    const maxTokens = config?.maxTokens ?? this.config.maxTokens;
    const temperature = config?.temperature ?? this.config.temperature;

    if (maxTokens !== undefined || temperature !== undefined) {
      body.generationConfig = {};
      if (maxTokens !== undefined) body.generationConfig.maxOutputTokens = maxTokens;
      if (temperature !== undefined) body.generationConfig.temperature = temperature;
    }

    return body;
  }

  /**
   * Merge consecutive messages with the same role, since Google's API expects
   * strictly alternating user/model turns.
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

  private async fetchAPI(url: string, body: GeminiRequestBody): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            'Could not connect to Google Gemini API. Check your network connection and any proxy or firewall settings.',
          );
        }
      }
      throw error;
    }
  }

  private async handleHTTPError(response: Response, apiKey: string): Promise<never> {
    let detail = '';
    try {
      const errorJson = (await response.json()) as GeminiErrorResponse;
      if (errorJson.error?.message) {
        detail = errorJson.error.message;
      }
    } catch {
      detail = await response.text().catch(() => '');
    }

    if (response.status === 400 && detail.toLowerCase().includes('api key')) {
      throw new Error(
        'Google Gemini API key is invalid. Verify that your GOOGLE_API_KEY is correct at https://aistudio.google.com/apikey',
      );
    }
    if (response.status === 403) {
      throw new Error(
        'Google Gemini API access denied. Ensure the Generative Language API is enabled for your project and your API key has the correct permissions.',
      );
    }
    if (response.status === 429) {
      throw new Error(
        'Google Gemini rate limit exceeded. Wait a moment and try again, or check your quota at https://console.cloud.google.com',
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Google Gemini model not found. The requested model may not be available. Available models: ${MODELS.join(', ')}`,
      );
    }

    throw new Error(
      `Google Gemini API error (${response.status}): ${detail || response.statusText}`,
    );
  }
}
