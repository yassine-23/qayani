import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { AgentConfigSchema } from '../config/schema.js';
import type { AgentConfig } from './types.js';
import { renderSoul, buildSoulContext } from './soul.js';

const AGENT_FILENAME = 'AGENT.md';
const SOUL_FILENAME = 'soul.md';
const CONFIG_FILENAME = 'agent.yaml';

// ── New format: soul.md + agent.yaml ─────────────────────────────────────────

/**
 * Load an agent from a directory, supporting both formats:
 *   1. New format: soul.md + agent.yaml (preferred)
 *   2. Legacy format: AGENT.md (YAML frontmatter + markdown body)
 *
 * Returns the validated config and the fully rendered system prompt.
 */
export async function loadAgent(
  dir: string,
): Promise<AgentConfig & { systemPrompt: string }> {
  const absoluteDir = path.resolve(dir);

  const soulPath = path.join(absoluteDir, SOUL_FILENAME);
  const configPath = path.join(absoluteDir, CONFIG_FILENAME);
  const legacyPath = path.join(absoluteDir, AGENT_FILENAME);

  // Try new format first
  const hasSoul = fileExists(soulPath);
  const hasConfig = fileExists(configPath);

  if (hasSoul && hasConfig) {
    return loadNewFormat(soulPath, configPath, absoluteDir);
  }

  // Fall back to legacy AGENT.md
  if (fileExists(legacyPath)) {
    return parseAgentFile(legacyPath);
  }

  // Check if soul.md or agent.yaml exists alone (helpful error)
  if (hasSoul && !hasConfig) {
    throw new Error(
      `Found ${SOUL_FILENAME} in ${absoluteDir} but missing ${CONFIG_FILENAME}. ` +
        'Both files are required for the new format.',
    );
  }
  if (hasConfig && !hasSoul) {
    throw new Error(
      `Found ${CONFIG_FILENAME} in ${absoluteDir} but missing ${SOUL_FILENAME}. ` +
        'Both files are required for the new format.',
    );
  }

  throw new Error(
    `No agent definition found in ${absoluteDir}. ` +
      `Expected ${SOUL_FILENAME} + ${CONFIG_FILENAME}, or legacy ${AGENT_FILENAME}.`,
  );
}

/**
 * Load from the new soul.md + agent.yaml format.
 */
async function loadNewFormat(
  soulPath: string,
  configPath: string,
  agentDir: string,
): Promise<AgentConfig & { systemPrompt: string }> {
  // Read and parse agent.yaml
  let rawYaml: string;
  try {
    rawYaml = await fs.readFile(configPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to read ${CONFIG_FILENAME}: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(rawYaml);
  } catch (err) {
    throw new Error(
      `Invalid YAML in ${configPath}: ${(err as Error).message}`,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${CONFIG_FILENAME} must be a YAML object.`);
  }

  const config = validateConfig(parsed);

  // Read soul.md
  let soulTemplate: string;
  try {
    soulTemplate = await fs.readFile(soulPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to read ${SOUL_FILENAME}: ${(err as Error).message}`,
    );
  }

  if (!soulTemplate.trim()) {
    throw new Error(
      `${SOUL_FILENAME} is empty. Write the agent's identity and instructions.`,
    );
  }

  // Render the soul template with config context
  const context = buildSoulContext(config as unknown as Record<string, unknown>);
  const systemPrompt = renderSoul(soulTemplate, context, agentDir);

  return { ...config, systemPrompt };
}

// ── Legacy format: AGENT.md ──────────────────────────────────────────────────

/**
 * Parses an AGENT.md file, extracting YAML frontmatter as configuration
 * and the remaining markdown body as the system prompt.
 */
export async function parseAgentFile(
  filePath: string,
): Promise<AgentConfig & { systemPrompt: string }> {
  const absolutePath = path.resolve(filePath);

  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Agent file not found: ${absolutePath}`);
    }
    throw new Error(
      `Failed to read agent file at ${absolutePath}: ${(err as Error).message}`,
    );
  }

  const { frontmatter, body } = extractFrontmatter(raw);

  if (!frontmatter) {
    throw new Error(
      `Agent file at ${absolutePath} is missing YAML frontmatter. ` +
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

  const config = validateConfig(parsed);
  const systemPrompt = body.trim();

  if (!systemPrompt) {
    throw new Error(
      `Agent file at ${absolutePath} has no system prompt. ` +
        'Add markdown content after the frontmatter closing ---.',
    );
  }

  return { ...config, systemPrompt };
}

/**
 * Splits a file into YAML frontmatter and markdown body.
 * Frontmatter is delimited by lines that are exactly '---'.
 */
function extractFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  const lines = content.split('\n');

  // The file must start with '---'
  if (lines[0]?.trim() !== '---') {
    return { frontmatter: null, body: content };
  }

  // Find the closing '---'
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

// ── File discovery ───────────────────────────────────────────────────────────

/**
 * Searches for an agent definition starting from the given directory (or cwd),
 * walking up parent directories until found or the filesystem root is reached.
 *
 * Prefers new format (soul.md + agent.yaml) over legacy AGENT.md.
 * Returns the directory path containing the agent definition, or null.
 */
export function findAgentDir(dir?: string): string | null {
  let current = path.resolve(dir ?? process.cwd());

  while (true) {
    // Check new format
    const soulCandidate = path.join(current, SOUL_FILENAME);
    const configCandidate = path.join(current, CONFIG_FILENAME);
    if (fileExists(soulCandidate) && fileExists(configCandidate)) {
      return current;
    }

    // Check legacy format
    const legacyCandidate = path.join(current, AGENT_FILENAME);
    if (fileExists(legacyCandidate)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Legacy helper: searches for AGENT.md walking up directories.
 * Returns the absolute path to the file, or null.
 */
export function findAgentFile(dir?: string): string | null {
  let current = path.resolve(dir ?? process.cwd());

  while (true) {
    const candidate = path.join(current, AGENT_FILENAME);
    if (fileExists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a raw parsed object against the AgentConfig Zod schema.
 * Throws a descriptive error if validation fails.
 */
export function validateConfig(config: unknown): AgentConfig {
  const result = AgentConfigSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `  - ${path}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Invalid agent configuration:\n${issues}`);
  }

  return result.data as AgentConfig;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileExists(filePath: string): boolean {
  try {
    return fsSync.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
