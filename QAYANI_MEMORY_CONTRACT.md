# QAYANI Memory and Shared-State Contract

## 1. Introduction
This document defines the QAYANI memory architecture. It transitions the system from simple "trimmed chat history" to a multi-tiered state model consisting of short-term turn memory, a global artifact store, and bounded working memory.

## 2. Memory Tiers

### A. Short-Term Turn Memory (Local Context)
- **Scope:** Isolated to a single Worker agent during a specific Task execution.
- **Mechanism:** Standard sliding-window chat history (System Prompt + N recent turns).
- **Trimming Rule:** Instead of arbitrary truncation (`history.slice(-maxHistory)`), the runtime must perform token-aware pruning or utilize a summarization tool when the context window reaches 80% capacity.

### B. Fleet Shared Context (Working Memory)
- **Scope:** Accessible by the Supervisor and all active Workers within a Fleet.
- **Mechanism:** A reactive Key-Value store holding critical facts, environmental variables, and workflow status.
- **Format:**
  ```typescript
  interface FleetContext {
    globalDirectives: string;
    environment: Record<string, string>;
    taskStatus: Record<string, 'pending' | 'running' | 'completed'>;
  }
  ```
- **Access:** Injected dynamically into the System Prompt or provided via explicit `get_fleet_context` tools.

### C. Artifact Store (Long-Term/Shared Outputs)
- **Scope:** Persistent across task boundaries and workflow executions.
- **Mechanism:** A content-addressed immutable store for intermediate outputs (e.g., research drafts, scraped data, final text).
- **Rule:** Agents do NOT pass heavy text (like a 5-page research document) via chat messages. Instead, the Researcher saves it to the Artifact Store and passes the reference (`artifact_id: "res_draft_1"`) to the Writer.
- **Tools:** `read_artifact(id)`, `write_artifact(id, content)`.

## 3. Resumability & Snapshots
- The complete state (DAG status, Fleet Context, Artifact pointers, and Agent chat histories) must be serializable to JSON.
- Snapshots are taken on every `TaskComplete` event.
- If a process dies, QAYANI can resume from the last snapshot.

## File-Level Implications for Claude Code
- `cli/src/agent/runtime.ts`: Remove naive `slice(-maxHistory)`. Implement token-bounded summarization or explicit sliding windows that preserve the system prompt and tool-call pairs correctly.
- `cli/src/fleet/runtime.ts`: Implement the Key-Value `FleetContext` and the `ArtifactStore`.
- `cli/src/tools/built-in/artifacts.ts`: Create new built-in tools for agents to push/pull from the Artifact Store.