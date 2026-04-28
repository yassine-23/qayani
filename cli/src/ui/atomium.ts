import chalk from 'chalk';
import { colors } from './theme.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AtomiumNode {
  id: string;
  name: string;
  status: 'active' | 'working' | 'idle' | 'error';
  provider?: string;
  model?: string;
  role?: string;
}

export interface AtomiumConfig {
  nodes: AtomiumNode[];
  title?: string;
  animated?: boolean;
  selectedId?: string;
  compact?: boolean;
}

// ── Color Helpers ───────────────────────────────────────────────────────────

const atomColors = {
  active:     chalk.hex('#00E676'),
  working:    chalk.hex('#FFD740'),
  idle:       chalk.hex('#666680'),
  error:      chalk.hex('#FF5252'),
  selected:   chalk.hex('#D4AF37'),
  beam:       chalk.hex('#444466'),
  beamActive: chalk.hex('#00D9FF'),
  beamDim:    chalk.hex('#333350'),
  title:      chalk.hex('#D4AF37'),
  hub:        chalk.hex('#E8E8F0'),
};

const STATUS_DOT: Record<AtomiumNode['status'], string> = {
  active:  atomColors.active('\u25CF'),   // ●
  working: atomColors.working('\u25CF'),  // ●
  idle:    atomColors.idle('\u25CB'),     // ○
  error:   atomColors.error('\u25CF'),    // ●
};

const STATUS_DOT_BRIGHT: Record<AtomiumNode['status'], string> = {
  active:  chalk.hex('#00FF88').bold('\u25CF'),
  working: chalk.hex('#FFE57F').bold('\u25CF'),
  idle:    atomColors.idle('\u25CB'),
  error:   chalk.hex('#FF6E6E').bold('\u25CF'),
};

// ── String Utilities ────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

function truncate(str: string, maxLen: number): string {
  if (maxLen <= 0) return '';
  if (str.length <= maxLen) return str;
  if (maxLen <= 1) return '\u2026';
  return str.slice(0, maxLen - 1) + '\u2026';
}

