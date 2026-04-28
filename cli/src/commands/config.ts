import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { theme } from '../ui/theme.js';
import { handleError, QayaniError } from '../utils/errors.js';

const CONFIG_PATH = path.join(os.homedir(), '.qayani', 'config.json');

interface GlobalConfig {
  [key: string]: string | undefined;
}

const VALID_KEYS = [
  'default-provider',
  'default-model',
  'openai-api-key',
  'anthropic-api-key',
  'google-api-key',
];

const SECRET_KEYS = new Set(['openai-api-key', 'anthropic-api-key', 'google-api-key']);

// ── Config I/O ────────────────────────────────────────────────────────────────

function loadConfig(): GlobalConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as GlobalConfig;
  } catch {
    return {};
  }
}

function saveConfig(config: GlobalConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '****';
  return '****' + value.slice(-4);
}

// ── Command registration ──────────────────────────────────────────────────────

export function registerConfig(program: Command): void {
  program
    .command('config [key] [value]')
    .description('Get or set global configuration')
    .option('-l, --list', 'Show all configuration values')
    .option('-d, --delete <key>', 'Delete a configuration key')
    .action((key: string | undefined, value: string | undefined, opts: { list?: boolean; delete?: string }) => {
      try {
        const config = loadConfig();

        // ── List all config ───────────────────────────────────────────────
        if (opts.list || (!key && !opts.delete)) {
          console.log(theme.bold('\n  QAYANI Configuration\n'));
          console.log(theme.dim('  ' + '─'.repeat(40)));

          const entries = Object.entries(config).filter(([, v]) => v !== undefined);
          if (entries.length === 0) {
            console.log(theme.dim('\n  No configuration set.\n'));
            console.log(`  Set a value: ${theme.info('qayani config <key> <value>')}`);
            console.log(theme.dim('\n  Valid keys: ' + VALID_KEYS.join(', ') + '\n'));
            return;
          }

          for (const [k, v] of entries) {
            if (v === undefined) continue;
            const display = SECRET_KEYS.has(k) ? maskSecret(v) : v;
            console.log(`  ${theme.info(k.padEnd(22))} ${display}`);
          }
          console.log('');

          if (SECRET_KEYS.size > 0) {
            console.log(theme.dim('  Note: API keys are stored in ~/.qayani/config.json.'));
            console.log(theme.dim('  Ensure this file has appropriate permissions.\n'));
          }
          return;
        }

        // ── Delete a key ──────────────────────────────────────────────────
        if (opts.delete) {
          if (config[opts.delete] !== undefined) {
            delete config[opts.delete];
            saveConfig(config);
            console.log(theme.success(`\n  Deleted "${opts.delete}".\n`));
          } else {
            console.log(theme.dim(`\n  Key "${opts.delete}" not found.\n`));
          }
          return;
        }

        // ── Get a specific key ────────────────────────────────────────────
        if (key && !value) {
          const val = config[key];
          if (val !== undefined) {
            const display = SECRET_KEYS.has(key) ? maskSecret(val) : val;
            console.log(`\n  ${theme.info(key)}: ${display}\n`);
          } else {
            console.log(theme.dim(`\n  Key "${key}" is not set.\n`));
          }
          return;
        }

        // ── Set a key ─────────────────────────────────────────────────────
        if (key && value) {
          if (!VALID_KEYS.includes(key)) {
            throw new QayaniError(
              `Invalid configuration key: "${key}"`,
              'INVALID_CONFIG_KEY',
              `Valid keys: ${VALID_KEYS.join(', ')}`,
            );
          }

          config[key] = value;
          saveConfig(config);

          const display = SECRET_KEYS.has(key) ? maskSecret(value) : value;
          console.log(theme.success(`\n  Set ${key} = ${display}`));

          if (SECRET_KEYS.has(key)) {
            const envVar = key
              .replace('-api-key', '')
              .toUpperCase() + '_API_KEY';
            console.log(
              theme.dim(`\n  This will be used when the ${envVar} env var is not set.`),
            );
            console.log(
              theme.dim('  Note: API keys are stored in ~/.qayani/config.json.'),
            );
          }
          console.log('');
        }
      } catch (err) {
        handleError(err);
      }
    });
}
