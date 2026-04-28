import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { theme } from '../ui/theme.js';
import { QayaniError, handleError } from '../utils/errors.js';
import {
  select,
  multiselect,
  input,
  slider,
  confirm,
  wizardWelcome,
  wizardHeader,
  wizardPreview,
} from '../ui/wizard.js';

// ── New format templates ─────────────────────────────────────────────────────

function defaultSoulTemplate(name: string): string {
  return `You are {{name}}, a helpful AI assistant.

## Instructions

- Answer questions clearly and concisely.
- If you are unsure about something, say so.
- Be friendly and professional.

{{#if expertise}}
## Areas of Expertise
Your areas of expertise: {{expertise}}.
{{/if}}

{{#if voice}}
## Communication Style
Speak in this style: {{voice}}.
{{/if}}

## Constraints

- Do not make up information.
- Stay on topic.
`;
}

function defaultAgentYaml(name: string, provider: string, model: string): string {
  return `name: "${name}"
version: "1.0"
description: "A helpful AI assistant"
model:
  provider: "${provider}"
  name: "${model}"
  temperature: 0.7
  maxTokens: 2048
memory:
  backend: local
  maxHistory: 50
tools:
  - web_search
persona:
  traits:
    helpfulness: 0.9
    conciseness: 0.7
  expertise:
    - general knowledge
vars: {}
`;
}

function teslaSoulTemplate(name: string): string {
  return `You are {{name}}, an AI agent inspired by the intellect and vision of Nikola Tesla.

## Instructions

- Think creatively and draw connections across disciplines.
- Explain complex technical concepts with vivid analogies.
- Approach problems with a first-principles mindset.
- Be passionate about science, engineering, and human progress.
- When discussing inventions or ideas, consider both the technical details and their societal impact.

## Personality

- Visionary and forward-thinking.
- Deeply technical but able to communicate clearly.
- Passionate about alternating current, wireless energy, and electromagnetic phenomena.
- Occasionally reference historical context from the age of invention.

{{#if expertise}}
## Areas of Expertise
Your areas of expertise: {{expertise}}.
{{/if}}

## Constraints

- Ground explanations in real physics and engineering principles.
- Do not fabricate scientific claims.
- Acknowledge the limits of current knowledge when appropriate.
`;
}

function teslaAgentYaml(name: string, provider: string, model: string): string {
  return `name: "${name}"
version: "1.0"
description: "An AI agent modeled after Nikola Tesla's intellect and vision"
model:
  provider: "${provider}"
  name: "${model}"
  temperature: 0.8
  maxTokens: 4096
memory:
  backend: local
  maxHistory: 100
tools:
  - web_search
persona:
  traits:
    creativity: 1.0
    technical_depth: 0.95
    visionary_thinking: 0.9
    helpfulness: 0.85
  voice: "passionate, inventive, eloquent"
  expertise:
    - electrical engineering
    - physics
    - invention
    - energy systems
    - mathematics
vars: {}
`;
}

// ── Provider / model maps ───────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash',
  ollama: 'llama3.3',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
};

const PROVIDER_MODELS: Record<string, Array<{ label: string; value: string; description?: string }>> = {
  openai: [
    { label: 'gpt-4o', value: 'gpt-4o', description: 'Most capable' },
    { label: 'gpt-4o-mini', value: 'gpt-4o-mini', description: 'Fast and affordable' },
    { label: 'gpt-4-turbo', value: 'gpt-4-turbo', description: 'High throughput' },
    { label: 'o3-mini', value: 'o3-mini', description: 'Reasoning model' },
  ],
  anthropic: [
    { label: 'claude-opus-4-20250514', value: 'claude-opus-4-20250514', description: 'Most capable' },
    { label: 'claude-sonnet-4-20250514', value: 'claude-sonnet-4-20250514', description: 'Balanced' },
    { label: 'claude-haiku-4-20250514', value: 'claude-haiku-4-20250514', description: 'Fast and compact' },
  ],
  google: [
    { label: 'gemini-2.5-pro', value: 'gemini-2.5-pro', description: 'Most capable' },
    { label: 'gemini-2.0-flash', value: 'gemini-2.0-flash', description: 'Fast and versatile' },
    { label: 'gemini-2.0-flash-lite', value: 'gemini-2.0-flash-lite', description: 'Lightweight' },
  ],
  ollama: [
    { label: 'llama3.3', value: 'llama3.3', description: 'Local Meta Llama 3.3' },
    { label: 'mistral', value: 'mistral', description: 'Local Mistral' },
    { label: 'codellama', value: 'codellama', description: 'Local Code Llama' },
  ],
  openrouter: [
    { label: 'openai/gpt-4o-mini', value: 'openai/gpt-4o-mini', description: 'GPT-4o Mini via OpenRouter' },
    { label: 'anthropic/claude-sonnet-4', value: 'anthropic/claude-sonnet-4', description: 'Claude Sonnet via OpenRouter' },
    { label: 'meta-llama/llama-3.3-70b-instruct', value: 'meta-llama/llama-3.3-70b-instruct', description: 'Llama 3.3 70B' },
  ],
  groq: [
    { label: 'llama-3.3-70b-versatile', value: 'llama-3.3-70b-versatile', description: 'Fast Llama 3.3' },
    { label: 'mixtral-8x7b-32768', value: 'mixtral-8x7b-32768', description: 'Fast Mixtral' },
  ],
};

