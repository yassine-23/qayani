'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/context';
import { ProtectedRoute } from '../../lib/auth/protected-route';
import AvatarRing from '@/components/ui/AvatarRing';
import Button from '@/components/ui/Button';

/* ============================================
   Auth Page — Obsidian Depths

   Minimal. One goal: get authenticated.
   Left: avatar + emotional message.
   Right: Google OAuth + email magic link.
   Dark theme. No benefit cards. No clutter.
   ============================================ */

const spring = [0.16, 1, 0.3, 1] as const;

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignIn, setIsSignIn] = useState(true);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isSignIn) {
        const result = await signIn(email, password);
        if (result.success) {
          router.push('/dashboard');
        } else {
          setMessage({ text: result.error || 'Sign in failed', type: 'error' });
        }
      } else {
        const result = await signUp(email, password, fullName);
        if (result.success) {
          setMessage({ text: 'Account created. You can now sign in.', type: 'success' });
          setIsSignIn(true);
          setPassword('');
        } else {
          setMessage({ text: result.error || 'Sign up failed', type: 'error' });
        }
      }
    } catch {
      setMessage({ text: 'An unexpected error occurred', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setMessage({ text: result.error || 'Google auth failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Google authentication failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <main className="min-h-screen bg-void flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-5xl grid lg:grid-cols-5 gap-12 lg:gap-20 items-center">

          {/* ── Left: Avatar + Message (3/5) ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: spring }}
            className="lg:col-span-3 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Abstract avatar */}
            <div className="relative mb-10">
              <div className="absolute inset-0 w-[320px] h-[320px] bg-cube/[0.04] rounded-full blur-[80px] -translate-x-4 -translate-y-4" />
              <AvatarRing
                size="hero"
                tier="premium"
                status="alive"
                name="Q"
              />
            </div>

            <h1 className="text-display-lg lg:text-display-xl text-white tracking-tight leading-tight">
              You&apos;re building something
              <br />
              <span className="text-cube">that will outlast you.</span>
            </h1>

            <p className="text-body-lg text-muted mt-4 max-w-md leading-relaxed">
              Preserve your voice, your wisdom, and your personality
              as an AI that your family can talk to forever.
            </p>
          </motion.div>

          {/* ── Right: Auth Form (2/5) ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: spring }}
            className="lg:col-span-2"
          >
            <div className="bg-deep border border-white/[0.06] rounded-xl p-8">

              {/* Error / Success */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-body-sm p-3 rounded-md mb-6 border ${
                    message.type === 'error'
                      ? 'bg-error/10 text-error border-error/20'
                      : 'bg-alive/10 text-alive border-alive/20'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}

              {/* Google OAuth — primary action */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-md bg-white text-void font-medium text-body-sm hover:bg-primary transition-colors duration-interaction disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-caption text-muted">or use email</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Tab toggle */}
              <div className="flex bg-void rounded-md p-1 mb-6">
                <button
                  onClick={() => { setIsSignIn(true); setMessage(null); }}
                  disabled={isLoading}
                  className={`flex-1 py-2 rounded-sm text-body-sm font-medium transition-all duration-interaction ${
                    isSignIn ? 'bg-lifted text-primary' : 'text-muted hover:text-subtle'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsSignIn(false); setMessage(null); }}
                  disabled={isLoading}
                  className={`flex-1 py-2 rounded-sm text-body-sm font-medium transition-all duration-interaction ${
                    !isSignIn ? 'bg-lifted text-primary' : 'text-muted hover:text-subtle'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isSignIn && (
                  <div>
                    <label className="block text-label uppercase tracking-[0.1em] text-muted mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-10 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 text-body-sm text-primary placeholder:text-muted/50 focus:outline-none focus:border-cube/40 transition-colors"
                      placeholder="Your full name"
                      required={!isSignIn}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-label uppercase tracking-[0.1em] text-muted mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 text-body-sm text-primary placeholder:text-muted/50 focus:outline-none focus:border-cube/40 transition-colors"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-label uppercase tracking-[0.1em] text-muted mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 text-body-sm text-primary placeholder:text-muted/50 focus:outline-none focus:border-cube/40 transition-colors"
                    placeholder="Min 6 characters"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={isLoading}
                >
                  {isSignIn ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              {/* Footer */}
              <p className="text-caption text-muted/50 text-center mt-6">
                By continuing you agree to our{' '}
                <Link href="#" className="underline hover:text-muted transition-colors">Terms</Link>.
                We never share your data.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