function padRight(str: string, width: number): string {
  const diff = width - visibleLength(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function centerIn(str: string, width: number): string {
  const vis = visibleLength(str);
  const diff = width - vis;
  if (diff <= 0) return str;
  const left = Math.floor(diff / 2);
  return ' '.repeat(left) + str + ' '.repeat(diff - left);
}

// ── Sphere Rendering ────────────────────────────────────────────────────────

/**
 * Renders a single sphere (agent node) as a rounded box.
 * Returns an array of strings, each exactly `width` visible characters wide.
 *
 *   ╭────────────────╮    or selected:  ╔════════════════╗
 *   │ ● AgentName    │                  ║ ● AgentName    ║
 *   │   role desc    │                  ║   role desc    ║
 *   ╰────────────────╯                  ╚════════════════╝
 */
function renderSphere(
  node: AtomiumNode,
  width: number,
  selected: boolean,
  pulse: boolean,
): string[] {
  const innerW = width - 2; // minus left/right border chars

  // Border characters
  const sel = selected;
  const bc = sel ? atomColors.selected : atomColors.beam;
  const tl = sel ? '\u2554' : '\u256D'; // ╔ or ╭
  const tr = sel ? '\u2557' : '\u256E'; // ╗ or ╮
  const bl = sel ? '\u255A' : '\u2570'; // ╚ or ╰
  const br = sel ? '\u255D' : '\u256F'; // ╝ or ╯
  const hz = sel ? '\u2550' : '\u2500'; // ═ or ─
  const vl = sel ? '\u2551' : '\u2502'; // ║ or │

  // Status dot
  const dot = pulse ? STATUS_DOT_BRIGHT[node.status] : STATUS_DOT[node.status];

  // Name styling
  const nameColor = sel
    ? atomColors.selected
    : node.status === 'active'  ? atomColors.active
    : node.status === 'working' ? atomColors.working
    : node.status === 'error'   ? atomColors.error
    : colors.white;

  const maxNameLen = innerW - 4; // " ● Name " with padding
  const nameText = truncate(node.name, maxNameLen);
  const nameContent = ' ' + dot + ' ' + nameColor(nameText);
  const nameVisLen = 1 + 1 + 1 + nameText.length; // space + dot(1) + space + name
  const namePad = Math.max(0, innerW - nameVisLen);

  const lines: string[] = [];

  // Top border
  lines.push(bc(tl + hz.repeat(innerW) + tr));

  // Name line
  lines.push(bc(vl) + nameContent + ' '.repeat(namePad) + bc(vl));

  // Role line (optional)
  if (node.role) {
    const maxRoleLen = innerW - 4;
    const roleText = truncate(node.role, maxRoleLen);
    const roleContent = '   ' + atomColors.idle(roleText);
    const roleVisLen = 3 + roleText.length;
    const rolePad = Math.max(0, innerW - roleVisLen);
    lines.push(bc(vl) + roleContent + ' '.repeat(rolePad) + bc(vl));
  }

  // Bottom border
  lines.push(bc(bl + hz.repeat(innerW) + br));

  return lines;
}

/**
 * Returns the height (number of lines) a sphere will occupy.
 */
function sphereHeight(node: AtomiumNode): number {
  return node.role ? 4 : 3;
}

// ── Line-Based Layout Renderer ──────────────────────────────────────────────

/**
 * Places pre-rendered sphere blocks onto a lines array at specific column positions.
 * This avoids the canvas overlap issues by working at the line level.
 */
function composeLine(width: number, ...segments: Array<{ col: number; text: string }>): string {
  // Build a character array
  const chars: string[] = new Array(width).fill(' ');
  // Track which positions have been written (with ANSI)
  const ansiChars: (string | null)[] = new Array(width).fill(null);

  for (const seg of segments) {
    const segs = parseAnsiSegments(seg.text);
    for (let i = 0; i < segs.length; i++) {
      const pos = seg.col + i;
      if (pos >= 0 && pos < width) {
        ansiChars[pos] = segs[i];
      }
    }
  }

  const result: string[] = [];
  for (let i = 0; i < width; i++) {
    result.push(ansiChars[i] ?? chars[i]);
  }
  return result.join('');
}

/**
 * Parse an ANSI string into an array where each element is one visible character
 * with its surrounding escape codes.
 */
function parseAnsiSegments(str: string): string[] {
  const segments: string[] = [];
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  let pendingCodes = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(str)) !== null) {
    const plain = str.slice(lastIndex, match.index);
    for (const ch of plain) {
      segments.push(pendingCodes + ch + '\x1b[0m');
      pendingCodes = '';
    }
    pendingCodes += match[0];
    lastIndex = match.index + match[0].length;
  }

  const remaining = str.slice(lastIndex);
  for (const ch of remaining) {
    if (pendingCodes) {
      segments.push(pendingCodes + ch + '\x1b[0m');
      pendingCodes = '';
    } else {
      segments.push(ch);
    }
  }

  return segments;
}

// ── Beam Strings ────────────────────────────────────────────────────────────

function hBeam(length: number, active: boolean): string {
  if (length <= 0) return '';
  const c = active ? atomColors.beamActive : atomColors.beam;
  return c('\u2500'.repeat(length)); // ─
}

function diagBeamDown(length: number, active: boolean): string {
  if (length <= 0) return '';
  const c = active ? atomColors.beamActive : atomColors.beam;
  // Diagonal going down-right: ╲
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(c('\u2572')); // ╲
  }
  return chars.join('');
}

function diagBeamUp(length: number, active: boolean): string {
  if (length <= 0) return '';
  const c = active ? atomColors.beamActive : atomColors.beam;
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(c('\u2571')); // ╱
  }
  return chars.join('');
}

function vBeam(active: boolean): string {
  const c = active ? atomColors.beamActive : atomColors.beam;
  return c('\u2502'); // │
}

// ── Tier-Based Atomium Renderer ─────────────────────────────────────────────

/**
 * Render the full Atomium structure as a string.
 *
 * The layout strategy builds the output line by line using a tier-based approach:
 *
 *   Tier 1 (top):     [node] ──── [node]
 *                        ╲    ╱╲    ╱
 *   Tier 2 (center):  [node] [HUB] [node]
 *                        ╱    ╲╱    ╲
 *   Tier 3 (bottom):  [node] ──── [node]
 *
 * For fewer nodes, simpler layouts are used.
 */
