'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

/* ============================================
   Voice Capture — Recording Studio
   Obsidian Depths design system
   ============================================ */

const MAX_DURATION = 180; // 3 minutes in seconds

type CaptureState = 'idle' | 'recording' | 'recorded';
type QualityStage = 'good' | 'great' | 'studio';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------
   Voice Quality Gauge
   ------------------------------------------ */
function QualityGauge({ stage }: { stage: QualityStage }) {
  const stages: { key: QualityStage; label: string }[] = [
    { key: 'good', label: 'Good' },
    { key: 'great', label: 'Great' },
    { key: 'studio', label: 'Studio' },
  ];
  const activeIndex = stages.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-label uppercase text-muted tracking-widest">Voice Quality</span>
      <div className="flex items-center gap-1.5">
        {stages.map((s, i) => {
          const isActive = i <= activeIndex;
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <div
                className={[
                  'h-1.5 rounded-full transition-all duration-transition',
                  i === 0 ? 'w-8' : i === 1 ? 'w-10' : 'w-12',
                  isActive
                    ? i === 0
                      ? 'bg-tetra'
                      : i === 1
                        ? 'bg-alive'
                        : 'bg-speaking'
                    : 'bg-rim',
                ].join(' ')}
              />
              <span
                className={[
                  'text-caption transition-colors duration-transition',
                  i === activeIndex ? 'text-primary font-medium' : isActive ? 'text-subtle' : 'text-muted',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------
   Microphone Icon (SVG)
   ------------------------------------------ */
function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

/* ------------------------------------------
   Stop Icon (SVG)
   ------------------------------------------ */
function StopIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/* ------------------------------------------
   Play / Pause Icons
   ------------------------------------------ */
function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

/* ------------------------------------------
   Back Arrow Icon
   ------------------------------------------ */
function ArrowLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

/* ==========================================
   Unauthenticated CTA
   ========================================== */
function CaptureSignInCTA() {
  return (
    <main className="min-h-screen bg-void flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md"
      >
        {/* Mic circle */}
        <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-deep border border-rim flex items-center justify-center">
          <MicIcon className="w-10 h-10 text-muted" />
        </div>

        <h1 className="text-heading-lg text-primary mb-3">
          Voice Capture
        </h1>
        <p className="text-body-md text-muted mb-8">
          Sign in to record and preserve your voice as part of your digital legacy.
        </p>

        <Link href="/auth">
          <Button variant="primary" size="lg">
            Sign in to capture your voice
          </Button>
        </Link>

        <div className="mt-6">
          <Link href="/" className="text-body-sm text-subtle hover:text-primary transition-colors duration-interaction">
            Back to home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

/* ==========================================
   Main Capture Page (Authenticated)
   ========================================== */
export default function Capture() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // --- Recording state ---
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState<QualityStage>('good');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // --- Refs ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // --- Quality upgrades based on elapsed time ---
  useEffect(() => {
    if (elapsed >= 120) {
      setQuality('studio');
    } else if (elapsed >= 45) {
      setQuality('great');
    } else {
      setQuality('good');
    }
  }, [elapsed]);

  // --- Volume analysis loop ---
  const analyseVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setVolumeLevel(Math.min(rms * 4, 1)); // Normalize to 0-1
    animFrameRef.current = requestAnimationFrame(analyseVolume);
  }, []);

  // --- Start recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Set up audio analysis
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start volume analysis
      analyseVolume();

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setCaptureState('recorded');

        // Clean up stream & analysis
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtx.state !== 'closed') audioCtx.close();
        setVolumeLevel(0);
      };

      recorder.start(250); // Collect data every 250ms
      mediaRecorderRef.current = recorder;

      // Start timer
      setElapsed(0);
      setCaptureState('recording');
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            // Auto-stop at max duration
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to access microphone:', err);
    }
  }, [analyseVolume]);

  // --- Stop recording ---
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // --- Re-record ---
  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    setQuality('good');
    setIsPlaying(false);
    setCaptureState('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  // --- Playback ---
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  // --- Upload / use this take ---
  const useThisTake = useCallback(async () => {
    if (!audioBlob || !user) return;
    setIsUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (error) throw error;

      // Save recording metadata
      const { error: dbError } = await supabase.from('recordings').insert({
        user_id: user.id,
        file_path: data.path,
        duration: elapsed,
        status: 'processing',
      });

      if (dbError) throw dbError;

      router.push('/dashboard');
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, user, elapsed, router]);

  // --- Loading ---
  if (loading) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-rim border-t-cube rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  // --- Unauthenticated ---
  if (!user) {
    return <CaptureSignInCTA />;
  }

  // --- Authenticated Recording Studio ---
  return (
    <main className="min-h-screen bg-void relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-40 pointer-events-none" />

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
        />
      )}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Back to dashboard */}
        <div className="absolute top-6 left-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-body-sm text-subtle hover:text-primary transition-colors duration-interaction"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {/* Studio container */}
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Quality gauge — visible during recording & recorded */}
          <AnimatePresence>
            {(captureState === 'recording' || captureState === 'recorded') && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mb-10"
              >
                <QualityGauge stage={quality} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page title for idle state */}
          <AnimatePresence>
            {captureState === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-center mb-10"
              >
                <h1 className="text-heading-xl text-primary mb-2">Voice Capture</h1>
                <p className="text-body-md text-muted">
                  Tap the microphone to begin recording your legacy
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== The Circle ========== */}
          <div className="relative mb-8">
            {/* Glow ring behind circle during recording */}
            {captureState === 'recording' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 ${40 + volumeLevel * 60}px rgba(56, 189, 248, ${0.15 + volumeLevel * 0.25})`,
                }}
                animate={{
                  scale: [1, 1.03 + volumeLevel * 0.04, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            {/* Main circle */}
            <motion.button
              onClick={
                captureState === 'idle'
                  ? startRecording
                  : captureState === 'recording'
                    ? stopRecording
                    : togglePlayback
              }
              className={[
                'relative w-[200px] h-[200px] rounded-full',
                'flex items-center justify-center',
                'transition-all duration-transition ease-spring',
                'focus-visible:outline-2 focus-visible:outline-cube focus-visible:outline-offset-4',
                'cursor-pointer',
                // Base styles
                captureState === 'idle'
                  ? 'bg-deep border-2 border-rim hover:border-subtle'
                  : captureState === 'recording'
                    ? 'bg-deep border-2 border-speaking'
                    : 'bg-deep border-2 border-cube',
              ].join(' ')}
              whileHover={captureState === 'idle' ? { scale: 1.02 } : undefined}
              whileTap={{ scale: 0.97 }}
            >
              {/* Animated ring for recording state */}
              {captureState === 'recording' && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-speaking/40 pointer-events-none"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}

              {/* Icon */}
              <AnimatePresence mode="wait">
                {captureState === 'idle' && (
                  <motion.div
                    key="mic"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MicIcon className="w-16 h-16 text-muted" />
                  </motion.div>
                )}
                {captureState === 'recording' && (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StopIcon className="w-14 h-14 text-speaking" />
                  </motion.div>
                )}
                {captureState === 'recorded' && (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-14 h-14 text-cube-bright" />
                    ) : (
                      <PlayIcon className="w-14 h-14 text-cube-bright" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* ========== Timer ========== */}
          <AnimatePresence>
            {captureState === 'recording' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="text-center mb-8"
              >
                <p className="text-heading-lg text-primary font-mono tracking-wider">
                  {formatTime(elapsed)}
                  <span className="text-muted"> / {formatTime(MAX_DURATION)}</span>
                </p>
                <p className="text-caption text-speaking mt-1">Recording...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== Recorded State Info ========== */}
          <AnimatePresence>
            {captureState === 'recorded' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="text-center mb-8"
              >
                <p className="text-body-md text-subtle">
                  {formatTime(elapsed)} recorded
                </p>
                <p className="text-caption text-muted mt-1">
                  Tap the circle to {isPlaying ? 'pause' : 'play'} back
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== Idle State Hint ========== */}
          <AnimatePresence>
            {captureState === 'idle' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-caption text-muted text-center mb-8"
              >
                Up to 3 minutes per recording
              </motion.p>
            )}
          </AnimatePresence>

          {/* ========== Action Buttons (Recorded) ========== */}
          <AnimatePresence>
            {captureState === 'recorded' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4"
              >
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={reRecord}
                >
                  Re-record
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={useThisTake}
                  loading={isUploading}
                >
                  Use This Take
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== Volume indicator bars (recording) ========== */}
          <AnimatePresence>
            {captureState === 'recording' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-end justify-center gap-[3px] h-8 mt-6"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const center = 12;
                  const dist = Math.abs(i - center) / center;
                  const baseH = 0.2 + (1 - dist) * 0.3;
                  const h = Math.min(baseH + volumeLevel * (1 - dist) * 0.5, 1);
                  return (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-speaking"
                      animate={{
                        height: `${h * 100}%`,
                        opacity: 0.3 + h * 0.7,
                      }}
                      transition={{ duration: 0.08 }}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
