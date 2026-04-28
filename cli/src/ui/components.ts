import chalk from 'chalk';
import { colors, theme } from './theme.js';

// ── Terminal width helper ────────────────────────────────────────────────────

function termWidth(): number {
  return process.stdout.columns || 80;
}

// ── Strip ANSI escape codes for width calculations ───────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

// ── Box Drawing System ───────────────────────────────────────────────────────

export type BoxStyle = 'single' | 'double' | 'rounded' | 'heavy' | 'minimal';

interface BoxChars {
  tl: string; t: string; tr: string;
  l: string; r: string;
  bl: string; b: string; br: string;
  lt: string; rt: string;  // left-tee, right-tee for dividers
}

const BOX_CHARS: Record<BoxStyle, BoxChars> = {
  single:  { tl: '┌', t: '─', tr: '┐', l: '│', r: '│', bl: '└', b: '─', br: '┘', lt: '├', rt: '┤' },
  double:  { tl: '╔', t: '═', tr: '╗', l: '║', r: '║', bl: '╚', b: '═', br: '╝', lt: '╠', rt: '╣' },
  rounded: { tl: '╭', t: '─', tr: '╮', l: '│', r: '│', bl: '╰', b: '─', br: '╯', lt: '├', rt: '┤' },
  heavy:   { tl: '┏', t: '━', tr: '┓', l: '┃', r: '┃', bl: '┗', b: '━', br: '┛', lt: '┣', rt: '┫' },
  minimal: { tl: ' ', t: '─', tr: ' ', l: ' ', r: ' ', bl: ' ', b: '─', br: ' ', lt: ' ', rt: ' ' },
};

interface BoxOptions {
  style?: BoxStyle;
  title?: string;
  width?: number;
  padding?: number;
  borderColor?: (s: string) => string;
  titleColor?: (s: string) => string;
}

/**
 * Wraps content inside a box with Unicode box-drawing characters.
 * Respects ANSI colors inside content. Auto-sizes to content or terminal width.
 */
export function box(content: string, opts?: BoxOptions): string {
  const style = opts?.style ?? 'rounded';
  const padding = opts?.padding ?? 1;
  const bc = opts?.borderColor ?? colors.muted;
  const tc = opts?.titleColor ?? theme.brand;
  const chars = BOX_CHARS[style];

  const lines = content.split('\n');
  const padStr = ' '.repeat(padding);

  // Determine inner width (widest content line + padding on each side)
  const maxContentWidth = Math.max(...lines.map(visibleLength), 0);
  const minInner = maxContentWidth + padding * 2;

  let innerWidth: number;
  if (opts?.width) {
    innerWidth = Math.max(opts.width - 2, minInner); // -2 for borders
  } else {
    innerWidth = Math.min(minInner, termWidth() - 4); // leave a small margin
  }
  // Ensure inner width is at least enough for content
  innerWidth = Math.max(innerWidth, minInner);

  const output: string[] = [];

  // ── Top border ──
  if (opts?.title) {
    const titleText = ` ${stripAnsi(opts.title)} `;
    const titleRendered = ` ${tc(opts.title)} `;
    const leftLen = 2;
    const rightLen = Math.max(0, innerWidth - leftLen - titleText.length);
    output.push(
      bc(chars.tl + chars.t.repeat(leftLen)) +
      titleRendered +
      bc(chars.t.repeat(rightLen) + chars.tr),
    );
  } else {
    output.push(bc(chars.tl + chars.t.repeat(innerWidth) + chars.tr));
  }

  // ── Content lines ──
  for (const line of lines) {
    const visible = visibleLength(line);
    const rightPad = Math.max(0, innerWidth - padding * 2 - visible);
    output.push(
      bc(chars.l) + padStr + line + ' '.repeat(rightPad) + padStr + bc(chars.r),
    );
  }

  // ── Bottom border ──
  output.push(bc(chars.bl + chars.b.repeat(innerWidth) + chars.br));

  return output.join('\n');
}

/**
 * Draws a horizontal divider line.
 */
export function divider(width?: number, style?: BoxStyle, color?: (s: string) => string): string {
  const w = width ?? Math.min(60, termWidth() - 4);
  const chars = BOX_CHARS[style ?? 'single'];
  const c = color ?? colors.muted;
  return c(chars.t.repeat(w));
}

// ── Table System ─────────────────────────────────────────────────────────────

interface TableOptions {
  headers: string[];
  rows: string[][];
  style?: BoxStyle;
  headerColor?: (s: string) => string;
  columnColors?: Array<((s: string) => string) | undefined>;
}