export function renderAtomium(config: AtomiumConfig): string {
  const { nodes, title, selectedId, animated } = config;
  const termW = process.stdout.columns || 80;
  const canvasW = Math.max(60, Math.min(termW - 2, 120));
  const pulse = animated ?? false;

  // ── Empty state ──
  if (nodes.length === 0) {
    const lines: string[] = [''];
    if (title) lines.push('  ' + atomColors.title.bold(title));
    lines.push('');
    lines.push('  ' + atomColors.idle('No agents in fleet.'));
    lines.push('  ' + colors.muted('Use ') + colors.accent('qayani fleet add <agent>') + colors.muted(' to add one.'));
    lines.push('');
    return lines.join('\n');
  }

  // ── Header ──
  const output: string[] = [''];
  if (title) {
    output.push('  ' + atomColors.title.bold(title) + colors.muted(` (${nodes.length} agent${nodes.length !== 1 ? 's' : ''})`));
    const statusParts = buildStatusSummary(nodes);
    output.push('  ' + statusParts);
    output.push('  ' + colors.muted('\u2500'.repeat(Math.min(56, canvasW - 4))));
    output.push('');
  }

  // ── Dispatch to layout ──
  const count = nodes.length;
  if (count === 1) {
    output.push(...renderSingleNode(nodes, canvasW, selectedId, pulse));
  } else if (count === 2) {
    output.push(...renderPairNodes(nodes, canvasW, selectedId, pulse));
  } else if (count === 3) {
    output.push(...renderTriangle(nodes, canvasW, selectedId, pulse));
  } else if (count === 4) {
    output.push(...renderDiamond(nodes, canvasW, selectedId, pulse));
  } else {
    output.push(...renderFullAtomium(nodes, canvasW, selectedId, pulse));
  }

  // ── Legend ──
  output.push('');
  output.push(
    '  ' +
    atomColors.active('\u25CF') + colors.muted(' active  ') +
    atomColors.working('\u25CF') + colors.muted(' working  ') +
    atomColors.idle('\u25CB') + colors.muted(' idle  ') +
    atomColors.error('\u25CF') + colors.muted(' error'),
  );
  output.push('');

  return output.join('\n');
}

// ── Status Summary ──────────────────────────────────────────────────────────

function buildStatusSummary(nodes: AtomiumNode[]): string {
  const counts: Record<AtomiumNode['status'], number> = { active: 0, working: 0, idle: 0, error: 0 };
  for (const n of nodes) counts[n.status]++;

  const parts: string[] = [];
  if (counts.active > 0)  parts.push(atomColors.active(`${counts.active} active`));
  if (counts.working > 0) parts.push(atomColors.working(`${counts.working} working`));
  if (counts.idle > 0)    parts.push(atomColors.idle(`${counts.idle} idle`));
  if (counts.error > 0)   parts.push(atomColors.error(`${counts.error} error`));
  return parts.join(colors.muted(' \u2215 ')); // ∕
}

// ── Layout: Single Node ─────────────────────────────────────────────────────

function renderSingleNode(
  nodes: AtomiumNode[],
  canvasW: number,
  selectedId: string | undefined,
  pulse: boolean,
): string[] {
  const sphereW = Math.min(24, Math.max(16, Math.floor(canvasW / 3)));
  const node = nodes[0];
  const selected = node.id === selectedId;
  const sphere = renderSphere(node, sphereW, selected, pulse);
  const col = Math.floor((canvasW - sphereW) / 2);

  return sphere.map((line) => ' '.repeat(col) + line);
}

// ── Layout: Pair ────────────────────────────────────────────────────────────

function renderPairNodes(
  nodes: AtomiumNode[],
  canvasW: number,
  selectedId: string | undefined,
  pulse: boolean,
): string[] {
  const sphereW = Math.min(22, Math.max(14, Math.floor((canvasW - 10) / 2)));
  const beamLen = Math.max(4, canvasW - sphereW * 2 - 4);
  const leftCol = Math.floor((canvasW - sphereW * 2 - beamLen) / 2);
  const rightCol = leftCol + sphereW + beamLen;

  const leftSphere = renderSphere(nodes[0], sphereW, nodes[0].id === selectedId, pulse);
  const rightSphere = renderSphere(nodes[1], sphereW, nodes[1].id === selectedId, pulse);
  const active = isActive(nodes[0]) || isActive(nodes[1]);

  const maxH = Math.max(leftSphere.length, rightSphere.length);
  const lines: string[] = [];

  for (let row = 0; row < maxH; row++) {
    const leftLine = row < leftSphere.length ? leftSphere[row] : ' '.repeat(sphereW);
    const rightLine = row < rightSphere.length ? rightSphere[row] : ' '.repeat(sphereW);

    // Draw beam on the middle row
    const midRow = Math.floor(maxH / 2);
    const beamStr = row === midRow ? hBeam(beamLen, active) : ' '.repeat(beamLen);

    lines.push(
      composeLine(canvasW,
        { col: leftCol, text: leftLine },
        { col: leftCol + sphereW, text: beamStr },
        { col: rightCol, text: rightLine },
      ),
    );
  }

  return lines;
}

