/**
 * Atomium management commands for the QAYANI CLI.
 *
 * Provides duplication, linking, and hive management for fleets:
 *   atomium duplicate <source> [dest]  - Duplicate a fleet as a new Atomium
 *   atomium link <fleet1> <fleet2>     - Link two fleets for inter-fleet comms
 *   atomium unlink <fleet1> <fleet2>   - Remove link between fleets
 *   atomium hive init <name>           - Create a hive (group of linked Atomiums)
 *   atomium hive status                - Show hive topology
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { theme, colors } from '../ui/theme.js';
import { QayaniError, handleError } from '../utils/errors.js';

// ── Constants ───────────────────────────────────────────────────────────────

const HIVES_DIR = path.join(os.homedir(), '.qayani', 'hives');
const AGENTS_DIR = path.join(os.homedir(), '.qayani', 'agents');
const LINKS_FILE = path.join(HIVES_DIR, 'LINKS.json');

// ── Types ───────────────────────────────────────────────────────────────────

interface FleetLink {
  from: string;   // "fleet-1/researcher"
  to: string;     // "fleet-2/writer"
  type: string;   // "data"
  createdAt: string;
}

interface LinksFile {
  links: FleetLink[];
}

interface HiveFleetEntry {
  name: string;
  path: string;
}

interface HiveLinkEntry {
  from: string;
  to: string;
}

interface HiveConfig {
  name: string;
  fleets: HiveFleetEntry[];
  links: HiveLinkEntry[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read the global LINKS.json file, creating it if it doesn't exist.
 */
function readLinks(): LinksFile {
  ensureDir(HIVES_DIR);
  if (!fs.existsSync(LINKS_FILE)) {
    const empty: LinksFile = { links: [] };
    fs.writeFileSync(LINKS_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  const raw = fs.readFileSync(LINKS_FILE, 'utf-8');
  return JSON.parse(raw) as LinksFile;
}

/**
 * Write the global LINKS.json file.
 */
function writeLinks(data: LinksFile): void {
  ensureDir(HIVES_DIR);
  fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Parse agent names from a fleet directory's FLEET.md frontmatter.
 * Returns the fleet name and list of agent names.
 */
function parseFleetAgents(fleetDir: string): { fleetName: string; agents: string[] } {
  const fleetMdPath = path.join(fleetDir, 'FLEET.md');
  if (!fs.existsSync(fleetMdPath)) {
    throw new QayaniError(
      `No FLEET.md found in "${fleetDir}".`,
      'NO_FLEET',
      'Provide a directory that contains a FLEET.md file.',
    );
  }

  const raw = fs.readFileSync(fleetMdPath, 'utf-8');
  const lines = raw.split('\n');

  // Extract frontmatter
  if (lines[0]?.trim() !== '---') {
    throw new QayaniError(
      `Invalid FLEET.md: missing YAML frontmatter.`,
      'INVALID_FLEET',
      'The file must start with --- followed by YAML config and closed with ---.',
    );
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new QayaniError(
      'Invalid FLEET.md: frontmatter not closed.',
      'INVALID_FLEET',
      'The frontmatter must be closed with ---.',
    );
  }

  // Extract fleet name
  let fleetName = 'unknown';
  const agents: string[] = [];

  const frontmatter = lines.slice(1, closingIndex);
  for (const line of frontmatter) {
    const nameMatch = line.match(/^name:\s*"?([^"\n]+)"?/);
    if (nameMatch) {
      fleetName = nameMatch[1].trim();
    }
    const agentNameMatch = line.match(/^\s+-\s+name:\s*"?([^"\n]+)"?/);
    if (agentNameMatch) {
      agents.push(agentNameMatch[1].trim());
    }
  }

  return { fleetName, agents };
}

/**
 * Parse a HIVE.md file and return the hive configuration.
 */
function parseHiveConfig(hiveMdPath: string): HiveConfig {
  if (!fs.existsSync(hiveMdPath)) {
    throw new QayaniError(
      `No HIVE.md found at "${hiveMdPath}".`,
      'NO_HIVE',
      'Initialize a hive first with: qayani atomium hive init <name>',
    );
  }

  const raw = fs.readFileSync(hiveMdPath, 'utf-8');
  const lines = raw.split('\n');

  if (lines[0]?.trim() !== '---') {
    throw new QayaniError(
      'Invalid HIVE.md: missing YAML frontmatter.',
      'INVALID_HIVE',
      'The file must start with --- followed by YAML config and closed with ---.',
    );
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new QayaniError(
      'Invalid HIVE.md: frontmatter not closed.',
      'INVALID_HIVE',
      'The frontmatter must be closed with ---.',
    );
  }

  const frontmatter = lines.slice(1, closingIndex);

  let hiveName = 'unknown';
  const fleets: HiveFleetEntry[] = [];
  const hiveLinks: HiveLinkEntry[] = [];

  // Simple YAML parsing for the hive structure
  let section: 'none' | 'fleets' | 'links' = 'none';
  let currentFleet: Partial<HiveFleetEntry> = {};

  for (const line of frontmatter) {
    const nameMatch = line.match(/^name:\s*"?([^"\n]+)"?/);
    if (nameMatch) {
      hiveName = nameMatch[1].trim();
      continue;
    }

    if (line.match(/^fleets:/)) {
      section = 'fleets';
      continue;
    }

    if (line.match(/^links:/)) {
      section = 'links';
      continue;
    }

    if (section === 'fleets') {
      const fleetNameMatch = line.match(/^\s+-\s+name:\s*"?([^"\n]+)"?/);
      if (fleetNameMatch) {
        if (currentFleet.name) {
          fleets.push(currentFleet as HiveFleetEntry);
        }
        currentFleet = { name: fleetNameMatch[1].trim() };
        continue;
      }
      const pathMatch = line.match(/^\s+path:\s*"?([^"\n]+)"?/);
      if (pathMatch) {
        currentFleet.path = pathMatch[1].trim();
        continue;
      }
    }

    if (section === 'links') {
      const fromMatch = line.match(/^\s+-\s+from:\s*"?([^"\n]+)"?/);
      if (fromMatch) {
        hiveLinks.push({ from: fromMatch[1].trim(), to: '' });
        continue;
      }
      const toMatch = line.match(/^\s+to:\s*"?([^"\n]+)"?/);
      if (toMatch && hiveLinks.length > 0) {
        hiveLinks[hiveLinks.length - 1].to = toMatch[1].trim();
        continue;
      }
    }
  }

  // Push the last fleet if any
  if (currentFleet.name) {
    fleets.push(currentFleet as HiveFleetEntry);
  }

  return { name: hiveName, fleets, links: hiveLinks };
}

