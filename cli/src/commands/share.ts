/**
 * Agent sharing commands for the QAYANI CLI agent platform.
 *
 * Provides clone, export, and import functionality for agents.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { theme } from '../ui/theme.js';
import { QayaniError, handleError } from '../utils/errors.js';

// ── .qayani export format ────────────────────────────────────────────────────

interface QayaniBundle {
  version: '1.0';
  agent: {
    name: string;
    description: string;
    provider: string;
    model: string;
  };
  systemPrompt: string;
  agentMd: string;
  exportedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse minimal frontmatter fields from an AGENT.md file.
 */
function parseFrontmatter(content: string): {
  name: string;
  description: string;
  provider: string;
  model: string;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    throw new QayaniError(
      'Invalid AGENT.md: missing YAML frontmatter.',
      'INVALID_AGENT',
      'The file must start with --- followed by YAML config and closed with ---.',
    );
  }

  const fm = match[1];
  const body = content.slice(match[0].length).trim();

  const nameMatch = fm.match(/^name:\s*"?([^"\n]+)"?/m);
  const descMatch = fm.match(/^description:\s*"?([^"\n]+)"?/m);
  const providerMatch = fm.match(/provider:\s*"?([^"\n]+)"?/m);
  const modelMatch = fm.match(/^\s+name:\s*"?([^"\n]+)"?/m);

  return {
    name: nameMatch?.[1]?.trim() ?? 'unknown',
    description: descMatch?.[1]?.trim() ?? '',
    provider: providerMatch?.[1]?.trim() ?? 'unknown',
    model: modelMatch?.[1]?.trim() ?? 'unknown',
    body,
  };
}

/**
 * Register an agent in ~/.qayani/agents/ with a meta.json file.
 */
