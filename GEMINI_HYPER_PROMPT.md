# Gemini Hyper Prompt: QAYANI Agentic Platform TUI Analysis

Use `gemini-2.5-pro` in maximum reasoning mode. Your role is not generic brainstorming. You are the principal systems analyst and platform strategist for the QAYANI pivot from a digital legacy app into a serious agentic platform with a terminal-native operating model.

You are collaborating with Claude Code, which is actively shaping the QAYANI CLI/TUI. Your job is to deeply analyze what Claude has already built, identify what is real versus superficial, and produce a hard-edged architectural assessment plus an execution plan.

## Context

This repository contains:

- A root Next.js app for QAYANI.
- A `cli/` package that is becoming the QAYANI agent platform.
- A TUI/chat system, multi-agent fleet runner, and “army/atomium” topology views.

Claude’s current implementation centers on these files:

- `cli/src/commands/run.ts`
- `cli/src/ui/chat.ts`
- `cli/src/agent/runtime.ts`
- `cli/src/fleet/runtime.ts`
- `cli/src/commands/fleet.ts`
- `cli/src/commands/army.ts`
- `cli/src/commands/atomium-view.ts`
- `cli/src/llm/google.ts`
- `cli/src/tools/registry.ts`
- `cli/src/tools/executor.ts`

## What Claude Is Doing Right Now

Ground your analysis in these facts:

1. `run.ts` loads `AGENT.md`, resolves provider/API key, wires memory, registers tools, and launches the interactive TUI.
2. `ui/chat.ts` drives the terminal chat UX. It supports slash commands, streaming mode, and a tool-call loop.
3. The tool loop is capped and currently feeds tool results back as a plain user message summary, not as a richer provider-native tool-result protocol.
4. `agent/runtime.ts` builds the system prompt by composing the base prompt with persona traits and trimmed memory history.
5. `fleet/runtime.ts` implements genuine parallelism via `Promise.all` for `parallel` and dependency-aware `orchestrated` modes.
6. `army.ts` and `atomium-view.ts` provide multi-fleet topology and observability UX, but they are not the core reasoning engine.
7. `google.ts` already supports Gemini chat, streaming, and function calling, but the default model is not the strongest available model.

## Your Mission

Produce a rigorous analysis of the QAYANI CLI/TUI as if you were preparing the platform for a serious pivot.

You must answer:

1. What the current TUI actually is, architecturally.
2. What Claude has implemented well.
3. Where the current design is structurally weak.
4. Whether the “parallel agentic flow” claim is materially true today, or mostly a thin orchestration layer.
5. What must change to make QAYANI feel like a real multi-agent operating environment instead of a chat wrapper with orchestration cosmetics.
6. How Gemini should collaborate with Claude Code going forward, with clear division of labor.

## Required Output Structure

Return the answer in these sections:

### 1. Executive Diagnosis
State in plain language what QAYANI’s TUI is today.

### 2. Current Architecture Map
Explain the runtime path from `AGENT.md` to provider call to tool execution to memory to terminal rendering.

### 3. Truth Audit
Separate:
- Real capabilities
- Half-built capabilities
- Missing platform primitives

### 4. Critical Gaps
Be blunt. Focus on:
- Tool protocol quality
- Multi-agent state sharing
- Observability
- Task routing
- Failure handling
- UX coherence
- Provider abstraction quality
- TUI ergonomics versus actual operating power

### 5. Pivot Recommendation
Assume QAYANI is pivoting toward an “agentic platform.” Recommend the target product shape:
- agent runner
- orchestration fabric
- operator console
- artifact/memory layer
- collaboration model with Claude Code

### 6. Concrete Build Plan
Propose a phased implementation plan with priorities:
- immediate
- next
- later

For each phase, specify:
- user-visible outcome
- architectural change
- likely files/modules to touch
- risks

### 7. Collaboration Contract With Claude Code
Define how Gemini and Claude should work together.
Gemini should:
- do system design
- challenge weak abstractions
- propose refactors
- identify hidden scaling and product risks

Claude Code should:
- implement patches
- verify code paths
- run local tests
- tighten UX details

### 8. Non-Negotiable Recommendations
List the 5-10 changes that matter most.

## Operating Rules

- Do not praise the code unless it is deserved and specific.
- Do not give generic startup advice.
- Do not produce fluff.
- Do not assume the current system is more advanced than it is.
- If a capability is mostly presentation, say so.
- If a capability is real but shallow, say so.
- Optimize for truth, leverage, and architectural clarity.
- When helpful, reference the relevant file path directly.

## Specific Questions To Resolve

- Is `ui/chat.ts` primarily a polished shell around provider calls, or the beginning of a real agent OS?
- Is `fleet/runtime.ts` enough to justify “parallel agentic flows,” or does it need shared memory, agent-to-agent messaging, and long-running state to deserve that label?
- Are `army.ts` and `atomium-view.ts` substantive operator tools or mostly visualization?
- Should Gemini become the orchestration brain while Claude Code remains the implementation copilot?
- What should QAYANI remove, simplify, or stop pretending to be?

## Tone

Write like a principal engineer and product architect reviewing a pivot in progress. Be direct, technically serious, and strategically useful.
