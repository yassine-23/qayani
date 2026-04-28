'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const InteractiveAgentHead = dynamic(
  () => import('@/components/agent/InteractiveAgentHead'),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cube/20 border-t-neon rounded-full animate-spin" />
    </div>
  )}
);

/* ══════════════════════════════════════════════════════════════
   AGENT STUDIO — Immersive Config
   Head center-stage, 4 wired spec cards around it,
   official brand icons, CLI terminal demo at bottom.
   ══════════════════════════════════════════════════════════════ */

type AgentStatus = 'idle' | 'thinking' | 'speaking';
type ExpandedPanel = 'identity' | 'model' | 'memory' | 'tools' | null;

// ── Official Brand SVG Icons ─────────────────────────────────
const brandIcons = {
  openai: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.304 3.541h-3.48l6.15 16.918h3.48zm-10.56 0L.594 20.459h3.544l1.26-3.54h6.444l1.259 3.54h3.544L10.496 3.54zm-.592 10.564l2.064-5.804h.047l2.045 5.804z" />
    </svg>
  ),
  gemini: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.372 0 0 5.372 0 12c0 6.627 5.372 12 12 12 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm5.082 16.777a.197.197 0 0 1-.197.197h-2.012a.197.197 0 0 1-.18-.12l-1.263-2.88h-2.86l-1.262 2.88a.198.198 0 0 1-.18.12H7.115a.197.197 0 0 1-.197-.197.2.2 0 0 1 .017-.08l4.673-10.39a.197.197 0 0 1 .18-.118h.424c.077 0 .146.045.18.118l4.672 10.39a.2.2 0 0 1 .018.08zM12 8.657L10.238 12.7h3.524z" />
    </svg>
  ),
  mistral: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3 3h4.5v4.5H3zm13.5 0H21v4.5h-4.5zM3 7.5h4.5V12H3zm4.5 0h4.5V12H7.5zm4.5 0h4.5V12H12zm4.5 0H21V12h-4.5zM7.5 12h4.5v4.5H7.5zm4.5 0h4.5v4.5H12zM3 12h4.5v4.5H3zm13.5 0H21v4.5h-4.5zM3 16.5h4.5V21H3zm4.5 0h4.5V21H7.5zm9 0H21V21h-4.5z" />
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a4.26 4.26 0 0 0 1.676 2.574c.675.478 1.434.716 2.207.716 1.074 0 2.1-.416 3.1-1.272.858-.736 1.712-1.775 2.537-3.103l.28-.453.281.453c.824 1.328 1.679 2.367 2.537 3.103 1 .856 2.027 1.272 3.1 1.272.772 0 1.532-.238 2.207-.716a4.259 4.259 0 0 0 1.675-2.574c.141-.604.211-1.267.211-1.973 0-2.566-.704-5.24-2.044-7.303C16.598 5.31 14.883 4.03 12.915 4.03c-1.074 0-2.1.416-3.1 1.272-.395.338-.79.735-1.185 1.196a12.1 12.1 0 0 0-1.186-1.196c-1-.856-2.026-1.272-3.1-1.272zm-.058 2.08c.642 0 1.31.244 2.056.796l-2.691 4.152c-.659 1.033-1.192 1.99-1.604 2.862-.527-.91-.772-2.038-.772-3.471 0-1.349.282-2.531.772-3.32.487-.784 1.285-1.018 2.24-1.018zm12.228 0c.955 0 1.753.234 2.24 1.019.49.789.772 1.971.772 3.32 0 1.433-.245 2.56-.772 3.47-.412-.87-.945-1.828-1.604-2.861l-2.691-4.152c.746-.552 1.414-.796 2.055-.796zM12 9.936l1.754 2.705c.776 1.213 1.39 2.262 1.833 3.125.358.699.603 1.286.718 1.719-.31.14-.671.213-1.066.213-.72 0-1.43-.308-2.19-.95a12.7 12.7 0 0 1-1.049-.99 12.7 12.7 0 0 1-1.05.99c-.76.642-1.47.95-2.19.95-.394 0-.755-.073-1.065-.213.115-.433.36-1.02.718-1.719.443-.863 1.057-1.912 1.833-3.125z" />
    </svg>
  ),
  drive: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M7.71 3.5L1.15 15l3.43 5.95h6.56l-3.43-5.95zM8.8 3.5h6.56l6.56 11.5H15.36zM16.22 15.88L12.79 21.83H22.85l3.43-5.95z" />
    </svg>
  ),
  obsidian: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12.527.075a.35.35 0 0 0-.314.055l-7.14 5.67a.35.35 0 0 0-.056.49l5.25 6.614a.35.35 0 0 0 .548 0l5.25-6.613a.35.35 0 0 0-.055-.491L12.869.13a.35.35 0 0 0-.342-.055zm-1.1 14.024l-4.74 3.764a.35.35 0 0 0-.056.491l4.65 5.858a.35.35 0 0 0 .548 0l4.65-5.858a.35.35 0 0 0-.056-.49z" />
    </svg>
  ),
  terminal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
};

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  identity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  model: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>,
  memory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  tools: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1 5.1a2.121 2.121 0 01-3-3l5.1-5.1m0 0L15.17 4.42a2.121 2.121 0 013 3l-7.75 7.75zM14.121 9.879L9.879 14.12" /></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
  expand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};

