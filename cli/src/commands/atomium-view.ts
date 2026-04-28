import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { colors, theme } from '../ui/theme.js';
import { parseFleetFile, findFleetFile } from '../fleet/loader.js';
import type { FleetConfig, FleetAgent } from '../fleet/types.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentInfo {
  name: string;
  provider: string;
  model: string;
  role: string;
  lastUsed: string;
  createdAt: string;
  status: 'active' | 'idle' | 'stopped';
  sessions: number;
  messages: number;
  tools: string[];
  agentPath: string;
  recentActivity: ActivityEntry[];
}

interface ActivityEntry {
  relativeTime: string;
  action: string;
}

interface AtomiumState {
  mode: 'overview' | 'zoom';
  agents: AgentInfo[];
  selectedIndex: number;
  fleetName: string;
  startTime: number;
}

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const ESC = '\x1b';

const ansi = {
  clearScreen: `${ESC}[2J`,
  cursorHome: `${ESC}[H`,
  hideCursor: `${ESC}[?25l`,
  showCursor: `${ESC}[?25h`,
  enterAltScreen: `${ESC}[?1049h`,
  exitAltScreen: `${ESC}[?1049l`,
  moveTo: (row: number, col: number) => `${ESC}[${row};${col}H`,
  clearLine: `${ESC}[2K`,
};

// ── Box-drawing characters (double-line style) ──────────────────────────────

const BOX = {
  tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D',
  h: '\u2550', v: '\u2551',
  lt: '\u2560', rt: '\u2563',
};

// ── Strip ANSI for width calculations ────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

// ── Terminal dimensions ──────────────────────────────────────────────────────

function termCols(): number {
  return process.stdout.columns || 80;
}

function termRows(): number {
  return process.stdout.rows || 24;
}

// ── Padded string helper ─────────────────────────────────────────────────────

function padTo(str: string, width: number): string {
  const vis = visibleLength(str);
  if (vis > width) {
    const plain = stripAnsi(str);
    return plain.slice(0, width - 1) + '\u2026';
  }
  return str + ' '.repeat(Math.max(0, width - vis));
}

function centerPad(str: string, width: number): string {
  const vis = visibleLength(str);
  if (vis >= width) return str;
  const leftPad = Math.floor((width - vis) / 2);
  const rightPad = width - vis - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

// ── Data loading ─────────────────────────────────────────────────────────────

function loadAgentInfo(name: string, role: string, agentPath: string): AgentInfo {
  const homeDir = os.homedir();
  const agentsDir = path.join(homeDir, '.qayani', 'agents');
  const agentDir = path.join(agentsDir, name);

  let provider = 'unknown';
  let model = 'unknown';
  let lastUsed = '-';
  let createdAt = '-';

  // Try to load meta.json from ~/.qayani/agents/<name>/
  const metaPath = path.join(agentDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(raw);
      provider = meta.provider || provider;
      model = meta.model || model;
      lastUsed = meta.lastUsed || lastUsed;
      createdAt = meta.createdAt || createdAt;
    } catch {
      // malformed meta.json
    }
  }

  // Try to load from AGENT.md frontmatter at the agentPath
  if (provider === 'unknown' && agentPath) {
    const agentMdPath = path.join(agentPath, 'AGENT.md');
    if (fs.existsSync(agentMdPath)) {
      try {
        const raw = fs.readFileSync(agentMdPath, 'utf-8');
        const providerMatch = raw.match(/provider:\s*"?(\w+)"?/);
        const modelMatch = raw.match(/name:\s*"?([^"\n]+)"?/);
        if (providerMatch) provider = providerMatch[1];
        if (modelMatch) model = modelMatch[1].trim();
      } catch {
        // skip
      }
    }
  }

  // Count sessions and messages
  const memoryDir = path.join(agentDir, 'memory');
  let sessions = 0;
  let messages = 0;
  if (fs.existsSync(memoryDir)) {
    try {
      const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.json'));
      sessions = files.length;
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            messages += data.length;
          } else if (data.messages && Array.isArray(data.messages)) {
            messages += data.messages.length;
          }
        } catch {
          // skip malformed
        }
      }
    } catch {
      // skip
    }
  }

  // Determine status
  let status: AgentInfo['status'] = 'stopped';
  if (lastUsed !== '-') {
    try {
      const date = new Date(lastUsed);
      const diffHr = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      if (diffHr < 1) status = 'active';
      else if (diffHr < 24) status = 'idle';
    } catch {
      // keep stopped
    }
  }

  // Load tools from AGENT.md
  const tools: string[] = [];
  const agentMdPath2 = path.join(agentPath || agentDir, 'AGENT.md');
  if (fs.existsSync(agentMdPath2)) {
    try {
      const raw = fs.readFileSync(agentMdPath2, 'utf-8');
      const toolMatch = raw.match(/tools:\s*\n((?:\s+-\s+.+\n?)*)/);
      if (toolMatch) {
        const toolLines = toolMatch[1].split('\n');
        for (const line of toolLines) {
          const m = line.match(/^\s+-\s+(.+)/);
          if (m) tools.push(m[1].trim());
        }
      }
    } catch {
      // skip
    }
  }

  // Build recent activity
  const recentActivity: ActivityEntry[] = [];
  if (fs.existsSync(memoryDir)) {
    try {
      const files = fs.readdirSync(memoryDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(memoryDir, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .slice(0, 5);

      for (const file of files) {
        recentActivity.push({
          relativeTime: formatRelativeTime(file.mtime),
          action: 'Session saved',
        });
      }
    } catch {
      // skip
    }
  }
  if (lastUsed !== '-') {
    try {
      const date = new Date(lastUsed);
      recentActivity.unshift({
        relativeTime: formatRelativeTime(date),
        action: 'Last active',
      });
    } catch {
      // skip
    }
  }

  return {
    name,
    provider,
    model,
    role,
    lastUsed,
    createdAt,
    status,
    sessions,
    messages,
    tools,
    agentPath: agentPath || agentDir,
    recentActivity: recentActivity.slice(0, 5),
  };
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return date.toLocaleDateString();
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  if (diffSec > 10) return `${diffSec}s ago`;
  return 'just now';
}

async function loadFleetAgents(fleetName?: string): Promise<{ agents: AgentInfo[]; fleetName: string }> {
  // Try fleet file first
  if (fleetName) {
    const candidate = path.resolve(process.cwd(), fleetName, 'FLEET.md');
    const fleetPath = fs.existsSync(candidate) ? candidate : findFleetFile(path.resolve(process.cwd(), fleetName));
    if (fleetPath) {
      try {
        const config = await parseFleetFile(fleetPath);
        const fleetDir = path.dirname(fleetPath);
        const agents = config.agents.map((a) => {
          const resolvedPath = path.isAbsolute(a.agentPath) ? a.agentPath : path.resolve(fleetDir, a.agentPath);
          return loadAgentInfo(a.name, a.role, resolvedPath);
        });
        return { agents, fleetName: config.name };
      } catch {
        // fall through
      }
    }
  }

  // Try finding FLEET.md in cwd
  const fleetPath = findFleetFile();
  if (fleetPath) {
    try {
      const config = await parseFleetFile(fleetPath);
      const fleetDir = path.dirname(fleetPath);
      const agents = config.agents.map((a) => {
        const resolvedPath = path.isAbsolute(a.agentPath) ? a.agentPath : path.resolve(fleetDir, a.agentPath);
        return loadAgentInfo(a.name, a.role, resolvedPath);
      });
      return { agents, fleetName: config.name };
    } catch {
      // fall through
    }
  }

  // Fallback: scan ~/.qayani/agents/
  const homeDir = os.homedir();
  const agentsDir = path.join(homeDir, '.qayani', 'agents');
  const agents: AgentInfo[] = [];

  if (fs.existsSync(agentsDir)) {
    try {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        agents.push(loadAgentInfo(entry.name, 'Agent', path.join(agentsDir, entry.name)));
      }
    } catch {
      // skip
    }
  }

  return { agents, fleetName: fleetName || 'All Agents' };
}