// ── Layout: Triangle ────────────────────────────────────────────────────────

function renderTriangle(
  nodes: AtomiumNode[],
  canvasW: number,
  selectedId: string | undefined,
  pulse: boolean,
): string[] {
  const sphereW = Math.min(22, Math.max(14, Math.floor((canvasW - 10) / 2)));
  const topNode = nodes[0];
  const leftNode = nodes[1];
  const rightNode = nodes[2];

  const topCol = Math.floor((canvasW - sphereW) / 2);
  const spacing = Math.max(4, canvasW - sphereW * 2 - 4);
  const leftCol = Math.floor((canvasW - sphereW * 2 - spacing) / 2);
  const rightCol = leftCol + sphereW + spacing;

  const topSphere = renderSphere(topNode, sphereW, topNode.id === selectedId, pulse);
  const leftSphere = renderSphere(leftNode, sphereW, leftNode.id === selectedId, pulse);
  const rightSphere = renderSphere(rightNode, sphereW, rightNode.id === selectedId, pulse);

  const topActive = isActive(topNode);
  const leftActive = isActive(leftNode);
  const rightActive = isActive(rightNode);

  const lines: string[] = [];

  // Top sphere
  for (const row of topSphere) {
    lines.push(composeLine(canvasW, { col: topCol, text: row }));
  }

  // Diagonal beams going down from top to bottom left/right
  const diagRows = 3;
  const topCenter = topCol + Math.floor(sphereW / 2);
  const leftCenter = leftCol + Math.floor(sphereW / 2);
  const rightCenter = rightCol + Math.floor(sphereW / 2);

  for (let i = 1; i <= diagRows; i++) {
    const t = i / (diagRows + 1);
    const lx = Math.round(topCenter + (leftCenter - topCenter) * t);
    const rx = Math.round(topCenter + (rightCenter - topCenter) * t);
    lines.push(
      composeLine(canvasW,
        { col: lx, text: (topActive || leftActive) ? atomColors.beamActive('\u2572') : atomColors.beam('\u2572') },
        { col: rx, text: (topActive || rightActive) ? atomColors.beamActive('\u2571') : atomColors.beam('\u2571') },
      ),
    );
  }

  // Bottom row: left and right spheres with horizontal beam
  const botMaxH = Math.max(leftSphere.length, rightSphere.length);
  for (let row = 0; row < botMaxH; row++) {
    const lLine = row < leftSphere.length ? leftSphere[row] : ' '.repeat(sphereW);
    const rLine = row < rightSphere.length ? rightSphere[row] : ' '.repeat(sphereW);

    const midRow = Math.floor(botMaxH / 2);
    const beamStr = row === midRow ? hBeam(spacing, leftActive || rightActive) : ' '.repeat(spacing);

    lines.push(
      composeLine(canvasW,
        { col: leftCol, text: lLine },
        { col: leftCol + sphereW, text: beamStr },
        { col: rightCol, text: rLine },
      ),
    );
  }

  return lines;
}

// ── Layout: Diamond (4 nodes) ───────────────────────────────────────────────