/**
 * Generate a HIVE.md string from a hive configuration.
 */
function generateHiveMd(config: HiveConfig): string {
  let md = `---\nname: ${config.name}\nfleets:\n`;
  for (const fleet of config.fleets) {
    md += `  - name: ${fleet.name}\n`;
    md += `    path: ${fleet.path}\n`;
  }
  if (config.links.length > 0) {
    md += `links:\n`;
    for (const link of config.links) {
      md += `  - from: ${link.from}\n`;
      md += `    to: ${link.to}\n`;
    }
  } else {
    md += `links: []\n`;
  }
  md += `---\n\n# Hive: ${config.name}\n\nThis hive groups multiple fleets for inter-fleet collaboration.\n`;
  return md;
}

/**
 * Register an agent in ~/.qayani/agents/ with a meta.json file.
 */
function registerAgent(
  name: string,
  agentDir: string,
): void {
  const globalDir = path.join(AGENTS_DIR, name);
  ensureDir(globalDir);

  // Read provider/model from AGENT.md if available
  let provider = 'openai';
  let model = 'gpt-4o-mini';
  const agentMdPath = path.join(agentDir, 'AGENT.md');
  if (fs.existsSync(agentMdPath)) {
    const content = fs.readFileSync(agentMdPath, 'utf-8');
    const providerMatch = content.match(/provider:\s*"?([^"\n]+)"?/);
    const modelMatch = content.match(/^\s+name:\s*"?([^"\n]+)"?/m);
    if (providerMatch) provider = providerMatch[1].trim();
    if (modelMatch) model = modelMatch[1].trim();
  }

  const metaPath = path.join(globalDir, 'meta.json');
  const meta = {
    name,
    provider,
    model,
    template: 'duplicated',
    path: agentDir,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * Determine a suffix number for the duplicated fleet by checking existing dirs.
 */
function determineSuffix(baseName: string, destParent: string): number {
  let suffix = 2;
  while (fs.existsSync(path.join(destParent, `${baseName}-${suffix}`))) {
    suffix++;
  }
  return suffix;
}

// ── Command registration ────────────────────────────────────────────────────

export function registerAtomiumManage(program: Command): Command {
  const atomium = program
    .command('atomium')
    .description('Atomium visualization, fleet duplication, and hive management');

  // ── atomium duplicate <source> [dest] ───────────────────────────────────

  atomium
    .command('duplicate <source> [dest]')
    .description('Duplicate an entire fleet as a new Atomium')
    .action((source: string, dest: string | undefined) => {
      try {
        const sourceDir = path.resolve(process.cwd(), source);

        // Validate source fleet exists
        if (!fs.existsSync(sourceDir)) {
          throw new QayaniError(
            `Source directory "${source}" does not exist.`,
            'NOT_FOUND',
            'Provide a valid fleet directory path.',
          );
        }

        const fleetMdPath = path.join(sourceDir, 'FLEET.md');
        if (!fs.existsSync(fleetMdPath)) {
          throw new QayaniError(
            `No FLEET.md found in "${source}".`,
            'NO_FLEET',
            'The source must be a fleet directory containing a FLEET.md file.',
          );
        }

        // Parse source fleet
        const { fleetName, agents } = parseFleetAgents(sourceDir);

        // Determine destination
        const baseName = path.basename(sourceDir);
        const destParent = path.dirname(sourceDir);
        const suffix = determineSuffix(baseName, destParent);

        let destDir: string;
        let destName: string;

        if (dest) {
          destDir = path.resolve(process.cwd(), dest);
          destName = path.basename(destDir);
        } else {
          destName = `${baseName}-${suffix}`;
          destDir = path.join(destParent, destName);
        }

        // Validate dest name
        if (!/^[a-zA-Z0-9_-]+$/.test(destName)) {
          throw new QayaniError(
            `Invalid fleet name: "${destName}"`,
            'INVALID_NAME',
            'Fleet names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        if (fs.existsSync(destDir)) {
          throw new QayaniError(
            `Destination "${destDir}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Copy the entire fleet directory
        fs.cpSync(sourceDir, destDir, { recursive: true });

        // Rename agents: add suffix to each agent name
        const agentSuffix = `-${suffix}`;
        const renamedAgents: { original: string; renamed: string }[] = [];

        for (const agentName of agents) {
          const oldAgentDir = path.join(destDir, agentName);
          const newAgentName = `${agentName}${agentSuffix}`;
          const newAgentDir = path.join(destDir, newAgentName);

          if (fs.existsSync(oldAgentDir)) {
            // Rename directory
            fs.renameSync(oldAgentDir, newAgentDir);

            // Update AGENT.md name field
            const agentMdPath = path.join(newAgentDir, 'AGENT.md');
            if (fs.existsSync(agentMdPath)) {
              let content = fs.readFileSync(agentMdPath, 'utf-8');
              content = content.replace(
                /^(name:\s*)"?[^"\n]+"?/m,
                `$1"${newAgentName}"`,
              );
              fs.writeFileSync(agentMdPath, content, 'utf-8');
            }

            // Register in ~/.qayani/agents/
            registerAgent(newAgentName, newAgentDir);

            renamedAgents.push({ original: agentName, renamed: newAgentName });
          }
        }

        // Update FLEET.md with new names and paths
        const fleetMdContent = fs.readFileSync(path.join(destDir, 'FLEET.md'), 'utf-8');
        let updatedContent = fleetMdContent;

        // Update fleet name
        updatedContent = updatedContent.replace(
          /^(name:\s*)"?[^"\n]+"?/m,
          `$1"${destName}"`,
        );

        // Update each agent reference
        for (const { original, renamed } of renamedAgents) {
          // Replace agent name in agents section
          updatedContent = updatedContent.replace(
            new RegExp(`(- name:\\s*)${escapeRegex(original)}`, 'g'),
            `$1${renamed}`,
          );
          // Replace agentPath
          updatedContent = updatedContent.replace(
            new RegExp(`(agentPath:\\s*)\\./${escapeRegex(original)}`, 'g'),
            `$1./${renamed}`,
          );
          // Replace agent references in workflow
          updatedContent = updatedContent.replace(
            new RegExp(`(agent:\\s*)${escapeRegex(original)}`, 'g'),
            `$1${renamed}`,
          );
          // Replace in dependsOn arrays
          updatedContent = updatedContent.replace(
            new RegExp(`(\\[.*?)${escapeRegex(original)}(.*?\\])`, 'g'),
            `$1${renamed}$2`,
          );
        }

        fs.writeFileSync(path.join(destDir, 'FLEET.md'), updatedContent, 'utf-8');

        // Print the new Atomium structure
        console.log('');
        console.log(theme.success('  Atomium duplicated successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Source:')}      ${sourceDir}`);
        console.log(`  ${theme.bold('Atomium:')}     ${destDir}`);
        console.log(`  ${theme.bold('Fleet Name:')} ${destName}`);
        console.log('');
        console.log(theme.dim('  Agent mapping:'));
        for (const { original, renamed } of renamedAgents) {
          console.log(`    ${colors.muted(original)} ${colors.accent('->')} ${colors.gold(renamed)}`);
        }
        console.log('');
        console.log(theme.dim('  Structure:'));
        console.log(theme.dim(`    ${destName}/`));
        console.log(theme.dim(`    +-- FLEET.md`));
        for (let i = 0; i < renamedAgents.length; i++) {
          const prefix = i === renamedAgents.length - 1 ? '\\--' : '+--';
          console.log(theme.dim(`    ${prefix} ${renamedAgents[i].renamed}/AGENT.md`));
        }
        console.log('');
        console.log(theme.dim('  Next steps:'));
        console.log(theme.info(`    1. cd ${destName}`));
        console.log(theme.info('    2. Customize agents as needed'));
        console.log(theme.info(`    3. qayani fleet run`));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── atomium link <fleet1> <fleet2> ──────────────────────────────────────

  atomium
    .command('link <fleet1> <fleet2>')
    .description('Link two fleets for inter-fleet communication')
    .option('-t, --type <type>', 'Link type (data, control, feedback)', 'data')
    .action((fleet1: string, fleet2: string, opts: { type: string }) => {
      try {
        const fleet1Dir = path.resolve(process.cwd(), fleet1);
        const fleet2Dir = path.resolve(process.cwd(), fleet2);

        // Validate both fleets exist
        const fleet1Info = parseFleetAgents(fleet1Dir);
        const fleet2Info = parseFleetAgents(fleet2Dir);

        // Read existing links
        const linksData = readLinks();

        // Determine link endpoints: first agent of fleet1 -> first agent of fleet2
        const fromAgent = fleet1Info.agents[0];
        const toAgent = fleet2Info.agents[0];

        if (!fromAgent || !toAgent) {
          throw new QayaniError(
            'Both fleets must have at least one agent to link.',
            'NO_AGENTS',
            'Add agents to the fleets before linking.',
          );
        }

        const fromKey = `${fleet1Info.fleetName}/${fromAgent}`;
        const toKey = `${fleet2Info.fleetName}/${toAgent}`;

        // Check if link already exists
        const existing = linksData.links.find(
          (l) => l.from === fromKey && l.to === toKey,
        );

        if (existing) {
          throw new QayaniError(
            `Link already exists: ${fromKey} -> ${toKey}`,
            'LINK_EXISTS',
            'Use "qayani atomium unlink" to remove the existing link first.',
          );
        }

        // Add the link
        const newLink: FleetLink = {
          from: fromKey,
          to: toKey,
          type: opts.type,
          createdAt: new Date().toISOString(),
        };

        linksData.links.push(newLink);
        writeLinks(linksData);

        // Print confirmation
        console.log('');
        console.log(theme.success('  Fleets linked successfully.'));
        console.log('');

        const boxWidth = 28;
        const f1Label = truncate(fleet1Info.fleetName, boxWidth - 8);
        const f2Label = truncate(fleet2Info.fleetName, boxWidth - 8);

        console.log(
          `  ${colors.muted('+')}${colors.muted('-'.repeat(boxWidth))}${colors.muted('+')}     ${colors.muted('+')}${colors.muted('-'.repeat(boxWidth))}${colors.muted('+')}`,
        );
        console.log(
          `  ${colors.muted('|')} ${colors.gold(padRight(f1Label, boxWidth - 2))} ${colors.muted('|')}     ${colors.muted('|')} ${colors.gold(padRight(f2Label, boxWidth - 2))} ${colors.muted('|')}`,
        );
        console.log(
          `  ${colors.muted('|')} ${colors.accent(padRight(fromAgent, boxWidth - 2))} ${colors.muted('|')}${colors.success('====>')}${colors.muted('|')} ${colors.accent(padRight(toAgent, boxWidth - 2))} ${colors.muted('|')}`,
        );
        console.log(
          `  ${colors.muted('+')}${colors.muted('-'.repeat(boxWidth))}${colors.muted('+')}     ${colors.muted('+')}${colors.muted('-'.repeat(boxWidth))}${colors.muted('+')}`,
        );

        console.log('');
        console.log(`  ${theme.bold('Type:')}  ${opts.type}`);
        console.log(`  ${theme.bold('Stored:')} ${LINKS_FILE}`);
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── atomium unlink <fleet1> <fleet2> ────────────────────────────────────

  atomium
    .command('unlink <fleet1> <fleet2>')
    .description('Remove link between two fleets')
    .action((fleet1: string, fleet2: string) => {
      try {
        const fleet1Dir = path.resolve(process.cwd(), fleet1);
        const fleet2Dir = path.resolve(process.cwd(), fleet2);

        // Validate both fleets exist
        const fleet1Info = parseFleetAgents(fleet1Dir);
        const fleet2Info = parseFleetAgents(fleet2Dir);

        // Read existing links
        const linksData = readLinks();

        // Find links between these two fleets (in either direction)
        const fleet1Name = fleet1Info.fleetName;
        const fleet2Name = fleet2Info.fleetName;

        const initialCount = linksData.links.length;
        linksData.links = linksData.links.filter((link) => {
          const fromFleet = link.from.split('/')[0];
          const toFleet = link.to.split('/')[0];
          const isMatch =
            (fromFleet === fleet1Name && toFleet === fleet2Name) ||
            (fromFleet === fleet2Name && toFleet === fleet1Name);
          return !isMatch;
        });

        const removedCount = initialCount - linksData.links.length;

        if (removedCount === 0) {
          throw new QayaniError(
            `No links found between "${fleet1Name}" and "${fleet2Name}".`,
            'NO_LINK',
            'Check fleet names with: qayani atomium hive status',
          );
        }

        writeLinks(linksData);

        console.log('');
        console.log(theme.success(`  Removed ${removedCount} link${removedCount > 1 ? 's' : ''} between fleets.`));
        console.log('');
        console.log(`  ${colors.muted(fleet1Name)} ${colors.error('--X--')} ${colors.muted(fleet2Name)}`);
        console.log('');
        console.log(`  ${theme.bold('Remaining links:')} ${linksData.links.length}`);
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── atomium hive ────────────────────────────────────────────────────────

  const hive = atomium
    .command('hive')
    .description('Manage hives (groups of linked Atomiums)');

  // ── atomium hive init <name> ────────────────────────────────────────────

  hive
    .command('init <name>')
    .description('Create a hive (group of linked Atomiums)')
    .option('-f, --fleets <fleets>', 'Comma-separated fleet names to include', '')
    .action((name: string, opts: { fleets: string }) => {
      try {
        // Validate hive name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          throw new QayaniError(
            `Invalid hive name: "${name}"`,
            'INVALID_NAME',
            'Hive names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        const hiveDir = path.resolve(process.cwd(), name);

        if (fs.existsSync(hiveDir)) {
          throw new QayaniError(
            `Directory "${name}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Create hive directory
        fs.mkdirSync(hiveDir, { recursive: true });

        // Determine fleet names
        const fleetNames = opts.fleets
          ? opts.fleets.split(',').map((f) => f.trim()).filter(Boolean)
          : ['fleet-1', 'fleet-2'];

        // Create fleet directories using the same template as fleet init
        const fleets: HiveFleetEntry[] = [];
        const allAgents: Map<string, string[]> = new Map();

        for (const fleetName of fleetNames) {
          if (!/^[a-zA-Z0-9_-]+$/.test(fleetName)) {
            throw new QayaniError(
              `Invalid fleet name: "${fleetName}"`,
              'INVALID_NAME',
              'Fleet names must contain only letters, numbers, hyphens, and underscores.',
            );
          }

          const fleetDir = path.join(hiveDir, fleetName);
          fs.mkdirSync(fleetDir, { recursive: true });

          const agentDefs = [
            { dir: 'researcher', role: 'Research specialist who finds and analyzes information' },
            { dir: 'writer', role: 'Content writer who creates clear, well-structured text' },
            { dir: 'reviewer', role: 'Quality reviewer who checks for accuracy and clarity' },
          ];

          const agentNames: string[] = [];

          for (const { dir, role } of agentDefs) {
            const agentDir = path.join(fleetDir, dir);
            fs.mkdirSync(agentDir, { recursive: true });
            fs.writeFileSync(
              path.join(agentDir, 'AGENT.md'),
              generateAgentMd(dir, role),
              'utf-8',
            );
            agentNames.push(dir);
          }

          allAgents.set(fleetName, agentNames);

          // Write FLEET.md
          fs.writeFileSync(
            path.join(fleetDir, 'FLEET.md'),
            generateFleetMd(fleetName),
            'utf-8',
          );

          fleets.push({ name: fleetName, path: `./${fleetName}` });
        }

        // Set up initial links (first agent of fleet-1 -> first agent of fleet-2)
        const hiveLinks: HiveLinkEntry[] = [];
        if (fleetNames.length >= 2) {
          const agents1 = allAgents.get(fleetNames[0])!;
          const agents2 = allAgents.get(fleetNames[1])!;
          if (agents1.length > 0 && agents2.length > 0) {
            hiveLinks.push({
              from: `${fleetNames[0]}/${agents1[0]}`,
              to: `${fleetNames[1]}/${agents2[0]}`,
            });
          }
        }

        // Write HIVE.md
        const hiveConfig: HiveConfig = { name, fleets, links: hiveLinks };
        fs.writeFileSync(
          path.join(hiveDir, 'HIVE.md'),
          generateHiveMd(hiveConfig),
          'utf-8',
        );

        // Also register links in global LINKS.json
        if (hiveLinks.length > 0) {
          const linksData = readLinks();
          for (const link of hiveLinks) {
            linksData.links.push({
              from: link.from,
              to: link.to,
              type: 'data',
              createdAt: new Date().toISOString(),
            });
          }
          writeLinks(linksData);
        }

        // Print output
        console.log('');
        console.log(theme.success('  Hive created successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Name:')}      ${name}`);
        console.log(`  ${theme.bold('Fleets:')}    ${fleetNames.join(', ')}`);
        console.log(`  ${theme.bold('Links:')}     ${hiveLinks.length}`);
        console.log(`  ${theme.bold('Location:')}  ${hiveDir}`);
        console.log('');
        console.log(theme.dim('  Structure:'));
        console.log(theme.dim(`    ${name}/`));
        console.log(theme.dim(`    +-- HIVE.md`));
        for (let fi = 0; fi < fleetNames.length; fi++) {
          const fleetName = fleetNames[fi];
          const isLast = fi === fleetNames.length - 1;
          const prefix = isLast ? '\\--' : '+--';
          const agents = allAgents.get(fleetName) ?? [];
          console.log(theme.dim(`    ${prefix} ${fleetName}/`));
          console.log(theme.dim(`    ${isLast ? '   ' : '|  '} +-- FLEET.md`));
          for (let ai = 0; ai < agents.length; ai++) {
            const agentPrefix = ai === agents.length - 1 ? '\\--' : '+--';
            console.log(theme.dim(`    ${isLast ? '   ' : '|  '} ${agentPrefix} ${agents[ai]}/AGENT.md`));
          }
        }
        console.log('');

        if (hiveLinks.length > 0) {
          console.log(theme.dim('  Initial links:'));
          for (const link of hiveLinks) {
            console.log(`    ${colors.accent(link.from)} ${colors.success('->')} ${colors.accent(link.to)}`);
          }
          console.log('');
        }

        console.log(theme.dim('  Next steps:'));
        console.log(theme.info(`    1. cd ${name}`));
        console.log(theme.info('    2. Customize fleet agents'));
        console.log(theme.info('    3. qayani atomium hive status'));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── atomium hive status ─────────────────────────────────────────────────

  hive
    .command('status')
    .description('Show hive topology')
    .action(() => {
      try {
        // Look for HIVE.md in current directory
        const hiveMdPath = path.resolve(process.cwd(), 'HIVE.md');

        if (!fs.existsSync(hiveMdPath)) {
          throw new QayaniError(
            'No HIVE.md found in current directory.',
            'NO_HIVE',
            'Run this command from a hive directory, or create one with: qayani atomium hive init <name>',
          );
        }

        const config = parseHiveConfig(hiveMdPath);

        // Gather agent info for each fleet
        const fleetAgents: Map<string, string[]> = new Map();

        for (const fleet of config.fleets) {
          const fleetDir = path.resolve(process.cwd(), fleet.path);
          try {
            const info = parseFleetAgents(fleetDir);
            fleetAgents.set(fleet.name, info.agents);
          } catch {
            fleetAgents.set(fleet.name, ['(unable to read)']);
          }
        }

        // Build a set of linked agents for highlighting
        const linkedFrom = new Set<string>();
        const linkedTo = new Set<string>();
        for (const link of config.links) {
          linkedFrom.add(link.from);
          linkedTo.add(link.to);
        }

        // Print header
        console.log('');
        console.log(colors.gold.bold(`  Hive: ${config.name}`));
        console.log(colors.muted('  ' + '-'.repeat(50)));
        console.log('');

        // Determine box dimensions
        const BOX_INNER = 22;

        // Build fleet boxes
        const fleetBoxes: { name: string; lines: string[] }[] = [];

        for (const fleet of config.fleets) {
          const agents = fleetAgents.get(fleet.name) ?? [];
          const lines: string[] = [];

          const titleText = ` ${fleet.name} `;
          const titlePadding = BOX_INNER - titleText.length - 4;
          const leftPad = Math.floor(titlePadding / 2);
          const rightPad = titlePadding - leftPad;

          lines.push(
            colors.muted('\u256D') +
            colors.muted('\u2500'.repeat(leftPad + 2)) +
            colors.gold(` ${fleet.name} `) +
            colors.muted('\u2500'.repeat(rightPad + 2)) +
            colors.muted('\u256E'),
          );

          for (const agent of agents) {
            const key = `${fleet.name}/${agent}`;
            const isSource = linkedFrom.has(key);
            const isTarget = linkedTo.has(key);
            const bullet = (isSource || isTarget)
              ? colors.success('\u25CF')
              : colors.muted('\u25CB');

            const agentText = ` ${bullet} ${padRight(agent, BOX_INNER - 5)}`;
            lines.push(
              colors.muted('\u2502') + agentText + colors.muted('\u2502'),
            );
          }

          lines.push(
            colors.muted('\u2570') +
            colors.muted('\u2500'.repeat(BOX_INNER)) +
            colors.muted('\u256F'),
          );

          fleetBoxes.push({ name: fleet.name, lines });
        }

        // Print boxes side by side (pairs)
        for (let i = 0; i < fleetBoxes.length; i += 2) {
          const left = fleetBoxes[i];
          const right = i + 1 < fleetBoxes.length ? fleetBoxes[i + 1] : null;

          // Find links between this pair of fleets
          const pairLinks: { fromAgent: string; toAgent: string; direction: 'lr' | 'rl' }[] = [];
          if (right) {
            for (const link of config.links) {
              const [fromFleet, fromAgent] = link.from.split('/');
              const [toFleet, toAgent] = link.to.split('/');
              if (fromFleet === left.name && toFleet === right.name) {
                pairLinks.push({ fromAgent, toAgent, direction: 'lr' });
              } else if (fromFleet === right.name && toFleet === left.name) {
                pairLinks.push({ fromAgent: toAgent, toAgent: fromAgent, direction: 'rl' });
              }
            }
          }

          // Determine max height
          const maxLines = Math.max(
            left.lines.length,
            right ? right.lines.length : 0,
          );

          // Map agent lines to link arrows
          // Agents start at line index 1 (after the top border)
          const leftAgents = fleetAgents.get(left.name) ?? [];
          const rightAgents = right ? (fleetAgents.get(right.name) ?? []) : [];

          for (let row = 0; row < maxLines; row++) {
            const leftLine = row < left.lines.length ? left.lines[row] : padRight('', BOX_INNER + 2);
            const rightLine = right && row < right.lines.length ? right.lines[row] : '';

            // Determine connector between boxes
            let connector = '     ';
            if (right) {
              const leftAgentIdx = row - 1; // agents start at row 1
              const rightAgentIdx = row - 1;

              for (const pl of pairLinks) {
                const leftMatch = leftAgentIdx >= 0 && leftAgentIdx < leftAgents.length && leftAgents[leftAgentIdx] === pl.fromAgent;
                const rightMatch = rightAgentIdx >= 0 && rightAgentIdx < rightAgents.length && rightAgents[rightAgentIdx] === pl.toAgent;

                if (pl.direction === 'lr' && leftMatch) {
                  connector = colors.success('\u2501\u2501\u2501\u2501\u25B8');
                  break;
                } else if (pl.direction === 'rl' && rightMatch) {
                  connector = colors.accent('\u25C2\u2501\u2501\u2501\u2501');
                  break;
                }
              }
            }

            console.log(`  ${leftLine}${connector}${rightLine}`);
          }

          console.log('');
        }

        // Print link summary
        if (config.links.length > 0) {
          console.log(theme.dim('  Links:'));
          for (const link of config.links) {
            console.log(`    ${colors.accent(link.from)} ${colors.success('\u2501\u2501>')} ${colors.accent(link.to)}`);
          }
          console.log('');
        } else {
          console.log(theme.dim('  No inter-fleet links configured.'));
          console.log(theme.dim('  Add links with: qayani atomium link <fleet1> <fleet2>'));
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });

  return atomium;
}

// ── Utility functions ───────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Generate a basic AGENT.md for hive fleet initialization.
 */
function generateAgentMd(name: string, role: string): string {
  return `---
name: "${name}"
version: "1.0"
description: "${role}"
model:
  provider: "openai"
  name: "gpt-4o-mini"
  temperature: 0.7
  maxTokens: 4096
memory:
  backend: none
persona:
  traits:
    helpfulness: 0.9
    conciseness: 0.7
  expertise:
    - general knowledge
---

# ${name}

You are ${name}, a ${role.toLowerCase()}.

## Instructions

- Complete your assigned tasks thoroughly and accurately.
- Collaborate effectively with other agents in the fleet.
- Be clear and concise in your outputs.

## Constraints

- Do not fabricate information.
- Stay focused on the task at hand.
`;
}

/**
 * Generate a basic FLEET.md for hive fleet initialization.
 */
function generateFleetMd(name: string): string {
  return `---
name: "${name}"
version: "1.0"
description: "A multi-agent fleet for research, writing, and review"
communication: orchestrated
agents:
  - name: researcher
    role: "Research specialist who finds and analyzes information"
    agentPath: ./researcher
    capabilities:
      - information gathering
      - analysis
      - fact checking
  - name: writer
    role: "Content writer who creates clear, well-structured text"
    agentPath: ./writer
    capabilities:
      - writing
      - summarization
      - formatting
  - name: reviewer
    role: "Quality reviewer who checks for accuracy and clarity"
    agentPath: ./reviewer
    capabilities:
      - review
      - editing
      - quality assurance
workflow:
  - agent: researcher
    task: "Research the given topic thoroughly. Gather key facts, data, and insights."
    output: research_data
  - agent: writer
    task: "Write a well-structured article based on the research data provided."
    dependsOn: [researcher]
    output: draft
  - agent: reviewer
    task: "Review the draft for accuracy, clarity, and completeness. Provide the final improved version."
    dependsOn: [writer]
    output: final
---

## Fleet Instructions

This fleet coordinates three agents to produce high-quality content:

1. **Researcher** - Gathers and analyzes information on the given topic
2. **Writer** - Transforms research into a well-structured article
3. **Reviewer** - Ensures quality, accuracy, and clarity

The workflow is orchestrated: the writer waits for research, and the reviewer waits for the draft.
`;
}