// ── Status helpers ───────────────────────────────────────────────────────────

function statusIcon(status: AgentInfo['status']): string {
  switch (status) {
    case 'active': return colors.success('\u25CF');  // ●
    case 'idle':   return colors.warning('\u25CF');  // ●
    case 'stopped': return colors.muted('\u25CB');   // ○
  }
}

function statusLabel(status: AgentInfo['status']): string {
  switch (status) {
    case 'active': return colors.success('Active');
    case 'idle':   return colors.warning('Idle');
    case 'stopped': return colors.muted('Stopped');
  }
}

// ── Atomium drawing ──────────────────────────────────────────────────────────

interface SphereLayout {
  row: number;
  col: number;
}

/**
 * Build the Atomium visualization as an array of text lines.
 * Returns the lines and the layout positions of each sphere (for navigation).
 */
function buildAtomium(agents: AgentInfo[], selectedIndex: number, maxWidth: number): { lines: string[]; layout: SphereLayout[] } {
  const count = agents.length;
  if (count === 0) {
    return {
      lines: [colors.muted('  No agents found.')],
      layout: [],
    };
  }

  const bc = colors.muted;
  const goldBorder = colors.gold;

  // Build a sphere box for an agent
  function sphere(agent: AgentInfo, isSelected: boolean): string[] {
    const borderFn = isSelected ? goldBorder : bc;
    const icon = isSelected ? colors.gold('\u25C9') : statusIcon(agent.status);  // ◉ or status
    const nameStr = isSelected ? chalk.bold.white(agent.name) : colors.white(agent.name);
    const label = `${icon} ${nameStr}`;
    const innerWidth = Math.max(visibleLength(label) + 2, 12);
    const top = borderFn('\u256D' + '\u2500'.repeat(innerWidth) + '\u256E');
    const padded = padTo(` ${label} `, innerWidth);
    const mid = borderFn('\u2502') + padded + borderFn('\u2502');
    const bot = borderFn('\u2570' + '\u2500'.repeat(innerWidth) + '\u256F');
    return [top, mid, bot];
  }

  // Connection characters
  const conn = colors.muted('\u2501');  // ━
  const connStr = conn.repeat(3);

  const lines: string[] = [];
  const layout: SphereLayout[] = [];

  if (count <= 3) {
    // Horizontal line layout
    //   ╭──A──╮━━━╭──B──╮━━━╭──C──╮
    const spheres = agents.map((a, i) => sphere(a, i === selectedIndex));
    const rows = ['' , '', ''];

    for (let i = 0; i < count; i++) {
      const s = spheres[i];
      if (i > 0) {
        rows[0] += '   ';
        rows[1] += connStr;
        rows[2] += '   ';
      }
      // Track layout position: row 1 (middle row of sphere), col is current position
      layout.push({ row: 1, col: Math.floor(visibleLength(stripAnsi(rows[1])) + visibleLength(stripAnsi(s[1])) / 2) });
      rows[0] += s[0];
      rows[1] += s[1];
      rows[2] += s[2];
    }

    // Center all rows
    for (const row of rows) {
      const vis = visibleLength(row);
      const leftPad = Math.max(0, Math.floor((maxWidth - vis) / 2));
      lines.push(' '.repeat(leftPad) + row);
    }

  } else if (count <= 6) {
    // Diamond/triangle layout
    //        ╭──A──╮
    //       ╱       ╲
    // ╭──B──╮━━━━━╭──C──╮
    //       ╲      ╱
    //        ╭──D──╮
    //
    // For 4 agents: top(0), left(1), right(2), bottom(3)
    // For 5: top(0), left(1), right(2), bottom-left(3), bottom-right(4)
    // For 6: top-left(0), top-right(1), left(2), right(3), bottom-left(4), bottom-right(5)

    if (count === 4) {
      const top = sphere(agents[0], 0 === selectedIndex);
      const left = sphere(agents[1], 1 === selectedIndex);
      const right = sphere(agents[2], 2 === selectedIndex);
      const bottom = sphere(agents[3], 3 === selectedIndex);

      const topWidth = visibleLength(stripAnsi(top[1]));
      const leftWidth = visibleLength(stripAnsi(left[1]));
      const rightWidth = visibleLength(stripAnsi(right[1]));
      const gap = 5;
      const midWidth = leftWidth + gap + rightWidth;

      // Top sphere centered above middle
      const topPad = Math.max(0, Math.floor((midWidth - topWidth) / 2));
      const centerX = Math.max(0, Math.floor(maxWidth / 2));

      // Center offset for the whole structure
      const structOffset = Math.max(0, Math.floor((maxWidth - midWidth) / 2));

      for (const row of top) {
        lines.push(' '.repeat(structOffset + topPad) + row);
      }
      layout.push({ row: 1, col: centerX });

      // Connectors
      const connLeft = colors.muted('\u2571');   // ╱
      const connRight = colors.muted('\u2572');  // ╲
      lines.push(' '.repeat(structOffset + topPad + 2) + connLeft + ' '.repeat(Math.max(0, topWidth - 4)) + connRight);

      // Middle row: left and right spheres
      for (let r = 0; r < 3; r++) {
        const mid = left[r] + (r === 1 ? connStr : ' '.repeat(3)) + ' '.repeat(Math.max(0, gap - 3)) + right[r];
        lines.push(' '.repeat(structOffset) + mid);
      }
      layout.push({ row: lines.length - 2, col: structOffset + Math.floor(leftWidth / 2) });
      layout.push({ row: lines.length - 2, col: structOffset + leftWidth + gap + Math.floor(rightWidth / 2) });

      // Connectors
      lines.push(' '.repeat(structOffset + topPad + 2) + connRight + ' '.repeat(Math.max(0, topWidth - 4)) + connLeft);

      // Bottom sphere
      const bottomWidth = visibleLength(stripAnsi(bottom[1]));
      const bottomPad = Math.max(0, Math.floor((midWidth - bottomWidth) / 2));
      for (const row of bottom) {
        lines.push(' '.repeat(structOffset + bottomPad) + row);
      }
      layout.push({ row: lines.length - 2, col: centerX });

    } else {
      // 5-6 agents: two rows with connections
      const topCount = Math.ceil(count / 2);
      const bottomCount = count - topCount;
      const topAgents = agents.slice(0, topCount);
      const bottomAgents = agents.slice(topCount);

      // Build top row
      const topSpheres = topAgents.map((a, i) => sphere(a, i === selectedIndex));
      const topRows = ['', '', ''];
      for (let i = 0; i < topSpheres.length; i++) {
        if (i > 0) {
          topRows[0] += '   ';
          topRows[1] += connStr;
          topRows[2] += '   ';
        }
        topRows[0] += topSpheres[i][0];
        topRows[1] += topSpheres[i][1];
        topRows[2] += topSpheres[i][2];
      }

      const topTotalWidth = visibleLength(stripAnsi(topRows[1]));
      const topOffset = Math.max(0, Math.floor((maxWidth - topTotalWidth) / 2));

      for (const row of topRows) {
        lines.push(' '.repeat(topOffset) + row);
      }

      // Track layout for top agents
      let xPos = topOffset;
      for (let i = 0; i < topSpheres.length; i++) {
        const w = visibleLength(stripAnsi(topSpheres[i][1]));
        layout.push({ row: lines.length - 2, col: xPos + Math.floor(w / 2) });
        xPos += w + (i < topSpheres.length - 1 ? 3 : 0);
      }

      // Connection line between rows
      const connLine = ' '.repeat(topOffset + 4) + colors.muted('\u2572') + ' '.repeat(Math.max(0, topTotalWidth - 10)) + colors.muted('\u2571');
      lines.push(connLine);

      // Build bottom row
      const bottomSpheres = bottomAgents.map((a, i) => sphere(a, i + topCount === selectedIndex));
      const bottomRows = ['', '', ''];
      for (let i = 0; i < bottomSpheres.length; i++) {
        if (i > 0) {
          bottomRows[0] += '   ';
          bottomRows[1] += connStr;
          bottomRows[2] += '   ';
        }
        bottomRows[0] += bottomSpheres[i][0];
        bottomRows[1] += bottomSpheres[i][1];
        bottomRows[2] += bottomSpheres[i][2];
      }

      const bottomTotalWidth = visibleLength(stripAnsi(bottomRows[1]));
      const bottomOffset = Math.max(0, Math.floor((maxWidth - bottomTotalWidth) / 2));

      for (const row of bottomRows) {
        lines.push(' '.repeat(bottomOffset) + row);
      }

      // Track layout for bottom agents
      let bxPos = bottomOffset;
      for (let i = 0; i < bottomSpheres.length; i++) {
        const w = visibleLength(stripAnsi(bottomSpheres[i][1]));
        layout.push({ row: lines.length - 2, col: bxPos + Math.floor(w / 2) });
        bxPos += w + (i < bottomSpheres.length - 1 ? 3 : 0);
      }
    }

  } else {
    // 7-9 agents: full Atomium (two layers + center connections)
    //    ╭──A──╮   ╭──B──╮   ╭──C──╮
    //     ╲   ╱     ╲   ╱     ╲   ╱
    //      ╭───── CENTER ─────╮
    //     ╱   ╲     ╱   ╲     ╱   ╲
    //    ╭──D──╮   ╭──E──╮   ╭──F──╮
    //
    // Top row: first third, center area for middle agents, bottom row: last third

    const topCount = Math.ceil(count / 3);
    const midCount = Math.min(Math.ceil((count - topCount) / 2), count - topCount);
    const bottomCount = count - topCount - midCount;

    const topAgents = agents.slice(0, topCount);
    const midAgents = agents.slice(topCount, topCount + midCount);
    const bottomAgents = agents.slice(topCount + midCount);

    // Helper to render a row of spheres
    function renderRow(rowAgents: AgentInfo[], indexOffset: number): { rows: string[]; widths: number[] } {
      const sph = rowAgents.map((a, i) => sphere(a, i + indexOffset === selectedIndex));
      const r = ['', '', ''];
      const widths: number[] = [];
      for (let i = 0; i < sph.length; i++) {
        if (i > 0) {
          r[0] += '   ';
          r[1] += connStr;
          r[2] += '   ';
        }
        widths.push(visibleLength(stripAnsi(sph[i][1])));
        r[0] += sph[i][0];
        r[1] += sph[i][1];
        r[2] += sph[i][2];
      }
      return { rows: r, widths };
    }

    // Top row
    const topResult = renderRow(topAgents, 0);
    const topTotalWidth = visibleLength(stripAnsi(topResult.rows[1]));
    const topOffset = Math.max(0, Math.floor((maxWidth - topTotalWidth) / 2));
    for (const row of topResult.rows) {
      lines.push(' '.repeat(topOffset) + row);
    }
    let xp = topOffset;
    for (let i = 0; i < topResult.widths.length; i++) {
      layout.push({ row: lines.length - 2, col: xp + Math.floor(topResult.widths[i] / 2) });
      xp += topResult.widths[i] + (i < topResult.widths.length - 1 ? 3 : 0);
    }

    // Connection line top to mid
    lines.push(' '.repeat(topOffset + 3) + colors.muted('\u2572') + ' '.repeat(Math.max(0, topTotalWidth - 8)) + colors.muted('\u2571'));

    // Middle row
    if (midAgents.length > 0) {
      const midResult = renderRow(midAgents, topCount);
      const midTotalWidth = visibleLength(stripAnsi(midResult.rows[1]));
      const midOffset = Math.max(0, Math.floor((maxWidth - midTotalWidth) / 2));
      for (const row of midResult.rows) {
        lines.push(' '.repeat(midOffset) + row);
      }
      let mp = midOffset;
      for (let i = 0; i < midResult.widths.length; i++) {
        layout.push({ row: lines.length - 2, col: mp + Math.floor(midResult.widths[i] / 2) });
        mp += midResult.widths[i] + (i < midResult.widths.length - 1 ? 3 : 0);
      }

      // Connection line mid to bottom
      lines.push(' '.repeat(midOffset + 3) + colors.muted('\u2571') + ' '.repeat(Math.max(0, midTotalWidth - 8)) + colors.muted('\u2572'));
    }

    // Bottom row
    if (bottomAgents.length > 0) {
      const bottomResult = renderRow(bottomAgents, topCount + midCount);
      const bottomTotalWidth = visibleLength(stripAnsi(bottomResult.rows[1]));
      const bottomOffset = Math.max(0, Math.floor((maxWidth - bottomTotalWidth) / 2));
      for (const row of bottomResult.rows) {
        lines.push(' '.repeat(bottomOffset) + row);
      }
      let bp = bottomOffset;
      for (let i = 0; i < bottomResult.widths.length; i++) {
        layout.push({ row: lines.length - 2, col: bp + Math.floor(bottomResult.widths[i] / 2) });
        bp += bottomResult.widths[i] + (i < bottomResult.widths.length - 1 ? 3 : 0);
      }
    }
  }

  return { lines, layout };
}

