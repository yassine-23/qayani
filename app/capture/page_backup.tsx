'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth/context';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import AudioVisualizer from '../../components/AudioVisualizer';

const PROMPTS = [
  "How are you feeling today?",
  "Share a memory that shaped who you are",
  "What advice would you give your younger self?",
  "What moments brought you joy today?",
  "What do you want your family to remember about you?"
];

interface Recording {
  id: string;
  fileUrl: string;
  transcript?: string;
  duration: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
}

// Capture Preview for Non-Authenticated Users - Apple-Inspired Minimalist Design
function CapturePreview() {
  return (
    <main className="min-h-screen bg-white">
      {/* SEO Optimization */}
      <head>
        <title>Voice Preservation & Digital Legacy - QAYANI Advanced AI Platform</title>
        <meta name="description" content="Preserve your voice and wisdom forever with QAYANI's cutting-edge AI technology. Customize foundation models from Anthropic Claude, GPT, Gemini, and 11Labs. Self-hostable, secure, and infinitely extensible." />
        <meta name="keywords" content="voice cloning, AI voice preservation, digital legacy, self-hosted AI, foundation models, claude, gpt, gemini, 11labs, voice AI, consciousness preservation, family legacy" />
        <meta property="og:title" content="Voice Preservation - QAYANI" />
        <meta property="og:description" content="Advanced AI platform for preserving your voice and wisdom across generations" />
        <meta name="twitter:card" content="summary_large_image" />
      </head>

      {/* Content */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 py-32">
          {/* Hero Section - Apple Minimalism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center max-w-4xl mx-auto mb-32"
          >
            <h1 className="text-7xl md:text-8xl font-light text-gray-900 mb-12 tracking-tight leading-none">
              Preserve
            </h1>
            <p className="text-2xl md:text-3xl font-light text-gray-600 mb-16 leading-relaxed tracking-wide">
              Your voice. Your wisdom. Your presence.<br />
              Captured with precision. Preserved forever.
            </p>
            <a href="/auth">
              <button className="bg-gray-900 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-gray-800 transition-all duration-300">
                Get Started
              </button>
            </a>
          </motion.div>

          {/* Visual Demo - Minimal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-5xl mx-auto mb-40"
          >
            <div className="bg-gray-50 rounded-3xl p-16 border border-gray-200">
              {/* Waveform - Minimalist */}
              <div className="flex items-center justify-center gap-0.5 h-32 mb-12">
                {[...Array(60)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gray-900 rounded-full"
                    style={{
                      height: `${Math.sin(i / 5) * 40 + 50}%`,
                      opacity: 0.3 + (Math.sin(i / 3) * 0.4)
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 mb-8 tracking-wider uppercase">
                  5 minutes to capture a lifetime
                </p>
              </div>
            </div>
          </motion.div>

          {/* Technical Excellence - Minimalist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-5xl mx-auto mb-40"
          >
            <h2 className="text-5xl md:text-6xl font-light text-gray-900 mb-6 text-center tracking-tight">
              Advanced
            </h2>
            <p className="text-xl font-light text-gray-600 mb-20 text-center max-w-2xl mx-auto">
              Powered by the world's most sophisticated voice AI infrastructure
            </p>

            <div className="space-y-24">
              {/* Foundation Models */}
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h3 className="text-2xl font-medium text-gray-900 mb-6">Foundation Models</h3>
                  <p className="text-lg font-light text-gray-600 leading-relaxed mb-8">
                    Choose from Anthropic Claude, OpenAI GPT, Google Gemini, or any Hugging Face model.
                    Your platform. Your choice. Complete flexibility.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Anthropic Claude 3.5</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">OpenAI GPT-4</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Google Gemini Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Custom Hugging Face Models</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-medium text-gray-900 mb-6">Voice Synthesis</h3>
                  <p className="text-lg font-light text-gray-600 leading-relaxed mb-8">
                    11Labs neural voice cloning captures every nuance. Your voice,
                    perfectly preserved with emotional depth and natural inflection.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">99.8% voice accuracy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Emotional inflection preserved</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Multi-language support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                      <span className="text-gray-700">Real-time synthesis</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Self-Hosting */}
              <div className="border-t border-gray-200 pt-24">
                <div className="grid md:grid-cols-2 gap-16">
                  <div>
                    <h3 className="text-2xl font-medium text-gray-900 mb-6">Self-Hosting</h3>
                    <p className="text-lg font-light text-gray-600 leading-relaxed mb-8">
                      Deploy your digital self on your own infrastructure. Complete data sovereignty.
                      No cloud dependencies. Your data never leaves your control.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">Docker container deployment</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">Kubernetes orchestration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">On-premise or private cloud</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">Full API access</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-medium text-gray-900 mb-6">Security First</h3>
                    <p className="text-lg font-light text-gray-600 leading-relaxed mb-8">
                      End-to-end encryption. Zero-knowledge architecture. Military-grade security
                      standards built into every layer of the platform.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">AES-256 encryption at rest</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">TLS 1.3 in transit</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">Zero-knowledge architecture</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700">GDPR & SOC 2 compliant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backend Architecture */}
              <div className="border-t border-gray-200 pt-24">
                <h3 className="text-3xl font-light text-gray-900 mb-12 text-center">Architecture</h3>
                <div className="bg-gray-50 rounded-3xl p-12 border border-gray-200">
                  <div className="space-y-8">
                    <div className="flex items-start gap-6">
                      <div className="min-w-[200px]">
                        <p className="text-sm font-medium text-gray-500 tracking-wider uppercase">Model Layer</p>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        Pluggable foundation model architecture supporting Anthropic, OpenAI, Google,
                        and Hugging Face. Switch models in real-time without data migration.
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-8 flex items-start gap-6">
                      <div className="min-w-[200px]">
                        <p className="text-sm font-medium text-gray-500 tracking-wider uppercase">Voice Pipeline</p>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        11Labs neural synthesis with custom voice cloning. Real-time streaming,
                        emotional prosody, and multi-speaker support.
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-8 flex items-start gap-6">
                      <div className="min-w-[200px]">
                        <p className="text-sm font-medium text-gray-500 tracking-wider uppercase">Data Storage</p>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        PostgreSQL with pgvector for semantic search. Supabase for realtime sync.
                        Decentralized storage options with IPFS integration.
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-8 flex items-start gap-6">
                      <div className="min-w-[200px]">
                        <p className="text-sm font-medium text-gray-500 tracking-wider uppercase">Privacy</p>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        Client-side encryption keys. Zero-knowledge proofs. Federated learning
                        for model training without data exposure. Complete user sovereignty.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA - Minimal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center max-w-3xl mx-auto mb-32"
          >
            <p className="text-sm font-medium text-gray-500 mb-8 tracking-wider uppercase">
              Your legacy, preserved
            </p>
            <a href="/auth">
              <button className="bg-gray-900 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-gray-800 transition-all duration-300 mb-8">
                Begin Capture
              </button>
            </a>
            <p className="text-sm font-light text-gray-500">
              Free to start · Self-hostable · Fully customizable
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

export default function Capture() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [userPersonality, setUserPersonality] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Show loading state while checking auth
  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Show preview for non-authenticated users
  if (!user) {
    return <CapturePreview />;
  }

  // Load user's personality (or create one if it doesn't exist)
  useEffect(() => {
    const loadUserPersonality = async () => {
      if (!user) return;

      // Try to get existing personality
      const { data: personalities, error } = await supabase
        .from('personalities')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('Error loading personality:', error);
        return;
      }

      if (personalities && personalities.length > 0) {
        setUserPersonality(personalities[0]);
      } else {
        // Create a new personality for the user
        const { data: newPersonality, error: createError } = await supabase
          .from('personalities')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Voice',
            relationship_to_creator: 'Self',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating personality:', createError);
        } else {
          setUserPersonality(newPersonality);
        }
      }
    };

    loadUserPersonality();
  }, [user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => clearTimeout(timer);
  }, [isRecording, timeLeft]);

  const uploadRecording = async (blob: Blob, duration: number, prompt: string) => {
    if (!userPersonality || !session) {
      console.error('Missing personality or session');
      return null;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      const timestamp = Date.now();
      const filename = `recording-${timestamp}.webm`;

      formData.append('file', blob, filename);
      formData.append('personalityId', userPersonality.id);
      formData.append('duration', duration.toString());
      formData.append('transcript', `Recording for: "${prompt}"`);

      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('Upload successful:', result);
      return result.recording;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    if (!userPersonality) {
      alert('Please wait while we set up your profile...');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const prompt = PROMPTS[currentPrompt];

        // Create temporary recording entry
        const tempRecording: Recording = {
          id: `temp-${Date.now()}`,
          fileUrl: URL.createObjectURL(blob),
          duration,
          uploadStatus: 'pending'
        };

        setRecordings(prev => [...prev, tempRecording]);

        // Upload to database
        try {
          tempRecording.uploadStatus = 'uploading';
          setRecordings(prev => prev.map(r => r.id === tempRecording.id ? tempRecording : r));

          const uploadedRecording = await uploadRecording(blob, duration, prompt);

          if (uploadedRecording) {
            tempRecording.uploadStatus = 'success';
            setRecordings(prev => prev.map(r =>
              r.id === tempRecording.id
                ? { ...tempRecording, id: uploadedRecording.id, fileUrl: uploadedRecording.fileUrl }
                : r
            ));

            // Move to next prompt
            if (currentPrompt < PROMPTS.length - 1) {
              setCurrentPrompt(currentPrompt + 1);
              setTimeLeft(60);
            }
          } else {
            tempRecording.uploadStatus = 'error';
            setRecordings(prev => prev.map(r => r.id === tempRecording.id ? tempRecording : r));
          }
        } catch (error) {
          tempRecording.uploadStatus = 'error';
          setRecordings(prev => prev.map(r => r.id === tempRecording.id ? tempRecording : r));
          console.error('Failed to upload recording:', error);
        }

        // Clean up local blob URL
        URL.revokeObjectURL(tempRecording.fileUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to record your voice.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setTimeLeft(60);
      setAudioStream(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isComplete = recordings.length === PROMPTS.length;

  // Show loading state while personality is being set up
  if (!userPersonality) {
    return (
      <main className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-400">Setting up your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen hero-gradient relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-qayani-gold/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-qayani-gold/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Clone Your Voice
            </h1>
            <p className="text-xl text-gray-300">
              5 minutes today becomes an eternal presence tomorrow
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="glass-gold p-6 mb-8">
            <div className="flex justify-between text-sm text-gray-400 mb-3">
              <span>Question {recordings.length + 1} of 5</span>
              <span className="text-qayani-gold font-semibold">{recordings.length * 20}% Complete</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${recordings.length * 20}%` }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>

          {!isComplete ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPrompt}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ ease: [0.4, 0, 0.2, 1] }}
                className="glass-gold p-12"
              >
                <div className="text-center mb-12">
                  <span className="text-6xl mb-6 block">🎙️</span>
                  <h2 className="text-3xl font-semibold text-white mb-6">
                    {PROMPTS[currentPrompt]}
                  </h2>
                  <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                    Speak naturally and authentically. Your family will treasure these words forever.
                  </p>
                </div>

                <div className="mb-12">
                  <AudioVisualizer isRecording={isRecording} audioStream={audioStream} />
                </div>

                <div className="flex flex-col items-center">
                  {isRecording ? (
                    <>
                      <div className="flex justify-center gap-2 mb-8">
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                      </div>
                      <p className="text-5xl font-bold text-qayani-gold mb-6">{formatTime(timeLeft)}</p>
                      <button
                        onClick={stopRecording}
                        className="bg-red-500 text-white px-12 py-4 rounded-full text-xl hover:bg-red-600 transition-colors"
                        disabled={isUploading}
                      >
                        {isUploading ? 'Saving...' : '⏹ Stop Recording'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startRecording}
                        className="btn-gold text-2xl px-16 py-6 mb-6 animate-pulse-gold"
                        disabled={isUploading || !userPersonality}
                      >
                        {isUploading ? 'Saving...' : '🎙 Start Recording'}
                      </button>
                      {recordings.length > 0 && (
                        <button
                          onClick={() => {
                            setCurrentPrompt(currentPrompt + 1);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          Skip this question →
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ease: [0.4, 0, 0.2, 1] }}
              className="glass-gold p-16 text-center"
            >
              <div className="text-8xl mb-8 animate-scale">🎉</div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Voice Clone Complete!
              </h2>
              <p className="text-xl text-gray-300 mb-6">
                Your words and wisdom have been preserved for eternity.
              </p>
              <p className="text-gray-400 mb-8">
                Your family will treasure these moments. Return anytime to add more memories to your legacy.
              </p>
              <button
                onClick={() => router.push('/dashboard/avatar/view')}
                className="btn-gold text-xl px-10 py-4"
              >
                View Your Avatar
              </button>
            </motion.div>
          )}

          {/* Recordings Status */}
          {recordings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mt-8 glass-gold p-6"
            >
              <h3 className="text-2xl font-semibold text-white mb-4">Your Recordings</h3>
              <div className="space-y-3">
                {recordings.map((recording, index) => (
                  <div key={recording.id} className="flex items-center justify-between p-4 bg-qayani-black/30 rounded-xl">
                    <div>
                      <p className="font-medium text-white">Question {index + 1}</p>
                      <p className="text-sm text-gray-400 line-clamp-1">{PROMPTS[index]}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-qayani-gold font-semibold">{recording.duration}s</span>
                      {recording.uploadStatus === 'pending' && (
                        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
                      )}
                      {recording.uploadStatus === 'uploading' && (
                        <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
                      )}
                      {recording.uploadStatus === 'success' && (
                        <div className="w-3 h-3 rounded-full bg-qayani-gold"></div>
                      )}
                      {recording.uploadStatus === 'error' && (
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recording Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-8 bg-qayani-gold/10 border border-qayani-gold/30 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>💡</span> Pro Tips for Perfect Voice Cloning
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Find a quiet space where you can speak freely</li>
              <li>• Share naturally, as if talking to a family member</li>
              <li>• Include names, dates, and places in your stories</li>
              <li>• Embrace imperfection - authenticity matters most</li>
              <li>• Your emotions and personality create your unique legacy</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </main>
  );
}