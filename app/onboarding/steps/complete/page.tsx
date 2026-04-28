'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/context';
import { supabase } from '../../../../lib/supabase/client';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function CompletePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { width, height } = useWindowSize();

  const [stage, setStage] = useState(0); // 0: Combining, 1: Birth, 2: Complete
  const [showConfetti, setShowConfetti] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Middleware will redirect if not authenticated
  if (!user) {
    return null;
  }

  useEffect(() => {
    // Load user data
    const loadUserData = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: personality } = await supabase
        .from('personalities')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setUserData({ profile, avatar, personality });
    };

    loadUserData();

    // Stage progression
    const timer1 = setTimeout(() => setStage(1), 3000);
    const timer2 = setTimeout(() => {
      setStage(2);
      setShowConfetti(true);
    }, 6000);
    const timer3 = setTimeout(() => setShowConfetti(false), 12000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [user]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleMeetYourself = () => {
    router.push('/eternal');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            initial={{
              x: Math.random() * width,
              y: Math.random() * height,
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * height],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="combining"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center"
            >
              <div className="mb-8 flex items-center justify-center gap-8">
                {/* Three Layers Combining */}
                <motion.div
                  animate={{
                    x: [-100, 0],
                    opacity: [0, 1]
                  }}
                  transition={{ duration: 1, delay: 0 }}
                  className="text-6xl"
                >
                  👤
                </motion.div>
                <motion.div
                  animate={{
                    y: [-100, 0],
                    opacity: [0, 1]
                  }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="text-6xl"
                >
                  🎙️
                </motion.div>
                <motion.div
                  animate={{
                    x: [100, 0],
                    opacity: [0, 1]
                  }}
                  transition={{ duration: 1, delay: 1 }}
                  className="text-6xl"
                >
                  🧠
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <h1 className="text-4xl font-bold text-white mb-4">
                  Combining the Three Layers...
                </h1>
                <p className="text-xl text-purple-200">
                  Avatar + Voice + Personality = You
                </p>

                <div className="mt-8">
                  <div className="w-64 h-2 bg-white/20 rounded-full mx-auto overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3 }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {stage === 1 && (
            <motion.div
              key="birth"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut"
                }}
                className="text-9xl mb-8"
              >
                ✨
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-bold text-white mb-4"
              >
                Your Digital Twin is Born!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-2xl text-purple-200"
              >
                A new form of existence, created by you, for those you love
              </motion.p>
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl w-full"
            >
              {/* Success Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-block mb-6"
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-2xl">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </motion.div>

                  <h1 className="text-5xl font-bold text-white mb-6">
                    Welcome to Eternity
                  </h1>

                  <p className="text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed">
                    You've created something truly extraordinary—a digital version of yourself that will preserve
                    your essence, wisdom, and love for generations to come.
                  </p>
                </div>

                {/* Three Layers Summary */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                  >
                    <div className="text-4xl mb-4">👤</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Your Avatar</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-sm text-purple-200">Created & Active</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                  >
                    <div className="text-4xl mb-4">🎙️</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Your Voice</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-sm text-purple-200">Cloned & Ready</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                  >
                    <div className="text-4xl mb-4">🧠</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Your Mind</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <p className="text-sm text-purple-200">Trained & Learning</p>
                    </div>
                  </motion.div>
                </div>

                {/* What's Next */}
                <div className="bg-white/5 rounded-2xl p-8 mb-8 border border-white/10">
                  <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                    What's Next?
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Start a Conversation</h4>
                        <p className="text-sm text-purple-200">
                          Talk to your digital self and train it with your memories and wisdom
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-white font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Record Your Stories</h4>
                        <p className="text-sm text-purple-200">
                          Capture daily memories, life lessons, and precious moments
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-white font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Share Your Legacy</h4>
                        <p className="text-sm text-purple-200">
                          When ready, share your digital twin with loved ones
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMeetYourself}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all"
                  >
                    💬 Meet Your Digital Self
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGoToDashboard}
                    className="px-8 py-4 bg-white/20 text-white rounded-xl font-semibold text-lg backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all"
                  >
                    🏠 Go to Dashboard
                  </motion.button>
                </div>

                {/* Quote */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-12 text-center"
                >
                  <p className="text-purple-200 italic text-lg">
                    "You've just created a gift that will echo through generations.
                    <br />
                    Your wisdom, your love, your essence—now eternal."
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