function registerAgent(
  name: string,
  provider: string,
  model: string,
  agentDir: string,
): void {
  const homeDir = os.homedir();
  const globalDir = path.join(homeDir, '.qayani', 'agents', name);

  if (!fs.existsSync(globalDir)) {
    fs.mkdirSync(globalDir, { recursive: true });
  }

  const metaPath = path.join(globalDir, 'meta.json');
  const meta = {
    name,
    provider,
    model,
    template: 'imported',
    path: agentDir,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * Replace the name field in AGENT.md frontmatter content.
 */
function replaceAgentName(content: string, newName: string): string {
  return content.replace(
    /^(name:\s*)"?[^"\n]+"?/m,
    `$1"${newName}"`,
  );
}

// ── Command registration ─────────────────────────────────────────────────────

export function registerShare(program: Command): void {
  // ── clone ──────────────────────────────────────────────────────────────────

  program
    .command('clone <source> <dest>')
    .description('Clone an agent to a new directory')
    .action((source: string, dest: string) => {
      try {
        const sourceDir = path.resolve(process.cwd(), source);
        const destDir = path.resolve(process.cwd(), dest);
        const destName = path.basename(destDir);

        // Validate source exists and contains AGENT.md
        const sourceAgentMd = path.join(sourceDir, 'AGENT.md');
        if (!fs.existsSync(sourceAgentMd)) {
          throw new QayaniError(
            `No AGENT.md found in "${source}".`,
            'NO_AGENT',
            'Provide a directory that contains an AGENT.md file.',
          );
        }

        // Validate dest does not already exist
        if (fs.existsSync(destDir)) {
          throw new QayaniError(
            `Destination "${dest}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Validate dest name
        if (!/^[a-zA-Z0-9_-]+$/.test(destName)) {
          throw new QayaniError(
            `Invalid agent name: "${destName}"`,
            'INVALID_NAME',
            'Agent names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        // Copy the directory recursively
        fs.cpSync(sourceDir, destDir, { recursive: true });

        // Update the name in the new AGENT.md
        const destAgentMd = path.join(destDir, 'AGENT.md');
        const content = fs.readFileSync(destAgentMd, 'utf-8');
        const updatedContent = replaceAgentName(content, destName);
        fs.writeFileSync(destAgentMd, updatedContent, 'utf-8');

        // Parse to get provider/model for registration
        const parsed = parseFrontmatter(updatedContent);

        // Register the clone in ~/.qayani/agents/
        registerAgent(destName, parsed.provider, parsed.model, destDir);

        console.log('');
        console.log(theme.success('  Agent cloned successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Source:')}  ${sourceDir}`);
        console.log(`  ${theme.bold('Clone:')}   ${destDir}`);
        console.log(`  ${theme.bold('Name:')}    ${destName}`);
        console.log('');
        console.log(theme.dim('  Run your cloned agent with:'));
        console.log(theme.info(`    qayani run ${destName}`));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── export ─────────────────────────────────────────────────────────────────

  program
    .command('export <name>')
    .description('Export an agent as a shareable .qayani bundle')
    .action((name: string) => {
      try {
        // Find the agent: try local directory first, then global registry
        let agentDir = path.resolve(process.cwd(), name);
        let agentMdPath = path.join(agentDir, 'AGENT.md');

        if (!fs.existsSync(agentMdPath)) {
          // Try global registry
          const homeDir = os.homedir();
          const globalMetaPath = path.join(homeDir, '.qayani', 'agents', name, 'meta.json');
          if (fs.existsSync(globalMetaPath)) {
            const raw = fs.readFileSync(globalMetaPath, 'utf-8');
            const meta = JSON.parse(raw) as { path?: string };
            if (meta.path) {
              agentDir = meta.path;
              agentMdPath = path.join(agentDir, 'AGENT.md');
            }
          }
        }

        if (!fs.existsSync(agentMdPath)) {
          throw new QayaniError(
            `Agent "${name}" not found.`,
            'NOT_FOUND',
            'Provide a directory name or a globally registered agent name.',
          );
        }

        const content = fs.readFileSync(agentMdPath, 'utf-8');
        const parsed = parseFrontmatter(content);

        const bundle: QayaniBundle = {
          version: '1.0',
          agent: {
            name: parsed.name,
            description: parsed.description,
            provider: parsed.provider,
            model: parsed.model,
          },
          systemPrompt: parsed.body,
          agentMd: content,
          exportedAt: new Date().toISOString(),
        };

        const outputFile = path.resolve(process.cwd(), `${name}.qayani`);
        fs.writeFileSync(outputFile, JSON.stringify(bundle, null, 2), 'utf-8');

        console.log('');
        console.log(theme.success('  Agent exported successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Agent:')}   ${parsed.name}`);
        console.log(`  ${theme.bold('File:')}    ${outputFile}`);
        console.log('');
        console.log(theme.dim('  Share this file to let others import your agent:'));
        console.log(theme.info(`    qayani import ${name}.qayani`));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── import ─────────────────────────────────────────────────────────────────

  program
    .command('import <file>')
    .description('Import an agent from a .qayani bundle')
    .action((file: string) => {
      try {
        const filePath = path.resolve(process.cwd(), file);

        if (!fs.existsSync(filePath)) {
          throw new QayaniError(
            `File not found: "${file}"`,
            'NOT_FOUND',
            'Provide a valid path to a .qayani bundle file.',
          );
        }

        // Parse the bundle
        let bundle: QayaniBundle;
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          bundle = JSON.parse(raw) as QayaniBundle;
        } catch {
          throw new QayaniError(
            `Failed to parse "${file}".`,
            'INVALID_BUNDLE',
            'The file must be a valid .qayani JSON bundle.',
          );
        }

        // Validate the bundle structure
        if (!bundle.version || !bundle.agent?.name || !bundle.agentMd) {
          throw new QayaniError(
            `Invalid .qayani bundle format.`,
            'INVALID_BUNDLE',
            'The bundle is missing required fields (version, agent.name, agentMd).',
          );
        }

        const agentName = bundle.agent.name;

        // Validate agent name
        if (!/^[a-zA-Z0-9_-]+$/.test(agentName)) {
          throw new QayaniError(
            `Invalid agent name in bundle: "${agentName}"`,
            'INVALID_NAME',
            'Agent names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        // Create agent directory
        const agentDir = path.resolve(process.cwd(), agentName);

        if (fs.existsSync(agentDir)) {
          throw new QayaniError(
            `Directory "${agentName}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or rename it first.',
          );
        }

        fs.mkdirSync(agentDir, { recursive: true });

        // Write the AGENT.md file
        const agentMdPath = path.join(agentDir, 'AGENT.md');
        fs.writeFileSync(agentMdPath, bundle.agentMd, 'utf-8');

        // Register in ~/.qayani/agents/
        registerAgent(agentName, bundle.agent.provider, bundle.agent.model, agentDir);

        console.log('');
        console.log(theme.success('  Agent imported successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Name:')}      ${agentName}`);
        console.log(`  ${theme.bold('Provider:')}  ${bundle.agent.provider}`);
        console.log(`  ${theme.bold('Model:')}     ${bundle.agent.model}`);
        console.log(`  ${theme.bold('Location:')}  ${agentDir}`);
        console.log('');
        console.log(theme.dim('  Run your imported agent with:'));
        console.log(theme.info(`    qayani run ${agentName}`));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });
}