const AVAILABLE_TOOLS: Array<{ label: string; value: string; description: string }> = [
  { label: 'web_search', value: 'web_search', description: 'Search the web for information' },
  { label: 'file_read', value: 'file_read', description: 'Read files from disk' },
  { label: 'file_write', value: 'file_write', description: 'Write files to disk' },
  { label: 'shell_exec', value: 'shell_exec', description: 'Execute shell commands' },
  { label: 'send_email', value: 'send_email', description: 'Send emails via SMTP' },
  { label: 'send_telegram', value: 'send_telegram', description: 'Send Telegram messages' },
];

// ── Interactive wizard ──────────────────────────────────────────────────────

interface WizardConfig {
  name: string;
  provider: string;
  model: string;
  tools: string[];
  voice: string;
  creativity: number;
  formality: number;
  helpfulness: number;
  expertise: string[];
  memoryBackend: string;
  systemPrompt: string;
}

function buildSoulMd(cfg: WizardConfig): string {
  const instructions = cfg.systemPrompt || `You are {{name}}, a helpful AI assistant. Answer clearly and concisely.`;

  return `${instructions}

{{#if expertise}}
## Areas of Expertise
Your areas of expertise: {{expertise}}.
{{/if}}

{{#if voice}}
## Communication Style
Speak in this style: {{voice}}.
{{/if}}

## Constraints

- Do not make up information.
- If unsure, acknowledge the limits of your knowledge.
- Stay on topic.
`;
}

function buildAgentYaml(cfg: WizardConfig): string {
  const toolsYaml = cfg.tools.length > 0
    ? `tools:\n${cfg.tools.map((t) => `  - ${t}`).join('\n')}`
    : 'tools: []';

  const expertiseYaml = cfg.expertise.length > 0
    ? cfg.expertise.map((e) => `    - ${e.trim()}`).join('\n')
    : '    - general knowledge';

  return `name: "${cfg.name}"
version: "1.0"
description: "A custom AI agent"
model:
  provider: "${cfg.provider}"
  name: "${cfg.model}"
  temperature: ${(cfg.creativity * 0.5 + 0.3).toFixed(1)}
  maxTokens: 4096
${toolsYaml}
memory:
  backend: ${cfg.memoryBackend}
  maxHistory: 50
persona:
  voice: "${cfg.voice}"
  traits:
    creativity: ${cfg.creativity.toFixed(1)}
    formality: ${cfg.formality.toFixed(1)}
    helpfulness: ${cfg.helpfulness.toFixed(1)}
  expertise:
${expertiseYaml}
vars: {}
`;
}

