'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import QMark from '@/components/ui/QMark';
import Button from '@/components/ui/Button';
import { GlassCard } from '@/components/ui';
import AvatarRing from '@/components/ui/AvatarRing';

const PolytopeView = dynamic(() => import('@/components/3d/PolytopeView'), { ssr: false });

/* ============================================
   HOW IT WORKS — The Platonic Agentic Architecture

   Deep technical dive into:
   1. How digital twins are built
   2. The Platonic solid agent topology
   3. Inter-agent communication via edges
   4. The Platonic Effect (generalization + specialization)
   5. 3D scaling from tetrahedron to 600-cell

   Each section has live 3D polytope renderings.
   This is the IP documentation page.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

// ── Step data ──

const STEPS = [
  {
    number: '01',
    title: 'Capture Your Essence',
    subtitle: 'Voice + Personality + Memories',
    description: 'Record your voice (3 minutes minimum). Answer personality questions (Big Five traits, communication style, values). Upload memories — stories, documents, photos. The system builds a multi-dimensional model of who you are.',
    details: [
      'Voice cloning via ElevenLabs neural synthesis — 97%+ accuracy',
      'Personality modeling using Big Five trait system with custom speech pattern analysis',
      'Memory ingestion via RAG pipeline — vector embeddings with pgvector for semantic retrieval',
      'Every memory scored for importance and categorized for contextual recall',
    ],
  },
  {
    number: '02',
    title: 'Build Your Agent',
    subtitle: 'Visual Workflow Configuration',
    description: 'Connect an LLM provider (OpenAI, Claude, Gemini, Mistral, Llama). Attach memory sources (Google Drive, uploaded documents, conversation history). Add tools (web search, calendar, email). Your avatar is the center node — everything connects to it.',
    details: [
      'Multi-provider LLM support — swap models with one click, no lock-in',
      'Node-based visual editor (React Flow) — drag, connect, configure',
      'Intelligence Level gauge — fills as more capabilities connect to your avatar',
      'CLI alternative: qayani init, qayani ingest, qayani run for terminal-native users',
    ],
  },
  {
    number: '03',
    title: 'Talk Forever',
    subtitle: 'Family Conversations That Never End',
    description: 'Your family talks to your avatar through text or voice. The avatar responds in your voice, drawing on your memories, using your communication style. Every conversation is permanent — dated, searchable, growing the avatar\'s wisdom over time.',
    details: [
      'Real-time voice synthesis — avatar speaks in your actual voice',
      '3D lip-synced avatar with gaze tracking and emotional expressions',
      'Memory-augmented responses — every answer cites specific memories',
      'Conversation milestones — celebrations at 10th, 50th, 100th interaction',
    ],
  },
];

// ── Platonic solids detailed data ──

const PLATONIC_SOLIDS = [
  {
    name: 'Tetrahedron',
    tier: 'The Seed',
    vertices: 4,
    edges: 6,
    faces: 4,
    faceShape: 'Equilateral triangles',
    agentCount: '4-5',
    degree: 3,
    diameter: 1,
    color: 'tetra',
    structure: 'tetrahedron' as const,
    topology: 'Complete graph K4 — every agent directly connected to every other agent. Maximum communication density. Zero latency between any pair.',
    useCase: 'Focused single-task execution. Research teams, content creation, code review. The entire team functions as one mind.',
    platonic_effect: 'With diameter 1, every agent has INSTANT access to every other agent\'s knowledge. Specialization is unnecessary — the team generalizes perfectly.',
  },
  {
    name: 'Octahedron',
    tier: 'The Mind',
    vertices: 6,
    edges: 12,
    faces: 8,
    faceShape: 'Equilateral triangles',
    agentCount: '6-16',
    degree: 4,
    diameter: 2,
    color: 'cube',
    structure: 'tesseract' as const,
    topology: 'Each agent connects to 4 others (degree 4). 8 triangular faces create 8 natural sub-teams of 3. Cross-team edges enable information flow across specializations.',
    useCase: 'Multi-domain workflows. An octahedron team can have researchers, writers, reviewers, and deployers — each specialized but aware of the whole.',
    platonic_effect: 'With diameter 2, any agent reaches any other in at most 2 hops. Each agent specializes (local role) while maintaining awareness of the full team output (global context via neighbor propagation).',
  },
  {
    name: 'Icosahedron',
    tier: 'The Cosmos',
    vertices: 12,
    edges: 30,
    faces: 20,
    faceShape: 'Equilateral triangles',
    agentCount: '12-120',
    degree: 5,
    diameter: 3,
    color: 'ico',
    structure: 'hexacosichoron' as const,
    topology: 'Each agent connects to 5 others (degree 5). 20 triangular faces form 20 sub-teams. The dual solid (dodecahedron) enables a meta-layer of 12 team leaders governing 20 working groups.',
    useCase: 'Enterprise fleet operations. Research divisions, content factories, customer service armies. Scales to 120 agents via 4D extension (600-cell polytope).',
    platonic_effect: 'With diameter 3, information reaches the entire fleet in 3 propagation steps. Each agent deeply specializes while the geometric structure GUARANTEES global coherence — no agent is ever more than 3 connections from the full picture.',
  },
];

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-void pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* ═══ Hero ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: spring }}
          className="text-center mb-24"
        >
          <QMark size={48} animate className="mx-auto mb-6" />
          <h1 className="text-display-lg md:text-display-xl text-white tracking-tight">
            How <span className="text-cube">QAYANI</span> Works
          </h1>
          <p className="text-body-lg text-muted mt-5 max-w-2xl mx-auto leading-relaxed">
            From capturing your voice to deploying agent fleets structured as Platonic solids.
            The complete technical story.
          </p>
        </motion.div>

        {/* ═══ 3 Steps ═══ */}
        <section className="mb-32">
          <div className="space-y-20">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: spring }}
                className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              >
                {/* Number */}
                <div className="shrink-0">
                  <span className="text-display-2xl font-bold text-cube/10 font-mono leading-none">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-label uppercase tracking-[0.15em] text-cube mb-2">{step.subtitle}</p>
                  <h2 className="text-heading-xl text-white tracking-tight mb-4">{step.title}</h2>
                  <p className="text-body-md text-subtle leading-relaxed mb-6">{step.description}</p>

                  <div className="space-y-2">
                    {step.details.map((detail, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-cube mt-2 shrink-0" />
                        <p className="text-body-sm text-muted leading-relaxed">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ The Platonic Agentic Architecture ═══ */}
        <section className="mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: spring }}
            className="text-center mb-16"
          >
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Original Innovation by QAYANI
            </p>
            <h2 className="text-display-lg text-white tracking-tight">
              The Platonic Agentic Architecture
            </h2>
            <p className="text-body-lg text-muted mt-5 max-w-2xl mx-auto leading-relaxed">
              Agents mapped to vertices. Communication channels mapped to edges.
              Team structure emerges from geometry. Scaling follows mathematics.
            </p>
          </motion.div>

          {/* The Core Insight */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, ease: spring }}
          >
            <GlassCard variant="elevated" padding="lg" glow="violet" className="mb-12">
              <h3 className="text-heading-md text-white mb-4">The Core Insight</h3>
              <p className="text-body-md text-subtle leading-relaxed mb-4">
                Traditional multi-agent systems use flat architectures (every agent talks to every other)
                or rigid hierarchies (manager delegates to workers). Both break at scale. Flat systems
                drown in N-squared communication overhead. Hierarchies create single points of failure.
              </p>
              <p className="text-body-md text-subtle leading-relaxed mb-4">
                <strong className="text-white">Platonic solids solve both problems simultaneously.</strong> They
                are the only 3D shapes where every vertex is topologically identical — meaning every
                agent has the same number of connections, the same structural importance, the same
                reach into the network. No bottlenecks. No single points of failure. Mathematically
                guaranteed balanced communication.
              </p>
              <p className="text-body-md text-cube leading-relaxed font-medium">
                The result: each agent specializes in its local task while the geometric
                structure propagates global awareness to every node. We call this
                the &quot;Platonic Effect&quot; — the simultaneous achievement of deep specialization
                and complete generalization through topology alone.
              </p>
            </GlassCard>
          </motion.div>

          {/* Individual Solids with 3D */}
          <div className="space-y-16">
            {PLATONIC_SOLIDS.map((solid, i) => (
              <motion.div
                key={solid.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: spring }}
              >
                <div className={`rounded-xl border border-${solid.color}/20 bg-deep/50 overflow-hidden`}>
                  <div className="flex flex-col lg:flex-row">
                    {/* 3D Rendering */}
                    <div className="lg:w-2/5 h-72 lg:h-auto relative">
                      <Suspense
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <div className={`w-5 h-5 border-2 border-${solid.color}/30 border-t-${solid.color} rounded-full animate-spin`} />
                          </div>
                        }
                      >
                        <PolytopeView structure={solid.structure} interactive={false} />
                      </Suspense>
                    </div>

                    {/* Details */}
                    <div className="lg:w-3/5 p-8">
                      <div className="flex items-center gap-3 mb-1">
                        <p className={`text-caption font-medium text-${solid.color}`}>{solid.tier}</p>
                        <span className="text-caption text-muted">|</span>
                        <span className="text-mono-sm text-muted">{solid.agentCount} agents</span>
                      </div>
                      <h3 className="text-heading-lg text-white tracking-tight mb-4">{solid.name}</h3>

                      {/* Properties grid */}
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        {[
                          { label: 'Vertices', value: solid.vertices },
                          { label: 'Edges', value: solid.edges },
                          { label: 'Faces', value: solid.faces },
                          { label: 'Diameter', value: solid.diameter },
                        ].map((prop) => (
                          <div key={prop.label} className="text-center">
                            <p className={`text-heading-md font-mono text-${solid.color}`}>{prop.value}</p>
                            <p className="text-caption text-muted">{prop.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-label uppercase tracking-[0.1em] text-muted mb-1.5">Topology</p>
                          <p className="text-body-sm text-subtle leading-relaxed">{solid.topology}</p>
                        </div>
                        <div>
                          <p className="text-label uppercase tracking-[0.1em] text-muted mb-1.5">Use Case</p>
                          <p className="text-body-sm text-subtle leading-relaxed">{solid.useCase}</p>
                        </div>
                        <div>
                          <p className="text-label uppercase tracking-[0.1em] text-cube mb-1.5">The Platonic Effect</p>
                          <p className="text-body-sm text-primary/80 leading-relaxed">{solid.platonic_effect}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ 4D Scaling ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: spring }}
          className="mb-24"
        >
          <GlassCard variant="default" padding="lg">
            <h2 className="text-heading-lg text-white tracking-tight mb-4">
              Beyond 3D: The 600-Cell Extension
            </h2>
            <p className="text-body-md text-subtle leading-relaxed mb-4">
              Platonic solids exist in 3 dimensions. But agent fleets can grow beyond 12 nodes.
              QAYANI extends the architecture into <strong className="text-white">4-dimensional polytopes</strong> —
              the higher-dimensional analogs of Platonic solids.
            </p>
            <p className="text-body-md text-subtle leading-relaxed mb-4">
              The <strong className="text-cube">600-cell (hexacosichoron)</strong> has 120 vertices,
              720 edges, 1200 triangular faces, and 600 tetrahedral cells. Each vertex
              connects to 12 others. The diameter is 5 — any agent reaches any other
              in at most 5 hops across a 120-agent fleet.
            </p>
            <p className="text-body-md text-subtle leading-relaxed mb-4">
              QAYANI renders these 4D structures in 3D through <strong className="text-white">stereographic
              projection</strong> — the same mathematical technique used to map the surface of
              a globe onto a flat map. As the 4D rotation angle changes, the projected
              3D structure morphs fluidly, creating the mesmerizing visualizations seen
              in the Atomium view.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tetra" />
                <span className="text-caption text-muted">4 vertices</span>
              </div>
              <span className="text-muted">&#8594;</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cube" />
                <span className="text-caption text-muted">6 vertices</span>
              </div>
              <span className="text-muted">&#8594;</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-ico" />
                <span className="text-caption text-muted">12 vertices</span>
              </div>
              <span className="text-muted">&#8594;</span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-gradient-to-r from-tetra via-cube to-ico" />
                <span className="text-caption text-white font-medium">120 vertices (4D)</span>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* ═══ CTA ═══ */}
        <div className="text-center">
          <QMark size={40} animate className="mx-auto mb-6" />
          <h2 className="text-heading-xl text-white tracking-tight mb-4">
            Experience the Platonic Effect
          </h2>
          <p className="text-body-md text-muted mb-8 max-w-md mx-auto">
            Build your first agent in 2 minutes. Scale to a fleet when you&apos;re ready.
            The geometry handles the complexity.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth">
              <Button variant="primary" size="xl">Start Building</Button>
            </Link>
            <Link href="/lab">
              <Button variant="secondary" size="xl">Open the Lab</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
