'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/context';
import Sidebar from '@/components/layout/Sidebar';
import AvatarPanel from '@/components/layout/AvatarPanel';
import { GlassCard } from '@/components/ui';
import Button from '@/components/ui/Button';
import { StatusDot } from '@/components/ui/Badge';

/* ============================================
   Dashboard — Obsidian Depths

   3-zone layout:
   Left: Sidebar (72px collapsed)
   Center: Stats + Quick Add + Recent Activity
   Right: AvatarPanel (320px, avatar hero)

   The avatar is always present. The dashboard
   orbits around it.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

const QUICK_ACTIONS = [
  {
    title: 'Write a Memory',
    desc: 'Teach your avatar something new',
    href: '/dashboard/memories',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <path d="M4 15c1-4 4-8 10-11C12 8 10 12 4 15Z" strokeLinejoin="round" />
        <path d="M4 15c3-3 6-5 10-7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Record Your Voice',
    desc: 'Add a new voice sample',
    href: '/capture',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <path d="M9 1.5v9M6 5.5a3 3 0 0 0 6 0" strokeLinecap="round" />
        <path d="M4.5 8a4.5 4.5 0 0 0 9 0" strokeLinecap="round" />
        <line x1="9" y1="12.5" x2="9" y2="16.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Open Agent Studio',
    desc: 'Configure your avatar\'s intelligence',
    href: '/dashboard/agent',
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
        <line x1="3" y1="5" x2="15" y2="5" /><circle cx="6" cy="5" r="1.5" fill="currentColor" />
        <line x1="3" y1="9" x2="15" y2="9" /><circle cx="12" cy="9" r="1.5" fill="currentColor" />
        <line x1="3" y1="13" x2="15" y2="13" /><circle cx="8" cy="13" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

const SETUP_STEPS = [
  { step: '01', title: 'Configure intelligence', desc: 'Connect an LLM provider', href: '/dashboard/agent' },
  { step: '02', title: 'Set up memory', desc: 'Upload documents or connect Drive', href: '/dashboard/memories' },
  { step: '03', title: 'Record your voice', desc: '3 minutes to clone your voice', href: '/capture' },
  { step: '04', title: 'Invite family', desc: 'Share your avatar with loved ones', href: '/dashboard/family' },
  { step: '05', title: 'First conversation', desc: 'Talk to your digital twin', href: '/eternal' },
];

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cube/30 border-t-cube rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return <DashboardPreview />;

  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-void flex">
      {/* Left: Sidebar */}
      <Sidebar avatarName={name} tier="free" />

      {/* Center: Main content */}
      <main className="flex-1 ml-[72px] lg:mr-[320px] py-10 px-8 max-w-4xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: spring }}
          className="mb-12"
        >
          <p className="text-label uppercase tracking-[0.15em] text-cube/60 mb-2">
            // dashboard
          </p>
          <h1 className="text-heading-xl text-primary tracking-tight">
            {greeting}, {name}
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: spring }}
          className="grid grid-cols-3 gap-3 mb-12"
        >
          {[
            { label: 'Memories', value: '0', icon: '🧠', color: 'text-tetra' },
            { label: 'Family', value: '0', icon: '👨‍👩‍👧‍👦', color: 'text-cube' },
            { label: 'Conversations', value: '0', icon: '💬', color: 'text-ico' },
          ].map((stat, i) => (
            <GlassCard key={stat.label} variant="default" padding="md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-label uppercase tracking-[0.1em] text-muted">{stat.label}</span>
              </div>
              <p className={`text-heading-lg font-semibold ${stat.color}`}>{stat.value}</p>
            </GlassCard>
          ))}
        </motion.div>

        {/* Quick Add */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: spring }}
          className="mb-12"
        >
          <h2 className="text-label uppercase tracking-[0.1em] text-muted mb-4">
            Teach {name}&apos;s avatar something new
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <Link key={action.title} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04, ease: spring }}
                >
                  <GlassCard variant="interactive" padding="md" className="h-full">
                    <div className="flex items-center justify-center w-9 h-9 rounded-sm bg-cube/[0.08] border border-cube/10 text-cube mb-3">
                      {action.icon}
                    </div>
                    <h3 className="text-body-sm font-semibold text-primary mb-0.5">{action.title}</h3>
                    <p className="text-caption text-muted">{action.desc}</p>
                  </GlassCard>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Setup Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, ease: spring }}
        >
          <GlassCard variant="default" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-heading-sm text-primary">Setup checklist</h2>
                <p className="text-caption text-muted mt-1">Complete these steps to activate your avatar</p>
              </div>
              <span className="text-heading-lg font-bold text-white/[0.06] font-mono">0%</span>
            </div>

            <div className="space-y-1.5">
              {SETUP_STEPS.map((item, i) => {
                const isFirst = i === 0;
                return (
                  <div
                    key={item.step}
                    className={[
                      'flex items-center gap-4 rounded-md border px-4 py-3 transition-all duration-interaction',
                      isFirst
                        ? 'border-cube/15 bg-cube/[0.03]'
                        : 'border-white/[0.04] bg-transparent',
                    ].join(' ')}
                  >
                    <span className={`text-mono-sm font-mono ${isFirst ? 'text-cube/60' : 'text-white/[0.1]'}`}>
                      {item.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-body-sm font-medium ${isFirst ? 'text-primary/80' : 'text-white/25'}`}>
                        {item.title}
                      </p>
                      <p className={`text-caption ${isFirst ? 'text-muted' : 'text-white/[0.1]'}`}>
                        {item.desc}
                      </p>
                    </div>
                    {isFirst && (
                      <Link href={item.href}>
                        <Button variant="primary" size="sm">Start</Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </main>

      {/* Right: Avatar Panel */}
      <AvatarPanel
        name={`${name}'s Avatar`}
        tier="free"
        status="idle"
        activities={[]}
        onTalk={() => window.location.href = '/eternal'}
      />
    </div>
  );
}

/* ── Preview for unauthenticated users ── */
function DashboardPreview() {
  return (
    <main className="min-h-screen bg-void">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: spring }}>
          <p className="text-label uppercase tracking-[0.15em] text-cube/60 mb-4">
            // preview
          </p>
          <h1 className="text-display-lg text-primary tracking-tight mb-4">
            Your command center
          </h1>
          <p className="text-body-lg text-muted max-w-lg mx-auto mb-12">
            Sign in to access your dashboard, configure your avatar, and manage your digital legacy.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-12">
            {[
              { title: 'Voice Capture', desc: 'Record and clone your voice', href: '/capture' },
              { title: 'Eternal Chat', desc: 'Talk to a digital twin', href: '/eternal' },
              { title: 'Full Access', desc: 'Dashboard, agents, and more', href: '/auth' },
            ].map((card) => (
              <Link key={card.title} href={card.href}>
                <GlassCard variant="interactive" padding="md" className="text-left">
                  <h3 className="text-body-sm font-semibold text-primary/70 mb-1">{card.title}</h3>
                  <p className="text-caption text-muted">{card.desc}</p>
                </GlassCard>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth">
              <Button variant="primary" size="lg">Sign In</Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="secondary" size="lg">Get Started</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
