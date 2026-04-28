/**
 * Interactive wizard system for QAYANI CLI.
 *
 * Provides beautiful, arrow-key-navigable prompts using only Node.js
 * built-in readline / stdin raw mode.  No external prompt libraries.
 */

import chalk from 'chalk';
import { colors, theme } from './theme.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function termWidth(): number {
  return process.stdout.columns || 80;
}

/** Strip ANSI escape codes for width calculations. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Move cursor up N lines. */
function cursorUp(n: number): void {
  if (n > 0) process.stdout.write(`\x1b[${n}A`);
}

/** Erase from cursor to end of screen. */
function eraseDown(): void {
  process.stdout.write('\x1b[J');
}

/** Hide terminal cursor. */
function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

/** Show terminal cursor. */
function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

/** Clear N lines above the cursor (inclusive of current line). */
function clearLines(n: number): void {
  cursorUp(n);
  eraseDown();
}

// ── Keystroke reader ────────────────────────────────────────────────────────

interface KeyEvent {
  name: string;      // 'up', 'down', 'left', 'right', 'return', 'space', 'backspace', or the char
  ctrl: boolean;
  raw: string;
}

function parseKey(data: Buffer): KeyEvent {
  const s = data.toString('utf-8');
  const ctrl = s.length === 1 && s.charCodeAt(0) < 32;

  // Arrow keys & escape sequences
  if (s === '\x1b[A') return { name: 'up', ctrl: false, raw: s };
  if (s === '\x1b[B') return { name: 'down', ctrl: false, raw: s };
  if (s === '\x1b[C') return { name: 'right', ctrl: false, raw: s };
  if (s === '\x1b[D') return { name: 'left', ctrl: false, raw: s };

  // Enter
  if (s === '\r' || s === '\n') return { name: 'return', ctrl: false, raw: s };

  // Space
  if (s === ' ') return { name: 'space', ctrl: false, raw: s };

  // Backspace (0x7f on macOS, 0x08 otherwise)
  if (s === '\x7f' || s === '\x08') return { name: 'backspace', ctrl: false, raw: s };

  // Tab
  if (s === '\t') return { name: 'tab', ctrl: false, raw: s };

  // Ctrl+C
  if (s === '\x03') return { name: 'c', ctrl: true, raw: s };

  // Ctrl+D
  if (s === '\x04') return { name: 'd', ctrl: true, raw: s };

  // Escape
  if (s === '\x1b') return { name: 'escape', ctrl: false, raw: s };

  return { name: s, ctrl, raw: s };
}

/**
 * Enable raw mode on stdin and return a promise that resolves
 * with each keypress.  Call cleanup() when done.
 */
function createKeyReader(): {
  nextKey: () => Promise<KeyEvent>;
  cleanup: () => void;
} {
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');

  let pending: Array<(key: KeyEvent) => void> = [];
  let buffer: KeyEvent[] = [];

  const onData = (data: Buffer | string): void => {
    const buf = typeof data === 'string' ? Buffer.from(data) : data;
    const key = parseKey(buf);
    if (pending.length > 0) {
      const resolve = pending.shift()!;
      resolve(key);
    } else {
      buffer.push(key);
    }
  };

  process.stdin.on('data', onData);

  return {
    nextKey(): Promise<KeyEvent> {
      if (buffer.length > 0) {
        return Promise.resolve(buffer.shift()!);
      }
      return new Promise<KeyEvent>((resolve) => {
        pending.push(resolve);
      });
    },
    cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(wasRaw ?? false);
      process.stdin.pause();
      pending = [];
      buffer = [];
    },
  };
}

// ── select ──────────────────────────────────────────────────────────────────

export interface SelectChoice<T extends string> {
  label: string;
  value: T;
  description?: string;
}