// ── Overview mode rendering ──────────────────────────────────────────────────

function renderOverview(state: AtomiumState): void {
  const cols = termCols();
  const rows = termRows();
  const bc = colors.muted;
  const innerWidth = cols - 2; // inside the double-line border

  const buf: string[] = [];
  buf.push(ansi.cursorHome);

  // ── Top border ──
  buf.push(bc(BOX.tl + BOX.h.repeat(innerWidth) + BOX.tr));

  // ── Header row ──
  const titleLeft = '  ' + colors.gold('QAYANI Atomium') + colors.muted(' \u00B7 ') + colors.white(state.fleetName);
  const titleRight = colors.gold('\u25C9') + colors.white(` ${state.agents.length} agents`) + '  ';
  const titleLeftPlain = '  QAYANI Atomium \u00B7 ' + state.fleetName;
  const titleRightPlain = '\u25C9 ' + state.agents.length + ' agents  ';
  const headerFill = Math.max(0, innerWidth - titleLeftPlain.length - titleRightPlain.length);
  buf.push(bc(BOX.v) + titleLeft + ' '.repeat(headerFill) + titleRight + bc(BOX.v));

  // ── Header divider ──
  buf.push(bc(BOX.lt + BOX.h.repeat(innerWidth) + BOX.rt));

  // ── Atomium visualization area ──
  const atomiumMaxHeight = Math.max(8, rows - 12); // leave room for info panel + help
  const { lines: atomLines } = buildAtomium(state.agents, state.selectedIndex, innerWidth);

  // Vertical centering: pad top and bottom to fill available space
  const atomiumContentHeight = atomLines.length;
  const verticalPad = Math.max(0, Math.floor((atomiumMaxHeight - atomiumContentHeight) / 2));

  // Top padding
  for (let i = 0; i < verticalPad && i < atomiumMaxHeight; i++) {
    buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));
  }

  // Atomium content
  let renderedLines = 0;
  for (const line of atomLines) {
    if (renderedLines + verticalPad >= atomiumMaxHeight) break;
    buf.push(bc(BOX.v) + padTo(line, innerWidth) + bc(BOX.v));
    renderedLines++;
  }

  // Bottom padding
  const usedRows = verticalPad + renderedLines;
  for (let i = usedRows; i < atomiumMaxHeight; i++) {
    buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));
  }

  // ── Help bar ──
  const helpItems = [
    `${colors.muted('[\u2191\u2193\u2190\u2192]')} Navigate`,
    `${colors.muted('[Enter]')} Zoom in`,
    `${colors.muted('[Tab]')} Cycle`,
    `${colors.muted('[a]')} Add`,
    `${colors.muted('[r]')} Refresh`,
    `${colors.muted('[q]')} Quit`,
  ];
  const helpStr = '  ' + helpItems.join('  ');
  buf.push(bc(BOX.v) + padTo(helpStr, innerWidth) + bc(BOX.v));

  // ── Info divider ──
  buf.push(bc(BOX.lt + BOX.h.repeat(innerWidth) + BOX.rt));

  // ── Selected agent info panel (2 lines) ──
  if (state.agents.length > 0 && state.selectedIndex < state.agents.length) {
    const agent = state.agents[state.selectedIndex];
    const providerModel = colors.muted(`(${agent.provider}/${agent.model})`);
    const line1 = `  ${colors.accent('\u25B8')} ${chalk.bold.white(agent.name)} ${providerModel} ${statusIcon(agent.status)} ${statusLabel(agent.status)}`;
    buf.push(bc(BOX.v) + padTo(line1, innerWidth) + bc(BOX.v));

    const memoryStr = agent.sessions > 0
      ? `${agent.sessions} sessions` + (agent.messages > 0 ? ` \u00B7 ${agent.messages} messages` : '')
      : 'No sessions';
    const line2 = `    Role: ${colors.white(agent.role)}` +
      colors.muted(' \u00B7 ') +
      `Memory: ${colors.white(memoryStr)}`;
    buf.push(bc(BOX.v) + padTo(line2, innerWidth) + bc(BOX.v));
  } else {
    buf.push(bc(BOX.v) + padTo(colors.muted('  No agent selected.'), innerWidth) + bc(BOX.v));
    buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));
  }

  // ── Bottom border ──
  buf.push(bc(BOX.bl + BOX.h.repeat(innerWidth) + BOX.br));

  // Fill any remaining terminal rows with empty lines to prevent artifacts
  const totalBufLines = buf.length;
  for (let i = totalBufLines; i < rows; i++) {
    buf.push(ansi.clearLine);
  }

  process.stdout.write(buf.join('\n'));
}

