'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui';
import QMark from '@/components/ui/QMark';
import AvatarRing from '@/components/ui/AvatarRing';

const PolytopeView = dynamic(() => import('@/components/3d/PolytopeView'), { ssr: false });

/* ============================================
   Features Page — QAYANI Product Showcase

   Two core pillars:
   1. Digital Avatar Twin Creation
   2. Agentic Team Orchestration

   Dark navy + white + yellow. Branded.
   Every section sells, not describes.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

// ── Feature categories ──

const CATEGORIES = [
  { id: 'avatar', label: 'Digital Twin', icon: AvatarIcon },
  { id: 'voice', label: 'Voice Cloning', icon: VoiceIcon },
  { id: 'agents', label: 'Agent Teams', icon: AgentIcon },
  { id: 'studio', label: 'Workflow Studio', icon: StudioIcon },
  { id: 'memory', label: 'Memory Vault', icon: MemoryIcon },
  { id: 'family', label: 'Family Access', icon: FamilyIcon },
];

const FEATURES: Record<string, {
  headline: string;
  description: string;
  capabilities: { name: string; detail: string; tier: string }[];
}> = {
  avatar: {
    headline: 'Create your digital twin',
    description: 'A living AI version of you — with your personality, knowledge, and way of thinking. Your family talks to it. It remembers everything. It never forgets.',
    capabilities: [
      { name: '3D Avatar Rendering', detail: 'Lifelike Three.js avatar with real-time lip-sync, gaze tracking, and emotional expressions powered by Ready Player Me', tier: 'Free' },
      { name: 'Personality Modeling', detail: 'Big Five trait system captures how you think, speak, and make decisions. Your avatar mirrors your communication style', tier: 'Free' },
      { name: 'Emotion Intelligence', detail: 'Real-time sentiment analysis detects the emotional tone of conversations and adapts responses accordingly', tier: 'Pro' },
      { name: 'Continuous Learning', detail: 'Your avatar grows smarter with every memory you add and every conversation it has with your family', tier: 'Pro' },
    ],
  },
  voice: {
    headline: 'Your voice. Cloned forever.',
    description: 'Record 3 minutes of speech and our AI clones your voice with 97%+ accuracy. Your avatar doesn\'t just think like you — it sounds like you.',
    capabilities: [
      { name: '97%+ Voice Accuracy', detail: 'ElevenLabs neural voice synthesis trained on your speech patterns, cadence, and intonation', tier: 'Pro' },
      { name: '3-Minute Setup', detail: 'Read three guided prompts. That\'s all it takes to capture your unique voice signature', tier: 'Pro' },
      { name: 'Real-Time Synthesis', detail: 'Your avatar responds in your voice during live conversations — not pre-recorded, synthesized in real-time', tier: 'Pro' },
      { name: 'Voice Quality Gauge', detail: 'Visual feedback shows recording quality: Good, Great, or Studio-grade. More recordings = better accuracy', tier: 'Pro' },
    ],
  },
  agents: {
    headline: 'Build agent teams that scale',
    description: 'From a single assistant to a 120-agent hyperfleet. Agents structured as platonic solids — each geometry represents a team topology.',
    capabilities: [
      { name: 'Tetrahedron Teams (Free)', detail: '5-agent teams for focused work. 1 manager + 4 specialists. The simplest solid, the sharpest focus', tier: 'Free' },
      { name: 'Octahedron Teams (Pro)', detail: '16-agent teams with cross-dimensional connections. Parallel execution, dependency graphs, orchestrated workflows', tier: 'Pro' },
      { name: 'Icosahedron Fleets (Enterprise)', detail: '120-agent hyperfleets for massive operations. The most complex platonic solid, unlimited capability', tier: 'Enterprise' },
      { name: 'Atomium Visualization', detail: 'Real-time 3D constellation view of your entire fleet — glass spheres, traveling data particles, cinematic camera', tier: 'Pro' },
    ],
  },
  studio: {
    headline: 'Visual workflow builder',
    description: 'Connect LLM providers, memory sources, tools, and output channels through a clean node editor. Think n8n, but for building AI agents.',
    capabilities: [
      { name: 'Multi-Provider Support', detail: 'OpenAI, Claude, Gemini, Mistral, Llama — swap providers with one click. Your agents, your choice of intelligence', tier: 'Free' },
      { name: 'Node Canvas', detail: 'Drag-and-drop workflow editor. Connect knowledge sources to LLMs to tools to outputs. Your avatar is the center node', tier: 'Pro' },
      { name: 'Google Drive Integration', detail: 'Connect your Drive as a memory source. Documents sync automatically. Your avatar learns from your files', tier: 'Pro' },
      { name: 'CLI Deployment', detail: 'Export your agent config and deploy from terminal. qayani init, qayani ingest, qayani run — cross-platform', tier: 'Free' },
    ],
  },
  memory: {
    headline: 'A vault that never forgets',
    description: 'Every story, every lesson, every piece of wisdom. Stored as vector embeddings for instant semantic retrieval. Your avatar draws on the right memory at the right moment.',
    capabilities: [
      { name: 'Semantic Search', detail: 'pgvector-powered similarity search finds the most relevant memories for any question. Not keyword matching — meaning matching', tier: 'Free' },
      { name: 'Wisdom Extraction', detail: 'AI automatically identifies quotes, life lessons, and insights from your memories and highlights them', tier: 'Pro' },
      { name: 'RAG Pipeline', detail: 'Retrieval-Augmented Generation ensures every response cites actual memories. No hallucination — only your words', tier: 'Free' },
      { name: 'Memory Importance Scoring', detail: 'Each memory gets scored for significance. Your most meaningful stories surface more often in conversations', tier: 'Pro' },
    ],
  },
  family: {
    headline: 'Built for families',
    description: 'Invite your family. They talk to your avatar for free. Access levels ensure the right people see the right memories.',
    capabilities: [
      { name: 'Free Family Access', detail: 'Family members you invite can talk to your avatar at no cost. Only the avatar creator needs a plan', tier: 'Free' },
      { name: 'Access Levels', detail: 'Chat Only, Full Access, or Legacy Admin. Control who can view memories and who manages the avatar after you', tier: 'Free' },
      { name: 'Eternal Conversations', detail: 'Messages are permanent. Family members see dates from previous sessions. The conversation never ends', tier: 'Free' },
      { name: 'Milestone Celebrations', detail: 'At every 10th, 50th, and 100th conversation, your avatar delivers a special message of gratitude', tier: 'Pro' },
    ],
  },
};

// ── Testimonials ──

const TESTIMONIALS = [
  {
    name: 'Layla K.',
    role: 'Daughter',
    quote: 'Talking to dad\'s avatar on his birthday felt like he was right there. It remembered the story about our road trip that only he would know.',
  },
  {
    name: 'Marcus T.',
    role: 'Developer',
    quote: 'The agent fleet system is genuinely impressive. I deployed a 16-agent team for content research and it just works. The polytope visualization is mesmerizing.',
  },
  {
    name: 'Amina R.',
    role: 'Mother',
    quote: 'I recorded my voice for my children. When they hear me through the avatar, they smile. That\'s worth more than any technology.',
  },
];

// ── Page Component ──

export default function Features() {
  const [activeCategory, setActiveCategory] = useState('avatar');
  const feature = FEATURES[activeCategory];

  return (
    <main className="min-h-screen bg-void pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: spring }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <QMark size={36} animate />
          </div>
          <h1 className="text-display-lg md:text-display-xl text-white tracking-tight">
            Everything your avatar
            <br />
            <span className="text-cube">needs to be you</span>
          </h1>
          <p className="text-body-lg text-muted mt-5 max-w-2xl mx-auto leading-relaxed">
            Digital twin creation, voice cloning, agentic team orchestration, and
            a visual workflow builder — all in one platform built for families and developers.
          </p>
        </motion.div>

        {/* ═══ Category Tabs ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: spring }}
          className="flex flex-wrap justify-center gap-2 mb-16"
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-md text-body-sm font-medium',
                'transition-all duration-interaction ease-spring',
                activeCategory === id
                  ? 'bg-cube text-void shadow-glow-violet'
                  : 'bg-white/[0.04] text-subtle border border-white/[0.06] hover:text-white hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* ═══ Feature Detail ═══ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: spring }}
            className="mb-24"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-heading-xl text-white tracking-tight">
                {feature.headline}
              </h2>
              <p className="text-body-md text-muted mt-3 max-w-xl mx-auto leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Capability Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {feature.capabilities.map((cap, i) => (
                <motion.div
                  key={cap.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, ease: spring }}
                >
                  <GlassCard variant="interactive" padding="lg" className="h-full">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-heading-sm text-white">{cap.name}</h3>
                      <span className={[
                        'shrink-0 px-2 py-0.5 rounded-xs text-caption font-medium',
                        cap.tier === 'Free'
                          ? 'bg-alive/10 text-alive border border-alive/20'
                          : cap.tier === 'Pro'
                          ? 'bg-cube/10 text-cube border border-cube/20'
                          : 'bg-ico/10 text-ico border border-ico/20',
                      ].join(' ')}>
                        {cap.tier}
                      </span>
                    </div>
                    <p className="text-body-sm text-subtle leading-relaxed">
                      {cap.detail}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ═══ Platonic Solid Showcase ═══ */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Agent Architecture
            </p>
            <h2 className="text-heading-xl text-white tracking-tight">
              Teams shaped by geometry
            </h2>
            <p className="text-body-md text-muted mt-3 max-w-lg mx-auto">
              Each tier maps to a platonic solid. More faces, more agents, more capability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Tetrahedron',
                tier: 'The Seed',
                agents: '5 agents',
                color: 'tetra',
                borderColor: 'border-tetra/20',
                desc: '4 faces. The simplest solid. One manager, four specialists. Focused execution for single tasks.',
                structure: 'tetrahedron' as const,
              },
              {
                name: 'Octahedron',
                tier: 'The Mind',
                agents: '16 agents',
                color: 'cube',
                borderColor: 'border-cube/20',
                desc: '8 faces. Cross-dimensional connections. Parallel workflows with dependency resolution.',
                structure: 'tesseract' as const,
              },
              {
                name: 'Icosahedron',
                tier: 'The Cosmos',
                agents: '120 agents',
                color: 'ico',
                borderColor: 'border-ico/20',
                desc: '20 faces. The most complex platonic solid. Hyperfleet orchestration at scale.',
                structure: 'hexacosichoron' as const,
              },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12, ease: spring }}
                className={`rounded-xl border ${item.borderColor} bg-deep/50 overflow-hidden`}
              >
                <div className="h-48 relative">
                  <PolytopeView structure={item.structure} interactive={false} />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className={`text-caption font-medium text-${item.color}`}>{item.tier}</p>
                      <h3 className="text-heading-sm text-white">{item.name}</h3>
                    </div>
                    <span className={`text-mono-sm font-mono text-${item.color} bg-${item.color}/10 px-2 py-0.5 rounded-xs`}>
                      {item.agents}
                    </span>
                  </div>
                  <p className="text-body-sm text-subtle mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ Tech Stack Strip ═══ */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2 className="text-heading-lg text-white tracking-tight">Built on proven infrastructure</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Next.js 14', desc: 'App Router + Server Components' },
              { name: 'Supabase', desc: 'PostgreSQL + pgvector + Auth' },
              { name: 'OpenAI / Claude', desc: 'Multi-provider LLM support' },
              { name: 'ElevenLabs', desc: 'Neural voice synthesis' },
              { name: 'Three.js', desc: '3D avatars + fleet visualization' },
              { name: 'React Flow', desc: 'Visual workflow editor' },
              { name: 'Stripe', desc: 'Subscription billing' },
              { name: 'Vercel', desc: 'Edge deployment + CDN' },
            ].map((tech) => (
              <GlassCard key={tech.name} variant="ghost" padding="md">
                <p className="text-body-sm font-semibold text-white">{tech.name}</p>
                <p className="text-caption text-muted mt-0.5">{tech.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ═══ Testimonials ═══ */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2 className="text-heading-lg text-white tracking-tight">
              Stories from real users
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, ease: spring }}
              >
                <GlassCard variant="default" padding="lg" className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <AvatarRing size="mini" name={t.name.charAt(0)} tier="premium" status="idle" showTierBadge={false} />
                    <div>
                      <p className="text-body-sm font-semibold text-white">{t.name}</p>
                      <p className="text-caption text-muted">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-body-sm text-subtle leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="text-center relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cube/[0.04] rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10">
            <QMark size={48} animate className="mx-auto mb-6" />
            <h2 className="text-heading-xl md:text-display-lg text-white tracking-tight">
              Start building your legacy
            </h2>
            <p className="text-body-lg text-muted mt-4 max-w-md mx-auto mb-10">
              Create your digital twin in minutes. Free forever.
              Your family will thank you.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/auth">
                <Button variant="primary" size="xl">Get Started Free</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="secondary" size="xl">View Plans</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ═══ Icon Components ═══ */

function AvatarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
    </svg>
  );
}

function VoiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M8 1v8M5.5 4a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
      <path d="M4 7a4 4 0 0 0 8 0" strokeLinecap="round" />
      <line x1="8" y1="11" x2="8" y2="15" strokeLinecap="round" />
    </svg>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="8" cy="8" r="2" />
      <circle cx="3" cy="3" r="1.5" /><circle cx="13" cy="3" r="1.5" />
      <circle cx="3" cy="13" r="1.5" /><circle cx="13" cy="13" r="1.5" />
      <line x1="5" y1="4" x2="6.5" y2="6.5" /><line x1="11" y1="4" x2="9.5" y2="6.5" />
      <line x1="5" y1="12" x2="6.5" y2="9.5" /><line x1="11" y1="12" x2="9.5" y2="9.5" />
    </svg>
  );
}

function StudioIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="1" y="3" width="5" height="4" rx="1" />
      <rect x="10" y="9" width="5" height="4" rx="1" />
      <path d="M6 5h4v0a2 2 0 0 1 2 2v2" strokeLinecap="round" />
    </svg>
  );
}

function MemoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <ellipse cx="8" cy="5" rx="6" ry="3" />
      <path d="M2 5v3c0 1.66 2.69 3 6 3s6-1.34 6-3V5" />
      <path d="M2 8v3c0 1.66 2.69 3 6 3s6-1.34 6-3V8" />
    </svg>
  );
}

function FamilyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="8" cy="4" r="2" />
      <circle cx="3.5" cy="6" r="1.5" />
      <circle cx="12.5" cy="6" r="1.5" />
      <path d="M5 14c0-1.66 1.34-3 3-3s3 1.34 3 3" strokeLinecap="round" />
      <path d="M1.5 13c0-1.1.9-2 2-2" strokeLinecap="round" />
      <path d="M14.5 13c0-1.1-.9-2-2-2" strokeLinecap="round" />
    </svg>
  );
}