export async function select<T extends string>(opts: {
  message: string;
  choices: SelectChoice<T>[];
  default?: T;
}): Promise<T> {
  const { choices } = opts;
  let cursor = 0;

  // Start at default if provided
  if (opts.default) {
    const idx = choices.findIndex((c) => c.value === opts.default);
    if (idx >= 0) cursor = idx;
  }

  const reader = createKeyReader();
  hideCursor();

  const render = (): number => {
    const lines: string[] = [];
    lines.push(`  ${colors.accent('?')} ${chalk.bold.white(opts.message)}`);
    lines.push('');

    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const active = i === cursor;
      const pointer = active ? colors.accent('  ▸ ') : '    ';
      const label = active ? chalk.white(c.label) : colors.muted(c.label);
      const desc = c.description
        ? (active ? colors.muted(`  ${c.description}`) : colors.muted(`  ${c.description}`))
        : '';
      lines.push(pointer + label + desc);
    }

    lines.push('');
    lines.push(colors.muted('  ↑/↓ navigate · enter select'));

    const output = lines.join('\n');
    process.stdout.write(output);
    return lines.length;
  };

  let lineCount = render();

  try {
    while (true) {
      const key = await reader.nextKey();

      // Handle Ctrl+C
      if (key.ctrl && key.name === 'c') {
        clearLines(lineCount - 1);
        showCursor();
        reader.cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        cursor = cursor <= 0 ? choices.length - 1 : cursor - 1;
      } else if (key.name === 'down') {
        cursor = cursor >= choices.length - 1 ? 0 : cursor + 1;
      } else if (key.name === 'return') {
        // Clear and show result
        clearLines(lineCount - 1);
        const selected = choices[cursor];
        process.stdout.write(
          `  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.accent(selected.label)}\n`,
        );
        showCursor();
        reader.cleanup();
        return selected.value;
      }

      // Re-render
      clearLines(lineCount - 1);
      lineCount = render();
    }
  } catch {
    showCursor();
    reader.cleanup();
    throw new Error('Prompt aborted');
  }
}

// ── confirm ─────────────────────────────────────────────────────────────────

export async function confirm(opts: {
  message: string;
  default?: boolean;
}): Promise<boolean> {
  const defaultVal = opts.default ?? true;
  const reader = createKeyReader();

  const hint = defaultVal ? 'Y/n' : 'y/N';
  process.stdout.write(
    `  ${colors.accent('?')} ${chalk.bold.white(opts.message)} ${colors.muted(`(${hint})`)} `,
  );

  try {
    while (true) {
      const key = await reader.nextKey();

      if (key.ctrl && key.name === 'c') {
        process.stdout.write('\n');
        showCursor();
        reader.cleanup();
        process.exit(0);
      }

      if (key.name === 'return') {
        const result = defaultVal;
        // Overwrite the line
        process.stdout.write(`\r\x1b[K  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${result ? colors.accent('Yes') : colors.muted('No')}\n`);
        reader.cleanup();
        return result;
      }

      if (key.name === 'y' || key.name === 'Y') {
        process.stdout.write(`\r\x1b[K  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.accent('Yes')}\n`);
        reader.cleanup();
        return true;
      }

      if (key.name === 'n' || key.name === 'N') {
        process.stdout.write(`\r\x1b[K  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.muted('No')}\n`);
        reader.cleanup();
        return false;
      }
    }
  } catch {
    reader.cleanup();
    throw new Error('Prompt aborted');
  }
}

// ── input ───────────────────────────────────────────────────────────────────

