/**
 * Tool system type definitions for the QAYANI CLI agent platform.
 *
 * Tools are capabilities that the LLM can invoke during a conversation,
 * such as file operations, web searches, or database queries.
 */

// ── Parameter definition ──────────────────────────────────────────────────────

export interface ToolParameter {
  /** JSON Schema type for this parameter. */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Human-readable description shown to the LLM. */
  description: string;
  /** Whether this parameter must be provided. Defaults to false. */
  required?: boolean;
  /** Restrict values to a fixed set of allowed strings. */
  enum?: string[];
}

// ── Tool definition (metadata) ────────────────────────────────────────────────

export interface ToolDefinition {
  /** Unique tool name (must be a valid function name: a-z, A-Z, 0-9, _). */
  name: string;
  /** Human-readable description explaining what the tool does. */
  description: string;
  /** Map of parameter names to their definitions. */
  parameters: Record<string, ToolParameter>;
}

// ── Tool invocation ───────────────────────────────────────────────────────────

export interface ToolCall {
  /** Unique identifier for this invocation (from the LLM response). */
  id: string;
  /** Name of the tool to invoke. */
  name: string;
  /** Parsed arguments to pass to the tool's execute function. */
  arguments: Record<string, unknown>;
}

// ── Tool execution result ─────────────────────────────────────────────────────

export interface ToolResult {
  /** Matches the ToolCall.id this result corresponds to. */
  callId: string;
  /** Textual content returned by the tool (shown back to the LLM). */
  content: string;
  /** When true, indicates the tool execution failed. */
  isError?: boolean;
}

// ── Tool interface ────────────────────────────────────────────────────────────

export interface Tool {
  /** The tool's metadata (name, description, parameters). */
  definition: ToolDefinition;
  /**
   * Execute the tool with the given arguments.
   *
   * @param args  The arguments parsed from the LLM's tool call.
   * @returns     A string result to send back to the LLM.
   */
  execute(args: Record<string, unknown>): Promise<string>;
}