// ── Zoom mode rendering ──────────────────────────────────────────────────────

function renderZoom(state: AtomiumState): void {
  const cols = termCols();
  const rows = termRows();
  const bc = colors.muted;
  const innerWidth = cols - 2;

  if (state.selectedIndex >= state.agents.length) return;
  const agent = state.agents[state.selectedIndex];

  const buf: string[] = [];
  buf.push(ansi.cursorHome);

  // ── Top border ──
  buf.push(bc(BOX.tl + BOX.h.repeat(innerWidth) + BOX.tr));

  // ── Header ──
  const headerLeft = `  ${colors.gold('\u25C9')} ${chalk.bold.white(agent.name)} ${colors.muted('\u00B7')} ${colors.white(agent.provider + '/' + agent.model)}`;
  const headerRight = `${colors.muted('[Esc] Back')}  `;
  const headerLeftPlain = `  \u25C9 ${agent.name} \u00B7 ${agent.provider}/${agent.model}`;
  const headerRightPlain = '[Esc] Back  ';
  const hdrFill = Math.max(0, innerWidth - headerLeftPlain.length - headerRightPlain.length);
  buf.push(bc(BOX.v) + headerLeft + ' '.repeat(hdrFill) + headerRight + bc(BOX.v));

  // ── Header divider ──
  buf.push(bc(BOX.lt + BOX.h.repeat(innerWidth) + BOX.rt));

  // ── Blank line ──
  buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));

  // ── Agent details ──
  const detailPairs: Array<[string, string]> = [
    ['  Status   ', statusIcon(agent.status) + ' ' + statusLabel(agent.status)],
    ['  Role     ', colors.white(agent.role)],
    ['  Provider ', colors.white(agent.provider)],
    ['  Model    ', colors.white(agent.model)],
  ];

  const memStr = agent.sessions > 0
    ? `${agent.sessions} sessions` + (agent.messages > 0 ? ` \u00B7 ${agent.messages} messages` : '')
    : 'No sessions';
  detailPairs.push(['  Memory   ', colors.white(memStr)]);

  if (agent.tools.length > 0) {
    detailPairs.push(['  Tools    ', colors.white(agent.tools.join(', '))]);
  }

  if (agent.createdAt && agent.createdAt !== '-') {
    try {
      detailPairs.push(['  Created  ', colors.white(formatRelativeTime(new Date(agent.createdAt)))]);
    } catch {
      // skip
    }
  }

  if (agent.agentPath) {
    detailPairs.push(['  Path     ', colors.muted(agent.agentPath)]);
  }

  for (const [label, value] of detailPairs) {
    const line = colors.muted(label) + value;
    buf.push(bc(BOX.v) + padTo(line, innerWidth) + bc(BOX.v));
  }

  // ── Blank line ──
  buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));

  // ── Quick Actions ──
  const actionHeader = '  ' + colors.muted('\u2500\u2500\u2500 Quick Actions ') + colors.muted('\u2500'.repeat(Math.max(0, innerWidth - 22)));
  buf.push(bc(BOX.v) + padTo(actionHeader, innerWidth) + bc(BOX.v));

  const actions = [
    `${colors.muted('[c]')} Chat`,
    `${colors.muted('[e]')} Edit AGENT.md`,
    `${colors.muted('[d]')} Duplicate`,
    `${colors.muted('[x]')} Export`,
  ];
  const actionsLine = '  ' + actions.join('   ');
  buf.push(bc(BOX.v) + padTo(actionsLine, innerWidth) + bc(BOX.v));

  // ── Blank line ──
  buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));

  // ── Recent Activity ──
  const activityHeader = '  ' + colors.muted('\u2500\u2500\u2500 Recent Activity ') + colors.muted('\u2500'.repeat(Math.max(0, innerWidth - 24)));
  buf.push(bc(BOX.v) + padTo(activityHeader, innerWidth) + bc(BOX.v));

  if (agent.recentActivity.length > 0) {
    for (const entry of agent.recentActivity.slice(0, 8)) {
      const line = `  ${colors.muted(entry.relativeTime.padEnd(10))} ${colors.white(entry.action)}`;
      buf.push(bc(BOX.v) + padTo(line, innerWidth) + bc(BOX.v));
    }
  } else {
    buf.push(bc(BOX.v) + padTo(colors.muted('  No recent activity.'), innerWidth) + bc(BOX.v));
  }

  // ── Fill remaining space ──
  const currentLines = buf.length;
  const targetLines = rows - 2; // leave room for bottom border + 1 extra
  for (let i = currentLines; i < targetLines; i++) {
    buf.push(bc(BOX.v) + ' '.repeat(innerWidth) + bc(BOX.v));
  }

  // ── Bottom border ──
  buf.push(bc(BOX.bl + BOX.h.repeat(innerWidth) + BOX.br));

  // Clear remaining rows
  const totalLines = buf.length;
  for (let i = totalLines; i < rows; i++) {
    buf.push(ansi.clearLine);
  }

  process.stdout.write(buf.join('\n'));
}

