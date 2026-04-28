'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import dynamic from 'next/dynamic';
import QMark from '@/components/ui/QMark';
import AvatarRing from '@/components/ui/AvatarRing';
import Button from '@/components/ui/Button';
import CustomCursor from './CustomCursor';
import SmoothScroll from './SmoothScroll';

gsap.registerPlugin(ScrollTrigger);

/* ============================================
   VIRAL LANDING PAGE — 5-Act Scroll Experience

   Act 1: The Hook — Q follows cursor, text types
   Act 2: The Demo — Avatar chat, scroll-scrubbed
   Act 3: The Builder — Nodes fly in on scroll
   Act 4: The Scale — Platonic solid morphs
   Act 5: The Close — Emotional CTA

   Every scroll pixel has meaning.
   ============================================ */

// ── Act 1: The Hook ──────────────────────────────────────────────

function ActHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200 };
  const qX = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), springConfig);
  const qY = useSpring(useTransform(mouseY, [0, 1], [-10, 10]), springConfig);

  const [showText, setShowText] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowText(true), 600);
    const timer2 = setTimeout(() => setShowCta(true), 2200);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      opacity: 0,
      y: -80,
      scale: 0.9,
    });
  }, { scope: containerRef });

  const words = ['Your', 'voice.', 'Your', 'wisdom.', 'Forever.'];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #FACC15 0%, transparent 60%)' }}
        />
      </div>

      {/* Q Mark — follows cursor */}
      <motion.div
        ref={qRef}
        style={{ x: qX, y: qY }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-12"
      >
        <div className="relative">
          {/* Pulsing glow behind Q */}
          <motion.div
            className="absolute inset-0 rounded-full blur-[60px]"
            style={{ width: 400, height: 400, left: -130, top: -130 }}
            animate={{
              opacity: [0.08, 0.15, 0.08],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-full h-full rounded-full bg-cube" />
          </motion.div>

          <svg viewBox="0 0 140 140" width={140} height={140} fill="none" aria-label="QAYANI">
            {/* Animated rays */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 22.5) * (Math.PI / 180);
              const r1 = 48, r2 = 62;
              return (
                <motion.line
                  key={i}
                  x1={70 + Math.cos(angle) * r1}
                  y1={70 + Math.sin(angle) * r1}
                  x2={70 + Math.cos(angle) * r2}
                  y2={70 + Math.sin(angle) * r2}
                  stroke="#FACC15"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 0.7] }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
            {/* Q letter */}
            <motion.text
              x="70" y="76"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="56"
              fontWeight="700"
              fontFamily="var(--font-geist-sans)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Q
            </motion.text>
          </svg>
        </div>
      </motion.div>

      {/* Typing headline */}
      <div className="relative z-10 text-center">
        <h1 className="text-display-xl md:text-display-2xl tracking-tight leading-[1.02] flex flex-wrap justify-center gap-x-4">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={showText ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={word === 'wisdom.' ? 'text-cube' : 'text-white'}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={showText ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="text-body-lg text-muted mt-6 max-w-lg mx-auto"
        >
          Build an AI that speaks like you, thinks like you, and preserves
          your legacy for the people you love.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={showCta ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-3 mt-10"
        >
          <Link href="/auth">
            <Button variant="primary" size="xl" data-cursor="invert">
              Start Your Legacy
            </Button>
          </Link>
          <Link href="#demo">
            <Button variant="secondary" size="xl">
              Watch It Work
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-caption text-muted/50">Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border border-white/[0.1] flex items-start justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 rounded-full bg-cube/60"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Act 2: The Demo (scroll-scrubbed chat) ───────────────────────

const DEMO_MESSAGES = [
  { role: 'user' as const, text: "Dad, tell me about when you met mom" },
  { role: 'avatar' as const, text: "It was September 1987 at the university library. She was reading Neruda — the same poet I loved. I asked if she thought love was invented or discovered. She said, 'Both.' I knew right then." },
  { role: 'user' as const, text: "What advice would you give me about my career?" },
  { role: 'avatar' as const, text: "Don't optimize for money — optimize for the feeling you get on Sunday evening. If you dread Monday, no salary will fix that. Find work that makes you forget what day it is." },
  { role: 'user' as const, text: "I miss you, Dad." },
  { role: 'avatar' as const, text: "I'm right here. Every story I told you, every lesson — they live in this conversation. Ask me anything, anytime. I'm not going anywhere." },
];

function ActDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useGSAP(() => {
    if (!sectionRef.current) return;

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const count = Math.floor(self.progress * (DEMO_MESSAGES.length + 1));
        setVisibleCount(Math.min(count, DEMO_MESSAGES.length));
      },
    });
  }, { scope: sectionRef });

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center px-6 py-20"
      style={{ height: `${150}vh` }}
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left — Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center gap-4">
          <AvatarRing
            size="hero"
            tier="premium"
            status={visibleCount > 0 ? 'speaking' : 'alive'}
            name="Dad"
          />
          <div className="text-center">
            <p className="text-body-sm font-semibold text-white">Dad&apos;s Avatar</p>
            <p className="text-caption text-cube">Speaking with wisdom</p>
          </div>
        </div>

        {/* Right — Chat */}
        <div className="flex-1 max-w-lg space-y-4">
          <p className="text-label uppercase tracking-[0.15em] text-cube mb-6">
            Live Demo — Scroll to Continue
          </p>

          {DEMO_MESSAGES.slice(0, visibleCount).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-lg px-5 py-4 max-w-[90%] ${
                msg.role === 'user'
                  ? 'bg-cube/10 border border-cube/20 ml-auto text-right'
                  : 'bg-deep border border-white/[0.06]'
              }`}
            >
              <p className="text-caption font-medium text-muted mb-1">
                {msg.role === 'user' ? 'You' : "Dad's Avatar"}
              </p>
              <p className="text-body-sm text-primary/90 leading-relaxed">
                {msg.text}
              </p>
            </motion.div>
          ))}

          {visibleCount < DEMO_MESSAGES.length && (
            <div className="flex items-center gap-1.5 px-4 py-3">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cube/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
              <span className="text-caption text-muted/40 ml-2">Scroll to reveal...</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Act 3: The Builder (nodes fly in) ────────────────────────────

const BUILDER_NODES = [
  { id: 'avatar', label: 'Your Digital Twin', color: '#FACC15', icon: '◉', x: 50, y: 50 },
  { id: 'memory', label: '142 memories loaded', color: '#0EA5E9', icon: '◆', x: 15, y: 35 },
  { id: 'llm', label: 'Claude Opus connected', color: '#8B5CF6', icon: '⬡', x: 85, y: 30 },
  { id: 'voice', label: 'Voice cloned at 97%', color: '#10B981', icon: '◈', x: 30, y: 75 },
  { id: 'family', label: '3 family members', color: '#F59E0B', icon: '◎', x: 70, y: 80 },
];

function ActBuilder() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [intelligence, setIntelligence] = useState(0);

  useGSAP(() => {
    if (!sectionRef.current) return;

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const nodes = Math.floor(self.progress * (BUILDER_NODES.length + 1));
        setVisibleNodes(Math.min(nodes, BUILDER_NODES.length));
        setIntelligence(Math.min(Math.round(self.progress * 100), 100));
      },
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20"
      style={{ height: '150vh' }}
    >
      <div className="w-full max-w-4xl">
        {/* Intelligence gauge */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-label uppercase tracking-[0.15em] text-cube">
            Build Your Agent
          </p>
          <div className="flex items-center gap-3">
            <span className="text-mono-sm text-muted">Intelligence Level</span>
            <div className="w-32 h-1.5 bg-rim rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cube rounded-full"
                style={{ width: `${intelligence}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-mono-sm text-cube font-semibold w-10 text-right">
              {intelligence}%
            </span>
          </div>
        </div>

        {/* Node canvas */}
        <div className="relative w-full aspect-[16/9] bg-deep/50 border border-white/[0.04] rounded-xl overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(244,244,245,0.02) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        >
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {BUILDER_NODES.slice(1, visibleNodes).map((node) => {
              const center = BUILDER_NODES[0];
              return (
                <motion.line
                  key={`line-${node.id}`}
                  x1={`${center.x}%`} y1={`${center.y}%`}
                  x2={`${node.x}%`} y2={`${node.y}%`}
                  stroke={node.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {BUILDER_NODES.slice(0, visibleNodes).map((node, i) => (
            <motion.div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold border-2"
                style={{
                  borderColor: node.color,
                  backgroundColor: `${node.color}10`,
                  color: node.color,
                  boxShadow: i === 0 && visibleNodes === BUILDER_NODES.length
                    ? `0 0 30px ${node.color}40`
                    : `0 0 12px ${node.color}15`,
                }}
              >
                {node.icon}
              </div>
              <span className="text-caption text-subtle whitespace-nowrap bg-void/80 px-2 py-0.5 rounded-xs">
                {node.label}
              </span>
            </motion.div>
          ))}

          {/* Completion state */}
          {visibleNodes === BUILDER_NODES.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cube/10 border border-cube/20 px-4 py-2 rounded-md"
            >
              <span className="text-body-sm font-semibold text-cube">Agent ready to deploy</span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Act 4: The Scale (platonic solid morph) ──────────────────────

function ActScale() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState(0);

  const tiers = [
    { name: 'Tetrahedron', agents: '5 agents', subtitle: 'The Seed', color: '#D97706' },
    { name: 'Octahedron', agents: '16 agents', subtitle: 'The Mind', color: '#FACC15' },
    { name: 'Icosahedron', agents: '120 agents', subtitle: 'The Cosmos', color: '#3B82F6' },
  ];

  useGSAP(() => {
    if (!sectionRef.current) return;

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        setTier(Math.min(Math.floor(self.progress * 3), 2));
      },
    });
  }, { scope: sectionRef });

  const current = tiers[tier];

  return (
    <section
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center px-6"
      style={{ height: '100vh' }}
    >
      <div className="text-center">
        <p className="text-label uppercase tracking-[0.15em] text-muted mb-4">
          Scale from solo to fleet
        </p>

        {/* Animated tier display */}
        <motion.div
          key={tier}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6"
        >
          {/* Geometric shape placeholder */}
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center border-2"
            style={{
              borderColor: current.color,
              boxShadow: `0 0 60px ${current.color}20`,
            }}
          >
            <motion.span
              className="text-display-xl font-bold"
              style={{ color: current.color }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {tier === 0 ? '△' : tier === 1 ? '◇' : '⬡'}
            </motion.span>
          </div>

          <div>
            <p className="text-caption font-medium" style={{ color: current.color }}>
              {current.subtitle}
            </p>
            <h2 className="text-heading-xl text-white tracking-tight mt-1">
              {current.name}
            </h2>
            <p className="text-heading-lg text-muted mt-2 font-mono">
              {current.agents}
            </p>
          </div>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mt-10">
          {tiers.map((t, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i <= tier ? t.color : 'rgba(255,255,255,0.1)',
                boxShadow: i === tier ? `0 0 8px ${t.color}60` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Act 5: The Close ─────────────────────────────────────────────

function ActClose() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #FACC15, transparent 60%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center max-w-2xl"
      >
        <QMark size={48} animate className="mx-auto mb-8" />

        <h2 className="text-display-lg md:text-display-xl text-white tracking-tight leading-tight">
          Your family deserves
          <br />
          to hear your voice
          <br />
          <span className="text-cube">forever.</span>
        </h2>

        <p className="text-body-lg text-muted mt-6 max-w-md mx-auto">
          No credit card. No setup time. Just you, your stories, and the
          people you love.
        </p>

        <Link href="/auth" className="inline-block mt-10">
          <Button variant="primary" size="xl" data-cursor="invert">
            Start Your Legacy — Free
          </Button>
        </Link>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-3 mt-10">
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
            2,400+ families preserving their stories
          </span>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 border-t border-white/[0.04] py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QMark size={16} />
            <span className="text-caption font-semibold text-white">QAYANI</span>
          </div>
          <nav className="flex items-center gap-5">
            {['Features', 'Pricing', 'Lab', 'Sign In'].map(label => (
              <Link
                key={label}
                href={`/${label.toLowerCase().replace(' ', '')}`}
                className="text-caption text-muted hover:text-white transition-colors duration-100"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </section>
  );
}

// ── Main Export ───────────────────────────────────────────────────

export default function ViralLanding() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <div className="bg-void">
        <ActHero />
        <ActDemo />
        <ActBuilder />
        <ActScale />
        <ActClose />
      </div>
    </SmoothScroll>
  );
}