export async function input(opts: {
  message: string;
  default?: string;
  validate?: (value: string) => string | true;
}): Promise<string> {
  const reader = createKeyReader();
  let value = '';
  let errorMsg = '';
  showCursor();

  const render = (): number => {
    const lines: string[] = [];
    const defaultHint = opts.default ? colors.muted(` (${opts.default})`) : '';
    const displayValue = value || '';

    lines.push(
      `  ${colors.accent('?')} ${chalk.bold.white(opts.message)}${defaultHint}`,
    );
    lines.push(`  ${colors.accent('▸')} ${chalk.white(displayValue)}${colors.muted('█')}`);

    if (errorMsg) {
      lines.push(`  ${colors.error('✗ ' + errorMsg)}`);
    }

    const output = lines.join('\n');
    process.stdout.write(output);
    return lines.length;
  };

  let lineCount = render();

  try {
    while (true) {
      const key = await reader.nextKey();

      if (key.ctrl && key.name === 'c') {
        clearLines(lineCount - 1);
        showCursor();
        reader.cleanup();
        process.exit(0);
      }

      if (key.name === 'return') {
        const finalValue = value || opts.default || '';

        // Validate
        if (opts.validate) {
          const result = opts.validate(finalValue);
          if (result !== true) {
            errorMsg = result;
            clearLines(lineCount - 1);
            lineCount = render();
            continue;
          }
        }

        clearLines(lineCount - 1);
        process.stdout.write(
          `  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.accent(finalValue)}\n`,
        );
        reader.cleanup();
        return finalValue;
      }

      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        errorMsg = '';
      } else if (!key.ctrl && key.name !== 'escape' && key.name !== 'tab' &&
                 key.name !== 'up' && key.name !== 'down' &&
                 key.name !== 'left' && key.name !== 'right' &&
                 key.raw.length === 1 && key.raw.charCodeAt(0) >= 32) {
        value += key.raw;
        errorMsg = '';
      }

      clearLines(lineCount - 1);
      lineCount = render();
    }
  } catch {
    showCursor();
    reader.cleanup();
    throw new Error('Prompt aborted');
  }
}

// ── multiselect ─────────────────────────────────────────────────────────────

export interface MultiselectChoice<T extends string> {
  label: string;
  value: T;
  description?: string;
  checked?: boolean;
}

export async function multiselect<T extends string>(opts: {
  message: string;
  choices: MultiselectChoice<T>[];
}): Promise<T[]> {
  const { choices } = opts;
  let cursor = 0;
  const checked = new Set<number>(
    choices.map((c, i) => (c.checked ? i : -1)).filter((i) => i >= 0),
  );

  const reader = createKeyReader();
  hideCursor();

  const render = (): number => {
    const lines: string[] = [];
    lines.push(`  ${colors.accent('?')} ${chalk.bold.white(opts.message)}`);
    lines.push('');

    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const active = i === cursor;
      const isChecked = checked.has(i);
      const pointer = active ? colors.accent('  ▸ ') : '    ';
      const checkbox = isChecked
        ? colors.success('◼ ')
        : colors.muted('◻ ');
      const label = active ? chalk.white(c.label) : colors.muted(c.label);
      const desc = c.description ? colors.muted(`  ${c.description}`) : '';
      lines.push(pointer + checkbox + label + desc);
    }

    lines.push('');
    lines.push(colors.muted('  ↑/↓ navigate · space toggle · enter confirm'));

    const output = lines.join('\n');
    process.stdout.write(output);
    return lines.length;
  };

  let lineCount = render();

  try {
    while (true) {
      const key = await reader.nextKey();

      if (key.ctrl && key.name === 'c') {
        clearLines(lineCount - 1);
        showCursor();
        reader.cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        cursor = cursor <= 0 ? choices.length - 1 : cursor - 1;
      } else if (key.name === 'down') {
        cursor = cursor >= choices.length - 1 ? 0 : cursor + 1;
      } else if (key.name === 'space') {
        if (checked.has(cursor)) {
          checked.delete(cursor);
        } else {
          checked.add(cursor);
        }
      } else if (key.name === 'return') {
        clearLines(lineCount - 1);
        const selected = choices.filter((_, i) => checked.has(i));
        const labels = selected.map((c) => c.label).join(', ') || 'none';
        process.stdout.write(
          `  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.accent(labels)}\n`,
        );
        showCursor();
        reader.cleanup();
        return selected.map((c) => c.value);
      }

      clearLines(lineCount - 1);
      lineCount = render();
    }
  } catch {
    showCursor();
    reader.cleanup();
    throw new Error('Prompt aborted');
  }
}

// ── slider ──────────────────────────────────────────────────────────────────