function renderDiamond(
  nodes: AtomiumNode[],
  canvasW: number,
  selectedId: string | undefined,
  pulse: boolean,
): string[] {
  const sphereW = Math.min(22, Math.max(14, Math.floor((canvasW - 10) / 2)));
  const [top, left, right, bottom] = nodes;

  const centerCol = Math.floor((canvasW - sphereW) / 2);
  const spacing = Math.max(4, canvasW - sphereW * 2 - 4);
  const leftCol = Math.floor((canvasW - sphereW * 2 - spacing) / 2);
  const rightCol = leftCol + sphereW + spacing;

  const topSph = renderSphere(top, sphereW, top.id === selectedId, pulse);
  const leftSph = renderSphere(left, sphereW, left.id === selectedId, pulse);
  const rightSph = renderSphere(right, sphereW, right.id === selectedId, pulse);
  const botSph = renderSphere(bottom, sphereW, bottom.id === selectedId, pulse);

  const lines: string[] = [];

  // Top sphere (centered)
  for (const row of topSph) {
    lines.push(composeLine(canvasW, { col: centerCol, text: row }));
  }

  // Diagonal beams top -> left/right
  const diagRows = 2;
  const topCenter = centerCol + Math.floor(sphereW / 2);
  const leftCenter = leftCol + Math.floor(sphereW / 2);
  const rightCenter = rightCol + Math.floor(sphereW / 2);

  for (let i = 1; i <= diagRows; i++) {
    const t = i / (diagRows + 1);
    const lx = Math.round(topCenter + (leftCenter - topCenter) * t);
    const rx = Math.round(topCenter + (rightCenter - topCenter) * t);
    const la = isActive(top) || isActive(left);
    const ra = isActive(top) || isActive(right);
    lines.push(
      composeLine(canvasW,
        { col: lx, text: la ? atomColors.beamActive('\u2572') : atomColors.beam('\u2572') },
        { col: rx, text: ra ? atomColors.beamActive('\u2571') : atomColors.beam('\u2571') },
      ),
    );
  }

  // Middle row: left and right spheres with beam
  const midMaxH = Math.max(leftSph.length, rightSph.length);
  for (let row = 0; row < midMaxH; row++) {
    const lLine = row < leftSph.length ? leftSph[row] : ' '.repeat(sphereW);
    const rLine = row < rightSph.length ? rightSph[row] : ' '.repeat(sphereW);
    const midRow = Math.floor(midMaxH / 2);
    const beamStr = row === midRow ? hBeam(spacing, isActive(left) || isActive(right)) : ' '.repeat(spacing);
    lines.push(
      composeLine(canvasW,
        { col: leftCol, text: lLine },
        { col: leftCol + sphereW, text: beamStr },
        { col: rightCol, text: rLine },
      ),
    );
  }

  // Diagonal beams left/right -> bottom
  const botCenter = centerCol + Math.floor(sphereW / 2);
  for (let i = 1; i <= diagRows; i++) {
    const t = i / (diagRows + 1);
    const lx = Math.round(leftCenter + (botCenter - leftCenter) * t);
    const rx = Math.round(rightCenter + (botCenter - rightCenter) * t);
    const la = isActive(left) || isActive(bottom);
    const ra = isActive(right) || isActive(bottom);
    lines.push(
      composeLine(canvasW,
        { col: lx, text: la ? atomColors.beamActive('\u2571') : atomColors.beam('\u2571') },
        { col: rx, text: ra ? atomColors.beamActive('\u2572') : atomColors.beam('\u2572') },
      ),
    );
  }

  // Bottom sphere (centered)
  for (const row of botSph) {
    lines.push(composeLine(canvasW, { col: centerCol, text: row }));
  }

  return lines;
}

// ── Layout: Full Atomium (5-9 nodes) ────────────────────────────────────────

/**
 * Full Atomium crystal with 3 tiers:
 *
 *         [Top-L] ─────── [Top-R]
 *            ╲   ╲     ╱   ╱
 *             ╲   ╲   ╱   ╱
 *    [Mid-L] ── [ HUB ] ── [Mid-R]
 *             ╱   ╱   ╲   ╲
 *            ╱   ╱     ╲   ╲
 *         [Bot-L] ─────── [Bot-R]
 *
 * Hub = nodes[0], rest distributed to tiers.
 */
