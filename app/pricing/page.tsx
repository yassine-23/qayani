'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';

const PolytopeView = dynamic(() => import('@/components/3d/PolytopeView'), { ssr: false });

/* ============================================
   Pricing Page — Obsidian Depths

   Dark theme. Platonic solids are the hero.
   Three tiers: The Seed, The Mind, The Cosmos.
   Feature comparison + FAQ accordion.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

const TIERS = [
  {
    id: 'free',
    name: 'The Seed',
    subtitle: 'Tetrahedron -- 4 faces',
    price: { monthly: 'Free', yearly: 'Free' },
    structure: 'tetrahedron' as const,
    tierColor: 'tetra',
    glowClass: 'shadow-glow-amber',
    borderActive: 'border-tetra/30',
    cta: 'Start Free',
    popular: false,
    features: [
      'Basic avatar with text chat',
      '100 memories',
      '3 family connections',
      'Single LLM provider',
      'Community support',
    ],
  },
  {
    id: 'premium',
    name: 'The Mind',
    subtitle: 'Octahedron -- 8 faces',
    price: { monthly: '$29', yearly: '$290' },
    structure: 'tetrahedron' as const,
    tierColor: 'cube',
    glowClass: 'shadow-glow-violet',
    borderActive: 'border-cube/30',
    cta: 'Start 14-Day Trial',
    popular: true,
    features: [
      'Full avatar with voice cloning',
      'Unlimited memories',
      '10 family connections',
      'Voice + text chat',
      'Visual workflow builder',
      'Multiple LLM providers',
      'Google Drive integration',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'The Cosmos',
    subtitle: 'Icosahedron -- 20 faces',
    price: { monthly: '$99', yearly: '$990' },
    structure: 'hexacosichoron' as const,
    tierColor: 'ico',
    glowClass: 'shadow-glow-blue',
    borderActive: 'border-ico/30',
    cta: 'Get Started',
    popular: false,
    features: [
      'Agent fleet (multi-avatar)',
      'Unlimited everything',
      'Unlimited family members',
      'Full API access',
      'Custom tools & integrations',
      'Advanced analytics',
      'SSO & audit logs',
      'Dedicated support',
    ],
  },
];

const FAQS = [
  {
    q: 'What happens to my avatar when I pass away?',
    a: 'Your avatar continues to exist and serve your family forever. Designated Legacy Admins can manage the avatar, update its knowledge, and ensure it remains accessible to future generations.',
  },
  {
    q: 'Can family members access the avatar without paying?',
    a: 'Yes. Family members you invite can talk to your avatar for free. Only the avatar creator needs an active plan.',
  },
  {
    q: 'How accurate is the voice cloning?',
    a: 'Our voice synthesis achieves 97%+ accuracy with just 3 minutes of recorded speech. The more you record, the more natural it becomes.',
  },
  {
    q: 'Can I switch plans anytime?',
    a: 'Absolutely. Upgrade or downgrade at any time. When downgrading, your data is preserved but some features become read-only until you re-upgrade.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'All data is encrypted at rest and in transit. We use zero-knowledge architecture so even we cannot access your memories or conversations. You own your data completely.',
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'free') {
      window.location.href = '/auth';
      return;
    }
    setLoadingTier(tierId);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, billingPeriod: billing }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch {
      // handle error
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <main className="min-h-screen bg-void pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: spring }}
          className="text-center mb-16"
        >
          <p className="text-label uppercase tracking-[0.15em] text-cube mb-3">Pricing</p>
          <h1 className="text-display-lg md:text-display-xl text-primary tracking-tight">
            Choose your legacy
          </h1>
          <p className="text-body-lg text-muted mt-4 max-w-lg mx-auto">
            Every plan includes a permanent avatar. Choose how capable yours will be.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-body-sm ${billing === 'monthly' ? 'text-primary' : 'text-muted'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-12 h-6 rounded-full bg-lifted border border-white/[0.08] transition-colors"
              aria-label="Toggle billing period"
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-cube"
                animate={{ left: billing === 'yearly' ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-body-sm ${billing === 'yearly' ? 'text-primary' : 'text-muted'}`}>
              Yearly
            </span>
            {billing === 'yearly' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-caption font-medium text-alive bg-alive/10 px-2 py-0.5 rounded-xs"
              >
                Save 20%
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* ── Tier Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: spring }}
              className={[
                'relative rounded-xl border p-8 transition-all duration-transition ease-spring',
                tier.popular
                  ? `bg-cube/[0.04] ${tier.borderActive} ${tier.glowClass} scale-[1.02]`
                  : 'bg-lifted/50 border-white/[0.06] hover:border-white/[0.1]',
              ].join(' ')}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cube text-white text-caption font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              {/* 3D Polytope */}
              <div className="h-32 mb-6 relative">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-4 h-4 border-2 border-${tier.tierColor}/30 border-t-${tier.tierColor} rounded-full animate-spin`} />
                    </div>
                  }
                >
                  <PolytopeView structure={tier.structure} interactive={false} />
                </Suspense>
              </div>

              <h3 className="text-heading-sm text-primary">{tier.name}</h3>
              <p className="text-caption text-muted mt-1">{tier.subtitle}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-display-lg text-primary">
                  {tier.price[billing]}
                </span>
                {tier.price[billing] !== 'Free' && (
                  <span className="text-body-sm text-muted">
                    /{billing === 'yearly' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-body-sm text-subtle">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${tier.tierColor} mt-1.5 shrink-0`} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant={tier.popular ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full"
                  loading={loadingTier === tier.id}
                  onClick={() => handleSubscribe(tier.id)}
                >
                  {tier.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: spring }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-heading-xl text-primary text-center mb-10 tracking-tight">
            Frequently asked questions
          </h2>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-white/[0.06] rounded-md overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-body-md text-primary font-medium pr-4">{faq.q}</span>
                  <svg
                    className={`w-4 h-4 text-muted shrink-0 transition-transform duration-transition ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: spring }}
                    className="px-5 pb-5"
                  >
                    <p className="text-body-sm text-subtle leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <div className="text-center mt-20">
          <h2 className="text-heading-lg text-primary tracking-tight">
            Ready to build your legacy?
          </h2>
          <p className="text-body-md text-muted mt-3 mb-8">
            Start free. No credit card required.
          </p>
          <Link href="/auth">
            <Button variant="primary" size="xl">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
