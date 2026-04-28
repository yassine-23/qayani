/**
 * Tool executor — runs tools by name and handles errors gracefully.
 *
 * If a tool invocation fails, the executor returns a ToolResult with
 * `isError: true` rather than throwing, so the agent loop can continue.
 */

import type { ToolRegistry } from './registry.js';
import type { ToolCall, ToolResult } from './types.js';

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  /**
   * Execute a single tool call.
   *
   * Returns a ToolResult with the output content. If the tool is not found
   * or throws during execution, returns an error result instead of throwing.
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.name);

    if (!tool) {
      return {
        callId: toolCall.id,
        content: `Tool not found: "${toolCall.name}". Available tools: ${this.registry.getAll().map((t) => t.definition.name).join(', ') || '(none)'}`,
        isError: true,
      };
    }

    try {
      const content = await tool.execute(toolCall.arguments);
      return {
        callId: toolCall.id,
        content,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        callId: toolCall.id,
        content: `Tool "${toolCall.name}" failed: ${message}`,
        isError: true,
      };
    }
  }

  /**
   * Execute multiple tool calls concurrently.
   *
   * Results are returned in the same order as the input tool calls.
   * Individual failures do not prevent other tools from executing.
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((call) => this.execute(call)));
  }
}
