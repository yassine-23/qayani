/**
 * ARMY.md loader — parse and serialize Army configuration files.
 *
 * ARMY.md uses YAML frontmatter (like FLEET.md and AGENT.md) to define
 * the army topology: which fleets to include, how they link, and the
 * orchestration mode.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { parseFleetFile } from '../fleet/loader.js';
import { AtomiumBuilder } from './builder.js';
import type { ArmyConfig, HiveConfig, AtomiumStructure } from './types.js';

const ARMY_FILENAME = 'ARMY.md';

// ── Raw frontmatter types ───────────────────────────────────────────────────

interface RawArmyFrontmatter {
  name?: string;
  version?: string;
  description?: string;
  maxAgents?: number;
  orchestrationMode?: string;
  hives?: RawHive[];
}

interface RawHive {
  structures?: Array<{
    name?: string;
    fleetPath?: string;
  }>;
  links?: Array<{
    fromStructure?: string;
    fromNode?: string;
    toStructure?: string;
    toNode?: string;
  }>;
}

// ── Parse ARMY.md ───────────────────────────────────────────────────────────

/**
 * Parse an ARMY.md file and resolve all fleet references.
 *
 * Loads each referenced FLEET.md, builds Atomium structures from their
 * agents, and assembles the full ArmyConfig.
 */
export async function parseArmyFile(filePath: string): Promise<ArmyConfig> {
  const absolutePath = path.resolve(filePath);
  const armyDir = path.dirname(absolutePath);

  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Army file not found: ${absolutePath}`);
    }
    throw new Error(
      `Failed to read army file at ${absolutePath}: ${(err as Error).message}`,
    );
  }

  const { frontmatter } = extractFrontmatter(raw);

  if (!frontmatter) {
    throw new Error(
      `Army file at ${absolutePath} is missing YAML frontmatter. ` +
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

  const fm = parsed as RawArmyFrontmatter;

  // Validate required fields
  if (!fm.name || typeof fm.name !== 'string') {
    throw new Error(
      `Army config in ${absolutePath} is missing required field "name".`,
    );
  }

  const validModes = ['centralized', 'distributed', 'swarm'] as const;
  const orchestrationMode =
    typeof fm.orchestrationMode === 'string' &&
    validModes.includes(fm.orchestrationMode as (typeof validModes)[number])
      ? (fm.orchestrationMode as ArmyConfig['orchestrationMode'])
      : 'distributed';

  const maxAgents =
    typeof fm.maxAgents === 'number' && fm.maxAgents > 0
      ? Math.min(fm.maxAgents, 100)
      : 100;

  // Build hives from fleet references
  const hives: HiveConfig[] = [];

  if (Array.isArray(fm.hives)) {
    for (const rawHive of fm.hives) {
      const structures: AtomiumStructure[] = [];

      if (Array.isArray(rawHive.structures)) {
        for (const rawStructure of rawHive.structures) {
          if (!rawStructure.name || !rawStructure.fleetPath) {
            throw new Error(
              `Each structure in an army hive must have "name" and "fleetPath".`,
            );
          }

          // Resolve fleet path relative to ARMY.md
          const fleetPath = path.resolve(armyDir, rawStructure.fleetPath);
          const fleetFile = path.join(fleetPath, 'FLEET.md');

          const fleetConfig = await parseFleetFile(fleetFile);

          // Resolve agent paths relative to fleet directory
          for (const agent of fleetConfig.agents) {
            if (!path.isAbsolute(agent.agentPath)) {
              agent.agentPath = path.resolve(fleetPath, agent.agentPath);
            }
          }

          const structure = AtomiumBuilder.fromAgents(
            rawStructure.name,
            fleetConfig.agents,
          );

          structures.push(structure);
        }
      }

      // Parse links
      const links: HiveConfig['links'] = [];
      if (Array.isArray(rawHive.links)) {
        for (const rawLink of rawHive.links) {
          if (
            rawLink.fromStructure &&
            rawLink.fromNode &&
            rawLink.toStructure &&
            rawLink.toNode
          ) {
            links.push({
              fromStructure: rawLink.fromStructure,
              fromNode: rawLink.fromNode,
              toStructure: rawLink.toStructure,
              toNode: rawLink.toNode,
            });
          }
        }
      }

      hives.push({ structures, links });
    }
  }

  const army: ArmyConfig = {
    name: fm.name,
    version: fm.version ?? '1.0',
    description: fm.description ?? `Army: ${fm.name}`,
    hives,
    maxAgents,
    orchestrationMode,
  };

  // Validate total agent count
  const validation = AtomiumBuilder.validateArmySize(army);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return army;
}

// ── Find ARMY.md ────────────────────────────────────────────────────────────

/**
 * Search for ARMY.md starting from the given directory (or cwd),
 * walking up parent directories until found or the filesystem root is reached.
 */
export function findArmyFile(dir?: string): string | null {
  let current = path.resolve(dir ?? process.cwd());

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(current, ARMY_FILENAME);

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

// ── Serialize Army to ARMY.md ───────────────────────────────────────────────

/**
 * Generate the content of an ARMY.md file from an ArmyConfig and
 * fleet-relative paths.
 */
export function serializeArmyConfig(
  army: ArmyConfig,
  fleetPaths: Array<{ name: string; relativePath: string }>,
  instructions?: string,
): string {
  const hivesYaml = army.hives.map((hive, hiveIdx) => {
    const structuresYaml = hive.structures.map((s) => {
      const fp = fleetPaths.find((fp) => fp.name === s.name);
      return {
        name: s.name,
        fleetPath: fp?.relativePath ?? `./${s.name}`,
      };
    });

    const linksYaml = hive.links.length > 0 ? hive.links : undefined;

    const hiveObj: Record<string, unknown> = {
      structures: structuresYaml,
    };
    if (linksYaml) {
      hiveObj.links = linksYaml;
    }

    return hiveObj;
  });

  const frontmatterObj: Record<string, unknown> = {
    name: army.name,
    version: army.version,
    description: army.description,
    maxAgents: army.maxAgents,
    orchestrationMode: army.orchestrationMode,
    hives: hivesYaml,
  };

  const yaml = YAML.stringify(frontmatterObj, { indent: 2 });

  const body =
    instructions ??
    `## Army Instructions\n\nCoordinate across all fleets to maximize output.\n`;

  return `---\n${yaml}---\n\n${body}\n`;
}

// ── Internal helpers ────────────────────────────────────────────────────────

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
