# QAYANI Tool Protocol Contract

## 1. Introduction
This document defines the canonical tool-call and tool-result message contract, abstracting away provider-specific (OpenAI, Anthropic, Google) idiosyncrasies into a unified, reliable lifecycle.

## 2. Canonical Tool Protocol

All LLM provider implementations must normalize to this standard before execution, and the executor must return this standard back to the LLM.

### Tool Request
```typescript
interface StandardToolCall {
  id: string;          // Unique execution ID
  name: string;        // Tool registry name
  arguments: unknown;  // Parsed JSON arguments
}
```

### Tool Result
```typescript
interface StandardToolResult {
  callId: string;
  status: 'success' | 'error';
  content: string;     // The actual response, stringified if necessary
  metadata?: {
    latencyMs: number;
    requiresApproval: boolean;
  };
}
```

## 3. Tool Lifecycle & Executor Semantics

The `ToolExecutor` must enforce a rigid lifecycle:
1. **Validation:** Validate incoming `arguments` against the Tool Schema using Zod or a strict JSON schema validator.
2. **Permission Check:** Check if the tool is flagged as `dangerous`. If true, and the session is interactive, execution is suspended until Supervisor/Human approval.
3. **Execution:** Run the tool within an isolated try/catch block.
4. **Normalization:** Always return a `StandardToolResult`. A tool failure must return `status: 'error'` with the error message in `content`, allowing the LLM a chance to self-correct. It must *never* throw an unhandled promise rejection that crashes the fleet.

## 4. Parallel Tool Execution
- Providers that support parallel tool calls (e.g., OpenAI, Anthropic) will yield an array of `StandardToolCall`s.
- `ToolExecutor.executeAll()` must execute them concurrently via `Promise.allSettled`.
- The Executor must guarantee that the order of `StandardToolResult`s exactly matches the order of `StandardToolCall`s to prevent LLM context misalignment.

## 5. Security & Dangerous Tools
Tools modifying the filesystem, executing arbitrary bash commands, or making destructive API calls must be tagged with `dangerous: true` in their definition.
- `cli/src/tools/registry.ts` must be updated to track this flag.
- The TUI must intercept `dangerous: true` tools and render an approval prompt before proceeding.

## File-Level Implications for Claude Code
- `cli/src/tools/types.ts`: Define `StandardToolCall` and `StandardToolResult`. Add `dangerous` boolean to `ToolDefinition`.
- `cli/src/tools/executor.ts`: Enforce strict try/catch, schema validation, and approval hooking.
- `cli/src/llm/*.ts`: Ensure all providers faithfully translate their native tool payloads into the Standard format and correctly serialize StandardToolResults back into their native message history arrays.