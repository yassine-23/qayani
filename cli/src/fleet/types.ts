import type { AgentConfig } from '../agent/types.js';

// ── Fleet agent definition ───────────────────────────────────────────────────

export interface FleetAgent {
  /** Display name used to reference this agent in workflow steps. */
  name: string;
  /** Role description, e.g. "researcher", "writer", "reviewer". */
  role: string;
  /** Path to the agent directory containing an AGENT.md file. */
  agentPath: string;
  /** Optional list of capabilities this agent is good at. */
  capabilities?: string[];
}

// ── Fleet configuration (parsed from FLEET.md frontmatter) ───────────────────

export interface FleetConfig {
  name: string;
  version: string;
  description: string;
  agents: FleetAgent[];
  workflow: WorkflowStep[];
  communication: 'sequential' | 'parallel' | 'orchestrated';
}

// ── Workflow step ────────────────────────────────────────────────────────────

export interface WorkflowStep {
  /** Name of the agent that executes this step. */
  agent: string;
  /** Instruction / task description for this step. */
  task: string;
  /** Names of steps (by agent name) that must complete before this one. */
  dependsOn?: string[];
  /** Variable name to store the step's output for downstream consumption. */
  output?: string;
}

// ── Fleet runtime state ──────────────────────────────────────────────────────

export interface FleetRuntime {
  config: FleetConfig;
  agents: Map<string, { config: AgentConfig; systemPrompt: string }>;
  messageLog: FleetMessage[];
}

// ── Inter-agent messages ─────────────────────────────────────────────────────

export interface FleetMessage {
  from: string;
  to: string;
  content: string;
  timestamp: string;
  type: 'task' | 'result' | 'feedback' | 'delegate';
}
