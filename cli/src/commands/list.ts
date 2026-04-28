import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { colors, theme } from '../ui/theme.js';
import { table, statusBadge, emptyState, sectionHeader } from '../ui/components.js';
import { handleError } from '../utils/errors.js';

interface AgentMeta {
  name: string;
  provider: string;
  model: string;
  lastUsed: string;
  path?: string;
}

// ── Scanners ──────────────────────────────────────────────────────────────────

/**
 * Scan the global ~/.qayani/agents/ directory for registered agents.
 */
function scanGlobalAgents(): AgentMeta[] {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '~';
  const agentsDir = path.join(homeDir, '.qayani', 'agents');
  const results: AgentMeta[] = [];

  if (!fs.existsSync(agentsDir)) {
    return results;
  }

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metaPath = path.join(agentsDir, entry.name, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    try {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as AgentMeta;
      results.push(meta);
    } catch {
      // Skip malformed meta files silently
    }
  }

  return results;
}

/**
 * Scan the current working directory for subdirectories containing AGENT.md.
 */
function scanLocalAgents(): AgentMeta[] {
  const cwd = process.cwd();
  const results: AgentMeta[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const agentMd = path.join(cwd, entry.name, 'AGENT.md');
    if (!fs.existsSync(agentMd)) continue;

    try {
      const content = fs.readFileSync(agentMd, 'utf-8');
      const meta = parseFrontmatter(content, entry.name);
      meta.path = path.join(cwd, entry.name);
      results.push(meta);
    } catch {
      results.push({
        name: entry.name,
        provider: 'unknown',
        model: 'unknown',
        lastUsed: '-',
        path: path.join(cwd, entry.name),
      });
    }
  }

  // Also check if AGENT.md exists in the current directory itself
  const cwdAgentMd = path.join(cwd, 'AGENT.md');
  if (fs.existsSync(cwdAgentMd)) {
    try {
      const content = fs.readFileSync(cwdAgentMd, 'utf-8');
      const dirName = path.basename(cwd);
      const meta = parseFrontmatter(content, dirName);
      meta.path = cwd;
      results.push(meta);
    } catch {
      // Skip
    }
  }

  return results;
}

/**
 * Minimal YAML-like frontmatter parser for AGENT.md files.
 * Extracts name, provider, and model from the frontmatter block.
 */
function parseFrontmatter(content: string, fallbackName: string): AgentMeta {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return { name: fallbackName, provider: 'unknown', model: 'unknown', lastUsed: '-' };
  }

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*"?([^"\n]+)"?/m);
  const providerMatch = frontmatter.match(/provider:\s*"?([^"\n]+)"?/m);
  // Match the model name (indented under "model:"), not the top-level "name:" field
  const modelMatch = frontmatter.match(/^\s+name:\s*"?([^"\n]+)"?/m);

  return {
    name: nameMatch?.[1]?.trim() ?? fallbackName,
    provider: providerMatch?.[1]?.trim() ?? 'unknown',
    model: modelMatch?.[1]?.trim() ?? 'unknown',
    lastUsed: '-',
  };
}

/**
 * Format a relative time string from an ISO date.
 */
function formatRelativeTime(isoDate: string): string {
  if (isoDate === '-') return colors.muted('--');
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 30) return date.toLocaleDateString();
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'just now';
  } catch {
    return isoDate;
  }
}

/**
 * Determine a status for display based on lastUsed.
 */
function agentStatus(lastUsed: string): 'active' | 'idle' | 'stopped' {
  if (lastUsed === '-') return 'idle';
  try {
    const date = new Date(lastUsed);
    const diffMs = Date.now() - date.getTime();
    const diffHr = diffMs / (1000 * 60 * 60);
    if (diffHr < 1) return 'active';
    if (diffHr < 24) return 'idle';
    return 'stopped';
  } catch {
    return 'idle';
  }
}

// ── Command registration ──────────────────────────────────────────────────────

export function registerList(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('List all agents')
    .action(() => {
      try {
        const globalAgents = scanGlobalAgents();
        const localAgents = scanLocalAgents();

        // Merge and deduplicate by name, preferring global metadata
        const seen = new Set<string>();
        const allAgents: AgentMeta[] = [];

        for (const agent of globalAgents) {
          seen.add(agent.name);
          allAgents.push(agent);
        }
        for (const agent of localAgents) {
          if (!seen.has(agent.name)) {
            seen.add(agent.name);
            allAgents.push(agent);
          }
        }

        console.log('');
        console.log(sectionHeader('Agents'));

        if (allAgents.length === 0) {
          console.log(emptyState(
            'No agents found.',
            `Create your first agent with: qayani init <name>`,
          ));
          return;
        }

        // Build table rows with status badges
        const rows = allAgents.map((agent) => {
          const status = agentStatus(agent.lastUsed);
          return [
            agent.name,
            agent.provider,
            agent.model,
            statusBadge(status),
            formatRelativeTime(agent.lastUsed),
          ];
        });

        console.log('');
        console.log(table({
          headers: ['Name', 'Provider', 'Model', 'Status', 'Last Used'],
          rows,
          style: 'rounded',
          headerColor: theme.brand,
          columnColors: [colors.accent, colors.white, colors.white, undefined, colors.muted],
        }));

        const count = allAgents.length;
        console.log(
          colors.muted(`  ${count} agent${count === 1 ? '' : 's'} found.`),
        );
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });
}