/**
 * Renders a beautiful box-bordered table with automatic column sizing.
 */
export function table(data: TableOptions): string {
  const style = data.style ?? 'single';
  const hc = data.headerColor ?? chalk.bold.white;
  const chars = BOX_CHARS[style];
  const bc = colors.muted;

  // Calculate column widths
  const colCount = data.headers.length;
  const colWidths: number[] = new Array(colCount).fill(0);

  for (let i = 0; i < colCount; i++) {
    colWidths[i] = Math.max(colWidths[i], visibleLength(data.headers[i]));
  }
  for (const row of data.rows) {
    for (let i = 0; i < colCount; i++) {
      const cell = row[i] ?? '';
      colWidths[i] = Math.max(colWidths[i], visibleLength(cell));
    }
  }

  // Add padding to each column
  for (let i = 0; i < colCount; i++) {
    colWidths[i] += 2;
  }

  // Clamp total width to terminal
  const totalInner = colWidths.reduce((a, b) => a + b, 0) + colCount - 1; // separators
  const maxWidth = termWidth() - 4;
  if (totalInner > maxWidth && maxWidth > colCount * 4) {
    const scale = maxWidth / totalInner;
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(4, Math.floor(colWidths[i] * scale));
    }
  }

  // Helper to build a horizontal rule
  const hRule = (left: string, mid: string, right: string, fill: string): string => {
    const segments = colWidths.map((w) => fill.repeat(w));
    return bc(left + segments.join(mid) + right);
  };

  // Helper to build a content row
  const buildRow = (cells: string[], colorFns?: Array<((s: string) => string) | undefined>): string => {
    const parts = cells.map((cell, i) => {
      const w = colWidths[i];
      const visible = visibleLength(cell);
      const pad = Math.max(0, w - visible - 1);
      const colorFn = colorFns?.[i];
      const content = colorFn ? colorFn(cell) : cell;
      return ' ' + content + ' '.repeat(pad);
    });
    return bc(chars.l) + parts.join(bc(chars.l)) + bc(chars.r);
  };

  const output: string[] = [];

  // Top border
  output.push(hRule(chars.tl, style === 'single' ? '┬' : style === 'double' ? '╦' : style === 'heavy' ? '┳' : '┬', chars.tr, chars.t));

  // Header row
  const headerCells = data.headers.map((h) => hc(h));
  const headerColorFns = data.headers.map(() => undefined); // already colored
  output.push(buildRow(headerCells, headerColorFns));

  // Header separator
  output.push(hRule(chars.lt, style === 'single' ? '┼' : style === 'double' ? '╬' : style === 'heavy' ? '╋' : '┼', chars.rt, chars.t));

  // Data rows
  for (const row of data.rows) {
    output.push(buildRow(row, data.columnColors));
  }

  // Bottom border
  output.push(hRule(chars.bl, style === 'single' ? '┴' : style === 'double' ? '╩' : style === 'heavy' ? '┻' : '┴', chars.br, chars.b));

  return output.join('\n');
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarOptions {
  filled?: string;
  empty?: string;
  color?: (s: string) => string;
}

/**
 * Renders a styled progress bar: ████████░░░░ 67%
 */
