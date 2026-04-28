'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import EmptyState from '@/components/ui/EmptyState';

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.315z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>,
  film: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" /></svg>,
  voice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424" /></svg>,
  brain: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  face: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
};

const emotions = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'excited', label: 'Excited' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'surprised', label: 'Surprised' },
];

const samplePhrases = [
  "Hello! It's wonderful to see you.",
  "I'm here to share my wisdom with you.",
  "Tell me, how was your day?",
  "I love you more than words can express.",
  "Remember to stay true to yourself.",
];

export default function ViewAvatarPage() {
  const { user, loading } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState(samplePhrases[0]);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const playPhrase = (phrase: string) => {
    setSelectedPhrase(phrase);
    setIsSpeaking(true);
    setIsPlaying(true);
    setTimeout(() => {
      setIsSpeaking(false);
      setIsPlaying(false);
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.2em] text-white/25 hover:text-neon/60 transition-colors mb-5"
          >
            {icons.back} Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-mono uppercase tracking-[0.25em] text-neon/60 mb-3">
                // avatar
              </p>
              <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">
                Your Digital Twin
              </h1>
              <p className="mt-2 text-[14px] text-white/30">
                3D avatar with your voice and personality
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Avatar Viewer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
              {/* Canvas area */}
              <div className="aspect-[16/10] flex items-center justify-center relative">
                {isSpeaking ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-center space-y-6"
                  >
                    {/* Waveform bars */}
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-neon/40 rounded-full"
                          animate={{
                            height: [8, 24 + Math.sin(i) * 16, 8],
                          }}
                          transition={{
                            delay: i * 0.08,
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[15px] text-white/50 font-light max-w-md mx-auto px-8 italic">
                      &ldquo;{selectedPhrase}&rdquo;
                    </p>
                  </motion.div>
                ) : (
                  <EmptyState
                    variant="avatar"
                    title="Ready to speak"
                    description="Your 3D avatar will render here once processing is complete. Select an emotion and test a phrase to preview."
                    hint="avatar processing typically takes 2-5 minutes"
                    className="py-8"
                  />
                )}

                {/* Status badge */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/[0.06] bg-surface/80 backdrop-blur-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-neon animate-pulse' : 'bg-white/15'}`} />
                    <span className="text-[10px] font-mono text-white/30">
                      {isSpeaking ? 'SPEAKING' : 'IDLE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls bar */}
              <div className="border-t border-white/[0.04] px-5 py-3 flex items-center gap-3">
                <motion.button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isPlaying ? icons.pause : icons.play}
                </motion.button>
                <motion.button
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {icons.film}
                </motion.button>
                <motion.button
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {icons.camera}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            {/* Emotions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 mb-4">
                Emotions
              </p>
              <div className="grid grid-cols-3 gap-2">
                {emotions.map((emotion) => (
                  <button
                    key={emotion.id}
                    onClick={() => setCurrentEmotion(emotion.id)}
                    className={`px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all ${
                      currentEmotion === emotion.id
                        ? 'bg-neon/[0.1] border border-neon/20 text-neon/80'
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/30 hover:bg-white/[0.04]'
                    }`}
                  >
                    {emotion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Voice */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 mb-4">
                Test Voice
              </p>
              <div className="space-y-2">
                {samplePhrases.map((phrase, index) => (
                  <button
                    key={index}
                    onClick={() => playPhrase(phrase)}
                    disabled={isSpeaking}
                    className={`w-full text-left p-3 rounded-lg text-[12px] transition-all ${
                      selectedPhrase === phrase && isSpeaking
                        ? 'bg-neon/[0.1] border border-neon/20 text-neon/80'
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/35 hover:bg-white/[0.04]'
                    } ${isSpeaking ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-white/20">{selectedPhrase === phrase && isSpeaking ? icons.voice : icons.voice}</div>
                      <span>{phrase}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 mb-4">
                Stats
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Voice Match', value: 95 },
                  { label: 'Personality', value: 88 },
                  { label: 'Training Data', value: 72 },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] text-white/30">{stat.label}</span>
                      <span className="text-[12px] font-mono text-neon/60">{stat.value}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-neon/30 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-2">
                  {[
                    { label: 'Conversations', value: '0' },
                    { label: 'Training Hours', value: '2.5h' },
                    { label: 'Model Version', value: 'v2.1' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-[12px]">
                      <span className="text-white/20">{item.label}</span>
                      <span className="text-white/50 font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link href="/eternal">
                <motion.button
                  className="w-full rounded-lg bg-neon/[0.1] border border-neon/20 py-3 text-[13px] font-semibold text-neon/80 hover:bg-neon/[0.15] transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Start Conversation
                </motion.button>
              </Link>
              <Link href="/dashboard/avatar/create">
                <motion.button
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-3 text-[13px] font-medium text-white/40 hover:bg-white/[0.06] transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Edit Avatar
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-3 mt-8"
        >
          {[
            { icon: icons.face, title: 'Realistic Expressions', desc: 'Authentic facial expressions and emotions based on context and personality.' },
            { icon: icons.voice, title: 'Voice Clone', desc: 'Captures your unique voice, tone, accent, and speaking patterns.' },
            { icon: icons.brain, title: 'Your Personality', desc: 'Responds with your values, wisdom, and communication style.' },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 mb-4">
                {card.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-white/70 mb-1">{card.title}</h3>
              <p className="text-[12px] text-white/25 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