// ── Main render dispatcher ───────────────────────────────────────────────────

function render(state: AtomiumState): void {
  if (state.mode === 'overview') {
    renderOverview(state);
  } else {
    renderZoom(state);
  }
}

// ── Keyboard navigation helpers ──────────────────────────────────────────────

/**
 * For the Atomium layout, map arrow keys to spatial navigation.
 * This is approximate: left/right cycle, up/down move between rows.
 */
function navigateOverview(state: AtomiumState, direction: 'up' | 'down' | 'left' | 'right'): void {
  const count = state.agents.length;
  if (count === 0) return;

  if (count <= 3) {
    // Horizontal: left/right navigate, up/down do nothing meaningful
    if (direction === 'left') {
      state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    } else if (direction === 'right') {
      state.selectedIndex = Math.min(count - 1, state.selectedIndex + 1);
    }
  } else if (count === 4) {
    // Diamond: 0=top, 1=left, 2=right, 3=bottom
    const nav: Record<number, Record<string, number>> = {
      0: { down: 1, left: 1, right: 2 },
      1: { up: 0, right: 2, down: 3 },
      2: { up: 0, left: 1, down: 3 },
      3: { up: 1, left: 1, right: 2 },
    };
    const target = nav[state.selectedIndex]?.[direction];
    if (target !== undefined) {
      state.selectedIndex = target;
    }
  } else if (count <= 6) {
    // Two rows
    const topCount = Math.ceil(count / 2);
    const isTop = state.selectedIndex < topCount;

    if (direction === 'left') {
      if (state.selectedIndex > 0 && (isTop || state.selectedIndex > topCount)) {
        state.selectedIndex--;
      }
    } else if (direction === 'right') {
      if (isTop && state.selectedIndex < topCount - 1) {
        state.selectedIndex++;
      } else if (!isTop && state.selectedIndex < count - 1) {
        state.selectedIndex++;
      }
    } else if (direction === 'down' && isTop) {
      const relIdx = state.selectedIndex;
      state.selectedIndex = Math.min(topCount + relIdx, count - 1);
    } else if (direction === 'up' && !isTop) {
      const relIdx = state.selectedIndex - topCount;
      state.selectedIndex = Math.min(relIdx, topCount - 1);
    }
  } else {
    // Three rows
    const topCount = Math.ceil(count / 3);
    const midCount = Math.min(Math.ceil((count - topCount) / 2), count - topCount);
    const bottomStart = topCount + midCount;

    let rowStart: number, rowEnd: number;
    if (state.selectedIndex < topCount) {
      rowStart = 0;
      rowEnd = topCount;
    } else if (state.selectedIndex < bottomStart) {
      rowStart = topCount;
      rowEnd = bottomStart;
    } else {
      rowStart = bottomStart;
      rowEnd = count;
    }

    const relIdx = state.selectedIndex - rowStart;

    if (direction === 'left') {
      if (state.selectedIndex > rowStart) state.selectedIndex--;
    } else if (direction === 'right') {
      if (state.selectedIndex < rowEnd - 1) state.selectedIndex++;
    } else if (direction === 'down') {
      if (rowStart === 0 && topCount + relIdx < bottomStart) {
        state.selectedIndex = topCount + Math.min(relIdx, midCount - 1);
      } else if (rowStart === topCount && bottomStart + relIdx < count) {
        state.selectedIndex = bottomStart + Math.min(relIdx, count - bottomStart - 1);
      }
    } else if (direction === 'up') {
      if (rowStart === bottomStart) {
        state.selectedIndex = topCount + Math.min(relIdx, midCount - 1);
      } else if (rowStart === topCount) {
        state.selectedIndex = Math.min(relIdx, topCount - 1);
      }
    }
  }

  // Clamp
  state.selectedIndex = Math.max(0, Math.min(count - 1, state.selectedIndex));
}

