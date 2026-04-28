'use client';

import { useRef, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import ScrollReveal, { StaggerReveal, StaggerChild } from '@/components/lab/ScrollReveal';
import AvatarRing from '@/components/ui/AvatarRing';
import Button from '@/components/ui/Button';
import QMark, { QMarkHero } from '@/components/ui/QMark';

const PolytopeView = dynamic(() => import('@/components/3d/PolytopeView'), { ssr: false });

/* ============================================
   QAYANI Landing Page — Obsidian Depths

   The avatar is the hero. The product speaks
   through a living, breathing digital twin.
   Every animation serves the emotional truth:
   you are building something that outlasts you.
   ============================================ */

// ── Spring easing used throughout ──
const spring = [0.16, 1, 0.3, 1] as const;

// ── Terminal Demo (restyled) ──────────────────────────────────────────────

function TerminalDemo() {
  const lines = [
    { prefix: '>', text: 'qayani init --name "Your Name"', color: 'text-cube' },
    { prefix: '  ', text: 'Agent initialized. ID: agt_legacy_001', color: 'text-subtle' },
    { prefix: '>', text: 'qayani ingest ./memories/ --recursive', color: 'text-cube' },
    { prefix: '  ', text: 'Indexing 142 memories... embedding with ada-002', color: 'text-subtle' },
    { prefix: '  ', text: 'Memory vault: 6 entries | 847 chunks | 1.2M tokens', color: 'text-subtle' },
    { prefix: '>', text: 'qayani voice train --samples ./voice/', color: 'text-cube' },
    { prefix: '  ', text: 'Voice cloned. Accuracy: 97.2%', color: 'text-alive' },
    { prefix: '>', text: 'qayani run --channel web --channel eternal', color: 'text-cube' },
    { prefix: '  ', text: 'Avatar live. Your family can talk to you forever.', color: 'text-tetra' },
  ];

  return (
    <div className="bg-deep border border-white/[0.06] rounded-md p-4 font-mono text-mono-sm max-w-lg mx-auto">
      {/* Traffic lights */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-error/60" />
        <div className="w-2 h-2 rounded-full bg-tetra/60" />
        <div className="w-2 h-2 rounded-full bg-alive/60" />
        <span className="text-muted/40 ml-2 text-[10px]">qayani-terminal</span>
      </div>
      {/* Lines */}
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 + i * 0.5, duration: 0.4, ease: spring }}
          className="py-[2px]"
        >
          <span className={line.color}>{line.prefix}</span>
          <span className={`${line.prefix === '>' ? 'text-primary/80' : line.color} ml-1`}>
            {line.text}
          </span>
        </motion.div>
      ))}
      {/* Blinking cursor */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 7, duration: 0.8, repeat: Infinity }}
        className="text-cube inline-block mt-1"
      >
        _
      </motion.span>
    </div>
  );
}

// ── Feature Block (alternating) ──────────────────────────────────────────