export async function slider(opts: {
  message: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}): Promise<number> {
  const min = opts.min ?? 0;
  const max = opts.max ?? 1;
  const step = opts.step ?? 0.1;
  let value = opts.default ?? (min + max) / 2;
  value = Math.round(value / step) * step;

  const reader = createKeyReader();
  hideCursor();

  const TRACK_WIDTH = 24;

  const render = (): number => {
    const lines: string[] = [];
    const ratio = (value - min) / (max - min);
    const filled = Math.round(ratio * TRACK_WIDTH);
    const empty = TRACK_WIDTH - filled;

    const track =
      colors.accent('━'.repeat(filled)) +
      colors.accent('◆') +
      colors.muted('━'.repeat(empty));

    const display = value.toFixed(1);

    lines.push(`  ${colors.accent('?')} ${chalk.bold.white(opts.message)}`);
    lines.push(`  ${track}  ${chalk.white(display)}`);
    lines.push('');
    lines.push(colors.muted('  ←/→ adjust · enter confirm'));

    const output = lines.join('\n');
    process.stdout.write(output);
    return lines.length;
  };

  let lineCount = render();

  try {
    while (true) {
      const key = await reader.nextKey();

      if (key.ctrl && key.name === 'c') {
        clearLines(lineCount - 1);
        showCursor();
        reader.cleanup();
        process.exit(0);
      }

      if (key.name === 'left') {
        value = Math.max(min, value - step);
        value = Math.round(value / step) * step;
      } else if (key.name === 'right') {
        value = Math.min(max, value + step);
        value = Math.round(value / step) * step;
      } else if (key.name === 'return') {
        clearLines(lineCount - 1);
        process.stdout.write(
          `  ${colors.success('✓')} ${chalk.bold.white(opts.message)} ${colors.accent(value.toFixed(1))}\n`,
        );
        showCursor();
        reader.cleanup();
        return parseFloat(value.toFixed(2));
      }

      clearLines(lineCount - 1);
      lineCount = render();
    }
  } catch {
    showCursor();
    reader.cleanup();
    throw new Error('Prompt aborted');
  }
}

// ── Wizard header / step indicator ──────────────────────────────────────────

export function wizardHeader(title: string, step: number, total: number): void {
  const progress = colors.muted(`[${step}/${total}]`);
  const bar = '━'.repeat(step) + colors.muted('━'.repeat(total - step));
  const coloredBar = colors.accent('━'.repeat(step)) + colors.muted('━'.repeat(total - step));

  console.log('');
  console.log(`  ${progress} ${chalk.bold.white(title)}`);
  console.log(`  ${coloredBar}`);
  console.log('');
}

export function wizardWelcome(agentName: string): void {
  const bc = colors.muted;
  const w = 52;

  const topLine = bc('╭' + '─'.repeat(w) + '╮');
  const emptyLine = bc('│') + ' '.repeat(w) + bc('│');
  const bottomLine = bc('╰' + '─'.repeat(w) + '╯');

  const centerLine = (text: string, visLen: number): string => {
    const leftPad = Math.floor((w - visLen) / 2);
    const rightPad = w - visLen - leftPad;
    return bc('│') + ' '.repeat(leftPad) + text + ' '.repeat(rightPad) + bc('│');
  };

  const titleText = 'Agent Setup Wizard';
  const title = chalk.bold.white(titleText);

  const nameText = `Creating: ${agentName}`;
  const name = colors.accent(`Creating: `) + chalk.white(agentName);

  const hintText = 'Configure your agent step by step';
  const hint = colors.muted(hintText);

  console.log('');
  console.log(topLine);
  console.log(emptyLine);
  console.log(centerLine(title, titleText.length));
  console.log(emptyLine);
  console.log(centerLine(name, nameText.length));
  console.log(centerLine(hint, hintText.length));
  console.log(emptyLine);
  console.log(bottomLine);
  console.log('');
}

export function wizardPreview(content: string): void {
  const bc = colors.muted;
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), 0);
  const w = Math.min(Math.max(maxLen + 4, 40), termWidth() - 6);

  const topLine = bc('╭─') + theme.brand(' AGENT.md Preview ') + bc('─'.repeat(Math.max(0, w - 20)) + '╮');
  const bottomLine = bc('╰' + '─'.repeat(w) + '╯');

  console.log('');
  console.log(topLine);

  for (const line of lines) {
    const pad = Math.max(0, w - 2 - line.length);
    console.log(bc('│') + ' ' + colors.white(line) + ' '.repeat(pad) + ' ' + bc('│'));
  }

  console.log(bottomLine);
  console.log('');
}
