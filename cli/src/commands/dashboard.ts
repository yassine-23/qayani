import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { colors, theme } from '../ui/theme.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentMeta {
  name: string;
  provider: string;
  model: string;
  lastUsed: string;
  createdAt?: string;
  template?: string;
  path?: string;
}

interface ActivityEntry {
  time: string;
  agent: string;
  action: string;
  type: 'tool' | 'message' | 'error' | 'idle';
}

interface DashboardState {
  agents: AgentMeta[];
  sessions: Map<string, number>;
  activity: ActivityEntry[];
  startTime: number;
  selectedAgent: number;
  scrollOffset: number;
  activityOffset: number;
  activePanel: 'agents' | 'activity';
  detailView: boolean;
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
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  lt: '╠', rt: '╣',  // left-tee, right-tee
  tt: '╦', bt: '╩',  // top-tee, bottom-tee
  cross: '╬',
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

// ── Data loading ─────────────────────────────────────────────────────────────

function loadAgents(): AgentMeta[] {
  const homeDir = os.homedir();
  const agentsDir = path.join(homeDir, '.qayani', 'agents');
  const results: AgentMeta[] = [];

  if (!fs.existsSync(agentsDir)) {
    return results;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metaPath = path.join(agentsDir, entry.name, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const raw = fs.readFileSync(metaPath, 'utf-8');
        const meta = JSON.parse(raw) as AgentMeta;
        results.push(meta);
      } catch {
        // If meta.json is malformed, create a minimal entry from directory name
        results.push({
          name: entry.name,
          provider: 'unknown',
          model: 'unknown',
          lastUsed: '-',
        });
      }
    } else {
      // Directory exists but no meta.json -- still list it
      results.push({
        name: entry.name,
        provider: 'unknown',
        model: 'unknown',
        lastUsed: '-',
      });
    }
  }

  return results;
}