function FeatureBlock({
  title,
  description,
  structure,
  align,
  tierColor,
  index,
}: {
  title: string;
  description: string;
  structure: 'tetrahedron' | 'tesseract' | 'hexacosichoron';
  align: 'left' | 'right';
  tierColor: string;
  index: number;
}) {
  return (
    <ScrollReveal delay={index * 0.1}>
      <div
        className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
          align === 'right' ? 'md:flex-row-reverse' : ''
        }`}
      >
        {/* 3D Polytope */}
        <div className="w-full md:w-1/2 aspect-square max-w-[360px] relative">
          <div
            className="absolute inset-0 rounded-full blur-[80px] opacity-10"
            style={{ background: tierColor }}
          />
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-cube/30 border-t-cube rounded-full animate-spin" />
              </div>
            }
          >
            <PolytopeView structure={structure} interactive={false} />
          </Suspense>
        </div>

        {/* Text */}
        <div className={`w-full md:w-1/2 ${align === 'right' ? 'md:text-right' : ''}`}>
          <h3 className="text-heading-lg text-primary tracking-tight">{title}</h3>
          <p className="text-body-lg text-muted mt-3 leading-relaxed max-w-md">
            {description}
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ── Pricing Teaser Card ──────────────────────────────────────────────────

function PricingCard({
  name,
  subtitle,
  price,
  tierClass,
  glowClass,
  borderClass,
  highlighted,
  cta,
  features,
}: {
  name: string;
  subtitle: string;
  price: string;
  tierClass: string;
  glowClass: string;
  borderClass: string;
  highlighted?: boolean;
  cta: string;
  features: string[];
}) {
  return (
    <div
      className={[
        'relative rounded-xl border p-8 transition-all duration-transition ease-spring',
        highlighted
          ? `bg-cube/[0.04] ${borderClass} shadow-glow-violet scale-[1.02]`
          : `bg-lifted/50 border-white/[0.06] hover:border-white/[0.1]`,
      ].join(' ')}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cube text-white text-caption font-semibold rounded-full">
          Most Popular
        </div>
      )}

      <h3 className="text-heading-sm text-primary">{name}</h3>
      <p className="text-caption text-muted mt-1">{subtitle}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-display-lg text-primary">{price}</span>
        {price !== 'Free' && <span className="text-body-sm text-muted">/mo</span>}
      </div>

      <ul className="mt-6 space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-body-sm text-subtle">
            <span className={`w-1 h-1 rounded-full ${tierClass}`} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/auth"
        className={[
          'block mt-8 py-3 rounded-md text-center text-body-sm font-semibold transition-all duration-interaction ease-spring',
          highlighted
            ? 'bg-cube text-white hover:bg-cube-bright hover:text-void'
            : 'bg-white/[0.04] text-primary border border-white/[0.08] hover:bg-white/[0.06]',
        ].join(' ')}
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Main Landing ─────────────────────────────────────────────────────────

export default function HomeLabLanding() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.97]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);

  return (
    <div className="bg-void min-h-screen overflow-hidden">

      {/* ═══════════════════ HERO — 50/50 SPLIT ═══════════════════ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative min-h-screen flex items-center px-6 md:px-12 lg:px-20 pt-20"
      >
        {/* Background — subtle icosahedron glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cube/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-tetra/[0.02] rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left — Text column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: spring }}
            className="flex-1 max-w-xl"
          >
            {/* Brand mark */}
            <div className="flex items-center gap-3 mb-8">
              <QMark size={28} />
              <span className="text-body-sm font-semibold text-white tracking-wide">QAYANI</span>
              <span className="text-caption text-muted/50">Digital Legacy Platform</span>
            </div>

            {/* Headline stack */}
            <h1 className="text-display-xl lg:text-display-2xl text-white tracking-tight leading-[1.02]">
              Your voice.
              <br />
              <span className="text-cube">Your wisdom.</span>
              <br />
              Forever.
            </h1>

            <p className="text-body-lg text-muted mt-6 leading-relaxed max-w-md">
              Build an AI that speaks the way you do, thinks the way you do,
              and never forgets. Preserve yourself for the people you love.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 mt-10">
              <Link href="/auth">
                <Button variant="primary" size="lg">
                  Start Your Legacy
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-10">
              <div className="flex -space-x-2">
                {['A', 'M', 'L', 'S'].map((initial, i) => (
                  <AvatarRing
                    key={i}
                    size="nano"
                    tier={i === 0 ? 'premium' : i === 1 ? 'enterprise' : 'free'}
                    name={initial}
                    status="alive"
                    showTierBadge={false}
                    className="ring-2 ring-void"
                  />
                ))}
              </div>
              <span className="text-caption text-muted">
                Join 2,400+ families preserving their stories
              </span>
            </div>
          </motion.div>

          {/* Right — 3D Avatar + polytope background */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: spring }}
            className="flex-1 flex items-center justify-center relative"
          >
            {/* Polytope wireframe behind avatar */}
            <div className="absolute inset-0 opacity-[0.06]">
              <Suspense fallback={null}>
                <PolytopeView structure="hexacosichoron" interactive={false} />
              </Suspense>
            </div>

            {/* Brand hero mark */}
            <div className="relative z-10">
              <QMarkHero size={200} />
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-white/[0.08] flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-white/20" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══════════════════ TERMINAL DEMO ═══════════════════ */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="text-center mb-10">
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Built for developers
            </p>
            <h2 className="text-heading-xl text-primary tracking-tight">
              From CLI to forever
            </h2>
            <p className="text-body-md text-muted mt-3 max-w-lg mx-auto">
              Initialize, ingest memories, clone your voice, and deploy — all from the terminal.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <TerminalDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════ FEATURES — 4 ALTERNATING ═══════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-20">
            <p className="text-label uppercase tracking-[0.15em] text-tetra mb-3">
              How it works
            </p>
            <h2 className="text-heading-xl md:text-display-lg text-primary tracking-tight">
              Four pillars of your digital legacy
            </h2>
          </ScrollReveal>

          <div className="space-y-24 md:space-y-32">
            <FeatureBlock
              index={0}
              title="Knowledge"
              description="Feed it everything you know. Upload documents, connect Google Drive, or write memories directly. Your avatar learns from every source."
              structure="tetrahedron"
              align="left"
              tierColor="#D97706"
            />
            <FeatureBlock
              index={1}
              title="Voice"
              description="It sounds exactly like you. Record 3 minutes of speech and our AI clones your voice with 97%+ accuracy. Your words, your tone, forever."
              structure="tesseract"
              align="right"
              tierColor="#7C3AED"
            />
            <FeatureBlock
              index={2}
              title="Conversation"
              description="Family talks to you forever. Your avatar answers questions, shares stories, and remembers every interaction. It grows wiser with each conversation."
              structure="tetrahedron"
              align="left"
              tierColor="#3B82F6"
            />
            <FeatureBlock
              index={3}
              title="Intelligence"
              description="Connect any LLM provider. OpenAI, Claude, Gemini, or local models. Add tools, memory sources, and output channels through a visual workflow builder."
              structure="hexacosichoron"
              align="right"
              tierColor="#7C3AED"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ PRICING TEASER ═══════════════════ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">
              Pricing
            </p>
            <h2 className="text-heading-xl md:text-display-lg text-primary tracking-tight">
              Choose your legacy
            </h2>
            <p className="text-body-md text-muted mt-3">
              Every plan includes a permanent avatar. Choose how capable yours will be.
            </p>
          </ScrollReveal>

          <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.12}>
            <StaggerChild>
              <PricingCard
                name="The Seed"
                subtitle="Tetrahedron -- 4 faces"
                price="Free"
                tierClass="bg-tetra"
                glowClass="shadow-glow-amber"
                borderClass="border-tetra/30"
                cta="Start Free"
                features={[
                  'Basic avatar with voice',
                  '100 memories',
                  '3 family connections',
                  'Text chat only',
                  'Community support',
                ]}
              />
            </StaggerChild>
            <StaggerChild>
              <PricingCard
                name="The Mind"
                subtitle="Octahedron -- 8 faces"
                price="$29"
                tierClass="bg-cube"
                glowClass="shadow-glow-violet"
                borderClass="border-cube/30"
                highlighted
                cta="Start 14-Day Trial"
                features={[
                  'Full avatar with voice cloning',
                  'Unlimited memories',
                  '10 family connections',
                  'Voice + text chat',
                  'Workflow builder',
                  'Priority support',
                ]}
              />
            </StaggerChild>
            <StaggerChild>
              <PricingCard
                name="The Cosmos"
                subtitle="Icosahedron -- 20 faces"
                price="$99"
                tierClass="bg-ico"
                glowClass="shadow-glow-blue"
                borderClass="border-ico/30"
                cta="Get Started"
                features={[
                  'Agent fleet (multi-avatar)',
                  'Unlimited everything',
                  'Unlimited family',
                  'API access',
                  'Custom tools & integrations',
                  'Dedicated support',
                ]}
              />
            </StaggerChild>
          </StaggerReveal>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cube/[0.03] rounded-full blur-[100px]" />
        </div>

        <ScrollReveal variant="scale" className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-heading-xl md:text-display-lg text-primary tracking-tight">
            Build something that
            <br />
            outlasts everything
          </h2>
          <p className="text-body-lg text-muted mt-5 max-w-md mx-auto">
            Your family deserves to hear your voice, your wisdom, and your love — even when you can&apos;t be there.
          </p>
          <Link href="/auth">
            <Button variant="primary" size="xl" className="mt-10">
              Start Your Legacy
            </Button>
          </Link>
          <p className="text-caption text-muted/50 mt-4">Free forever. No credit card required.</p>
        </ScrollReveal>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <QMark size={20} />
            <span className="text-body-sm font-semibold text-white">QAYANI</span>
            <span className="text-caption text-muted/40">Digital Legacy Platform</span>
          </div>
          <nav className="flex items-center gap-6">
            {[
              { href: '/features', label: 'Features' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/lab', label: 'Lab' },
              { href: '/auth', label: 'Sign In' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-caption text-muted hover:text-primary transition-colors duration-interaction"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
