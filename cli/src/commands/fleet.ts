import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import chalk from 'chalk';
import { theme } from '../ui/theme.js';
import { QayaniError, handleError } from '../utils/errors.js';
import { parseFleetFile, findFleetFile } from '../fleet/loader.js';
import { FleetRunner } from '../fleet/runtime.js';
import { registerBuiltinProviders, createProvider, getProviderEnvKey } from '../llm/registry.js';
import { registerBuiltinBackends } from '../memory/registry.js';
import type { AgentConfig } from '../agent/types.js';

// ── Default FLEET.md template ────────────────────────────────────────────────

function defaultFleetTemplate(name: string): string {
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

// ── Agent AGENT.md templates for fleet init ──────────────────────────────────

// ── Soul + agent.yaml templates for fleet agents ────────────────────────────

interface AgentTemplate {
  soul: string;
  yaml: string;
}

function researcherTemplate(): AgentTemplate {
  return {
    soul: `You are a meticulous research specialist.

## Instructions

- Gather comprehensive information on the given topic.
- Prioritize accuracy and cite your reasoning.
- Organize findings into clear categories.
- Highlight key facts, statistics, and insights.
- Note any areas of uncertainty or conflicting information.

## Constraints

- Do not fabricate data or statistics.
- Focus on the most relevant and important information.
- Keep findings well-organized and easy to reference.
`,
    yaml: `name: "researcher"
version: "1.0"
description: "A research specialist agent"
model:
  provider: "openai"
  name: "gpt-4o-mini"
  temperature: 0.5
  maxTokens: 4096
memory:
  backend: none
persona:
  traits:
    thoroughness: 0.95
    analytical_thinking: 0.9
    conciseness: 0.7
  expertise:
    - research
    - analysis
    - fact checking
tools:
  - web_search
vars: {}
`,
  };
}

function writerTemplate(): AgentTemplate {
  return {
    soul: `You are an experienced content writer who produces clear, engaging text.

## Instructions

- Transform research data into well-structured, readable content.
- Use clear headings and logical flow.
- Write in a professional yet accessible tone.
- Ensure all key points from the research are covered.
- Add smooth transitions between sections.

## Constraints

- Stay faithful to the research data provided.
- Do not add unverified claims.
- Keep the writing focused and avoid unnecessary filler.
`,
    yaml: `name: "writer"
version: "1.0"
description: "A content writing agent"
model:
  provider: "openai"
  name: "gpt-4o-mini"
  temperature: 0.7
  maxTokens: 4096
memory:
  backend: none
persona:
  traits:
    creativity: 0.8
    clarity: 0.9
    conciseness: 0.75
  expertise:
    - writing
    - content creation
    - storytelling
tools: []
vars: {}
`,
  };
}

function reviewerTemplate(): AgentTemplate {
  return {
    soul: `You are a meticulous quality reviewer.

## Instructions

- Review the provided content for accuracy, clarity, and completeness.
- Check for logical consistency and factual errors.
- Improve sentence structure and readability where needed.
- Ensure the piece flows well and covers the topic thoroughly.
- Produce the final, polished version of the content.

## Constraints

- Preserve the author's voice and intent.
- Only make changes that genuinely improve quality.
- If something is already well-written, leave it as is.
`,
    yaml: `name: "reviewer"
version: "1.0"
description: "A quality review agent"
model:
  provider: "openai"
  name: "gpt-4o-mini"
  temperature: 0.3
  maxTokens: 4096
memory:
  backend: none
persona:
  traits:
    attention_to_detail: 0.95
    critical_thinking: 0.9
    helpfulness: 0.85
  expertise:
    - editing
    - quality assurance
    - proofreading
tools: []
vars: {}
`,
  };
}

// ── Prompt for user input ────────────────────────────────────────────────────

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

// ── Resolve API key for an agent config ──────────────────────────────────────

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

// ── Command registration ─────────────────────────────────────────────────────

export function registerFleet(program: Command): void {
  const fleet = program
    .command('fleet')
    .description('Multi-agent fleet orchestration');

  // ── fleet init <name> ────────────────────────────────────────────────────

  fleet
    .command('init <name>')
    .description('Create a new fleet with a template FLEET.md')
    .action((name: string) => {
      try {
        // Validate fleet name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          throw new QayaniError(
            `Invalid fleet name: "${name}"`,
            'INVALID_NAME',
            'Fleet names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        const fleetDir = path.resolve(process.cwd(), name);

        if (fs.existsSync(fleetDir)) {
          throw new QayaniError(
            `Directory "${name}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Create fleet directory and agent subdirectories
        fs.mkdirSync(fleetDir, { recursive: true });

        const agentDirs = [
          { dir: 'researcher', template: researcherTemplate },
          { dir: 'writer', template: writerTemplate },
          { dir: 'reviewer', template: reviewerTemplate },
        ];

        for (const { dir, template } of agentDirs) {
          const agentDir = path.join(fleetDir, dir);
          fs.mkdirSync(agentDir, { recursive: true });
          const t = template();
          fs.writeFileSync(path.join(agentDir, 'soul.md'), t.soul, 'utf-8');
          fs.writeFileSync(path.join(agentDir, 'agent.yaml'), t.yaml, 'utf-8');
        }

        // Write FLEET.md
        fs.writeFileSync(
          path.join(fleetDir, 'FLEET.md'),
          defaultFleetTemplate(name),
          'utf-8',
        );

        // Success output
        console.log('');
        console.log(theme.success('  Fleet created successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Name:')}        ${name}`);
        console.log(`  ${theme.bold('Agents:')}      researcher, writer, reviewer`);
        console.log(`  ${theme.bold('Mode:')}        orchestrated`);
        console.log(`  ${theme.bold('Location:')}    ${fleetDir}`);
        console.log('');
        console.log(theme.dim('  Structure:'));
        console.log(theme.dim(`    ${name}/`));
        console.log(theme.dim(`    ├── FLEET.md`));
        console.log(theme.dim(`    ├── researcher/`));
        console.log(theme.dim(`    │   ├── soul.md`));
        console.log(theme.dim(`    │   └── agent.yaml`));
        console.log(theme.dim(`    ├── writer/`));
        console.log(theme.dim(`    │   ├── soul.md`));
        console.log(theme.dim(`    │   └── agent.yaml`));
        console.log(theme.dim(`    └── reviewer/`));
        console.log(theme.dim(`        ├── soul.md`));
        console.log(theme.dim(`        └── agent.yaml`));
        console.log('');
        console.log(theme.dim('  Next steps:'));
        console.log('');
        console.log(theme.info(`    1. cd ${name}`));
        console.log(theme.info('    2. Edit soul.md files to shape each agent'));
        console.log(theme.info('    3. Set your API key:'));
        console.log(theme.dim('       export OPENAI_API_KEY=your-key-here'));
        console.log(theme.info('    4. qayani fleet run'));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── fleet run [name] ─────────────────────────────────────────────────────

  fleet
    .command('run [name]')
    .description('Execute a fleet on a task')
    .option('-t, --task <task>', 'Task to execute (skips interactive prompt)')
    .action(async (name: string | undefined, opts: { task?: string }) => {
      try {
        // Bootstrap registries
        await registerBuiltinProviders();
        registerBuiltinBackends();

        // Find the FLEET.md file
        let fleetFilePath: string | null = null;

        if (name) {
          const candidate = path.resolve(process.cwd(), name, 'FLEET.md');
          if (fs.existsSync(candidate)) {
            fleetFilePath = candidate;
          } else {
            fleetFilePath = findFleetFile(path.resolve(process.cwd(), name));
          }
        } else {
          fleetFilePath = findFleetFile();
        }

        if (!fleetFilePath) {
          console.error(theme.error('\n  No FLEET.md found.\n'));
          console.log(theme.dim('  Create one with: qayani fleet init <name>\n'));
          process.exit(1);
        }

        // Parse fleet config
        const config = await parseFleetFile(fleetFilePath);
        const fleetDir = path.dirname(fleetFilePath);

        // Resolve agent paths relative to fleet directory
        for (const agent of config.agents) {
          if (!path.isAbsolute(agent.agentPath)) {
            agent.agentPath = path.resolve(fleetDir, agent.agentPath);
          }
        }

        // Get the task
        let task = opts.task;
        if (!task) {
          task = await promptInput(
            chalk.hex('#D4AF37')('  Task: '),
          );
          if (!task) {
            console.log(theme.dim('\n  No task provided. Exiting.\n'));
            return;
          }
        }

        // Create provider factory that resolves API keys per agent
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

        // Run the fleet
        const runner = new FleetRunner(config, providerFactory);
        const messages = await runner.run(task);

        // Print final output if the last workflow step has an output
        const lastStep = config.workflow[config.workflow.length - 1];
        if (lastStep?.output) {
          const finalResult = messages
            .filter(
              (m) =>
                m.from === lastStep.agent && m.type === 'result',
            )
            .pop();

          if (finalResult) {
            console.log(chalk.hex('#D4AF37').bold('  Final Output:'));
            console.log(chalk.dim('  ' + '─'.repeat(50)));
            console.log('');
            console.log(finalResult.content);
            console.log('');
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  // ── fleet status ─────────────────────────────────────────────────────────

  fleet
    .command('status')
    .description('Show fleet agents and their configuration')
    .action(async () => {
      try {
        const fleetFilePath = findFleetFile();

        if (!fleetFilePath) {
          console.error(theme.error('\n  No FLEET.md found.\n'));
          console.log(theme.dim('  Create one with: qayani fleet init <name>\n'));
          process.exit(1);
        }

        const config = await parseFleetFile(fleetFilePath);

        console.log('');
        console.log(
          chalk.hex('#D4AF37').bold('  Fleet: ') + chalk.bold(config.name),
        );
        console.log(chalk.dim(`  ${config.description}`));
        console.log(
          chalk.dim(`  Version: ${config.version} | Mode: ${config.communication}`),
        );
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        console.log('');

        console.log(chalk.bold('  Agents:'));
        console.log('');
        for (const agent of config.agents) {
          console.log(
            `    ${chalk.hex('#D4AF37')('>')} ${chalk.bold(agent.name)} ${chalk.dim(`(${agent.role})`)}`,
          );
          console.log(chalk.dim(`      Path: ${agent.agentPath}`));
          if (agent.capabilities && agent.capabilities.length > 0) {
            console.log(
              chalk.dim(`      Capabilities: ${agent.capabilities.join(', ')}`),
            );
          }
        }

        console.log('');
        console.log(chalk.bold('  Workflow:'));
        console.log('');
        for (let i = 0; i < config.workflow.length; i++) {
          const step = config.workflow[i];
          const deps = step.dependsOn
            ? chalk.dim(` (after: ${step.dependsOn.join(', ')})`)
            : '';
          const output = step.output
            ? chalk.dim(` -> ${step.output}`)
            : '';
          console.log(
            `    ${chalk.cyan(`${i + 1}.`)} ${chalk.bold(step.agent)}${deps}${output}`,
          );
          console.log(chalk.dim(`       ${step.task}`));
        }

        console.log('');
      } catch (err) {
        handleError(err);
      }
    });

  // ── fleet add <agent> ────────────────────────────────────────────────────

  fleet
    .command('add <agent>')
    .description('Add a new agent to the current fleet')
    .option('-r, --role <role>', 'Agent role description', 'General-purpose assistant')
    .action(async (agentName: string, opts: { role: string }) => {
      try {
        // Validate agent name
        if (!/^[a-zA-Z0-9_-]+$/.test(agentName)) {
          throw new QayaniError(
            `Invalid agent name: "${agentName}"`,
            'INVALID_NAME',
            'Agent names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        const fleetFilePath = findFleetFile();

        if (!fleetFilePath) {
          console.error(theme.error('\n  No FLEET.md found.\n'));
          console.log(theme.dim('  Create one with: qayani fleet init <name>\n'));
          process.exit(1);
        }

        const fleetDir = path.dirname(fleetFilePath);
        const agentDir = path.join(fleetDir, agentName);

        if (fs.existsSync(agentDir)) {
          throw new QayaniError(
            `Agent directory "${agentName}" already exists in this fleet.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        // Create agent directory with soul.md + agent.yaml
        fs.mkdirSync(agentDir, { recursive: true });

        const soulContent = `You are ${agentName}, a ${opts.role.toLowerCase()}.

## Instructions

- Complete your assigned tasks thoroughly and accurately.
- Collaborate effectively with other agents in the fleet.
- Be clear and concise in your outputs.

## Constraints

- Do not fabricate information.
- Stay focused on the task at hand.
`;

        const yamlContent = `name: "${agentName}"
version: "1.0"
description: "${opts.role}"
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
tools: []
vars: {}
`;

        fs.writeFileSync(path.join(agentDir, 'soul.md'), soulContent, 'utf-8');
        fs.writeFileSync(path.join(agentDir, 'agent.yaml'), yamlContent, 'utf-8');

        // Read current FLEET.md and add the agent entry to frontmatter
        const raw = fs.readFileSync(fleetFilePath, 'utf-8');
        const lines = raw.split('\n');

        // Find the agents section and insert the new agent
        let insertIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^workflow:/)) {
            // Insert just before the workflow section
            insertIndex = i;
            break;
          }
        }

        if (insertIndex !== -1) {
          const newAgentLines = [
            `  - name: ${agentName}`,
            `    role: "${opts.role}"`,
            `    agentPath: ./${agentName}`,
          ];
          lines.splice(insertIndex, 0, ...newAgentLines);
          fs.writeFileSync(fleetFilePath, lines.join('\n'), 'utf-8');
        }

        console.log('');
        console.log(theme.success(`  Agent "${agentName}" added to fleet.`));
        console.log('');
        console.log(`  ${theme.bold('Name:')}  ${agentName}`);
        console.log(`  ${theme.bold('Role:')}  ${opts.role}`);
        console.log(`  ${theme.bold('Path:')}  ${agentDir}`);
        console.log('');
        console.log(theme.dim('  Next steps:'));
        console.log(theme.info(`    1. Edit ${agentName}/soul.md to shape the agent's personality`));
        console.log(theme.info('    2. Add a workflow step for this agent in FLEET.md'));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });
}
