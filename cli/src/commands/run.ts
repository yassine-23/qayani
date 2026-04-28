import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { theme } from '../ui/theme.js';
import { handleError, missingApiKey } from '../utils/errors.js';
import { loadAgent, findAgentDir, findAgentFile } from '../agent/loader.js';
import { createRuntime } from '../agent/runtime.js';
import { registerBuiltinProviders, createProvider, getProviderEnvKey } from '../llm/registry.js';
import { registerBuiltinBackends, createMemoryBackend } from '../memory/registry.js';
import type { MemoryBackend } from '../memory/types.js';
import { startChat } from '../ui/chat.js';
import { ToolRegistry } from '../tools/registry.js';
import { ToolExecutor } from '../tools/executor.js';
import {
  createEmailTool,
  resolveEmailConfig,
  createTelegramTool,
  resolveTelegramConfig,
  createWhatsAppTool,
  resolveWhatsAppConfig,
  createWebSearchTool,
  createFileReadTool,
  createFileWriteTool,
  createShellTool,
} from '../tools/built-in/index.js';

export function registerRun(program: Command): void {
  program
    .command('run [name]')
    .description('Run an agent in interactive chat mode')
    .option('-s, --session <id>', 'Resume a specific conversation session')
    .action(async (name: string | undefined, opts: { session?: string }) => {
      try {
        // Bootstrap registries
        await registerBuiltinProviders();
        registerBuiltinBackends();

        // Find the agent directory (supports both soul.md+agent.yaml and AGENT.md)
        let agentDir: string | null = null;

        if (name) {
          const candidate = path.resolve(process.cwd(), name);
          agentDir = findAgentDir(candidate);
          // Also try legacy path directly
          if (!agentDir) {
            const legacyCandidate = path.join(candidate, 'AGENT.md');
            if (fs.existsSync(legacyCandidate)) {
              agentDir = candidate;
            }
          }
        } else {
          agentDir = findAgentDir();
        }

        if (!agentDir) {
          console.error(theme.error('\n  No agent found.\n'));
          console.log(theme.dim('  Create one with: qayani init <name>\n'));
          process.exit(1);
        }

        // Load agent config + rendered system prompt
        const { systemPrompt, ...config } = await loadAgent(agentDir);

        // Resolve API key: env var -> global config -> fail
        const providerName = config.model.provider;
        const envKey = getProviderEnvKey(providerName);
        let apiKey = process.env[envKey];

        // Fallback to global config file
        if (!apiKey) {
          try {
            const configPath = path.join(os.homedir(), '.qayani', 'config.json');
            const raw = fs.readFileSync(configPath, 'utf-8');
            const globalConfig = JSON.parse(raw) as Record<string, string>;
            const configKey = `${providerName}-api-key`;
            apiKey = globalConfig[configKey];
          } catch {
            // No global config file -- that's fine
          }
        }

        if (!apiKey) {
          missingApiKey(providerName);
        }

        // Update lastUsed timestamp in global meta
        try {
          const globalMetaPath = path.join(
            os.homedir(),
            '.qayani',
            'agents',
            config.name,
            'meta.json',
          );
          if (fs.existsSync(globalMetaPath)) {
            const raw = fs.readFileSync(globalMetaPath, 'utf-8');
            const meta = JSON.parse(raw) as Record<string, unknown>;
            meta.lastUsed = new Date().toISOString();
            fs.writeFileSync(globalMetaPath, JSON.stringify(meta, null, 2), 'utf-8');
          }
        } catch {
          // Non-critical -- don't fail the run if we can't update meta
        }

        // Create provider, runtime, and memory backend
        const provider = createProvider(providerName, apiKey);
        const runtime = createRuntime(config, systemPrompt, opts.session);

        let memory: MemoryBackend;
        try {
          memory = createMemoryBackend(config.memory.backend);
        } catch (err) {
          // Graceful fallback for gdrive/other backends that need config
          const msg = err instanceof Error ? err.message : String(err);
          console.log(theme.dim(`  Warning: ${msg} — falling back to local memory.\n`));
          memory = createMemoryBackend('local');
        }

        // Register tools based on config.tools array
        const registry = new ToolRegistry();
        const configTools = config.tools ?? [];

        for (const toolName of configTools) {
          try {
            switch (toolName) {
              case 'send_email': {
                const emailConfig = await resolveEmailConfig();
                if (emailConfig) {
                  registry.register(createEmailTool(emailConfig));
                } else {
                  console.log(theme.dim(`  Skipping tool "${toolName}": SMTP not configured.\n`));
                }
                break;
              }
              case 'send_telegram': {
                const telegramConfig = await resolveTelegramConfig();
                if (telegramConfig) {
                  registry.register(createTelegramTool(telegramConfig));
                } else {
                  console.log(theme.dim(`  Skipping tool "${toolName}": Telegram bot token not configured.\n`));
                }
                break;
              }
              case 'send_whatsapp': {
                const whatsappConfig = await resolveWhatsAppConfig();
                if (whatsappConfig) {
                  registry.register(createWhatsAppTool(whatsappConfig));
                } else {
                  console.log(theme.dim(`  Skipping tool "${toolName}": Twilio WhatsApp not configured.\n`));
                }
                break;
              }
              case 'web_search':
                registry.register(createWebSearchTool());
                break;
              case 'file_read':
                registry.register(createFileReadTool());
                break;
              case 'file_write':
                registry.register(createFileWriteTool());
                break;
              case 'shell_exec':
                registry.register(createShellTool());
                break;
              default:
                console.log(theme.dim(`  Skipping unknown tool: "${toolName}"\n`));
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(theme.dim(`  Skipping tool "${toolName}": ${msg}\n`));
          }
        }

        // Print loaded tools
        const loadedTools = registry.getAll();
        if (loadedTools.length > 0) {
          const toolNames = loadedTools.map((t) => t.definition.name).join(', ');
          console.log(theme.info(`  Tools loaded: ${toolNames}\n`));
        }

        const executor = new ToolExecutor(registry);

        // Start interactive chat
        await startChat(runtime, provider, memory, registry, executor);
      } catch (err) {
        handleError(err);
      }
    });
}
