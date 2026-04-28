'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../lib/auth/context';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/lab', label: 'Lab', accent: true },
  { href: '/features', label: 'Features' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20);
  });

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Desktop Navigation */}
      <motion.header
        className={`hidden lg:block fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-surface/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                className="w-9 h-9 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.08] flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src="/qayani-logo.png"
                  alt="QAYANI"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <span className="text-lg font-bold tracking-tight text-white">
                QAYANI
              </span>
            </Link>

            {/* Center nav links */}
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-white/45 hover:text-white/70'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-[14px] font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-neon shadow-[0_0_8px_rgba(0,255,102,0.5)]"
                          layoutId="nav-active"
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Right CTA */}
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse" />
              ) : user ? (
                <>
                  <Link href="/dashboard">
                    <motion.button
                      className="px-5 py-2.5 rounded-lg bg-neon text-black text-[13px] font-semibold transition-all hover:shadow-neon-md"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Dashboard
                    </motion.button>
                  </Link>
                  <motion.button
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 text-[13px] font-medium hover:bg-white/[0.06] hover:text-white/80 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign Out
                  </motion.button>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <motion.button
                      className="px-4 py-2.5 rounded-lg text-white/50 text-[13px] font-medium hover:text-white/80 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign In
                    </motion.button>
                  </Link>
                  <Link href="/onboarding">
                    <motion.button
                      className="px-5 py-2.5 rounded-lg bg-neon text-black text-[13px] font-semibold transition-all hover:shadow-neon-md"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Get Started
                    </motion.button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation */}
      <motion.div
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || isMobileMenuOpen
            ? 'bg-surface/90 backdrop-blur-2xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08]">
                <img
                  src="/qayani-logo.png"
                  alt="QAYANI"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                QAYANI
              </span>
            </Link>

            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]"
              whileTap={{ scale: 0.95 }}
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 9h16.5m-16.5 6.75h16.5" />
                </svg>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div
                          className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? 'bg-white/[0.05] text-white'
                              : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className="font-medium text-[15px]">{item.label}</span>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-neon" />
                          )}
                        </div>
                      </Link>
                    );
                  })}

                  <div className="pt-4 mt-2 border-t border-white/[0.06] space-y-2">
                    {loading ? (
                      <div className="w-full h-11 bg-white/5 rounded-xl animate-pulse" />
                    ) : user ? (
                      <>
                        <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full px-5 py-3 rounded-xl bg-neon text-black text-[14px] font-semibold">
                            Dashboard
                          </button>
                        </Link>
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-[14px] font-medium"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full px-5 py-3 rounded-xl bg-neon text-black text-[14px] font-semibold">
                            Get Started
                          </button>
                        </Link>
                        <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                          <button className="w-full px-5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-[14px] font-medium">
                            Sign In
                          </button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Spacer */}
      <div className="h-16 lg:h-20" />
    </>
  );
}
