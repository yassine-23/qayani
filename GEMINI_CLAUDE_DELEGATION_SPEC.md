# QAYANI Supervisor Delegation Spec

## Platform Truth

QAYANI is not yet a full multi-agent operating system. Today it is:

- a real single-agent terminal runner in `cli/src/commands/run.ts`
- a real interactive TUI loop in `cli/src/ui/chat.ts`
- a real provider/tool abstraction in `cli/src/llm/*`, `cli/src/tools/*`
- a real but shallow orchestration layer in `cli/src/fleet/runtime.ts`
- a topology and visibility layer in `cli/src/commands/army.ts` and `cli/src/commands/atomium-view.ts`

The current weakness is not lack of UI. The weakness is that orchestration semantics, shared state, tool-result protocol, agent delegation, and operating-model rigor are still thin.

## Executive Split

Gemini owns the reasoning layer.
Claude Code owns the execution layer.

That means:

- Gemini decides how orchestration should work.
- Claude turns that design into working code and hardens the UX.

Do not invert this. If Gemini starts doing generic UI polish or Claude starts inventing orchestration theory ad hoc, the platform will drift.

## Gemini Ownership

Gemini should excel at these tasks and own them end-to-end:

### 1. Orchestration Semantics
Design the real agent contract for:

- agent roles
- task envelopes
- dependency resolution
- handoff messages
- result schemas
- retry and failure semantics
- escalation rules

Primary files to analyze:

- `cli/src/fleet/runtime.ts`
- `cli/src/fleet/types.ts`
- `cli/src/commands/fleet.ts`
- `cli/src/commands/army.ts`

### 2. Tool Protocol Redesign
Design the correct provider-neutral tool lifecycle instead of today’s plain-text “tool results” loop.

Primary files:

- `cli/src/ui/chat.ts`
- `cli/src/tools/registry.ts`
- `cli/src/tools/executor.ts`
- `cli/src/llm/google.ts`
- `cli/src/llm/openai.ts`
- `cli/src/llm/anthropic.ts`

Deliverable:
- one canonical tool-call / tool-result message contract

### 3. Memory and Shared State Model
Design the missing memory system:

- short-term turn memory
- bounded working memory
- fleet shared context
- artifacts and outputs
- summaries and pruning
- resumability

Primary files:

- `cli/src/agent/runtime.ts`
- `cli/src/memory/local.ts`
- `cli/src/memory/google-drive.ts`

### 4. Agentic Pivot Decisions
Gemini must be blunt about what QAYANI should stop pretending to be.

It should explicitly decide:

- what stays single-agent
- what becomes fleet-native
- whether `army` is substance or mostly operator theater
- what deserves the phrase “parallel agentic flows”

### 5. Supervisor Blueprint
Gemini should specify the target operator model:

- one supervisor
- multiple workers
- task queue
- artifact store
- observability model
- intervention points for humans and Claude Code

## Claude Code Ownership

Claude should pick up exactly where the current code stops and implement what Gemini defines.

### 1. TUI Runtime Hardening
Claude owns:

- `cli/src/commands/run.ts`
- `cli/src/ui/chat.ts`
- `cli/src/ui/components.ts`
- `cli/src/ui/theme.ts`

Implementation tasks:

- integrate structured tool-result handling
- enforce real history trimming via `agent/runtime.ts`
- improve slash-command ergonomics
- make the TUI reflect live execution state, not just chat output

### 2. Deterministic Orchestration Runtime
Claude owns:

- `cli/src/fleet/runtime.ts`
- `cli/src/commands/fleet.ts`
- `cli/src/commands/army.ts`
- `cli/src/commands/atomium-view.ts`

Implementation tasks:

- encode Gemini’s orchestration contract
- wire dependency-aware execution correctly
- add failure surfaces, retries, and clearer task status
- keep the system deterministic and testable

### 3. Tool Execution and Safety
Claude owns:

- `cli/src/tools/executor.ts`
- `cli/src/tools/built-in/*`

Implementation tasks:

- add allowlists / approval boundaries for dangerous tools
- support parallel tool execution where the contract permits it
- normalize error reporting and tool telemetry

### 4. Verification
Claude owns:

- code-path verification
- local tests
- regression checks
- integration wiring

Claude should not invent new orchestration abstractions without Gemini sign-off.

## Sequence of Work

### Phase 1: Gemini First
Gemini produces four hard deliverables:

1. orchestration contract
2. tool protocol contract
3. memory/shared-state contract
4. target operator model

No code yet. Only precise design with file-level implications.

### Phase 2: Claude Implements
Claude converts those contracts into patches across:

- `cli/src/ui/chat.ts`
- `cli/src/agent/runtime.ts`
- `cli/src/fleet/runtime.ts`
- `cli/src/tools/executor.ts`
- `cli/src/commands/army.ts`

### Phase 3: Gemini Reviews
Gemini reviews the implementation for:

- abstraction drift
- fake agentic behavior
- broken contracts
- overbuilt UX with underbuilt runtime

### Phase 4: Claude Hardens
Claude closes the loop with:

- tests
- edge-case handling
- UX cleanup
- documentation

## Non-Negotiable Rules

- Gemini owns architecture, not cosmetics.
- Claude owns implementation, not strategy drift.
- “Parallel” only means something if there is real shared-state and delegation semantics.
- Atomium and army views must justify themselves through operating value, not spectacle.
- The next milestone is not more screens. It is a credible supervisor-worker runtime.

## Immediate Tasking

### Gemini: do now
- write the orchestration contract
- write the tool protocol contract
- write the shared memory/artifact model
- define what QAYANI is and is not

### Claude: do next
- refactor `ui/chat.ts` around the new tool contract
- stop bypassing `buildMessages()` in `agent/runtime.ts`
- strengthen `fleet/runtime.ts` with richer task-state handling
- make dangerous tools explicit and governable

This is the clean split. Gemini should think harder. Claude should ship harder.
