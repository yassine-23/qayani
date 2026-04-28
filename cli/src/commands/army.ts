import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { QayaniError, handleError } from '../utils/errors.js';
import { parseFleetFile, findFleetFile } from '../fleet/loader.js';
import { parseArmyFile, findArmyFile, serializeArmyConfig } from '../atomium/loader.js';
import { AtomiumBuilder } from '../atomium/builder.js';
import { FleetRunner } from '../fleet/runtime.js';
import { createProvider, getProviderEnvKey } from '../llm/registry.js';
import type { AgentConfig } from '../agent/types.js';
import type { FleetConfig } from '../fleet/types.js';
import type { AtomiumStructure, ArmyConfig } from '../atomium/types.js';

// ── Default templates ───────────────────────────────────────────────────────

function defaultFleetTemplate(name: string, agentDefs: Array<{ name: string; role: string }>): string {
  const agentsYaml = agentDefs
    .map(
      (a) =>
        `  - name: ${a.name}\n` +
        `    role: "${a.role}"\n` +
        `    agentPath: ./${a.name}`,
    )
    .join('\n');

  const workflowYaml = agentDefs
    .map((a, i) => {
      const deps = i > 0 ? `\n    dependsOn: [${agentDefs[i - 1].name}]` : '';
      return (
        `  - agent: ${a.name}\n` +
        `    task: "Perform your role as ${a.role}."${deps}\n` +
        `    output: ${a.name}_output`
      );
    })
    .join('\n');

  return `---
name: "${name}"
version: "1.0"
description: "Fleet: ${name}"
communication: orchestrated
agents:
${agentsYaml}
workflow:
${workflowYaml}
---

## Fleet Instructions

This fleet is part of an army orchestration.
`;
}