function renderFullAtomium(
  nodes: AtomiumNode[],
  canvasW: number,
  selectedId: string | undefined,
  pulse: boolean,
): string[] {
  const sphereW = Math.min(22, Math.max(14, Math.floor((canvasW - 14) / 3)));
  const hub = nodes[0];
  const rest = nodes.slice(1);

  // Distribute non-hub nodes: top-left, top-right, bot-left, bot-right, mid-left, mid-right
  const slots: (AtomiumNode | null)[] = [null, null, null, null, null, null];
  // Fill: TL, TR, BL, BR, ML, MR
  for (let i = 0; i < rest.length && i < 6; i++) {
    slots[i] = rest[i];
  }
  // Extra nodes beyond 6 go to additional mid positions (handled by expanding)
  const extras = rest.slice(6);

  const [topL, topR, botL, botR, midL, midR] = slots;

  // Column positions
  const hubCol = Math.floor((canvasW - sphereW) / 2);
  const sideGap = Math.max(2, Math.floor((canvasW - sphereW * 3 - 4) / 2));
  const leftCol = hubCol - sphereW - sideGap;
  const rightCol = hubCol + sphereW + sideGap;

  // Render all spheres
  const hubSph = renderSphere(hub, sphereW, hub.id === selectedId, pulse);
  const renderOpt = (n: AtomiumNode | null) =>
    n ? renderSphere(n, sphereW, n.id === selectedId, pulse) : null;

  const topLSph = renderOpt(topL);
  const topRSph = renderOpt(topR);
  const botLSph = renderOpt(botL);
  const botRSph = renderOpt(botR);
  const midLSph = renderOpt(midL);
  const midRSph = renderOpt(midR);

  const hubActive = isActive(hub);
  const lines: string[] = [];

  // ── Top tier ──
  if (topL || topR) {
    const topMaxH = Math.max(topLSph?.length ?? 0, topRSph?.length ?? 0);
    if (topL && topR) {
      // Both top nodes
      const beamLen = rightCol - leftCol - sphereW;
      for (let row = 0; row < topMaxH; row++) {
        const lLine = topLSph && row < topLSph.length ? topLSph[row] : ' '.repeat(sphereW);
        const rLine = topRSph && row < topRSph.length ? topRSph[row] : ' '.repeat(sphereW);
        const midRow = Math.floor(topMaxH / 2);
        const beamStr = row === midRow
          ? hBeam(beamLen, (isActive(topL) || isActive(topR)))
          : ' '.repeat(beamLen);
        lines.push(
          composeLine(canvasW,
            { col: leftCol, text: lLine },
            { col: leftCol + sphereW, text: beamStr },
            { col: rightCol, text: rLine },
          ),
        );
      }
    } else {
      // Only one top node
      const n = topL ?? topR!;
      const sph = topLSph ?? topRSph!;
      const col = Math.floor((canvasW - sphereW) / 2);
      for (const row of sph) {
        lines.push(composeLine(canvasW, { col, text: row }));
      }
    }

    // Diagonal beams from top tier down to hub
    const diagRows = 3;
    const topLCenter = leftCol + Math.floor(sphereW / 2);
    const topRCenter = rightCol + Math.floor(sphereW / 2);
    const hubCenter = hubCol + Math.floor(sphereW / 2);

    for (let i = 1; i <= diagRows; i++) {
      const t = i / (diagRows + 1);
      const segments: Array<{ col: number; text: string }> = [];

      if (topL) {
        const lx = Math.round(topLCenter + (hubCenter - topLCenter) * t);
        const a = hubActive || isActive(topL);
        segments.push({ col: lx, text: a ? atomColors.beamActive('\u2572') : atomColors.beam('\u2572') });
      }
      if (topR) {
        const rx = Math.round(topRCenter + (hubCenter - topRCenter) * t);
        const a = hubActive || isActive(topR);
        segments.push({ col: rx, text: a ? atomColors.beamActive('\u2571') : atomColors.beam('\u2571') });
      }

      lines.push(composeLine(canvasW, ...segments));
    }
  }

  // ── Middle tier: [midL] ── [HUB] ── [midR] ──
  const midMaxH = Math.max(
    hubSph.length,
    midLSph?.length ?? 0,
    midRSph?.length ?? 0,
  );

  for (let row = 0; row < midMaxH; row++) {
    const hubLine = row < hubSph.length ? hubSph[row] : ' '.repeat(sphereW);
    const segments: Array<{ col: number; text: string }> = [];

    if (midL && midLSph) {
      const lLine = row < midLSph.length ? midLSph[row] : ' '.repeat(sphereW);
      segments.push({ col: leftCol, text: lLine });

      // Horizontal beam left -> hub
      const midRow = Math.floor(midMaxH / 2);
      const beamLen = hubCol - leftCol - sphereW;
      const beamStr = row === midRow
        ? hBeam(beamLen, hubActive || isActive(midL))
        : ' '.repeat(Math.max(0, beamLen));
      if (beamLen > 0) {
        segments.push({ col: leftCol + sphereW, text: beamStr });
      }
    }

    segments.push({ col: hubCol, text: hubLine });

    if (midR && midRSph) {
      // Horizontal beam hub -> right
      const midRow = Math.floor(midMaxH / 2);
      const beamLen = rightCol - hubCol - sphereW;
      const beamStr = row === midRow
        ? hBeam(beamLen, hubActive || isActive(midR))
        : ' '.repeat(Math.max(0, beamLen));
      if (beamLen > 0) {
        segments.push({ col: hubCol + sphereW, text: beamStr });
      }

      const rLine = row < midRSph.length ? midRSph[row] : ' '.repeat(sphereW);
      segments.push({ col: rightCol, text: rLine });
    }

    lines.push(composeLine(canvasW, ...segments));
  }

  // ── Diagonal beams from hub down to bottom tier ──
  if (botL || botR) {
    const diagRows = 3;
    const hubCenter = hubCol + Math.floor(sphereW / 2);
    const botLCenter = leftCol + Math.floor(sphereW / 2);
    const botRCenter = rightCol + Math.floor(sphereW / 2);

    for (let i = 1; i <= diagRows; i++) {
      const t = i / (diagRows + 1);
      const segments: Array<{ col: number; text: string }> = [];

      if (botL) {
        const lx = Math.round(hubCenter + (botLCenter - hubCenter) * t);
        const a = hubActive || isActive(botL);
        segments.push({ col: lx, text: a ? atomColors.beamActive('\u2571') : atomColors.beam('\u2571') });
      }
      if (botR) {
        const rx = Math.round(hubCenter + (botRCenter - hubCenter) * t);
        const a = hubActive || isActive(botR);
        segments.push({ col: rx, text: a ? atomColors.beamActive('\u2572') : atomColors.beam('\u2572') });
      }

      lines.push(composeLine(canvasW, ...segments));
    }

    // Bottom tier spheres
    const botMaxH = Math.max(botLSph?.length ?? 0, botRSph?.length ?? 0);
    if (botL && botR) {
      const beamLen = rightCol - leftCol - sphereW;
      for (let row = 0; row < botMaxH; row++) {
        const lLine = botLSph && row < botLSph.length ? botLSph[row] : ' '.repeat(sphereW);
        const rLine = botRSph && row < botRSph.length ? botRSph[row] : ' '.repeat(sphereW);
        const midRow = Math.floor(botMaxH / 2);
        const beamStr = row === midRow
          ? hBeam(beamLen, isActive(botL) || isActive(botR))
          : ' '.repeat(beamLen);
        lines.push(
          composeLine(canvasW,
            { col: leftCol, text: lLine },
            { col: leftCol + sphereW, text: beamStr },
            { col: rightCol, text: rLine },
          ),
        );
      }
    } else {
      const n = botL ?? botR!;
      const sph = botLSph ?? botRSph!;
      const col = Math.floor((canvasW - sphereW) / 2);
      for (const row of sph) {
        lines.push(composeLine(canvasW, { col, text: row }));
      }
    }
  }

  // Handle extras (7th, 8th, 9th nodes) -- show as additional row below
  if (extras.length > 0) {
    lines.push('');
    const extraSpheres = extras.map((n) =>
      renderSphere(n, sphereW, n.id === selectedId, pulse),
    );
    const totalW = extras.length * sphereW + (extras.length - 1) * 4;
    const startCol = Math.floor((canvasW - totalW) / 2);
    const maxH = Math.max(...extraSpheres.map((s) => s.length));

    for (let row = 0; row < maxH; row++) {
      const segments: Array<{ col: number; text: string }> = [];
      for (let i = 0; i < extraSpheres.length; i++) {
        const sph = extraSpheres[i];
        const col = startCol + i * (sphereW + 4);
        const line = row < sph.length ? sph[row] : ' '.repeat(sphereW);
        segments.push({ col, text: line });

        // Beam between extras
        if (i < extraSpheres.length - 1 && row === Math.floor(maxH / 2)) {
          segments.push({ col: col + sphereW, text: hBeam(4, true) });
        }
      }
      lines.push(composeLine(canvasW, ...segments));
    }
  }

  return lines;
}

