/**
 * Abstract interfaces for LLM provider adapters.
 *
 * Every provider (OpenAI, Anthropic, Google, etc.) implements the LLMProvider
 * interface so the rest of the CLI can swap models without touching business logic.
 */

// ── Message types ──────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Streaming ──────────────────────────────────────────────────────────────────

export interface LLMStreamChunk {
  /** Incremental text content for this chunk. */
  content: string;
  /** True when the stream has finished. */
  done: boolean;
}

// ── Responses ──────────────────────────────────────────────────────────────────

export interface LLMResponse {
  /** The full text content of the assistant reply. */
  content: string;
  /** The model that actually served the request. */
  model: string;
  /** Token usage stats, when the provider reports them. */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Tool calls requested by the model (only present when using chatWithTools). */
  toolCalls?: LLMToolCall[];
}

// ── Tool calling ──────────────────────────────────────────────────────────────

export interface LLMToolCall {
  /** Provider-assigned identifier for this tool call. */
  id: string;
  /** Name of the tool/function to invoke. */
  name: string;
  /** JSON-encoded arguments string (must be parsed by the caller). */
  arguments: string;
}

export interface LLMMessageWithToolCalls extends LLMMessage {
  /** Tool calls attached to an assistant message. */
  toolCalls?: LLMToolCall[];
}

export interface LLMToolResult {
  /** Matches the LLMToolCall.id this result corresponds to. */
  callId: string;
  /** Textual content returned by the tool execution. */
  content: string;
}

// ── Provider configuration ─────────────────────────────────────────────────────

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

// ── Provider contract ──────────────────────────────────────────────────────────

export interface LLMProvider {
  /** Human-readable provider name (e.g. "openai", "anthropic"). */
  readonly name: string;

  /**
   * Send a chat completion request and return the full response.
   *
   * @param messages  Conversation messages.
   * @param config    Optional overrides (model, temperature, etc.).
   */
  chat(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse>;

  /**
   * Send a chat completion request and stream the response token-by-token.
   *
   * Yields LLMStreamChunk objects. The final chunk has `done: true`.
   *
   * @param messages  Conversation messages.
   * @param config    Optional overrides (model, temperature, etc.).
   */
  chatStream(
    messages: LLMMessage[],
    config?: Partial<LLMProviderConfig>,
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * Send a chat completion request with tool definitions, allowing the model
   * to invoke tools.
   *
   * @param messages  Conversation messages.
   * @param tools     Tool definitions in the provider's native format.
   * @param config    Optional overrides (model, temperature, etc.).
   * @returns         Response that may include toolCalls if the model chose to call tools.
   */
  chatWithTools(
    messages: LLMMessage[],
    tools: unknown[],
    config?: Partial<LLMProviderConfig>,
  ): Promise<LLMResponse>;

  /** Return the list of models this provider exposes. */
  listModels(): string[];

  /** Return the default model for this provider. */
  defaultModel(): string;
}