async function runInteractiveWizard(name: string): Promise<void> {
  const TOTAL_STEPS = 7;

  // Welcome
  wizardWelcome(name);

  // Step 1 — Provider
  wizardHeader('Choose a Provider', 1, TOTAL_STEPS);
  const provider = await select({
    message: 'Which LLM provider?',
    choices: [
      { label: 'OpenAI', value: 'openai', description: 'GPT-4o, GPT-4 Turbo, o3' },
      { label: 'Anthropic', value: 'anthropic', description: 'Claude Opus, Sonnet, Haiku' },
      { label: 'Google', value: 'google', description: 'Gemini 2.5 Pro, Flash' },
      { label: 'Ollama', value: 'ollama', description: 'Local models (Llama, Mistral)' },
      { label: 'OpenRouter', value: 'openrouter', description: '300+ models via API' },
      { label: 'Groq', value: 'groq', description: 'Fast inference (Llama, Mixtral)' },
    ],
    default: 'openai',
  });

  // Step 2 — Model
  wizardHeader('Choose a Model', 2, TOTAL_STEPS);
  const modelChoices = PROVIDER_MODELS[provider] ?? [
    { label: DEFAULT_MODELS[provider] ?? 'gpt-4o-mini', value: DEFAULT_MODELS[provider] ?? 'gpt-4o-mini' },
  ];
  const model = await select({
    message: 'Which model?',
    choices: modelChoices,
    default: DEFAULT_MODELS[provider],
  });

  // Step 3 — Tools
  wizardHeader('Select Tools', 3, TOTAL_STEPS);
  const tools = await multiselect({
    message: 'Which tools should the agent have access to?',
    choices: AVAILABLE_TOOLS.map((t) => ({
      label: t.label,
      value: t.value,
      description: t.description,
    })),
  });

  // Step 4 — Persona
  wizardHeader('Configure Persona', 4, TOTAL_STEPS);

  const voice = await input({
    message: 'Voice / style',
    default: 'friendly, clear, professional',
  });

  console.log('');
  const creativity = await slider({
    message: 'Creativity',
    min: 0,
    max: 1,
    step: 0.1,
    default: 0.7,
  });

  const formality = await slider({
    message: 'Formality',
    min: 0,
    max: 1,
    step: 0.1,
    default: 0.5,
  });

  const helpfulness = await slider({
    message: 'Helpfulness',
    min: 0,
    max: 1,
    step: 0.1,
    default: 0.9,
  });

  console.log('');
  const expertiseRaw = await input({
    message: 'Areas of expertise (comma-separated)',
    default: 'general knowledge',
  });
  const expertise = expertiseRaw.split(',').map((s) => s.trim()).filter(Boolean);

  // Step 5 — Memory
  wizardHeader('Memory Backend', 5, TOTAL_STEPS);
  const memoryBackend = await select({
    message: 'Where should conversation history be stored?',
    choices: [
      { label: 'Local', value: 'local', description: 'JSON files on disk' },
      { label: 'Google Drive', value: 'gdrive', description: 'Sync across devices' },
      { label: 'None', value: 'none', description: 'No history persistence' },
    ],
    default: 'local',
  });

  // Step 6 — System prompt
  wizardHeader('Soul Prompt', 6, TOTAL_STEPS);
  const systemPrompt = await input({
    message: 'Core instructions for the agent (written to soul.md)',
    default: `You are ${name}, a helpful AI assistant. Answer clearly and concisely.`,
  });

  // Step 7 — Preview & confirm
  wizardHeader('Preview & Confirm', 7, TOTAL_STEPS);

  const cfg: WizardConfig = {
    name,
    provider,
    model,
    tools,
    voice,
    creativity,
    formality,
    helpfulness,
    expertise,
    memoryBackend,
    systemPrompt,
  };

  const soulContent = buildSoulMd(cfg);
  const yamlContent = buildAgentYaml(cfg);
  wizardPreview(`# soul.md\n${soulContent}\n\n# agent.yaml\n${yamlContent}`);

  const shouldSave = await confirm({
    message: 'Create this agent?',
    default: true,
  });

  if (!shouldSave) {
    console.log('');
    console.log(theme.dim('  Aborted. No files were created.'));
    console.log('');
    return;
  }

  // Write files
  const agentDir = path.resolve(process.cwd(), name);

  if (fs.existsSync(agentDir)) {
    throw new QayaniError(
      `Directory "${name}" already exists.`,
      'DIR_EXISTS',
      'Remove the existing directory or choose a different name.',
    );
  }

  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'soul.md'), soulContent, 'utf-8');
  fs.writeFileSync(path.join(agentDir, 'agent.yaml'), yamlContent, 'utf-8');

  // Register globally
  const globalDir = path.join(
    process.env.HOME ?? process.env.USERPROFILE ?? '~',
    '.qayani',
    'agents',
    name,
  );
  if (!fs.existsSync(globalDir)) {
    fs.mkdirSync(globalDir, { recursive: true });
  }

  const metaPath = path.join(globalDir, 'meta.json');
  const meta = {
    name,
    provider,
    model,
    template: 'custom',
    tools,
    format: 'soul',
    path: agentDir,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  // Success
  const envKey = getEnvKeyForProvider(provider);

  console.log('');
  console.log(theme.success('  Agent created successfully.'));
  console.log('');
  console.log(`  ${theme.bold('Name:')}      ${name}`);
  console.log(`  ${theme.bold('Provider:')}  ${provider}`);
  console.log(`  ${theme.bold('Model:')}     ${model}`);
  console.log(`  ${theme.bold('Tools:')}     ${tools.length > 0 ? tools.join(', ') : 'none'}`);
  console.log(`  ${theme.bold('Location:')}  ${agentDir}`);
  console.log('');
  console.log(theme.dim('  Structure:'));
  console.log(theme.dim(`    ${name}/`));
  console.log(theme.dim(`    ├── soul.md       # Agent identity & instructions`));
  console.log(theme.dim(`    └── agent.yaml    # Model, memory, tools config`));
  console.log('');
  console.log(theme.dim('  Next steps:'));
  console.log('');
  console.log(theme.info(`    1. cd ${name}`));
  console.log(theme.info(`    2. Edit soul.md to shape your agent's personality`));
  console.log(theme.info(`    3. Set your API key:`));
  console.log(theme.dim(`       export ${envKey}=your-key-here`));
  console.log(theme.info(`    4. qayani run`));
  console.log('');
}