export function progressBar(percent: number, width?: number, opts?: ProgressBarOptions): string {
  const w = width ?? 30;
  const pct = Math.max(0, Math.min(100, percent));
  const filled = opts?.filled ?? '█';
  const empty = opts?.empty ?? '░';
  const color = opts?.color ?? colors.accent;

  const filledCount = Math.round((pct / 100) * w);
  const emptyCount = w - filledCount;

  const bar = color(filled.repeat(filledCount)) + colors.muted(empty.repeat(emptyCount));
  const label = pct === 100
    ? colors.success(` ${pct}%`)
    : colors.white(` ${Math.round(pct)}%`);

  return bar + label;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

type BadgeStatus = 'running' | 'stopped' | 'active' | 'error' | 'idle';

const BADGE_MAP: Record<BadgeStatus, { icon: string; color: (s: string) => string; label: string }> = {
  running: { icon: '\u25CF', color: colors.success, label: 'Running' },   // ●
  active:  { icon: '\u25C9', color: colors.accent,  label: 'Active' },    // ◉
  idle:    { icon: '\u25CB', color: colors.muted,   label: 'Idle' },      // ○
  stopped: { icon: '\u25CB', color: colors.warning, label: 'Stopped' },   // ○
  error:   { icon: '\u25CF', color: colors.error,   label: 'Error' },     // ●
};

/**
 * Renders a colored status badge: [● Running]
 */
export function statusBadge(status: BadgeStatus): string {
  const badge = BADGE_MAP[status];
  return badge.color(`${badge.icon} ${badge.label}`);
}

// ── Key-Value Display ────────────────────────────────────────────────────────

interface KeyValueOptions {
  keyColor?: (s: string) => string;
  valueColor?: (s: string) => string;
  separator?: string;
  indent?: number;
}

/**
 * Renders aligned key-value pairs:
 *   Provider ····· OpenAI
 *   Model ······· gpt-4o
 */
export function keyValue(pairs: Array<[string, string]>, opts?: KeyValueOptions): string {
  const kc = opts?.keyColor ?? colors.muted;
  const vc = opts?.valueColor ?? colors.white;
  const sep = opts?.separator ?? ' ';
  const indent = opts?.indent ?? 2;
  const pad = ' '.repeat(indent);

  const maxKeyLen = Math.max(...pairs.map(([k]) => k.length));

  return pairs.map(([key, value]) => {
    const dots = sep.repeat(Math.max(1, maxKeyLen - key.length + 3));
    return `${pad}${kc(key)} ${colors.muted(dots)} ${vc(value)}`;
  }).join('\n');
}

// ── Sparkline ────────────────────────────────────────────────────────────────

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Renders a sparkline graph: ▁▂▃▅▇█▇▅▃▂
 */
export function sparkline(values: number[], color?: (s: string) => string): string {
  if (values.length === 0) return '';
  const c = color ?? colors.accent;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return c(
    values
      .map((v) => {
        const idx = Math.round(((v - min) / range) * (SPARK_CHARS.length - 1));
        return SPARK_CHARS[idx];
      })
      .join(''),
  );
}

// ── Fancy Spinners ───────────────────────────────────────────────────────────

export type SpinnerStyle = 'dots' | 'braille' | 'arc' | 'pulse' | 'quantum';

const SPINNER_FRAMES: Record<SpinnerStyle, string[]> = {
  dots:    ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  braille: ['⡿', '⣟', '⣯', '⣷', '⣾', '⣽', '⣻', '⢿'],
  arc:     ['◜', '◝', '◞', '◟'],
  pulse:   ['░', '▒', '▓', '█', '▓', '▒'],
  quantum: ['◐', '◓', '◑', '◒'],
};

const SPINNER_INTERVAL = 80;

interface FancySpinner {
  start(): void;
  stop(finalMessage?: string): void;
  update(label: string): void;
}

/**
 * Creates an animated terminal spinner with various styles.
 */
export function createFancySpinner(style?: SpinnerStyle, label?: string): FancySpinner {
  const frames = SPINNER_FRAMES[style ?? 'dots'];
  let frameIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentLabel = label ?? '';

  return {
    start() {
      frameIndex = 0;
      timer = setInterval(() => {
        const frame = frames[frameIndex % frames.length];
        const spinnerText = `  ${colors.accent(frame)} ${colors.muted(currentLabel)}`;
        process.stdout.write(`\r\x1b[K${spinnerText}`);
        frameIndex++;
      }, SPINNER_INTERVAL);
    },

    stop(finalMessage?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      process.stdout.write('\r\x1b[K'); // clear the line

      if (finalMessage !== undefined) {
        const isError = finalMessage.toLowerCase().includes('error') ||
                        finalMessage.toLowerCase().includes('fail');
        const icon = isError ? colors.error('✗') : colors.success('✓');
        const msg = isError ? colors.error(finalMessage) : colors.muted(finalMessage);
        process.stdout.write(`  ${icon} ${msg}\n`);
      }
    },

    update(newLabel: string) {
      currentLabel = newLabel;
    },
  };
}

// ── Section Header ───────────────────────────────────────────────────────────

/**
 * Renders a styled section header with a subtle divider.
 *   ── Section Title ──────────────────
 */
export function sectionHeader(title: string, width?: number): string {
  const w = width ?? Math.min(60, termWidth() - 4);
  const prefix = '── ';
  const suffix = ' ';
  const remaining = Math.max(0, w - prefix.length - suffix.length - title.length);
  return colors.muted(prefix) + theme.brand(title) + colors.muted(suffix + '─'.repeat(remaining));
}

// ── Empty State ──────────────────────────────────────────────────────────────

/**
 * Renders an empty state message with an icon and action hint.
 */
export function emptyState(message: string, hint?: string): string {
  const lines: string[] = [
    '',
    `  ${colors.muted('○')}  ${colors.muted(message)}`,
  ];
  if (hint) {
    lines.push(`     ${colors.accent(hint)}`);
  }
  lines.push('');
  return lines.join('\n');
}
