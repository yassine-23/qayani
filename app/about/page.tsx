'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import QMark from '@/components/ui/QMark';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui';
import AvatarRing from '@/components/ui/AvatarRing';

/* ============================================
   ABOUT US — Origin, Mission, IP Declaration

   This page serves as:
   1. Brand storytelling (who we are, why we exist)
   2. IP documentation (Platonic Agentic Architecture)
   3. Team & founding story
   4. Prior art declaration with timestamps

   Published and deployed to establish provenance.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

const TIMELINE = [
  { date: 'Sep 2025', event: 'QAYANI founded — digital legacy preservation concept born', detail: 'Initial prototype: voice capture, personality modeling, AI chat with memories' },
  { date: 'Oct 2025', event: 'Avatar system launched — 3D digital twins with lip-sync', detail: 'Ready Player Me integration, morph target blending, gaze tracking, emotional intelligence' },
  { date: 'Nov 2025', event: 'RAG pipeline completed — semantic memory search', detail: 'pgvector embeddings, wisdom extraction, citation-based responses from personal memories' },
  { date: 'Dec 2025', event: 'Agent fleet architecture invented — Platonic Agentic Topology', detail: 'Agents structured as vertices of Platonic solids. Team coordination through geometric edge connections.' },
  { date: 'Jan 2026', event: 'Atomium visualization — 3D agent constellation', detail: 'Glass-sphere nodes, traveling data particles, single/hive/army fleet modes, camera zoom-to-agent' },
  { date: 'Feb 2026', event: 'CLI tool built — cross-platform agent deployment', detail: 'qayani init, qayani ingest, qayani run. Soul files in markdown. Deploy agents from terminal.' },
  { date: 'Apr 2026', event: 'Obsidian Depths redesign — viral-grade UI/UX', detail: 'GSAP scroll-driven landing, custom cursor, Geist typography, dark navy + yellow brand' },
  { date: 'Apr 27, 2026', event: 'Production deployment — GitHub + Vercel', detail: 'Full platform live. 33 API routes, 12 database tables, 320+ source files.' },
];

export default function About() {
  return (
    <main className="min-h-screen bg-void pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">

        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: spring }}
          className="text-center mb-20"
        >
          <QMark size={48} animate className="mx-auto mb-6" />
          <h1 className="text-display-lg md:text-display-xl text-white tracking-tight">
            About <span className="text-cube">QAYANI</span>
          </h1>
          <p className="text-body-lg text-muted mt-5 max-w-xl mx-auto leading-relaxed">
            We build technology that preserves human connection across time.
            Your voice, your wisdom, your personality — immortalized as an AI
            that your family can talk to forever.
          </p>
        </motion.div>

        {/* ═══ Mission ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: spring }}
          className="mb-20"
        >
          <GlassCard variant="elevated" padding="lg">
            <h2 className="text-heading-lg text-white tracking-tight mb-4">Our Mission</h2>
            <p className="text-body-md text-subtle leading-relaxed mb-4">
              Every day, irreplaceable wisdom is lost. Grandparents pass away before
              their grandchildren can ask them about life. Parents leave before they
              can give advice on careers, relationships, and the moments that matter most.
            </p>
            <p className="text-body-md text-subtle leading-relaxed mb-4">
              QAYANI exists to solve this. We combine voice cloning, personality modeling,
              semantic memory retrieval, and 3D avatar rendering to create digital twins
              that don&apos;t just store information — they <em>embody</em> a person. The way they
              speak, the way they think, the stories only they would tell.
            </p>
            <p className="text-body-md text-cube leading-relaxed font-medium">
              We believe every human voice deserves to be heard forever.
            </p>
          </GlassCard>
        </motion.section>

        {/* ═══ The Invention: Platonic Agentic Architecture ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease: spring }}
          className="mb-20"
        >
          <div className="mb-8">
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Original Innovation
            </p>
            <h2 className="text-heading-xl text-white tracking-tight">
              Platonic Agentic Architecture
            </h2>
            <p className="text-body-md text-muted mt-3 max-w-2xl">
              Invented and first implemented by QAYANI in December 2025.
              A novel approach to multi-agent orchestration using the mathematical
              properties of Platonic solids to define team topology.
            </p>
          </div>

          <GlassCard variant="default" padding="lg" className="mb-6">
            <h3 className="text-heading-sm text-white mb-4">How It Works</h3>
            <p className="text-body-sm text-subtle leading-relaxed mb-4">
              In traditional multi-agent systems, agents communicate through flat
              message buses or simple hierarchies. QAYANI&apos;s Platonic Architecture
              maps agents to the <strong className="text-white">vertices of Platonic solids</strong> —
              the five regular convex polyhedra that have fascinated mathematicians since antiquity.
            </p>
            <p className="text-body-sm text-subtle leading-relaxed mb-4">
              Each <strong className="text-white">edge</strong> of the solid represents a direct
              communication channel between two agents. Because Platonic solids are
              vertex-transitive (every vertex is equivalent to every other), every agent
              has the same number of connections — creating naturally balanced teams where
              no single agent becomes a bottleneck.
            </p>
            <p className="text-body-sm text-subtle leading-relaxed">
              The <strong className="text-white">geometric properties</strong> directly map to
              computational properties: edge count determines communication bandwidth,
              face count determines sub-team groupings, and the dual solid relationship
              enables hierarchical team composition (a fleet of fleets).
            </p>
          </GlassCard>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                solid: 'Tetrahedron',
                vertices: 4, edges: 6, faces: 4,
                agents: '4-5 agents',
                property: 'Every agent directly connected to every other. Maximum communication density. Ideal for focused, collaborative tasks.',
                color: 'tetra',
              },
              {
                solid: 'Octahedron',
                vertices: 6, edges: 12, faces: 8,
                agents: '6-16 agents',
                property: 'Each agent connects to 4 others. Sub-teams form naturally along face boundaries. Balanced specialization with cross-team awareness.',
                color: 'cube',
              },
              {
                solid: 'Icosahedron',
                vertices: 12, edges: 30, faces: 20,
                agents: '12-120 agents',
                property: 'Each agent connects to 5 others. 20 triangular faces create 20 natural sub-teams. Scales to fleets via 4D extensions (600-cell polytopes).',
                color: 'ico',
              },
            ].map((s, i) => (
              <motion.div
                key={s.solid}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1, ease: spring }}
              >
                <GlassCard variant="interactive" padding="md" className="h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-body-sm font-semibold text-${s.color}`}>{s.solid}</h4>
                    <span className="text-mono-sm text-muted">{s.agents}</span>
                  </div>
                  <div className="flex gap-4 mb-3 text-caption text-muted">
                    <span>{s.vertices} vertices</span>
                    <span>{s.edges} edges</span>
                    <span>{s.faces} faces</span>
                  </div>
                  <p className="text-caption text-subtle leading-relaxed">{s.property}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <GlassCard variant="ghost" padding="md" className="mt-6">
            <h4 className="text-body-sm font-semibold text-white mb-2">Key Innovation: Generalization Through Geometry</h4>
            <p className="text-caption text-subtle leading-relaxed">
              Because every vertex in a Platonic solid is equivalent, every agent in
              a QAYANI team benefits from the <strong className="text-white">collective intelligence
              of the entire topology</strong>. Information propagates along edges — an insight
              from any single agent reaches every other agent within at most
              diameter(G) hops. For the icosahedron, this diameter is 3: any agent is at most
              3 connections away from any other. This means local specialization
              (each agent has a specific role) combines with global awareness (each agent
              knows what the entire team knows) — the &quot;Platonic Effect.&quot;
            </p>
          </GlassCard>
        </motion.section>

        {/* ═══ Prior Art & IP Timeline ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: spring }}
          className="mb-20"
        >
          <div className="mb-8">
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Development Timeline
            </p>
            <h2 className="text-heading-xl text-white tracking-tight">
              Built in public since September 2025
            </h2>
            <p className="text-body-md text-muted mt-3">
              Every feature timestamped in Git. Every deployment logged on Vercel.
            </p>
          </div>

          <div className="space-y-3">
            {TIMELINE.map((item, i) => (
              <motion.div
                key={item.date}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06, ease: spring }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${i === TIMELINE.length - 1 ? 'bg-cube shadow-glow-violet' : 'bg-rim'}`} />
                  {i < TIMELINE.length - 1 && <div className="w-px flex-1 bg-white/[0.04]" />}
                </div>
                <div className="pb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-mono-sm text-cube font-medium">{item.date}</span>
                  </div>
                  <p className="text-body-sm font-medium text-white">{item.event}</p>
                  <p className="text-caption text-muted mt-1">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══ Technology DNA ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, ease: spring }}
          className="mb-20"
        >
          <h2 className="text-heading-lg text-white tracking-tight mb-6">Technology DNA</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Frontend', items: 'Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, GSAP, Three.js, React Three Fiber' },
              { label: 'AI/ML', items: 'OpenAI (embeddings + chat), Anthropic Claude, ElevenLabs (voice synthesis), pgvector (semantic search)' },
              { label: 'Database', items: 'Supabase PostgreSQL, pgvector extension, Row Level Security, UUID primary keys, real-time subscriptions' },
              { label: 'Infrastructure', items: 'Vercel (deployment + CDN), Stripe (billing), Upstash Redis (rate limiting), GitHub (source control)' },
              { label: '3D Rendering', items: 'Three.js meshPhysicalMaterial with glass transmission, 4D polytope projection, morph target lip-sync' },
              { label: 'Novel IP', items: 'Platonic Agentic Architecture, vertex-mapped agent topology, geometric team scaling, 4D extension to 600-cell polytopes' },
            ].map((tech) => (
              <GlassCard key={tech.label} variant="ghost" padding="md">
                <p className="text-label uppercase tracking-[0.1em] text-cube mb-2">{tech.label}</p>
                <p className="text-body-sm text-subtle leading-relaxed">{tech.items}</p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        {/* ═══ CTA ═══ */}
        <div className="text-center">
          <h2 className="text-heading-lg text-white tracking-tight mb-4">
            Join us in preserving what matters
          </h2>
          <p className="text-body-md text-muted mb-8">
            Every voice preserved is a bridge between generations.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth">
              <Button variant="primary" size="xl">Start Your Legacy</Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="secondary" size="xl">How It Works</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