// ── Duplicate agent ──────────────────────────────────────────────────────────

function duplicateAgent(agent: AgentInfo): void {
  const homeDir = os.homedir();
  const srcDir = path.join(homeDir, '.qayani', 'agents', agent.name);
  const newName = agent.name + '-copy';
  const dstDir = path.join(homeDir, '.qayani', 'agents', newName);

  if (fs.existsSync(dstDir)) {
    // Already exists, skip
    return;
  }

  try {
    fs.mkdirSync(dstDir, { recursive: true });

    // Copy meta.json with updated name
    const metaPath = path.join(srcDir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(raw);
      meta.name = newName;
      meta.createdAt = new Date().toISOString();
      meta.lastUsed = new Date().toISOString();
      fs.writeFileSync(path.join(dstDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
    }

    // Copy AGENT.md if exists
    const agentMdSrc = path.join(srcDir, 'AGENT.md');
    if (fs.existsSync(agentMdSrc)) {
      const content = fs.readFileSync(agentMdSrc, 'utf-8');
      fs.writeFileSync(path.join(dstDir, 'AGENT.md'), content.replace(new RegExp(agent.name, 'g'), newName), 'utf-8');
    }

    // Create empty memory directory
    fs.mkdirSync(path.join(dstDir, 'memory'), { recursive: true });
  } catch {
    // silently fail in interactive mode
  }
}

// ── Export agent ─────────────────────────────────────────────────────────────

function exportAgent(agent: AgentInfo): string {
  const homeDir = os.homedir();
  const agentDir = path.join(homeDir, '.qayani', 'agents', agent.name);
  const exportPath = path.join(process.cwd(), `${agent.name}-export.json`);

  const exportData: Record<string, unknown> = {
    name: agent.name,
    provider: agent.provider,
    model: agent.model,
    role: agent.role,
    status: agent.status,
    sessions: agent.sessions,
    messages: agent.messages,
    tools: agent.tools,
    exportedAt: new Date().toISOString(),
  };

  // Include meta.json content
  const metaPath = path.join(agentDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      exportData.meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      // skip
    }
  }

  try {
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');
  } catch {
    // skip
  }

  return exportPath;
}

// ── Main interactive loop ────────────────────────────────────────────────────

async function runAtomiumView(fleetName?: string): Promise<void> {
  const { agents, fleetName: resolvedName } = await loadFleetAgents(fleetName);

  const state: AtomiumState = {
    mode: 'overview',
    agents,
    selectedIndex: 0,
    fleetName: resolvedName,
    startTime: Date.now(),
  };

  // Enter alternate screen and hide cursor
  process.stdout.write(ansi.enterAltScreen + ansi.hideCursor);

  // Cleanup function
  function cleanup(): void {
    process.stdout.write(ansi.showCursor + ansi.exitAltScreen);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners('data');
    process.stdin.pause();
  }

  function exitGracefully(): void {
    cleanup();
    process.exit(0);
  }

  process.on('SIGINT', exitGracefully);
  process.on('SIGTERM', exitGracefully);

  // Handle terminal resize
  process.stdout.on('resize', () => {
    process.stdout.write(ansi.clearScreen);
    render(state);
  });

  // Set up raw mode
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Keyboard handler
  process.stdin.on('data', async (key: string) => {
    // Ctrl+C
    if (key === '\u0003') {
      exitGracefully();
      return;
    }

    if (state.mode === 'overview') {
      // ── Overview mode keys ──

      // q to quit
      if (key === 'q' || key === 'Q') {
        exitGracefully();
        return;
      }

      // Arrow keys
      if (key === '\x1b[A') { navigateOverview(state, 'up'); render(state); return; }
      if (key === '\x1b[B') { navigateOverview(state, 'down'); render(state); return; }
      if (key === '\x1b[C') { navigateOverview(state, 'right'); render(state); return; }
      if (key === '\x1b[D') { navigateOverview(state, 'left'); render(state); return; }

      // Tab: cycle through spheres
      if (key === '\t') {
        if (state.agents.length > 0) {
          state.selectedIndex = (state.selectedIndex + 1) % state.agents.length;
        }
        render(state);
        return;
      }

      // Enter: zoom into selected sphere
      if (key === '\r' || key === '\n') {
        if (state.agents.length > 0) {
          state.mode = 'zoom';
          render(state);
        }
        return;
      }

      // 'a': add new agent placeholder
      if (key === 'a' || key === 'A') {
        // Exit alternate screen temporarily to show message
        cleanup();
        console.log('');
        console.log(theme.info('  To add a new agent, use:'));
        console.log('');
        console.log(colors.white('    qayani init <agent-name>'));
        console.log(colors.white('    qayani fleet add <agent-name>'));
        console.log('');
        process.exit(0);
        return;
      }

      // 'd': duplicate selected agent
      if (key === 'd' || key === 'D') {
        if (state.agents.length > 0) {
          const agent = state.agents[state.selectedIndex];
          duplicateAgent(agent);
          // Refresh
          const { agents: refreshed } = await loadFleetAgents(fleetName);
          state.agents = refreshed;
          state.selectedIndex = Math.min(state.selectedIndex, state.agents.length - 1);
          render(state);
        }
        return;
      }

      // 'r': refresh data
      if (key === 'r' || key === 'R') {
        const { agents: refreshed, fleetName: newName } = await loadFleetAgents(fleetName);
        state.agents = refreshed;
        state.fleetName = newName;
        state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.agents.length - 1));
        render(state);
        return;
      }

    } else {
      // ── Zoom mode keys ──

      // Escape: back to overview
      if (key === '\x1b' || key === '\x1b[') {
        state.mode = 'overview';
        render(state);
        return;
      }

      // 'q' to quit from zoom mode too
      if (key === 'q' || key === 'Q') {
        exitGracefully();
        return;
      }

      // 'c': launch chat
      if (key === 'c' || key === 'C') {
        if (state.agents.length > 0) {
          const agent = state.agents[state.selectedIndex];
          cleanup();
          console.log('');
          console.log(theme.info(`  To chat with ${agent.name}, run:`));
          console.log('');
          console.log(colors.white(`    qayani run ${agent.name}`));
          console.log('');
          process.exit(0);
        }
        return;
      }

      // 'e': edit AGENT.md
      if (key === 'e' || key === 'E') {
        if (state.agents.length > 0) {
          const agent = state.agents[state.selectedIndex];
          const editor = process.env.EDITOR || process.env.VISUAL;
          const agentMdPath = path.join(agent.agentPath, 'AGENT.md');

          if (editor && fs.existsSync(agentMdPath)) {
            cleanup();
            const { execSync } = await import('child_process');
            try {
              execSync(`${editor} "${agentMdPath}"`, { stdio: 'inherit' });
            } catch {
              console.log(colors.muted(`  AGENT.md path: ${agentMdPath}`));
            }
            process.exit(0);
          } else {
            // Show the path so user can open manually
            cleanup();
            console.log('');
            console.log(colors.muted('  AGENT.md location:'));
            console.log(colors.white(`  ${agentMdPath}`));
            console.log('');
            if (!editor) {
              console.log(colors.muted('  Set $EDITOR to open automatically.'));
              console.log('');
            }
            process.exit(0);
          }
        }
        return;
      }

      // 'd': duplicate
      if (key === 'd' || key === 'D') {
        if (state.agents.length > 0) {
          const agent = state.agents[state.selectedIndex];
          duplicateAgent(agent);
          const { agents: refreshed } = await loadFleetAgents(fleetName);
          state.agents = refreshed;
          state.selectedIndex = Math.min(state.selectedIndex, state.agents.length - 1);
          render(state);
        }
        return;
      }

      // 'x': export
      if (key === 'x' || key === 'X') {
        if (state.agents.length > 0) {
          const agent = state.agents[state.selectedIndex];
          const exportPath = exportAgent(agent);
          cleanup();
          console.log('');
          console.log(theme.success('  Agent exported successfully.'));
          console.log(colors.muted(`  File: ${exportPath}`));
          console.log('');
          process.exit(0);
        }
        return;
      }
    }
  });

  // Initial render
  render(state);
}

// ── Command registration ─────────────────────────────────────────────────────

export function registerAtomiumView(program: Command): void {
  program
    .command('atomium [fleet-name]')
    .description('Interactive Atomium visualization for agent fleets')
    .action(async (fleetName?: string) => {
      if (!process.stdout.isTTY) {
        console.error(
          theme.error('\n  Atomium view requires an interactive terminal (TTY).\n')
        );
        process.exit(1);
      }
      await runAtomiumView(fleetName);
    });
}

/**
 * Add the view subcommand to an existing atomium command group.
 */
export function addAtomiumViewSubcommand(atomiumCmd: Command): void {
  atomiumCmd
    .command('view [fleet-name]')
    .description('Interactive Atomium visualization for agent fleets')
    .action(async (fleetName?: string) => {
      if (!process.stdout.isTTY) {
        console.error(
          theme.error('\n  Atomium view requires an interactive terminal (TTY).\n')
        );
        process.exit(1);
      }
      await runAtomiumView(fleetName);
    });
}