// ── Provider data with brand icons + Mistral added ───────────
const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: brandIcons.openai, color: '#10a37f', models: ['gpt-4o', 'gpt-4-turbo', 'o1-preview', 'o1-mini'] },
  { id: 'anthropic', name: 'Claude', icon: brandIcons.anthropic, color: '#cc785c', models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-3.5'] },
  { id: 'gemini', name: 'Gemini', icon: brandIcons.gemini, color: '#4285f4', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'] },
  { id: 'mistral', name: 'Mistral', icon: brandIcons.mistral, color: '#ff7000', models: ['mistral-large', 'mistral-medium', 'codestral', 'mistral-small'] },
  { id: 'meta', name: 'Llama', icon: brandIcons.meta, color: '#0668E1', models: ['llama-4-maverick', 'llama-4-scout', 'llama-3.3-70b'] },
];

const MEMORY_SOURCES = [
  { id: 'drive', name: 'Google Drive', icon: brandIcons.drive, desc: 'Sync docs and files as agent context' },
  { id: 'obsidian', name: 'Obsidian Vault', icon: brandIcons.obsidian, desc: 'Connect your knowledge graph' },
  { id: 'local', name: 'Local / CLI', icon: brandIcons.terminal, desc: 'Feed data via qayani ingest' },
];

// ── Tesla pre-populated data ─────────────────────────────────
const INIT = {
  identity: {
    name: 'Nikola Tesla',
    tagline: 'Inventor, Electrical Engineer, Futurist',
    bio: `Born July 10, 1856 in Smiljan, Austrian Empire. Serbian-American inventor who discovered and patented the rotating magnetic field. Developed the three-phase AC power system and conceived the Tesla coil.`,
    personality: `Visionary, obsessive thinker. Speaks with eloquence and precision, using metaphors from electricity and nature. Values truth, innovation, and humanitarian progress.`,
    expertise: ['AC power systems', 'Electromagnetic fields', 'Wireless energy', 'Radio technology', 'High-voltage experiments'],
    speakingStyle: `Formal yet poetic. Vivid imagery, confident sentences, genuine warmth.`,
  },
  model: {
    provider: 'anthropic',
    model: 'claude-opus-4',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: `You are Nikola Tesla, the legendary inventor. You speak from first-person perspective with deep knowledge of electrical engineering and your life's work. Respond with the eloquence Tesla was known for.`,
  },
  memories: [
    { id: '1', title: 'War of Currents', content: 'AC vs DC. Westinghouse partnership proved alternating current superior for long-distance power transmission.', cat: 'life_event' },
    { id: '2', title: 'Colorado Springs 1899', content: 'High-voltage wireless experiments. Artificial lightning, millions of volts. Detected signals I believed extraterrestrial.', cat: 'invention' },
    { id: '3', title: 'Wardenclyffe Tower', content: 'Worldwide wireless communication and energy. Morgan withdrew funding. Demolished 1917. My greatest unfinished dream.', cat: 'life_event' },
    { id: '4', title: 'AC Induction Motor', content: 'Patented 1888. Rotating magnetic field. Foundation of modern power systems. Conceived in Budapest park, 1882.', cat: 'invention' },
    { id: '5', title: 'Tesla Coil', content: 'Invented 1891. Resonant transformer. High-voltage, low-current, high-frequency AC. Basis of radio technology.', cat: 'invention' },
    { id: '6', title: '300+ Patents', content: 'Motors, generators, transformers, lighting, radio, X-ray, remote control, energy transmission.', cat: 'achievement' },
  ],
  tools: [
    { id: '1', name: 'Knowledge Search', desc: 'Semantic search across memory vault', on: true },
    { id: '2', name: 'Patent Lookup', desc: 'Search 300+ patents', on: true },
    { id: '3', name: 'Timeline Navigator', desc: 'Chronological life events', on: true },
    { id: '4', name: 'Voice Synthesis', desc: 'Cloned voice responses', on: false },
    { id: '5', name: 'Web Search', desc: 'Current information retrieval', on: false },
  ],
  memorySource: 'local',
};

// ═══════════════════════════════════════════════════════════════
// ANIMATED WIRE connecting card to head
// ═══════════════════════════════════════════════════════════════
function Wire({ side, active }: { side: 'tl' | 'tr' | 'bl' | 'br'; active: boolean }) {
  const paths: Record<string, string> = {
    tl: 'M100,50 C70,50 40,30 10,10',
    tr: 'M0,50 C30,50 60,30 90,10',
    bl: 'M100,0 C70,0 40,20 10,40',
    br: 'M0,0 C30,0 60,20 90,40',
  };
  return (
    <svg viewBox={side.startsWith('t') ? '0 0 100 55' : '0 0 100 45'} className={`absolute ${
      side === 'tl' ? 'right-0 bottom-0 w-20 h-12' :
      side === 'tr' ? 'left-0 bottom-0 w-20 h-12' :
      side === 'bl' ? 'right-0 top-0 w-20 h-10' :
      'left-0 top-0 w-20 h-10'
    }`} preserveAspectRatio="none">
      <path d={paths[side]} fill="none" stroke={active ? '#FACC15' : '#ffffff'} strokeOpacity={active ? 0.3 : 0.06} strokeWidth="2" />
      {active && (
        <circle r="3" fill="#FACC15" opacity="0.8">
          <animateMotion dur="2s" repeatCount="indefinite" path={paths[side]} />
        </circle>
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPEC CARD (compact summary, click to expand)
// ═══════════════════════════════════════════════════════════════
function SpecCard({
  icon, label, summary, wire, active, onClick, children,
}: {
  icon: JSX.Element; label: string; summary: string; wire: 'tl' | 'tr' | 'bl' | 'br';
  active: boolean; onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Wire side={wire} active={active} />
      <motion.button
        onClick={onClick}
        className={`w-full rounded-xl border p-4 text-left transition-all ${
          active
            ? 'border-cube/25 bg-cube/[0.04] shadow-[0_0_20px_rgba(124,58,237,0.06)]'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            active ? 'bg-cube/[0.1] text-cube' : 'bg-white/[0.04] text-white/30'
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/70">{label}</p>
            <p className="text-[10px] text-white/25 truncate">{summary}</p>
          </div>
          <div className="text-white/15">{icons.expand}</div>
        </div>
        {children}
      </motion.button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLI TERMINAL ANIMATION
// ═══════════════════════════════════════════════════════════════
function CLITerminal() {
  const lines = [
    { cmd: true, text: '$ qayani init --name "Nikola Tesla"' },
    { cmd: false, text: '  Agent initialized. ID: agt_tesla_001' },
    { cmd: true, text: '$ qayani ingest ./tesla-papers/ --recursive' },
    { cmd: false, text: '  Indexing 342 documents... embedding with ada-002' },
    { cmd: false, text: '  Memory vault: 6 entries | 1,247 chunks | 2.1M tokens' },
    { cmd: true, text: '$ qayani config model --provider anthropic --model claude-opus-4' },
    { cmd: false, text: '  Model updated. Temperature: 0.7 | Max tokens: 2048' },
    { cmd: true, text: '$ qayani run --channel web --channel telegram' },
    { cmd: false, text: '  Agent live on 2 channels. Dashboard: http://localhost:3000/agent/tesla' },
    { cmd: false, text: '  Telegram bot: @tesla_agent_bot' },
    { cmd: true, text: '$ qayani fleet status' },
    { cmd: false, text: '  tesla_001  ONLINE   2 channels  6 memories  claude-opus-4' },
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines < lines.length) {
      const delay = lines[visibleLines]?.cmd ? 800 : 300;
      const timer = setTimeout(() => setVisibleLines(v => v + 1), delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisibleLines(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/60 overflow-hidden font-mono text-[11px]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        <span className="text-white/20 text-[10px] ml-2">qayani-cli v0.1.0</span>
      </div>
      {/* Lines */}
      <div className="p-4 h-[200px] overflow-hidden">
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="py-0.5"
          >
            <span className={line.cmd ? 'text-cube/70' : 'text-white/30'}>
              {line.text}
            </span>
          </motion.div>
        ))}
        {visibleLines < lines.length && (
          <motion.span
            className="text-cube"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            _
          </motion.span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPANDED PANEL (modal drawer)
// ═══════════════════════════════════════════════════════════════
function ExpandedPanel({
  panel, onClose, state, setState,
}: {
  panel: ExpandedPanel; onClose: () => void;
  state: typeof INIT; setState: (fn: (prev: typeof INIT) => typeof INIT) => void;
}) {
  if (!panel) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="rounded-2xl border border-white/[0.08] bg-void-100 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-void-100/95 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white capitalize">{panel === 'memory' ? 'Memory Vault' : panel}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all">{icons.close}</button>
        </div>

        <div className="p-6">
          {panel === 'identity' && <IdentityPanel s={state.identity} set={(v: any) => setState(p => ({ ...p, identity: { ...p.identity, ...v } }))} />}
          {panel === 'model' && <ModelPanel s={state.model} set={(v: any) => setState(p => ({ ...p, model: { ...p.model, ...v } }))} />}
          {panel === 'memory' && <MemoryPanel s={state} set={setState} />}
          {panel === 'tools' && <ToolsPanel s={state.tools} set={(v: any) => setState(p => ({ ...p, tools: v }))} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Identity Panel ──
function IdentityPanel({ s, set }: { s: typeof INIT.identity; set: (v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Fin label="Name" value={s.name} onChange={(v) => set({ name: v })} />
        <Fin label="Tagline" value={s.tagline} onChange={(v) => set({ tagline: v })} />
      </div>
      <Ftx label="Biography" value={s.bio} onChange={(v) => set({ bio: v })} rows={4} />
      <Ftx label="Personality" value={s.personality} onChange={(v) => set({ personality: v })} rows={3} />
      <Ftx label="Speaking Style" value={s.speakingStyle} onChange={(v) => set({ speakingStyle: v })} rows={2} />
      <div>
        <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">Expertise</label>
        <div className="flex flex-wrap gap-1.5">
          {s.expertise.map((sk, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cube/[0.06] border border-cube/10 text-[10px] font-mono text-cube/60">
              {sk}
              <button onClick={() => set({ expertise: s.expertise.filter((_: any, j: number) => j !== i) })} className="text-cube/30 hover:text-cube/60 ml-0.5">x</button>
            </span>
          ))}
          <button onClick={() => { const v = prompt('Add expertise:'); if (v?.trim()) set({ expertise: [...s.expertise, v.trim()] }); }}
            className="px-2.5 py-1 rounded-md border border-dashed border-white/[0.08] text-[10px] font-mono text-white/20 hover:text-white/40 transition-all"
          >{icons.add}</button>
        </div>
      </div>
    </div>
  );
}

// ── Model Panel with brand icons ──
function ModelPanel({ s, set }: { s: typeof INIT.model; set: (v: any) => void }) {
  const prov = PROVIDERS.find(p => p.id === s.provider);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2">
        {PROVIDERS.map(p => (
          <button key={p.id} onClick={() => set({ provider: p.id, model: p.models[0] })}
            className={`rounded-xl border p-3 flex flex-col items-center gap-2 transition-all ${
              s.provider === p.id ? 'border-cube/25 bg-cube/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
            style={s.provider === p.id ? { boxShadow: `0 0 20px ${p.color}15` } : {}}
          >
            <div style={{ color: s.provider === p.id ? p.color : undefined }} className={s.provider !== p.id ? 'text-white/25' : ''}>
              {p.icon}
            </div>
            <span className={`text-[10px] font-semibold ${s.provider === p.id ? 'text-white/80' : 'text-white/30'}`}>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">Model</label>
          <select value={s.model} onChange={(e) => set({ model: e.target.value })}
            className="w-full rounded-lg border border-white/[0.08] bg-void-100 px-3 py-2.5 text-[12px] text-white/70 outline-none focus:border-cube/25">
            {prov?.models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">Max Tokens</label>
          <input type="number" value={s.maxTokens} onChange={(e) => set({ maxTokens: parseInt(e.target.value) || 0 })}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/70 font-mono outline-none focus:border-cube/25" />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Temperature</label>
          <span className="text-[12px] font-mono text-cube/60">{s.temperature.toFixed(2)}</span>
        </div>
        <input type="range" min="0" max="2" step="0.05" value={s.temperature} onChange={(e) => set({ temperature: parseFloat(e.target.value) })} className="w-full accent-cube" />
      </div>
      <Ftx label="System Prompt" value={s.systemPrompt} onChange={(v) => set({ systemPrompt: v })} rows={6} mono />
    </div>
  );
}

// ── Memory Panel with sources ──
function MemoryPanel({ s, set }: { s: typeof INIT; set: (fn: any) => void }) {
  return (
    <div className="space-y-5">
      {/* Memory source selector */}
      <div>
        <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-3">Source</label>
        <div className="grid grid-cols-3 gap-2">
          {MEMORY_SOURCES.map(src => (
            <button key={src.id} onClick={() => set((p: typeof INIT) => ({ ...p, memorySource: src.id }))}
              className={`rounded-lg border p-3 text-left transition-all ${
                s.memorySource === src.id ? 'border-cube/25 bg-cube/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}>
              <div className={`mb-2 ${s.memorySource === src.id ? 'text-cube' : 'text-white/25'}`}>{src.icon}</div>
              <p className={`text-[11px] font-semibold ${s.memorySource === src.id ? 'text-white/70' : 'text-white/35'}`}>{src.name}</p>
              <p className="text-[9px] text-white/20 mt-0.5">{src.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/25">Entries ({s.memories.length})</label>
        <button onClick={() => set((p: typeof INIT) => ({ ...p, memories: [...p.memories, { id: Date.now().toString(), title: '', content: '', cat: 'general' }] }))}
          className="text-[10px] font-mono text-cube/50 hover:text-cube/80 transition-colors">{icons.add}</button>
      </div>
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {s.memories.map(m => (
          <div key={m.id} className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 group">
            <div className="flex items-center gap-2 mb-1.5">
              <input value={m.title} onChange={(e) => set((p: typeof INIT) => ({ ...p, memories: p.memories.map(x => x.id === m.id ? { ...x, title: e.target.value } : x) }))}
                placeholder="Title..." className="flex-1 bg-transparent text-[12px] font-medium text-white/60 placeholder-white/15 outline-none" />
              <button onClick={() => set((p: typeof INIT) => ({ ...p, memories: p.memories.filter(x => x.id !== m.id) }))}
                className="text-white/10 hover:text-red-400/50 opacity-0 group-hover:opacity-100 transition-all">{icons.trash}</button>
            </div>
            <textarea value={m.content} onChange={(e) => set((p: typeof INIT) => ({ ...p, memories: p.memories.map(x => x.id === m.id ? { ...x, content: e.target.value } : x) }))}
              placeholder="Content..." rows={2} className="w-full bg-transparent text-[11px] text-white/30 placeholder-white/10 outline-none resize-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tools Panel ──
function ToolsPanel({ s, set }: { s: typeof INIT.tools; set: (v: any) => void }) {
  const toggle = (id: string) => set(s.map((t: any) => t.id === id ? { ...t, on: !t.on } : t));
  return (
    <div className="space-y-2">
      {s.map((t: any) => (
        <button key={t.id} onClick={() => toggle(t.id)}
          className={`w-full rounded-lg border p-4 text-left transition-all ${t.on ? 'border-cube/20 bg-cube/[0.04]' : 'border-white/[0.06] bg-white/[0.015] opacity-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[12px] font-semibold ${t.on ? 'text-white/70' : 'text-white/35'}`}>{t.name}</p>
              <p className="text-[10px] text-white/20 mt-0.5">{t.desc}</p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-all ${t.on ? 'bg-cube/30' : 'bg-white/[0.06]'}`}>
              <motion.div className={`w-4 h-4 rounded-full ${t.on ? 'bg-cube' : 'bg-white/15'}`}
                animate={{ x: t.on ? 16 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Shared field helpers ──
function Fin({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/70 outline-none focus:border-cube/25 transition-all" />
    </div>
  );
}
function Ftx({ label, value, onChange, rows = 3, mono }: { label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1.5">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className={`w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/60 outline-none focus:border-cube/25 transition-all resize-none leading-relaxed ${mono ? 'font-mono text-[11px]' : ''}`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AgentConfigPage() {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [expanded, setExpanded] = useState<ExpandedPanel>(null);
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState(INIT);

  const handleSave = useCallback(() => {
    setSaved(true);
    setStatus('thinking');
    setTimeout(() => { setStatus('idle'); setTimeout(() => setSaved(false), 2000); }, 1500);
  }, []);

  const handleTest = useCallback(() => {
    setStatus('speaking');
    setTimeout(() => setStatus('idle'), 4000);
  }, []);

  const handleTap = useCallback(() => {
    if (status === 'idle') {
      setStatus('thinking');
      setTimeout(() => { setStatus('speaking'); setTimeout(() => setStatus('idle'), 3000); }, 1500);
    }
  }, [status]);

  const prov = PROVIDERS.find(p => p.id === state.model.provider);

  return (
    <main className="min-h-screen bg-void">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 hover:text-cube/60 transition-colors mb-4">
            {icons.back} Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-cube/50 mb-1">// agent_studio</p>
              <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">{state.identity.name}</h1>
              <p className="text-[13px] text-white/25 mt-0.5">{state.identity.tagline}</p>
            </div>
            <div className="flex gap-2">
              <motion.button onClick={handleTest} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[11px] font-medium text-white/35 hover:bg-white/[0.06] transition-all"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{icons.play} Test</motion.button>
              <motion.button onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-cube/[0.12] border border-cube/20 px-5 py-2 text-[11px] font-semibold text-cube hover:bg-cube/[0.18] transition-all"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>{icons.save} {saved ? 'Saved' : 'Save'}</motion.button>
            </div>
          </div>
        </motion.div>

        {/* ═══ HERO: Head + 4 Wired Spec Cards ═══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-[1fr_auto_1fr] gap-x-0 gap-y-3 items-center mb-8">

          {/* Top-left: Identity */}
          <div className="justify-self-end pr-0">
            <SpecCard icon={icons.identity} label="Identity" wire="tl" active={expanded === 'identity'}
              summary={`${state.identity.name} - ${state.identity.expertise.length} skills`}
              onClick={() => setExpanded('identity')} />
          </div>

          {/* Center: 3D Head (spans 2 rows) */}
          <div className="row-span-2 mx-4">
            <div className="w-[340px] h-[440px] rounded-2xl border border-white/[0.06] bg-black/60 overflow-hidden">
              <InteractiveAgentHead name={state.identity.name} status={status} onTap={handleTap} className="w-full h-full" />
            </div>
          </div>

          {/* Top-right: Model */}
          <div className="justify-self-start pl-0">
            <SpecCard icon={icons.model} label="Model" wire="tr" active={expanded === 'model'}
              summary={`${prov?.name} ${state.model.model}`}
              onClick={() => setExpanded('model')}>
              {/* Brand icon row */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                {PROVIDERS.map(p => (
                  <div key={p.id} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    state.model.provider === p.id ? '' : 'opacity-20 grayscale'
                  }`} style={state.model.provider === p.id ? { color: p.color } : { color: 'white' }}>
                    {p.icon}
                  </div>
                ))}
              </div>
            </SpecCard>
          </div>

          {/* Bottom-left: Memory */}
          <div className="justify-self-end pr-0">
            <SpecCard icon={icons.memory} label="Memory Vault" wire="bl" active={expanded === 'memory'}
              summary={`${state.memories.length} entries - ${MEMORY_SOURCES.find(s => s.id === state.memorySource)?.name}`}
              onClick={() => setExpanded('memory')}>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                {MEMORY_SOURCES.map(src => (
                  <div key={src.id} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                    state.memorySource === src.id ? 'text-cube' : 'text-white/15'
                  }`}>
                    {src.icon}
                  </div>
                ))}
              </div>
            </SpecCard>
          </div>

          {/* Bottom-right: Tools */}
          <div className="justify-self-start pl-0">
            <SpecCard icon={icons.tools} label="Tools" wire="br" active={expanded === 'tools'}
              summary={`${state.tools.filter((t: any) => t.on).length} of ${state.tools.length} active`}
              onClick={() => setExpanded('tools')} />
          </div>
        </motion.div>

        {/* ═══ CLI TERMINAL DEMO ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/15 mb-3">// qayani cli dashboard</p>
          <CLITerminal />
        </motion.div>
      </div>

      {/* ═══ EXPANDED PANEL MODAL ═══ */}
      <AnimatePresence>
        {expanded && (
          <ExpandedPanel panel={expanded} onClose={() => setExpanded(null)} state={state} setState={setState} />
        )}
      </AnimatePresence>
    </main>
  );
}