function getEnvKeyForProvider(provider: string): string {
  const map: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    ollama: 'OLLAMA_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    groq: 'GROQ_API_KEY',
  };
  return map[provider] ?? `${provider.toUpperCase()}_API_KEY`;
}

// ── Command registration ──────────────────────────────────────────────────────

export function registerInit(program: Command): void {
  program
    .command('init <name>')
    .description('Create a new AI agent')
    .option('-p, --provider <provider>', 'LLM provider (openai, anthropic, google, ollama, openrouter, groq)', 'openai')
    .option('-m, --model <model>', 'Model name')
    .option('-t, --template <template>', 'Agent template (default, tesla)', 'default')
    .option('-i, --interactive', 'Launch interactive setup wizard')
    .action(async (name: string, opts: { provider: string; model?: string; template: string; interactive?: boolean }) => {
      try {
        // Validate agent name (shared between both modes)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          throw new QayaniError(
            `Invalid agent name: "${name}"`,
            'INVALID_NAME',
            'Agent names must contain only letters, numbers, hyphens, and underscores.',
          );
        }

        // ── Interactive mode ──────────────────────────────────────────────
        if (opts.interactive) {
          await runInteractiveWizard(name);
          return;
        }

        // ── Non-interactive mode ──────────────────────────────────────────
        const provider = opts.provider.toLowerCase();
        const model = opts.model ?? DEFAULT_MODELS[provider] ?? 'gpt-4o-mini';
        const template = opts.template.toLowerCase();

        // Validate template
        if (!['default', 'tesla'].includes(template)) {
          throw new QayaniError(
            `Unknown template: "${template}"`,
            'INVALID_TEMPLATE',
            'Available templates: default, tesla',
          );
        }

        // Create agent directory
        const agentDir = path.resolve(process.cwd(), name);

        if (fs.existsSync(agentDir)) {
          throw new QayaniError(
            `Directory "${name}" already exists.`,
            'DIR_EXISTS',
            'Remove the existing directory or choose a different name.',
          );
        }

        fs.mkdirSync(agentDir, { recursive: true });

        // Generate soul.md + agent.yaml from template
        const soulContent = template === 'tesla'
          ? teslaSoulTemplate(name)
          : defaultSoulTemplate(name);
        const yamlContent = template === 'tesla'
          ? teslaAgentYaml(name, provider, model)
          : defaultAgentYaml(name, provider, model);

        fs.writeFileSync(path.join(agentDir, 'soul.md'), soulContent, 'utf-8');
        fs.writeFileSync(path.join(agentDir, 'agent.yaml'), yamlContent, 'utf-8');

        // Register in global agents directory
        const globalDir = path.join(
          process.env.HOME ?? process.env.USERPROFILE ?? '~',
          '.qayani',
          'agents',
          name,
        );
        if (!fs.existsSync(globalDir)) {
          fs.mkdirSync(globalDir, { recursive: true });
        }

        const metaPath = path.join(globalDir, 'meta.json');
        const meta = {
          name,
          provider,
          model,
          template,
          format: 'soul',
          path: agentDir,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

        // Success output
        const envKey = getEnvKeyForProvider(provider);

        console.log('');
        console.log(theme.success('  Agent created successfully.'));
        console.log('');
        console.log(`  ${theme.bold('Name:')}      ${name}`);
        console.log(`  ${theme.bold('Provider:')}  ${provider}`);
        console.log(`  ${theme.bold('Model:')}     ${model}`);
        console.log(`  ${theme.bold('Template:')}  ${template}`);
        console.log(`  ${theme.bold('Location:')}  ${agentDir}`);
        console.log('');
        console.log(theme.dim('  Structure:'));
        console.log(theme.dim(`    ${name}/`));
        console.log(theme.dim(`    ├── soul.md       # Agent identity & instructions`));
        console.log(theme.dim(`    └── agent.yaml    # Model, memory, tools config`));
        console.log('');
        console.log(theme.dim('  Next steps:'));
        console.log('');
        console.log(theme.info(`    1. cd ${name}`));
        console.log(theme.info(`    2. Edit soul.md to shape your agent's personality`));
        console.log(theme.info(`    3. Set your API key:`));
        console.log(theme.dim(`       export ${envKey}=your-key-here`));
        console.log(theme.info(`    4. qayani run`));
        console.log('');
      } catch (err) {
        handleError(err);
      }
    });
}
