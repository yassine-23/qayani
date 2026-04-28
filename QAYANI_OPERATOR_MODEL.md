# QAYANI Target Operator Model

## 1. Introduction
This document defines the overarching operating model for QAYANI. It confronts the reality of the current implementation and dictates a pivot from "agentic theater" (shallow topology mapping) to a functional, deterministic Supervisor-Worker runtime.

## 2. What QAYANI Is and Is Not

**What QAYANI Is:**
- A robust, terminal-first orchestration engine.
- A deterministic task-runner that coordinates LLMs to achieve complex goals through specialized worker roles.
- A transparent system where state, tools, and costs are observable.

**What QAYANI Is NOT:**
- QAYANI is *not* a magical "swarm" or "army" of free-willed agents communicating autonomously in unstructured chat rooms.
- QAYANI is *not* just a visual wrapper over sequential API calls. The `army` topology view must represent actual isolated memory spaces and distributed task execution, not just console output.

## 3. The Supervisor Blueprint

The target operator model centers entirely around the **Supervisor**.

### The Flow
1. **Intake:** The human interacts with the Supervisor via the TUI (`run.ts` / `chat.ts`). The human provides an objective.
2. **Planning:** The Supervisor formulates a DAG of tasks (or parses an existing `FLEET.md` template) and allocates them to the Task Queue.
3. **Execution:** The Supervisor dispatches tasks to Workers.
   - Workers execute in their own isolated `AgentRuntime` contexts.
   - Workers push output to the `ArtifactStore`.
   - Workers return structured `TaskResult`s to the Supervisor.
4. **Verification & Merge:** The Supervisor reviews outputs. If correct, the workflow advances. If flawed, the Supervisor re-queues the task with corrective feedback.
5. **Delivery:** The Supervisor presents the final artifact to the human.

### Observability Model
The CLI / TUI must reflect this runtime reality:
- **TUI Top Bar:** Shows global Fleet Context and active Supervisor state.
- **TUI Main Window:** Displays the DAG task queue (Pending, Running, Completed).
- **TUI Sidebar:** Streams real-time tool execution telemetry from active workers.
- **Intervention Points:** The Supervisor explicitly pauses and requests input when a worker fails repeatedly or a `dangerous` tool requires approval.

## File-Level Implications for Claude Code
- `cli/src/ui/chat.ts`: Must be heavily refactored. Move away from a simple chat interface to a rich TUI that renders the Task Queue, Artifacts, and Supervisor state.
- `cli/src/commands/army.ts`: Remove cosmetic visualizers if they do not map to the Supervisor's task queue and isolation boundaries. "Parallel" must mean actual concurrent `Promise.all` execution of isolated agent workers, managed by the Supervisor.