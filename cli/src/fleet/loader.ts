import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import type { FleetConfig } from './types.js';

const FLEET_FILENAME = 'FLEET.md';

/**
 * Parses a FLEET.md file, extracting YAML frontmatter as fleet configuration.
 * The markdown body after the frontmatter is informational (fleet instructions)
 * but is not used at runtime.
 */
export async function parseFleetFile(filePath: string): Promise<FleetConfig> {
  const absolutePath = path.resolve(filePath);

  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Fleet file not found: ${absolutePath}`);
    }
    throw new Error(
      `Failed to read fleet file at ${absolutePath}: ${(err as Error).message}`,
    );
  }

  const { frontmatter } = extractFrontmatter(raw);

  if (!frontmatter) {
    throw new Error(
      `Fleet file at ${absolutePath} is missing YAML frontmatter. ` +
        'The file must start with --- followed by YAML config and closed with ---.',
    );
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(frontmatter);
  } catch (err) {
    throw new Error(
      `Invalid YAML in frontmatter of ${absolutePath}: ${(err as Error).message}`,
    );
  }

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error(
      `Frontmatter in ${absolutePath} must be a YAML object, got ${typeof parsed}`,
    );
  }

  return validateFleetConfig(parsed as Record<string, unknown>, absolutePath);
}

/**
 * Searches for FLEET.md starting from the given directory (or cwd),
 * walking up parent directories until found or the filesystem root is reached.
 * Returns the absolute path to the file, or null if not found.
 */
export function findFleetFile(dir?: string): string | null {
  let current = path.resolve(dir ?? process.cwd());

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(current, FLEET_FILENAME);

    try {
      const stats = fsSync.statSync(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {
      // File doesn't exist at this level, keep walking up
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root
      return null;
    }
    current = parent;
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Splits a file into YAML frontmatter and markdown body.
 */
function extractFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  const lines = content.split('\n');

  if (lines[0]?.trim() !== '---') {
    return { frontmatter: null, body: content };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');

  return { frontmatter, body };
}

/**
 * Validates a raw parsed object into a FleetConfig.
 * Throws descriptive errors when required fields are missing or invalid.
 */
function validateFleetConfig(
  raw: Record<string, unknown>,
  filePath: string,
): FleetConfig {
  // Required string fields
  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error(`Fleet config in ${filePath} is missing required field "name".`);
  }
  if (!raw.description || typeof raw.description !== 'string') {
    throw new Error(`Fleet config in ${filePath} is missing required field "description".`);
  }

  const version =
    raw.version !== undefined ? String(raw.version) : '1.0';

  // Communication mode
  const validModes = ['sequential', 'parallel', 'orchestrated'] as const;
  const communication =
    typeof raw.communication === 'string' &&
    validModes.includes(raw.communication as (typeof validModes)[number])
      ? (raw.communication as FleetConfig['communication'])
      : 'sequential';

  // Agents
  if (!Array.isArray(raw.agents) || raw.agents.length === 0) {
    throw new Error(
      `Fleet config in ${filePath} must define at least one agent in the "agents" array.`,
    );
  }

  const agents = raw.agents.map((a: unknown, i: number) => {
    const agent = a as Record<string, unknown>;
    if (!agent.name || typeof agent.name !== 'string') {
      throw new Error(`Agent at index ${i} is missing a "name" field.`);
    }
    if (!agent.role || typeof agent.role !== 'string') {
      throw new Error(`Agent "${agent.name}" is missing a "role" field.`);
    }
    if (!agent.agentPath || typeof agent.agentPath !== 'string') {
      throw new Error(`Agent "${agent.name}" is missing an "agentPath" field.`);
    }
    return {
      name: agent.name,
      role: agent.role,
      agentPath: agent.agentPath,
      capabilities: Array.isArray(agent.capabilities)
        ? (agent.capabilities as string[])
        : undefined,
    };
  });

  // Workflow
  if (!Array.isArray(raw.workflow) || raw.workflow.length === 0) {
    throw new Error(
      `Fleet config in ${filePath} must define at least one step in the "workflow" array.`,
    );
  }

  const agentNames = new Set(agents.map((a) => a.name));

  const workflow = raw.workflow.map((s: unknown, i: number) => {
    const step = s as Record<string, unknown>;
    if (!step.agent || typeof step.agent !== 'string') {
      throw new Error(`Workflow step at index ${i} is missing an "agent" field.`);
    }
    if (!agentNames.has(step.agent)) {
      throw new Error(
        `Workflow step at index ${i} references unknown agent "${step.agent}". ` +
          `Available agents: ${[...agentNames].join(', ')}`,
      );
    }
    if (!step.task || typeof step.task !== 'string') {
      throw new Error(`Workflow step at index ${i} is missing a "task" field.`);
    }

    const dependsOn = Array.isArray(step.dependsOn)
      ? (step.dependsOn as string[])
      : undefined;

    // Validate that dependsOn references exist
    if (dependsOn) {
      for (const dep of dependsOn) {
        if (!agentNames.has(dep)) {
          throw new Error(
            `Workflow step "${step.agent}" depends on unknown agent "${dep}".`,
          );
        }
      }
    }

    return {
      agent: step.agent,
      task: step.task,
      dependsOn,
      output: typeof step.output === 'string' ? step.output : undefined,
    };
  });

  return {
    name: raw.name as string,
    version,
    description: raw.description as string,
    agents,
    workflow,
    communication,
  };
}