function defaultAgentTemplate(name: string, role: string): string {
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

// ── Prompt for user input ───────────────────────────────────────────────────

function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Resolve API key for an agent config ─────────────────────────────────────

function resolveApiKey(providerName: string): string | null {
  const envKey = getProviderEnvKey(providerName);
  let apiKey = process.env[envKey];

  if (!apiKey) {
    try {
      const configPath = path.join(os.homedir(), '.qayani', 'config.json');
      const raw = fs.readFileSync(configPath, 'utf-8');
      const globalConfig = JSON.parse(raw) as Record<string, string>;
      const configKey = `${providerName}-api-key`;
      apiKey = globalConfig[configKey];
    } catch {
      // No global config file
    }
  }

  return apiKey ?? null;
}

// ── Atomium visualization ───────────────────────────────────────────────────

function printAtomiumVisualization(army: ArmyConfig): void {
  const gold = chalk.hex('#D4AF37');
  const dim = chalk.dim;

  console.log('');
  console.log(gold.bold('  Atomium Topology'));
  console.log(dim('  ' + '─'.repeat(50)));
  console.log('');

  for (const hive of army.hives) {
    for (const structure of hive.structures) {
      const layoutTag = dim(`[${structure.layout}]`);
      console.log(`  ${gold('◆')} ${chalk.bold(structure.name)} ${layoutTag}`);

      for (const node of structure.nodes) {
        const isCenter = node.id === structure.centerNodeId;
        const icon = isCenter ? gold('●') : dim('○');
        const label = isCenter
          ? chalk.bold(node.name)
          : node.name;
        const role = dim(`(${node.role})`);
        const connCount = dim(`[${node.connections.length} links]`);
        console.log(`    ${icon} ${label} ${role} ${connCount}`);
      }

      console.log('');
    }

    // Print inter-structure links
    if (hive.links.length > 0) {
      console.log(dim('  Inter-fleet links:'));
      for (const link of hive.links) {
        console.log(
          dim('    ') +
            chalk.cyan(link.fromStructure) +
            dim(':') +
            chalk.white(link.fromNode) +
            dim(' --> ') +
            chalk.cyan(link.toStructure) +
            dim(':') +
            chalk.white(link.toNode),
        );
      }
      console.log('');
    }
  }

  const totalAgents = AtomiumBuilder.countAgents(army);
  console.log(dim('  ' + '─'.repeat(50)));
  console.log(
    `  ${dim('Total agents:')} ${chalk.bold(String(totalAgents))}${dim('/100')}`,
  );
  console.log('');
}

// ── Command registration ────────────────────────────────────────────────────

export function registerArmy(program: Command): void {
  const army = program
    .command('army')
    .description('Multi-fleet army orchestration with Atomium topology');

  // ── army init <name> ──────────────────────────────────────────────────

  army
    .command('init <name>')
    .description('Create a new army with ARMY.md and multiple fleets')
    .action((name: string) => {
      try {
        // Validate army name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          throw new QayaniError(
            `Invalid army name: "${name}"`,
            'INVALID_NAME',
            'Army names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        const armyDir = path.resolve(process.cwd(), name);

        if (fs.existsSync(armyDir)) {
          throw new QayaniError(
            `Directory "${name}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Create army directory
        fs.mkdirSync(armyDir, { recursive: true });

        // Define two default fleets
        const fleets = [
          {
            name: 'fleet-1',
            agents: [
              { name: 'researcher', role: 'Research specialist' },
              { name: 'writer', role: 'Content writer' },
              { name: 'reviewer', role: 'Quality reviewer' },
            ],
          },
          {
            name: 'fleet-2',
            agents: [
              { name: 'analyst', role: 'Data analyst' },
              { name: 'strategist', role: 'Strategy planner' },
              { name: 'editor', role: 'Final editor' },
            ],
          },
        ];

        // Create each fleet directory
        for (const fleet of fleets) {
          const fleetDir = path.join(armyDir, fleet.name);
          fs.mkdirSync(fleetDir, { recursive: true });

          // Create FLEET.md
          fs.writeFileSync(
            path.join(fleetDir, 'FLEET.md'),
            defaultFleetTemplate(fleet.name, fleet.agents),
            'utf-8',
          );

          // Create agent directories
          for (const agent of fleet.agents) {
            const agentDir = path.join(fleetDir, agent.name);
            fs.mkdirSync(agentDir, { recursive: true });
            fs.writeFileSync(
              path.join(agentDir, 'AGENT.md'),
              defaultAgentTemplate(agent.name, agent.role),
              'utf-8',
            );
          }
        }

        // Build Atomium structures for visualization
        const structures: AtomiumStructure[] = fleets.map((fleet) =>
          AtomiumBuilder.fromAgents(
            fleet.name,
            fleet.agents.map((a) => ({
              name: a.name,
              role: a.role,
              agentPath: `./${fleet.name}/${a.name}`,
            })),
          ),
        );

        const hive = AtomiumBuilder.createHive(structures);
        const armyConfig = AtomiumBuilder.createArmy(name, [hive], {
          description: `Army: ${name} - multi-fleet orchestration`,
          orchestrationMode: 'distributed',
        });

        // Write ARMY.md
        const fleetPaths = fleets.map((f) => ({
          name: f.name,
          relativePath: `./${f.name}`,
        }));
        const armyMdContent = serializeArmyConfig(
          armyConfig,
          fleetPaths,
          `## Army Instructions\n\nThis army coordinates ${fleets.length} fleets with ${fleets.reduce((sum, f) => sum + f.agents.length, 0)} total agents.\n\n### Fleets\n\n${fleets.map((f) => `- **${f.name}**: ${f.agents.map((a) => a.name).join(', ')}`).join('\n')}\n\n### Workflow\n\nAll fleets execute in parallel (distributed mode). Cross-fleet links allow agents to share context.\n`,
        );
        fs.writeFileSync(path.join(armyDir, 'ARMY.md'), armyMdContent, 'utf-8');

        // Success output
        console.log('');
        console.log(theme.success('  Army created successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Name:')}       ${name}`);
        console.log(`  ${theme.bold('Fleets:')}     ${fleets.length}`);
        console.log(`  ${theme.bold('Agents:')}     ${fleets.reduce((sum, f) => sum + f.agents.length, 0)}`);
        console.log(`  ${theme.bold('Mode:')}       distributed`);
        console.log(`  ${theme.bold('Location:')}   ${armyDir}`);
        console.log('');

        // Print structure
        console.log(theme.dim('  Structure:'));
        console.log(theme.dim(`    ${name}/`));
        console.log(theme.dim('    ├── ARMY.md'));
        for (let i = 0; i < fleets.length; i++) {
          const fleet = fleets[i];
          const isLast = i === fleets.length - 1;
          const prefix = isLast ? '└──' : '├──';
          console.log(theme.dim(`    ${prefix} ${fleet.name}/`));
          console.log(theme.dim(`    ${isLast ? '   ' : '│  '} ├── FLEET.md`));
          for (let j = 0; j < fleet.agents.length; j++) {
            const agent = fleet.agents[j];
            const agentIsLast = j === fleet.agents.length - 1;
            const agentPrefix = agentIsLast ? '└──' : '├──';
            console.log(
              theme.dim(
                `    ${isLast ? '   ' : '│  '} ${agentPrefix} ${agent.name}/AGENT.md`,
              ),
            );
          }
        }
        console.log('');

        // Print Atomium topology
        printAtomiumVisualization(armyConfig);

        console.log(theme.dim('  Next steps:'));
        console.log('');
        console.log(theme.info(`    1. cd ${name}`));
        console.log(theme.info('    2. Edit ARMY.md and fleet/agent files'));
        console.log(theme.info('    3. Set your API key:'));
        console.log(theme.dim('       export OPENAI_API_KEY=your-key-here'));
        console.log(theme.info('    4. qayani army run'));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── army run [name] ───────────────────────────────────────────────────

  army
    .command('run [name]')
    .description('Orchestrate all fleets in the army')
    .option('-t, --task <task>', 'Task to execute (skips interactive prompt)')
    .action(async (name: string | undefined, opts: { task?: string }) => {
      try {
        // Find ARMY.md
        let armyFilePath: string | null = null;

        if (name) {
          const candidate = path.resolve(process.cwd(), name, 'ARMY.md');
          if (fs.existsSync(candidate)) {
            armyFilePath = candidate;
          } else {
            armyFilePath = findArmyFile(path.resolve(process.cwd(), name));
          }
        } else {
          armyFilePath = findArmyFile();
        }

        if (!armyFilePath) {
          console.error(theme.error('\n  No ARMY.md found.\n'));
          console.log(theme.dim('  Create one with: qayani army init <name>\n'));
          process.exit(1);
        }

        // Parse army config
        const armyConfig = await parseArmyFile(armyFilePath);

        // Get the task
        let task = opts.task;
        if (!task) {
          task = await promptInput(chalk.hex('#D4AF37')('  Task: '));
          if (!task) {
            console.log(theme.dim('\n  No task provided. Exiting.\n'));
            return;
          }
        }

        // Print army banner
        console.log('');
        console.log(
          chalk.hex('#D4AF37').bold('  Army: ') + chalk.bold(armyConfig.name),
        );
        console.log(chalk.dim(`  ${armyConfig.description}`));
        console.log(
          chalk.dim(
            `  Mode: ${armyConfig.orchestrationMode} | ` +
              `Hives: ${armyConfig.hives.length} | ` +
              `Agents: ${AtomiumBuilder.countAgents(armyConfig)}`,
          ),
        );
        console.log(chalk.dim('  ' + '─'.repeat(50)));

        // Create provider factory
        const providerFactory = (agentConfig: AgentConfig) => {
          const providerName = agentConfig.model.provider;
          const apiKey = resolveApiKey(providerName);

          if (!apiKey) {
            const envKey = getProviderEnvKey(providerName);
            throw new QayaniError(
              `Missing API key for provider "${providerName}" (agent: ${agentConfig.name})`,
              'MISSING_API_KEY',
              `Set ${envKey} or run: qayani config ${providerName}-api-key "your-key"`,
            );
          }

          return createProvider(providerName, apiKey);
        };

        // Collect all fleet configs from the army
        const fleetConfigs: Array<{ config: FleetConfig; structureName: string }> = [];

        for (const hive of armyConfig.hives) {
          for (const structure of hive.structures) {
            // Build a FleetConfig from the structure's agent data
            // We need to find the original FLEET.md to get the workflow
            // The structure stores agent info; we need to re-parse the fleet file
            const armyDir = path.dirname(armyFilePath);

            // Try to find FLEET.md in the structure's agent paths
            const firstAgent = structure.nodes[0];
            if (!firstAgent) continue;

            // Walk up from agent path to find FLEET.md
            const agentDir = path.dirname(firstAgent.agentPath);
            const fleetFile = path.join(agentDir, 'FLEET.md');

            let config: FleetConfig;
            try {
              config = await parseFleetFile(fleetFile);
              // Resolve agent paths relative to fleet directory
              const fleetDir = path.dirname(fleetFile);
              for (const agent of config.agents) {
                if (!path.isAbsolute(agent.agentPath)) {
                  agent.agentPath = path.resolve(fleetDir, agent.agentPath);
                }
              }
            } catch {
              // If we can't find the fleet file, skip this structure
              console.log(
                chalk.yellow(`  ! Could not load fleet for structure "${structure.name}", skipping.`),
              );
              continue;
            }

            fleetConfigs.push({ config, structureName: structure.name });
          }
        }

        if (fleetConfigs.length === 0) {
          throw new QayaniError(
            'No runnable fleets found in the army.',
            'NO_FLEETS',
            'Ensure your ARMY.md references valid fleet directories with FLEET.md files.',
          );
        }

        // Execute based on orchestration mode
        if (armyConfig.orchestrationMode === 'centralized') {
          // Run fleets sequentially
          for (const { config, structureName } of fleetConfigs) {
            console.log('');
            console.log(
              chalk.hex('#D4AF37')(`  ┌─ Fleet: ${structureName}`),
            );
            const runner = new FleetRunner(config, providerFactory);
            await runner.run(task);
          }
        } else {
          // Distributed or swarm: run fleets in parallel
          console.log('');
          console.log(
            chalk.dim(
              `  Running ${fleetConfigs.length} fleets in parallel...`,
            ),
          );

          const results = await Promise.allSettled(
            fleetConfigs.map(async ({ config, structureName }) => {
              const runner = new FleetRunner(config, providerFactory);
              const messages = await runner.run(task);
              return { structureName, messages };
            }),
          );

          // Report results
          console.log('');
          console.log(chalk.dim('  ' + '─'.repeat(50)));
          console.log(chalk.hex('#D4AF37').bold('  Army Results:'));
          console.log('');

          for (const result of results) {
            if (result.status === 'fulfilled') {
              const { structureName, messages } = result.value;
              console.log(
                `  ${chalk.green('+')} ${chalk.bold(structureName)}: ` +
                  chalk.dim(`${messages.length} messages`),
              );
            } else {
              console.log(
                `  ${chalk.red('x')} ${chalk.red('Fleet failed:')} ` +
                  chalk.dim(result.reason?.message ?? 'Unknown error'),
              );
            }
          }
        }

        console.log('');
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        console.log(chalk.green.bold('  Army execution complete.'));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── army status ───────────────────────────────────────────────────────

  army
    .command('status')
    .description('Show all Atomiums, their agents, and links')
    .action(async () => {
      try {
        const armyFilePath = findArmyFile();

        if (!armyFilePath) {
          console.error(theme.error('\n  No ARMY.md found.\n'));
          console.log(theme.dim('  Create one with: qayani army init <name>\n'));
          process.exit(1);
        }

        const armyConfig = await parseArmyFile(armyFilePath);

        console.log('');
        console.log(
          chalk.hex('#D4AF37').bold('  Army: ') + chalk.bold(armyConfig.name),
        );
        console.log(chalk.dim(`  ${armyConfig.description}`));
        console.log(
          chalk.dim(
            `  Version: ${armyConfig.version} | Mode: ${armyConfig.orchestrationMode}`,
          ),
        );

        printAtomiumVisualization(armyConfig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── army scale <name> <count> ─────────────────────────────────────────

  army
    .command('scale <name> <count>')
    .description('Scale army to N Atomiums by duplicating the base fleet')
    .action(async (name: string, countStr: string) => {
      try {
        const count = parseInt(countStr, 10);
        if (isNaN(count) || count < 1) {
          throw new QayaniError(
            `Invalid count: "${countStr}"`,
            'INVALID_COUNT',
            'Count must be a positive integer.',
          );
        }

        const armyFilePath = findArmyFile();

        if (!armyFilePath) {
          console.error(theme.error('\n  No ARMY.md found.\n'));
          console.log(theme.dim('  Create one with: qayani army init <name>\n'));
          process.exit(1);
        }

        const armyConfig = await parseArmyFile(armyFilePath);
        const armyDir = path.dirname(armyFilePath);

        // Find the source fleet (first structure in first hive)
        if (armyConfig.hives.length === 0 || armyConfig.hives[0].structures.length === 0) {
          throw new QayaniError(
            'No fleets found in the army to scale.',
            'NO_FLEETS',
            'Initialize an army first with: qayani army init <name>',
          );
        }

        const sourceStructure = armyConfig.hives[0].structures[0];

        // Find the source FLEET.md
        const firstAgent = sourceStructure.nodes[0];
        if (!firstAgent) {
          throw new QayaniError(
            'Source fleet has no agents.',
            'NO_AGENTS',
            'Add agents to the fleet before scaling.',
          );
        }

        const sourceFleetDir = path.dirname(firstAgent.agentPath);
        const sourceFleetFile = path.join(sourceFleetDir, 'FLEET.md');
        const sourceFleetConfig = await parseFleetFile(sourceFleetFile);

        // Check total agent count would be under 100
        const agentsPerFleet = sourceStructure.nodes.length;
        const totalAfterScale = agentsPerFleet * count;
        if (totalAfterScale > 100) {
          throw new QayaniError(
            `Scaling to ${count} fleets would create ${totalAfterScale} agents (max 100).`,
            'MAX_AGENTS_EXCEEDED',
            `Maximum fleet count with ${agentsPerFleet} agents per fleet: ${Math.floor(100 / agentsPerFleet)}`,
          );
        }

        // Create duplicated fleets
        const newStructures: AtomiumStructure[] = [];
        const fleetPaths: Array<{ name: string; relativePath: string }> = [];

        for (let i = 1; i <= count; i++) {
          const fleetName = `${name}-${i}`;
          const fleetDir = path.join(armyDir, fleetName);

          // Create fleet directory if it doesn't exist
          if (!fs.existsSync(fleetDir)) {
            fs.mkdirSync(fleetDir, { recursive: true });

            // Copy agent directories from source
            for (const agent of sourceFleetConfig.agents) {
              const agentDir = path.join(fleetDir, agent.name);
              fs.mkdirSync(agentDir, { recursive: true });

              // Read source AGENT.md
              const sourceAgentDir = path.resolve(sourceFleetDir, agent.agentPath);
              const sourceAgentFile = path.join(sourceAgentDir, 'AGENT.md');
              try {
                const agentMd = fs.readFileSync(sourceAgentFile, 'utf-8');
                fs.writeFileSync(path.join(agentDir, 'AGENT.md'), agentMd, 'utf-8');
              } catch {
                // Write a default template if source can't be read
                fs.writeFileSync(
                  path.join(agentDir, 'AGENT.md'),
                  defaultAgentTemplate(agent.name, agent.role),
                  'utf-8',
                );
              }
            }

            // Write FLEET.md
            const agentDefs = sourceFleetConfig.agents.map((a) => ({
              name: a.name,
              role: a.role,
            }));
            fs.writeFileSync(
              path.join(fleetDir, 'FLEET.md'),
              defaultFleetTemplate(fleetName, agentDefs),
              'utf-8',
            );
          }

          // Build Atomium structure
          const structure = AtomiumBuilder.fromAgents(
            fleetName,
            sourceFleetConfig.agents.map((a) => ({
              ...a,
              agentPath: path.join(fleetDir, a.name),
            })),
          );
          newStructures.push(structure);
          fleetPaths.push({ name: fleetName, relativePath: `./${fleetName}` });
        }

        // Create linked hive
        const hive = AtomiumBuilder.createHive(newStructures);

        // Rebuild army config
        const newArmy = AtomiumBuilder.createArmy(armyConfig.name, [hive], {
          description: armyConfig.description,
          orchestrationMode: armyConfig.orchestrationMode,
        });

        // Write updated ARMY.md
        const armyMdContent = serializeArmyConfig(
          newArmy,
          fleetPaths,
          `## Army Instructions\n\nScaled to ${count} fleets with ${totalAfterScale} total agents.\n`,
        );
        fs.writeFileSync(armyFilePath, armyMdContent, 'utf-8');

        // Output
        console.log('');
        console.log(theme.success(`  Army scaled to ${count} fleets.`));
        console.log('');
        console.log(`  ${theme.bold('Fleets:')}  ${count}`);
        console.log(`  ${theme.bold('Agents:')}  ${totalAfterScale}/100`);
        console.log('');

        printAtomiumVisualization(newArmy);
      } catch (err) {
        handleError(err);
      }
    });

  // ── army link <fleet1> <fleet2> ───────────────────────────────────────

  army
    .command('link <fleet1> <fleet2>')
    .description('Link two fleets for cross-communication')
    .action(async (fleet1Name: string, fleet2Name: string) => {
      try {
        const armyFilePath = findArmyFile();

        if (!armyFilePath) {
          console.error(theme.error('\n  No ARMY.md found.\n'));
          console.log(theme.dim('  Create one with: qayani army init <name>\n'));
          process.exit(1);
        }

        const armyConfig = await parseArmyFile(armyFilePath);

        // Find the two structures by name
        let struct1: AtomiumStructure | undefined;
        let struct2: AtomiumStructure | undefined;

        for (const hive of armyConfig.hives) {
          for (const structure of hive.structures) {
            if (structure.name === fleet1Name) struct1 = structure;
            if (structure.name === fleet2Name) struct2 = structure;
          }
        }

        if (!struct1) {
          throw new QayaniError(
            `Fleet "${fleet1Name}" not found in the army.`,
            'FLEET_NOT_FOUND',
            `Available fleets: ${armyConfig.hives.flatMap((h) => h.structures.map((s) => s.name)).join(', ')}`,
          );
        }

        if (!struct2) {
          throw new QayaniError(
            `Fleet "${fleet2Name}" not found in the army.`,
            'FLEET_NOT_FOUND',
            `Available fleets: ${armyConfig.hives.flatMap((h) => h.structures.map((s) => s.name)).join(', ')}`,
          );
        }

        // Find center nodes
        const center1 = struct1.nodes.find((n) => n.id === struct1!.centerNodeId);
        const center2 = struct2.nodes.find((n) => n.id === struct2!.centerNodeId);

        if (!center1 || !center2) {
          throw new QayaniError(
            'Cannot link fleets: one or both are missing center nodes.',
            'NO_CENTER_NODE',
          );
        }

        // Add the link to the first hive that contains both structures
        // (or to the first hive if they span multiple hives)
        let targetHive = armyConfig.hives[0];
        for (const hive of armyConfig.hives) {
          const hasStruct1 = hive.structures.some((s) => s.name === fleet1Name);
          const hasStruct2 = hive.structures.some((s) => s.name === fleet2Name);
          if (hasStruct1 || hasStruct2) {
            targetHive = hive;
            break;
          }
        }

        // Check if link already exists
        const alreadyLinked = targetHive.links.some(
          (l) =>
            (l.fromStructure === fleet1Name && l.toStructure === fleet2Name) ||
            (l.fromStructure === fleet2Name && l.toStructure === fleet1Name),
        );

        if (alreadyLinked) {
          console.log('');
          console.log(theme.dim(`  Fleets "${fleet1Name}" and "${fleet2Name}" are already linked.`));
          console.log('');
          return;
        }

        targetHive.links.push({
          fromStructure: fleet1Name,
          fromNode: center1.name,
          toStructure: fleet2Name,
          toNode: center2.name,
        });

        // Rebuild and write ARMY.md
        const armyDir = path.dirname(armyFilePath);
        const fleetPaths = armyConfig.hives.flatMap((h) =>
          h.structures.map((s) => {
            // Try to derive the fleet path from agent paths
            const firstNode = s.nodes[0];
            let relativePath = `./${s.name}`;
            if (firstNode) {
              const agentParent = path.dirname(firstNode.agentPath);
              const rel = path.relative(armyDir, agentParent);
              if (rel && !rel.startsWith('..')) {
                relativePath = `./${rel}`;
              }
            }
            return { name: s.name, relativePath };
          }),
        );

        const armyMdContent = serializeArmyConfig(armyConfig, fleetPaths);
        fs.writeFileSync(armyFilePath, armyMdContent, 'utf-8');

        // Output
        console.log('');
        console.log(
          theme.success(
            `  Linked "${fleet1Name}" <-> "${fleet2Name}" via center nodes.`,
          ),
        );
        console.log('');
        console.log(
          `  ${chalk.cyan(fleet1Name)}:${chalk.white(center1.name)} --> ` +
            `${chalk.cyan(fleet2Name)}:${chalk.white(center2.name)}`,
        );
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });
}
