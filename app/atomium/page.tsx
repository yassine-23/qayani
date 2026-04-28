'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { AtomiumAgent } from '@/components/3d/AtomiumView';

// Dynamic import for Three.js component (no SSR)
const AtomiumView = dynamic(() => import('@/components/3d/AtomiumView'), {
  ssr: false,
  loading: () => <AtomiumLoadingState />,
});

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_AGENTS: AtomiumAgent[] = [
  {
    id: '1',
    name: 'Researcher',
    role: 'Research Specialist',
    status: 'active',
    provider: 'openai',
    model: 'gpt-4o',
  },
  {
    id: '2',
    name: 'Writer',
    role: 'Content Writer',
    status: 'working',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  {
    id: '3',
    name: 'Reviewer',
    role: 'Quality Reviewer',
    status: 'idle',
    provider: 'google',
    model: 'gemini-2.5-pro',
  },
  {
    id: '4',
    name: 'Analyst',
    role: 'Data Analyst',
    status: 'active',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  {
    id: '5',
    name: 'Designer',
    role: 'UI/UX Designer',
    status: 'idle',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
  {
    id: '6',
    name: 'Engineer',
    role: 'Backend Engineer',
    status: 'working',
    provider: 'openai',
    model: 'gpt-4o',
  },
  {
    id: '7',
    name: 'Strategist',
    role: 'Product Strategy',
    status: 'active',
    provider: 'google',
    model: 'gemini-2.5-pro',
  },
  {
    id: '8',
    name: 'Ops',
    role: 'DevOps Manager',
    status: 'idle',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  {
    id: '9',
    name: 'Security',
    role: 'Security Auditor',
    status: 'error',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },
];

// Extended agent metadata for the detail panel
const AGENT_DETAILS: Record<
  string,
  {
    description: string;
    tools: string[];
    memoryCount: number;
    conversationCount: number;
    lastActive: string;
  }
> = {
  '1': {
    description:
      'Specialized in deep web research, academic paper analysis, and competitive intelligence gathering.',
    tools: ['web_search', 'pdf_reader', 'citation_parser', 'summarizer'],
    memoryCount: 1842,
    conversationCount: 312,
    lastActive: '2 min ago',
  },
  '2': {
    description:
      'Expert content writer handling blog posts, documentation, marketing copy, and technical writing.',
    tools: ['text_editor', 'grammar_check', 'seo_optimizer', 'translator'],
    memoryCount: 956,
    conversationCount: 187,
    lastActive: 'Active now',
  },
  '3': {
    description:
      'Reviews all generated content for accuracy, consistency, and quality standards compliance.',
    tools: ['diff_checker', 'style_validator', 'fact_checker'],
    memoryCount: 2104,
    conversationCount: 445,
    lastActive: '15 min ago',
  },
  '4': {
    description:
      'Processes structured and unstructured data to generate actionable insights and visualizations.',
    tools: ['sql_query', 'chart_generator', 'csv_parser', 'statistics'],
    memoryCount: 3201,
    conversationCount: 523,
    lastActive: '5 min ago',
  },
  '5': {
    description:
      'Designs user interfaces and experiences with Apple-level attention to detail and craft.',
    tools: ['figma_export', 'color_palette', 'layout_generator', 'icon_search'],
    memoryCount: 678,
    conversationCount: 91,
    lastActive: '1 hour ago',
  },
  '6': {
    description:
      'Builds and maintains backend services, APIs, database schemas, and infrastructure.',
    tools: ['code_executor', 'db_query', 'api_tester', 'docker_manager'],
    memoryCount: 1567,
    conversationCount: 278,
    lastActive: 'Active now',
  },
  '7': {
    description:
      'Develops product strategy, roadmaps, competitive analysis, and market positioning.',
    tools: ['market_research', 'competitor_tracker', 'roadmap_builder'],
    memoryCount: 892,
    conversationCount: 156,
    lastActive: '10 min ago',
  },
  '8': {
    description:
      'Manages deployment pipelines, monitors system health, and handles infrastructure scaling.',
    tools: ['deploy_manager', 'log_analyzer', 'metrics_dashboard', 'alerting'],
    memoryCount: 445,
    conversationCount: 67,
    lastActive: '3 hours ago',
  },
  '9': {
    description:
      'Audits code and infrastructure for security vulnerabilities, compliance, and best practices.',
    tools: ['vulnerability_scanner', 'dependency_checker', 'compliance_audit'],
    memoryCount: 334,
    conversationCount: 42,
    lastActive: 'Error state',
  },
};

// ── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  active: {
    label: 'Active',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    dot: 'bg-green-400',
  },
  working: {
    label: 'Working',
    color: 'text-[#7C3AED]',
    bg: 'bg-[#7C3AED]/10',
    dot: 'bg-[#7C3AED]',
  },
  idle: {
    label: 'Idle',
    color: 'text-muted',
    bg: 'bg-zinc-500/10',
    dot: 'bg-zinc-500',
  },
  error: {
    label: 'Error',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    dot: 'bg-red-400',
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

// ── Icons (inline SVGs for zero deps) ────────────────────────────────────────

function IconChat({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function IconEdit({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function IconDuplicate({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  );
}

function IconExport({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconClose({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconSend({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function IconBack({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function IconScale({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

// ── Loading State ────────────────────────────────────────────────────────────

function AtomiumLoadingState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#09090B]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7C3AED] animate-spin" />
          <div className="absolute inset-2 rounded-full border border-transparent border-t-[#7C3AED]/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-sm font-medium text-muted tracking-wide">
          Initializing Atomium
        </p>
        <p className="text-xs text-muted mt-1">
          Loading 3D agent fleet viewer
        </p>
      </div>
    </div>
  );
}

// ── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  viewMode,
  onViewModeChange,
  agentCount,
}: {
  viewMode: 'single' | 'hive' | 'army';
  onViewModeChange: (mode: 'single' | 'hive' | 'army') => void;
  agentCount: number;
}) {
  const modes: { key: 'single' | 'hive' | 'army'; label: string }[] = [
    { key: 'single', label: 'Single' },
    { key: 'hive', label: 'Hive' },
    { key: 'army', label: 'Army' },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#09090B] via-[#09090B]/80 to-transparent pointer-events-none">
      {/* Left: title + back */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-gray-800/50 text-subtle hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <IconBack className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight leading-none">
            QAYANI Atomium
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {agentCount} agent{agentCount !== 1 ? 's' : ''} deployed
          </p>
        </div>
      </div>

      {/* Right: mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111113]/80 backdrop-blur-xl border border-gray-800/50 pointer-events-auto">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onViewModeChange(m.key)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              viewMode === m.key
                ? 'bg-[#7C3AED]/15 text-[#7C3AED] shadow-sm'
                : 'text-muted hover:text-subtle'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Agent Detail Panel ───────────────────────────────────────────────────────

function AgentDetailPanel({
  agent,
  onClose,
  onOpenChat,
}: {
  agent: AtomiumAgent;
  onClose: () => void;
  onOpenChat: () => void;
}) {
  const details = AGENT_DETAILS[agent.id];
  const status = STATUS_CONFIG[agent.status];
  const [quickMessage, setQuickMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when panel opens
    const timeout = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timeout);
  }, [agent.id]);

  const handleQuickSend = () => {
    if (!quickMessage.trim()) return;
    // Would send to agent API in production
    setQuickMessage('');
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 z-30 w-full sm:w-[380px] bg-[#111113]/95 backdrop-blur-2xl border-l border-gray-800/50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4 border-b border-gray-800/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status.dot} ${agent.status === 'working' ? 'animate-pulse' : ''}`} />
            <h2 className="text-lg font-semibold text-white truncate tracking-tight">
              {agent.name}
            </h2>
          </div>
          <p className="text-sm text-muted">{agent.role}</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all duration-200 shrink-0"
        >
          <IconClose />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hidden">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${status.color} ${status.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          {details && (
            <span className="text-xs text-muted">{details.lastActive}</span>
          )}
        </div>

        {/* Description */}
        {details && (
          <p className="text-sm text-subtle leading-relaxed">
            {details.description}
          </p>
        )}

        {/* Provider + Model */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-gray-800/30">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                Provider
              </p>
              <p className="text-sm font-semibold text-primary">
                {PROVIDER_LABELS[agent.provider] || agent.provider}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-gray-800/30">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                Model
              </p>
              <p className="text-sm font-semibold text-primary truncate" title={agent.model}>
                {agent.model}
              </p>
            </div>
          </div>
        </div>

        {/* Memory stats */}
        {details && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-gray-800/30">
                <p className="text-2xl font-bold text-white">
                  {details.memoryCount.toLocaleString()}
                </p>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">
                  Memories
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-gray-800/30">
                <p className="text-2xl font-bold text-white">
                  {details.conversationCount.toLocaleString()}
                </p>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">
                  Conversations
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tools list */}
        {details && details.tools.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Tools
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {details.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-subtle bg-white/[0.04] border border-gray-800/30"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={<IconChat />} label="Chat" primary onClick={onOpenChat} />
            <ActionButton icon={<IconEdit />} label="Edit" />
            <ActionButton icon={<IconDuplicate />} label="Duplicate" />
            <ActionButton icon={<IconExport />} label="Export" />
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-400/5 border border-transparent hover:border-red-400/10 transition-all duration-200">
            <IconTrash className="w-3.5 h-3.5" />
            Delete Agent
          </button>
        </div>
      </div>

      {/* Quick message input */}
      <div className="p-4 border-t border-gray-800/30">
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-gray-800/40 focus-within:border-[#7C3AED]/30 transition-colors duration-200">
          <input
            ref={inputRef}
            type="text"
            value={quickMessage}
            onChange={(e) => setQuickMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickSend()}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-transparent text-sm text-primary placeholder-muted outline-none px-2 py-1.5"
          />
          <button
            onClick={handleQuickSend}
            disabled={!quickMessage.trim()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all duration-200 disabled:opacity-30 disabled:hover:text-muted disabled:hover:bg-transparent"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  primary,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        primary
          ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 hover:bg-[#7C3AED]/20'
          : 'bg-white/[0.03] text-subtle border border-gray-800/30 hover:text-primary hover:bg-white/[0.06]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Agent Chat Modal ─────────────────────────────────────────────────────────

function AgentChatModal({
  agent,
  onClose,
}: {
  agent: AtomiumAgent;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<
    { role: 'user' | 'agent'; content: string }[]
  >([
    {
      role: 'agent',
      content: `Hello, I'm ${agent.name}. I'm currently functioning as your ${agent.role}. How can I assist you?`,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const status = STATUS_CONFIG[agent.status];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Simulate agent response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `Processing your request: "${userMessage}". This is a demo response from the ${agent.name} agent running on ${agent.model}.`,
        },
      ]);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl h-[80vh] max-h-[700px] bg-[#111113] border border-gray-800/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/30">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
            <div>
              <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
              <p className="text-xs text-muted">
                {agent.role} -- {PROVIDER_LABELS[agent.provider] || agent.provider} / {agent.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <IconClose />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hidden">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#7C3AED]/15 text-primary rounded-br-md'
                    : 'bg-white/[0.04] text-subtle border border-gray-800/20 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-4 border-t border-gray-800/30">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-gray-800/40 focus-within:border-[#7C3AED]/30 transition-colors duration-200">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-primary placeholder-muted outline-none px-2.5 py-2"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#7C3AED]/15 text-[#7C3AED] hover:bg-[#7C3AED]/25 transition-all duration-200 disabled:opacity-30"
            >
              <IconSend />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Bottom Controls ──────────────────────────────────────────────────────────

function BottomControls({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'single' | 'hive' | 'army';
  onViewModeChange: (mode: 'single' | 'hive' | 'army') => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-center justify-center gap-2 px-5 py-4 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent">
        <div className="flex items-center gap-2 pointer-events-auto">
          <ControlButton icon={<IconPlus />} label="Add Agent" primary />
          <ControlButton icon={<IconDuplicate />} label="Duplicate Fleet" />
          <ControlButton icon={<IconScale />} label="Scale" />
          <div className="w-px h-6 bg-gray-800 mx-1" />
          <ControlButton
            label="Army Mode"
            active={viewMode === 'army'}
            onClick={() =>
              onViewModeChange(viewMode === 'army' ? 'single' : 'army')
            }
          />
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  primary,
  active,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  primary?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
        primary
          ? 'bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/20 hover:bg-[#7C3AED]/25'
          : active
            ? 'bg-white/10 text-white border border-gray-700/50'
            : 'bg-[#111113]/80 backdrop-blur-xl text-muted border border-gray-800/50 hover:text-subtle hover:border-gray-700/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AtomiumPage() {
  const [agents] = useState<AtomiumAgent[]>(MOCK_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'hive' | 'army'>('single');
  const [chatAgent, setChatAgent] = useState<AtomiumAgent | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  const handleAgentHover = useCallback((_agentId: string | null) => {
    // Could show a tooltip or highlight in the panel
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAgentId(null);
  }, []);

  const handleOpenChat = useCallback(() => {
    if (selectedAgent) {
      setChatAgent(selectedAgent);
    }
  }, [selectedAgent]);

  // Escape to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chatAgent) {
          setChatAgent(null);
        } else {
          setSelectedAgentId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatAgent]);

  return (
    <div className="fixed inset-0 bg-[#09090B] flex flex-col lg:flex-row overflow-hidden">
      {/* 3D View */}
      <div
        className={`relative flex-1 transition-all duration-300 ease-out ${
          selectedAgent ? 'lg:mr-[380px]' : ''
        }`}
      >
        {/* Atomium 3D Canvas */}
        <AtomiumView
          agents={agents}
          onAgentClick={handleAgentClick}
          onAgentHover={handleAgentHover}
          selectedAgentId={selectedAgentId}
          mode={viewMode}
          className="w-full h-full"
        />

        {/* Top Bar overlay */}
        <TopBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          agentCount={agents.length}
        />

        {/* Bottom Controls overlay */}
        <BottomControls viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Agent Detail Panel */}
      <AnimatePresence mode="wait">
        {selectedAgent && (
          <AgentDetailPanel
            key={selectedAgent.id}
            agent={selectedAgent}
            onClose={handleClosePanel}
            onOpenChat={handleOpenChat}
          />
        )}
      </AnimatePresence>

      {/* Agent Chat Modal */}
      <AnimatePresence>
        {chatAgent && (
          <AgentChatModal
            key={`chat-${chatAgent.id}`}
            agent={chatAgent}
            onClose={() => setChatAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