// ── Utility ─────────────────────────────────────────────────────────────────

function isActive(node: AtomiumNode | null): boolean {
  return node !== null && (node.status === 'active' || node.status === 'working');
}

// ── Mini Atomium (Compact Mode) ─────────────────────────────────────────────

/**
 * Render a mini/compact Atomium for fleet overview (multiple on screen).
 * Shows dots in a crystal pattern with fleet label.
 *
 *   \u25CF\u2501\u25CF\u2501\u25CF
 *   \u2503\u2572\u2503\u2571\u2503
 *   \u25CF\u2501\u25CF\u2501\u25CF
 *    Fleet-1
 */
export function renderMiniAtomium(config: AtomiumConfig): string {
  const { nodes, title, selectedId } = config;
  const lines: string[] = [];

  if (nodes.length === 0) {
    lines.push(colors.muted('  (empty)'));
    if (title) lines.push('  ' + atomColors.title(truncate(title, 14)));
    return lines.join('\n');
  }

  const hasActive = nodes.some((n) => isActive(n));
  const bc = hasActive ? atomColors.beamActive : atomColors.beam;

  // Arrange nodes in a grid: up to 3 cols
  const cols = Math.min(3, nodes.length);
  const rows: AtomiumNode[][] = [];
  for (let i = 0; i < nodes.length; i += cols) {
    rows.push(nodes.slice(i, i + cols));
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Dot row: ●━━●━━●
    let dotLine = '  ';
    for (let c = 0; c < row.length; c++) {
      const n = row[c];
      const dot = n.id === selectedId
        ? atomColors.selected('\u25C9') // ◉
        : STATUS_DOT[n.status];
      dotLine += dot;
      if (c < row.length - 1) {
        dotLine += bc('\u2501\u2501'); // ━━
      }
    }
    lines.push(dotLine);

    // Vertical/cross connector row between tiers
    if (r < rows.length - 1) {
      let connLine = '  ';
      const nextRow = rows[r + 1];
      for (let c = 0; c < row.length; c++) {
        connLine += bc('\u2503'); // ┃
        if (c < row.length - 1 && c < nextRow.length - 1) {
          connLine += bc('\u2572\u2571'); // ╲╱
        } else if (c < row.length - 1) {
          connLine += '  ';
        }
      }
      lines.push(connLine);
    }
  }

  // Fleet label
  if (title) {
    const labelWidth = cols * 3; // approximate
    lines.push('  ' + atomColors.title(truncate(title, 24)));
  }

  return lines.join('\n');
}

