'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth/context';
import { ProtectedRoute } from '../../../lib/auth/protected-route';
import { supabase } from '../../../lib/supabase/client';
import EmptyState from '../../../components/ui/EmptyState';

interface Recording {
  id: string;
  personality_id: string;
  file_url: string;
  duration: number;
  transcript?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

const PROMPTS = [
  "How are you feeling today?",
  "Share a memory that shaped who you are",
  "What advice would you give your younger self?",
  "What moments brought you joy today?",
  "What do you want your family to remember about you?"
];

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
};

export default function RecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (user) {
      loadRecordings();
    }
  }, [user]);

  const loadRecordings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data: personalities } = await supabase
        .from('personalities' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (!personalities || personalities.length === 0) {
        setRecordings([]);
        return;
      }

      const { data: recordingsData, error } = await supabase
        .from('recordings' as any)
        .select('*')
        .eq('personality_id', (personalities as any[])[0].id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recordings:', error);
      } else {
        setRecordings((recordingsData as Recording[]) || []);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playRecording = (recording: Recording) => {
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying].pause();
      audioRefs.current[currentlyPlaying].currentTime = 0;
    }

    if (currentlyPlaying === recording.id) {
      setCurrentlyPlaying(null);
      return;
    }

    if (!audioRefs.current[recording.id]) {
      audioRefs.current[recording.id] = new Audio(recording.file_url);

      audioRefs.current[recording.id].addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setPlaybackTime(prev => ({ ...prev, [recording.id]: 0 }));
      });

      audioRefs.current[recording.id].addEventListener('timeupdate', () => {
        const audio = audioRefs.current[recording.id];
        if (audio) {
          setPlaybackTime(prev => ({ ...prev, [recording.id]: audio.currentTime }));
        }
      });
    }

    audioRefs.current[recording.id].play();
    setCurrentlyPlaying(recording.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPromptForIndex = (index: number) => {
    return PROMPTS[index % PROMPTS.length];
  };

  const statusStyles: Record<string, string> = {
    completed: 'bg-neon/[0.08] border-neon/15 text-neon/60',
    processing: 'bg-amber-500/[0.08] border-amber-500/15 text-amber-400/60',
    failed: 'bg-red-500/[0.08] border-red-500/15 text-red-400/60',
    pending: 'bg-white/[0.03] border-white/[0.06] text-white/30',
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-16">
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
                  // recordings
                </p>
                <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">
                  Voice Recordings
                </h1>
                <p className="mt-2 text-[14px] text-white/30">
                  Listen to your captured stories and voice signatures
                </p>
              </div>
              <Link href="/capture">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg bg-neon/[0.1] border border-neon/15 px-5 py-2.5 text-[13px] font-semibold text-neon/80 hover:bg-neon/[0.15] transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {icons.mic} Record New
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10"
          >
            {[
              { label: 'Total', value: recordings.length, icon: icons.mic },
              { label: 'Duration', value: formatDuration(recordings.reduce((t, r) => t + r.duration, 0)), icon: icons.clock },
              { label: 'Processed', value: recordings.filter(r => r.processing_status === 'completed').length, icon: icons.check },
              { label: 'Sessions', value: new Set(recordings.map(r => new Date(r.created_at).toDateString())).size, icon: icons.calendar },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-white/20">{s.icon}</div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20">{s.label}</span>
                </div>
                <p className="text-xl font-semibold text-white/80">{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Recordings List or Empty State */}
          {isLoading ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-16 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
            </div>
          ) : recordings.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-white/20">
                  Your Recordings
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recordings.map((recording, index) => (
                  <motion.div
                    key={recording.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Play button */}
                      <motion.button
                        onClick={() => playRecording(recording)}
                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          currentlyPlaying === recording.id
                            ? 'bg-neon/[0.12] border border-neon/25 text-neon'
                            : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {currentlyPlaying === recording.id ? icons.pause : icons.play}
                      </motion.button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-[14px] font-medium text-white/75">
                            Recording #{recordings.length - index}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusStyles[recording.processing_status]}`}>
                            {recording.processing_status}
                          </span>
                        </div>
                        <p className="text-[12px] text-white/25 truncate">
                          {getPromptForIndex(index)}
                        </p>

                        {recording.transcript && (
                          <p className="text-[12px] text-white/35 italic mt-2 line-clamp-1">
                            &ldquo;{recording.transcript}&rdquo;
                          </p>
                        )}

                        {/* Progress bar */}
                        {currentlyPlaying === recording.id && (
                          <div className="mt-3 w-full bg-white/[0.04] rounded-full h-1">
                            <motion.div
                              className="bg-neon/50 h-1 rounded-full"
                              style={{
                                width: `${((playbackTime[recording.id] || 0) / recording.duration) * 100}%`
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-mono text-white/40">{formatDuration(recording.duration)}</p>
                        <p className="text-[11px] text-white/15 mt-1">{formatDate(recording.created_at)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015]">
              <EmptyState
                variant="recordings"
                title="No recordings yet"
                description="Your voice is unique. Capture your stories, wisdom, and personality through voice recordings that will train your digital twin."
                hint="5 minutes of recording creates a meaningful voice signature"
                actions={[
                  { label: 'Make Your First Recording', href: '/capture' },
                ]}
              />
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