function countSessions(agentName: string): number {
  const homeDir = os.homedir();
  const memoryDir = path.join(homeDir, '.qayani', 'agents', agentName, 'memory');

  if (!fs.existsSync(memoryDir)) {
    return 0;
  }

  try {
    const entries = fs.readdirSync(memoryDir);
    return entries.filter((e) => e.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

function buildActivity(agents: AgentMeta[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const agent of agents) {
    if (agent.lastUsed && agent.lastUsed !== '-') {
      try {
        const date = new Date(agent.lastUsed);
        const time = formatTime(date);
        const diffMs = Date.now() - date.getTime();
        const diffHr = diffMs / (1000 * 60 * 60);

        if (diffHr < 1) {
          entries.push({ time, agent: agent.name, action: 'active session', type: 'message' });
        } else if (diffHr < 24) {
          entries.push({ time, agent: agent.name, action: 'last active', type: 'idle' });
        } else {
          entries.push({ time, agent: agent.name, action: 'idle', type: 'idle' });
        }
      } catch {
        // skip
      }
    }

    // Check memory directory for recent session files
    const homeDir = os.homedir();
    const memoryDir = path.join(homeDir, '.qayani', 'agents', agent.name, 'memory');
    if (fs.existsSync(memoryDir)) {
      try {
        const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.json'));
        for (const file of files.slice(-3)) {
          const filePath = path.join(memoryDir, file);
          try {
            const stat = fs.statSync(filePath);
            const time = formatTime(stat.mtime);
            entries.push({ time, agent: agent.name, action: 'session saved', type: 'message' });
          } catch {
            // skip
          }
        }
      } catch {
        // skip
      }
    }
  }

  // Sort by time descending (most recent first)
  entries.sort((a, b) => {
    // Since time is HH:MM, this is a simple string sort for same-day entries
    return b.time.localeCompare(a.time);
  });

  return entries.slice(0, 50); // Cap at 50 entries
}

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatUptime(startTime: number): string {
  const diffMs = Date.now() - startTime;
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatRelativeTime(isoDate: string): string {
  if (isoDate === '-') return '--';
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 30) return date.toLocaleDateString();
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'just now';
  } catch {
    return isoDate;
  }
}

function agentStatusIcon(lastUsed: string): string {
  if (lastUsed === '-') return colors.muted('\u25CB'); // ○
  try {
    const date = new Date(lastUsed);
    const diffMs = Date.now() - date.getTime();
    const diffHr = diffMs / (1000 * 60 * 60);
    if (diffHr < 1) return colors.success('\u25CF');   // ● green
    if (diffHr < 24) return colors.warning('\u25CF');   // ● yellow
    return colors.muted('\u25CB');                       // ○ gray
  } catch {
    return colors.muted('\u25CB');
  }
}

function activityTypeColor(type: ActivityEntry['type']): (s: string) => string {
  switch (type) {
    case 'tool': return colors.warning;
    case 'message': return colors.accent;
    case 'error': return colors.error;
    case 'idle': return colors.muted;
  }
}

// ── Padded string helper ─────────────────────────────────────────────────────

/**
 * Pads a (possibly ANSI-colored) string to exactly `width` visible characters.
 * Truncates with ellipsis if too long.
 */
function padTo(str: string, width: number): string {
  const vis = visibleLength(str);
  if (vis > width) {
    // Truncate: this is approximate for colored strings, but acceptable
    const plain = stripAnsi(str);
    return plain.slice(0, width - 1) + '\u2026'; // ...
  }
  return str + ' '.repeat(Math.max(0, width - vis));
}

// ── Rendering ────────────────────────────────────────────────────────────────

function render(state: DashboardState): void {
  const cols = termCols();
  const rows = termRows();
  const bc = colors.muted;

  // Layout calculations
  const leftWidth = Math.max(32, Math.floor(cols * 0.4));
  const rightWidth = cols - leftWidth - 3; // -3 for borders (left, mid, right)
  const innerLeft = leftWidth - 2;  // inside the left panel (minus 2 border chars)
  const innerRight = rightWidth; // inside the right panel

  const headerRow = 1;
  const contentStartRow = 3;
  const statsRow = rows - 2;
  const contentHeight = Math.max(1, statsRow - contentStartRow - 1);

  const buf: string[] = [];

  // Position cursor at top
  buf.push(ansi.cursorHome);

  // ── Row 1: Top border ──────────────────────────────────────────────────
  buf.push(
    bc(BOX.tl + BOX.h.repeat(cols - 2) + BOX.tr)
  );

  // ── Row 2: Header bar ──────────────────────────────────────────────────
  const title = '  QAYANI Agent Dashboard';
  const timeStr = formatCurrentTime();
  const version = 'v0.1.0';
  const rightHeader = `${timeStr}  ${version}  `;
  const titleColored = '  ' + colors.gold('QAYANI') + colors.white(' Agent Dashboard');
  const rightHeaderColored = colors.muted(timeStr) + '  ' + colors.muted(version) + '  ';
  const titlePlainLen = title.length;
  const rightPlainLen = rightHeader.length;
  const headerFill = Math.max(0, cols - 2 - titlePlainLen - rightPlainLen);

  buf.push(
    bc(BOX.v) +
    titleColored +
    ' '.repeat(headerFill) +
    rightHeaderColored +
    bc(BOX.v)
  );

  // ── Row 3: Divider with column split ───────────────────────────────────
  buf.push(
    bc(BOX.lt + BOX.h.repeat(leftWidth) + BOX.tt + BOX.h.repeat(rightWidth) + BOX.rt)
  );

  // ── Row 4: Panel headers ───────────────────────────────────────────────
  const agentsHeader = state.activePanel === 'agents'
    ? chalk.bold.white('  Agents')
    : colors.muted('  Agents');
  const activityHeader = state.activePanel === 'activity'
    ? chalk.bold.white('  Activity Feed')
    : colors.muted('  Activity Feed');

  buf.push(
    bc(BOX.v) +
    padTo(agentsHeader, innerLeft) + '  ' +
    bc(BOX.v) +
    padTo(activityHeader, innerRight) +
    bc(BOX.v)
  );

  // ── Row 5: Thin separator under headers ────────────────────────────────
  buf.push(
    bc(BOX.v) +
    '  ' + colors.muted('\u2500'.repeat(Math.max(0, innerLeft - 2))) + '  ' +
    bc(BOX.v) +
    '  ' + colors.muted('\u2500'.repeat(Math.max(0, innerRight - 2))) +
    bc(BOX.v)
  );

  // ── Content rows ───────────────────────────────────────────────────────
  const contentRows = contentHeight - 2; // -2 for panel headers + separator

  for (let i = 0; i < contentRows; i++) {
    // Left panel: agent list
    let leftContent = '';
    const agentIdx = state.scrollOffset + i;
    if (agentIdx < state.agents.length) {
      const agent = state.agents[agentIdx];
      const isSelected = agentIdx === state.selectedAgent;
      const icon = agentStatusIcon(agent.lastUsed);

      if (state.detailView && isSelected) {
        // Detail view for selected agent
        leftContent = renderAgentDetailLine(agent, i, innerLeft);
      } else {
        const pointer = isSelected && state.activePanel === 'agents'
          ? colors.accent('\u25B6 ') // ▶
          : '  ';
        const name = isSelected && state.activePanel === 'agents'
          ? chalk.bold.white(agent.name)
          : colors.white(agent.name);
        const provider = colors.muted(agent.provider);
        const nameStr = `${pointer}${icon} ${name}`;
        const nameVisLen = visibleLength(nameStr);
        const providerVisLen = visibleLength(provider);
        const gap = Math.max(1, innerLeft - nameVisLen - providerVisLen - 2);

        leftContent = nameStr + ' '.repeat(gap) + provider;
      }
    }

    // Right panel: activity feed
    let rightContent = '';
    const actIdx = state.activityOffset + i;
    if (actIdx < state.activity.length) {
      const entry = state.activity[actIdx];
      const colorFn = activityTypeColor(entry.type);
      const timeTag = colors.muted(`[${entry.time}]`);
      const agentTag = colors.accent(entry.agent + ':');
      const actionTag = colorFn(entry.action);
      rightContent = `  ${timeTag} ${agentTag} ${actionTag}`;
    } else if (state.activity.length === 0 && i === 0) {
      rightContent = colors.muted('  No recent activity.');
    }

    buf.push(
      bc(BOX.v) +
      padTo(leftContent, innerLeft) + '  ' +
      bc(BOX.v) +
      padTo(rightContent, innerRight) +
      bc(BOX.v)
    );
  }

  // ── Stats divider ──────────────────────────────────────────────────────
  buf.push(
    bc(BOX.lt + BOX.h.repeat(leftWidth) + BOX.bt + BOX.h.repeat(rightWidth) + BOX.rt)
  );

  // ── Stats bar ──────────────────────────────────────────────────────────
  const totalAgents = state.agents.length;
  const totalSessions = Array.from(state.sessions.values()).reduce((a, b) => a + b, 0);
  const uptime = formatUptime(state.startTime);

  const statsItems = [
    `Agents: ${colors.white(String(totalAgents))}`,
    `Sessions: ${colors.white(String(totalSessions))}`,
    `Uptime: ${colors.white(uptime)}`,
  ];

  const statsStr = '  ' + statsItems.join(colors.muted('  \u2502  ')) + '  ';
  const statsPlainLen = visibleLength(statsStr);
  const statsPad = Math.max(0, cols - 2 - statsPlainLen);

  buf.push(
    bc(BOX.v) +
    statsStr +
    ' '.repeat(statsPad) +
    bc(BOX.v)
  );

  // ── Bottom border ──────────────────────────────────────────────────────
  buf.push(
    bc(BOX.bl + BOX.h.repeat(cols - 2) + BOX.br)
  );

  // ── Help bar (below the box) ───────────────────────────────────────────
  const helpItems = [
    `${colors.muted('q')} exit`,
    `${colors.muted('\u2191\u2193')} scroll`,
    `${colors.muted('Tab')} switch panel`,
    `${colors.muted('Enter')} detail`,
  ];
  const helpStr = '  ' + helpItems.join(colors.muted('  \u2502  '));

  buf.push(helpStr);

  // Write the entire buffer at once
  process.stdout.write(buf.join('\n'));
}

/**
 * Renders detail information for the selected agent, one line at a time.
 * Called repeatedly with different line indices to fill the detail view.
 */
function renderAgentDetailLine(agent: AgentMeta, lineIdx: number, width: number): string {
  const lines: Array<{ label: string; value: string }> = [
    { label: 'Name', value: agent.name },
    { label: 'Provider', value: agent.provider },
    { label: 'Model', value: agent.model },
    { label: 'Last Active', value: formatRelativeTime(agent.lastUsed) },
  ];

  if (agent.createdAt) {
    lines.push({ label: 'Created', value: formatRelativeTime(agent.createdAt) });
  }
  if (agent.template) {
    lines.push({ label: 'Template', value: agent.template });
  }
  if (agent.path) {
    lines.push({ label: 'Path', value: agent.path });
  }

  if (lineIdx === 0) {
    // Header line with back hint
    const header = colors.accent('  \u25C0 ') + chalk.bold.white(agent.name);
    return padTo(header, width);
  }

  const dataIdx = lineIdx - 1;
  if (dataIdx < lines.length) {
    const item = lines[dataIdx];
    const label = colors.muted(`    ${item.label}`);
    const value = colors.white(item.value);
    const labelPlainLen = visibleLength(label);
    const valuePlainLen = visibleLength(value);
    const dots = colors.muted(' ' + '\u00B7'.repeat(Math.max(1, width - labelPlainLen - valuePlainLen - 4)) + ' ');
    return label + dots + value;
  }

  return '';
}

// ── Dashboard loop ───────────────────────────────────────────────────────────

function runDashboard(): void {
  const state: DashboardState = {
    agents: [],
    sessions: new Map(),
    activity: [],
    startTime: Date.now(),
    selectedAgent: 0,
    scrollOffset: 0,
    activityOffset: 0,
    activePanel: 'agents',
    detailView: false,
  };

  // Initial data load
  function refreshData(): void {
    state.agents = loadAgents();
    state.sessions = new Map();
    for (const agent of state.agents) {
      state.sessions.set(agent.name, countSessions(agent.name));
    }
    state.activity = buildActivity(state.agents);

    // Clamp selection
    if (state.agents.length > 0) {
      state.selectedAgent = Math.min(state.selectedAgent, state.agents.length - 1);
    } else {
      state.selectedAgent = 0;
    }
  }

  refreshData();

  // Enter alternate screen and hide cursor
  process.stdout.write(ansi.enterAltScreen + ansi.hideCursor);

  // Cleanup function to restore terminal state
  function cleanup(): void {
    process.stdout.write(ansi.showCursor + ansi.exitAltScreen);

    // Restore stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners('data');
    process.stdin.pause();
  }

  // Handle exit signals
  function exitGracefully(): void {
    clearInterval(refreshTimer);
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

  // Set up raw mode for key input
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key: string) => {
    const contentHeight = Math.max(1, termRows() - 7); // approximate visible rows

    // Ctrl+C
    if (key === '\u0003') {
      exitGracefully();
      return;
    }

    // 'q' to quit
    if (key === 'q' || key === 'Q') {
      exitGracefully();
      return;
    }

    // Tab: switch panel
    if (key === '\t') {
      state.activePanel = state.activePanel === 'agents' ? 'activity' : 'agents';
      render(state);
      return;
    }

    // Enter: toggle detail view
    if (key === '\r' || key === '\n') {
      if (state.activePanel === 'agents' && state.agents.length > 0) {
        state.detailView = !state.detailView;
      }
      render(state);
      return;
    }

    // Escape: exit detail view
    if (key === '\x1b' && !key.startsWith('\x1b[')) {
      if (state.detailView) {
        state.detailView = false;
        render(state);
      }
      return;
    }

    // Arrow keys (escape sequences)
    if (key === '\x1b[A') {
      // Up arrow
      if (state.activePanel === 'agents') {
        if (state.selectedAgent > 0) {
          state.selectedAgent--;
          if (state.selectedAgent < state.scrollOffset) {
            state.scrollOffset = state.selectedAgent;
          }
        }
      } else {
        if (state.activityOffset > 0) {
          state.activityOffset--;
        }
      }
      render(state);
      return;
    }

    if (key === '\x1b[B') {
      // Down arrow
      if (state.activePanel === 'agents') {
        if (state.selectedAgent < state.agents.length - 1) {
          state.selectedAgent++;
          if (state.selectedAgent >= state.scrollOffset + contentHeight) {
            state.scrollOffset = state.selectedAgent - contentHeight + 1;
          }
        }
      } else {
        if (state.activityOffset < Math.max(0, state.activity.length - contentHeight)) {
          state.activityOffset++;
        }
      }
      render(state);
      return;
    }

    // 'r' to force refresh
    if (key === 'r' || key === 'R') {
      refreshData();
      render(state);
      return;
    }
  });

  // Initial render
  render(state);

  // Refresh data and re-render every 2 seconds
  const refreshTimer = setInterval(() => {
    refreshData();
    render(state);
  }, 2000);
}

// ── Command registration ─────────────────────────────────────────────────────

export function registerDashboard(program: Command): void {
  program
    .command('dashboard')
    .alias('dash')
    .description('Real-time agent monitoring dashboard')
    .action(() => {
      if (!process.stdout.isTTY) {
        console.error(
          theme.error('\n  Dashboard requires an interactive terminal (TTY).\n')
        );
        process.exit(1);
      }
      runDashboard();
    });
}