// ── Animated Atomium Display ────────────────────────────────────────────────

/**
 * Creates an animated Atomium display that updates in place.
 * Uses ANSI escape sequences to overwrite previous frames.
 */
export function createAtomiumDisplay(config: AtomiumConfig): {
  start(): void;
  stop(): void;
  updateNode(id: string, updates: Partial<AtomiumNode>): void;
  selectNode(id: string | null): void;
  getSelected(): string | null;
} {
  let nodes = config.nodes.map((n) => ({ ...n }));
  let selectedId = config.selectedId ?? null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let pulsePhase = 0;
  let lastFrameHeight = 0;

  function renderFrame(): string {
    pulsePhase = (pulsePhase + 1) % 4;
    const isPulse = pulsePhase < 2;

    return renderAtomium({
      ...config,
      nodes,
      selectedId: selectedId ?? undefined,
      animated: isPulse,
    });
  }

  function draw(): void {
    const frame = renderFrame();
    const frameLines = frame.split('\n');

    // Move cursor up to overwrite previous frame
    if (lastFrameHeight > 0) {
      process.stdout.write(`\x1b[${lastFrameHeight}A`);
    }

    // Write each line, clearing to end of line
    for (const line of frameLines) {
      process.stdout.write('\x1b[2K' + line + '\n');
    }

    // Clear leftover lines from a taller previous frame
    if (frameLines.length < lastFrameHeight) {
      const extra = lastFrameHeight - frameLines.length;
      for (let i = 0; i < extra; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      if (extra > 0) {
        process.stdout.write(`\x1b[${extra}A`);
      }
    }

    lastFrameHeight = frameLines.length;
  }

  return {
    start(): void {
      process.stdout.write('\x1b[?25l'); // hide cursor
      draw();
      timer = setInterval(draw, 500);
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      process.stdout.write('\x1b[?25h'); // show cursor
    },

    updateNode(id: string, updates: Partial<AtomiumNode>): void {
      nodes = nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    },

    selectNode(id: string | null): void {
      selectedId = id;
    },

    getSelected(): string | null {
      return selectedId;
    },
  };
}
