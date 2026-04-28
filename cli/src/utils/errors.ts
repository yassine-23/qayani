import chalk from 'chalk';

/**
 * Base error class for all CLI errors.
 * Carries a machine-readable code and an optional human-friendly hint.
 */
export class QayaniError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'QayaniError';
  }
}

/**
 * Print a formatted error message to stderr and exit with code 1.
 */
export function handleError(error: unknown): never {
  if (error instanceof QayaniError) {
    console.error(chalk.red.bold(`\n  Error [${error.code}]: `) + chalk.red(error.message));
    if (error.hint) {
      console.error(chalk.dim(`\n  Hint: ${error.hint}\n`));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red.bold('\n  Error: ') + chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.dim('\n  Stack trace:'));
      console.error(chalk.dim(`  ${error.stack.split('\n').slice(1).join('\n  ')}\n`));
    }
  } else {
    console.error(chalk.red.bold('\n  Unknown error: ') + chalk.red(String(error)));
  }

  process.exit(1);
}

const API_KEY_ENV_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const API_KEY_URL_MAP: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.dev/apikey',
};

/**
 * Print a detailed error message about a missing API key and exit.
 */
export function missingApiKey(provider: string): never {
  const envVar = API_KEY_ENV_MAP[provider] ?? `${provider.toUpperCase()}_API_KEY`;
  const url = API_KEY_URL_MAP[provider] ?? '';

  const lines = [
    '',
    chalk.red.bold(`  Missing API key for ${provider}`),
    '',
    chalk.white(`  Set the ${chalk.bold(envVar)} environment variable:`),
    '',
    chalk.cyan(`    export ${envVar}="your-api-key-here"`),
    '',
  ];

  if (url) {
    lines.push(
      chalk.dim(`  Get your key at: ${url}`),
      '',
    );
  }

  lines.push(
    chalk.dim(`  Or store it permanently with:`),
    '',
    chalk.cyan(`    qayani config ${provider}-api-key "your-api-key-here"`),
    '',
  );

  console.error(lines.join('\n'));
  process.exit(1);
}
