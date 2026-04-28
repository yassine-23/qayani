import chalk from 'chalk';

// ── Color Palette ────────────────────────────────────────────────────────────

export const colors = {
  gold:       chalk.hex('#D4AF37'),
  goldBright: chalk.hex('#F0D060'),
  dark:       chalk.hex('#1A1A2E'),
  accent:     chalk.hex('#00D9FF'),
  success:    chalk.hex('#00E676'),
  error:      chalk.hex('#FF5252'),
  warning:    chalk.hex('#FFD740'),
  info:       chalk.hex('#448AFF'),
  muted:      chalk.hex('#666680'),
  white:      chalk.hex('#E8E8F0'),
};

// ── Semantic Theme ───────────────────────────────────────────────────────────

export const theme = {
  brand:   colors.gold,
  success: colors.success,
  error:   colors.error,
  warning: colors.warning,
  info:    colors.accent,
  dim:     colors.muted,
  bold:    chalk.bold,
  user:    colors.accent,
  agent:   colors.success,
  system:  colors.muted,
  tool:    colors.warning,
};

// ── ASCII Banner ─────────────────────────────────────────────────────────────

/**
 * Returns the main QAYANI ASCII art banner -- a startup splash screen
 * rendered with block characters and gold coloring.
 */
export function banner(): string {
  const lines = [
    '                                                          ',
    '   ██████╗   █████╗  ██╗   ██╗  █████╗  ███╗   ██╗ ██╗  ',
    '  ██╔═══██╗ ██╔══██╗ ╚██╗ ██╔╝ ██╔══██╗ ████╗  ██║ ██║  ',
    '  ██║   ██║ ███████║  ╚████╔╝  ███████║ ██╔██╗ ██║ ██║  ',
    '  ██║▄▄ ██║ ██╔══██║   ╚██╔╝   ██╔══██║ ██║╚██╗██║ ██║  ',
    '  ╚██████╔╝ ██║  ██║    ██║    ██║  ██║ ██║ ╚████║ ██║  ',
    '   ╚══▀▀═╝  ╚═╝  ╚═╝    ╚═╝    ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ',
    '                                                          ',
  ];

  const art = lines.map((l) => colors.gold(l)).join('\n');

  const version = colors.muted('  v0.1.0');
  const separator = colors.muted(' · ');
  const tagline = colors.white('Build, configure, and deploy AI agents from your terminal.');
  const bottomRule = colors.muted('  ' + '─'.repeat(56));

  return '\n' + art + '\n' + version + separator + tagline + '\n' + bottomRule + '\n';
}

// ── Agent Banner ─────────────────────────────────────────────────────────────

/**
 * Returns a beautiful boxed display with agent information.
 */
export function agentBanner(name: string, provider: string, model: string): string {
  const bc = colors.muted;
  const inner = 48;

  const pad = (content: string, visLen: number): string => {
    return content + ' '.repeat(Math.max(0, inner - visLen));
  };

  const topLine    = bc('╭' + '─'.repeat(inner) + '╮');
  const emptyLine  = bc('│') + ' '.repeat(inner) + bc('│');
  const bottomLine = bc('╰' + '─'.repeat(inner) + '╯');

  const nameLine = (() => {
    const label = '  ◉  ';
    const text = chalk.bold.white(name);
    const vis = label.length + name.length;
    return bc('│') + colors.accent(label) + text + ' '.repeat(Math.max(0, inner - vis)) + bc('│');
  })();

  const providerLine = (() => {
    const label = '  Provider  ';
    const value = provider;
    const vis = label.length + value.length;
    return bc('│') + colors.muted(label) + colors.white(value) + ' '.repeat(Math.max(0, inner - vis)) + bc('│');
  })();

  const modelLine = (() => {
    const label = '  Model     ';
    const value = model;
    const vis = label.length + value.length;
    return bc('│') + colors.muted(label) + colors.white(value) + ' '.repeat(Math.max(0, inner - vis)) + bc('│');
  })();

  const dividerLine = bc('│') + '  ' + colors.muted('─'.repeat(inner - 4)) + '  ' + bc('│');

  return [
    '',
    topLine,
    emptyLine,
    nameLine,
    dividerLine,
    providerLine,
    modelLine,
    emptyLine,
    bottomLine,
    '',
  ].join('\n');
}
