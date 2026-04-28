/**
 * Tool registry — manages available tools and converts their definitions
 * to provider-specific formats (OpenAI, Anthropic, Google).
 */

import type { Tool, ToolDefinition, ToolParameter } from './types.js';

// ── Provider-specific tool formats ────────────────────────────────────────────

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, object>;
      required: string[];
    };
  };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, object>;
    required: string[];
  };
}

export interface GoogleTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, object>;
      required: string[];
    };
  }>;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool. Overwrites any existing tool with the same name.
   */
  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Retrieve a tool by name.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Return all registered tools.
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Return all tool definitions (metadata only, no execute functions).
   */
  getDefinitions(): ToolDefinition[] {
    return this.getAll().map((t) => t.definition);
  }

  /**
   * Convert tool definitions to OpenAI function-calling format.
   *
   * OpenAI format:
   * ```
   * { type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } }
   * ```
   */
  toOpenAITools(): OpenAITool[] {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.definition.name,
        description: tool.definition.description,
        parameters: this.toJsonSchema(tool.definition.parameters),
      },
    }));
  }

  /**
   * Convert tool definitions to Anthropic tool format.
   *
   * Anthropic format:
   * ```
   * { name, description, input_schema: { type: 'object', properties, required } }
   * ```
   */
  toAnthropicTools(): AnthropicTool[] {
    return this.getAll().map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      input_schema: this.toJsonSchema(tool.definition.parameters),
    }));
  }

  /**
   * Convert tool definitions to Google (Gemini) tool format.
   *
   * Google format:
   * ```
   * { functionDeclarations: [{ name, description, parameters: { type: 'object', properties, required } }] }
   * ```
   *
   * Note: Google groups all function declarations into a single tool object.
   */
  toGoogleTools(): GoogleTool[] {
    const declarations = this.getAll().map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      parameters: this.toJsonSchema(tool.definition.parameters),
    }));

    // Google expects a single tools entry containing all declarations.
    if (declarations.length === 0) return [];
    return [{ functionDeclarations: declarations }];
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /**
   * Convert our ToolParameter map to a JSON Schema object suitable for all
   * providers. All providers expect the same JSON Schema structure for
   * parameter definitions.
   */
  private toJsonSchema(parameters: Record<string, ToolParameter>): {
    type: 'object';
    properties: Record<string, object>;
    required: string[];
  } {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [name, param] of Object.entries(parameters)) {
      const property: Record<string, unknown> = {
        type: param.type,
        description: param.description,
      };

      if (param.enum && param.enum.length > 0) {
        property.enum = param.enum;
      }

      properties[name] = property;

      if (param.required) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }
}
