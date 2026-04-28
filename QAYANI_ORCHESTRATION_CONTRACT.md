# QAYANI Orchestration Contract

## 1. Introduction
This document defines the strict orchestration semantics for QAYANI. It establishes the supervisor-worker paradigm, removing the superficial "army" theater and replacing it with a rigorous, state-aware execution model.

## 2. Agent Roles
QAYANI will adopt a strict Supervisor/Worker topology:
- **Supervisor (Orchestrator):** Owns the workflow DAG. Evaluates dependencies, routes tasks, handles escalations, and interacts with the user. Does *not* execute domain tasks.
- **Worker (Agent):** Owns specialized domain execution. Receives a bounded task envelope, executes it using tools, and returns a structured result. Does *not* route tasks or spawn child workflows autonomously without Supervisor permission.

## 3. Task Envelopes
Every unit of work must be passed in a formal `TaskEnvelope`:
```typescript
interface TaskEnvelope {
  taskId: string;
  parentTaskId?: string; // For sub-tasks
  assignee: string; // Worker name
  payload: {
    instruction: string;
    contextRef: string[]; // Pointers to shared artifacts
  };
  constraints: {
    maxTurns: number;
    deadlineMs?: number;
    allowedTools: string[];
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
}
```

## 4. Dependency Resolution & Task Routing
- Workflows are defined as Directed Acyclic Graphs (DAGs) of tasks, not just an ordered list of agents.
- The Supervisor evaluates the DAG dynamically. A task transitions to `pending` only when all `dependsOn` tasks reach `completed`.
- "Parallel execution" is strictly defined as concurrent `running` tasks with independent state branches, syncing only at explicit DAG merge points.

## 5. Handoff Messages
Agents do not communicate via free-text chat. Handoffs are structural:
```typescript
interface HandoffMessage {
  from: string;
  to: 'Supervisor' | string;
  type: 'TaskComplete' | 'TaskFailed' | 'Yield';
  resultSchema: TaskResult;
}
```

## 6. Result Schemas
Workers must produce structured output. Raw string output is only allowed for the final user-facing response.
```typescript
interface TaskResult {
  taskId: string;
  status: 'success' | 'failure';
  artifactsGenerated: string[]; // Keys in the shared artifact store
  data: Record<string, unknown>; // Structured JSON result
  metrics: {
    tokensUsed: number;
    executionTimeMs: number;
  };
}
```

## 7. Retry, Failure, and Escalation Rules
- **Worker-level Retry:** A worker may attempt to self-correct a tool failure up to `maxTurns`.
- **Supervisor-level Retry:** If a worker returns a `TaskFailed` result, the Supervisor may re-assign the task (possibly with augmented context) up to 2 times.
- **Escalation:** If Supervisor retries are exhausted, the Supervisor enters a `Blocked` state and escalates to the Human Operator via the TUI, explicitly requiring manual intervention or task abort.

## File-Level Implications for Claude Code
- `cli/src/fleet/types.ts`: Replace current `FleetMessage` with `TaskEnvelope`, `HandoffMessage`, and `TaskResult`.
- `cli/src/fleet/runtime.ts`: Rip out the basic `runSequential/runParallel` loops. Implement a robust DAG evaluator managed by the Supervisor.
- `cli/src/commands/army.ts`: Deprecate "army" features that lack rigorous underlying task-sharing semantics. Re-align around Supervisor fleet monitoring.