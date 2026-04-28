'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/context';
import { supabase } from '../../../../lib/supabase/client';
import StepWrapper from '../../../../components/onboarding/StepWrapper';
import AudioVisualizer from '../../../../components/AudioVisualizer';

const VOICE_PROMPTS = [
  "Hello, my name is [your name], and I'm creating my digital legacy.",
  "I want my loved ones to remember my voice and the way I speak.",
  "This technology will help me stay connected with future generations.",
];

interface VoiceRecording {
  id: string;
  blob: Blob;
  duration: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

export default function VoiceTrainingPage() {
  const router = useRouter();
  const { user, loading, session } = useAuth();

  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceModelId, setVoiceModelId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

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

  const startRecording = async () => {
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

        const recording: VoiceRecording = {
          id: `recording-${Date.now()}`,
          blob,
          duration,
          status: 'pending'
        };

        setRecordings(prev => [...prev, recording]);
        await uploadVoiceRecording(recording);

        // Move to next prompt
        if (currentPrompt < VOICE_PROMPTS.length - 1) {
          setCurrentPrompt(currentPrompt + 1);
        }
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
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      setAudioStream(null);
    }
  };

  const uploadVoiceRecording = async (recording: VoiceRecording) => {
    if (!user || !session) return;

    try {
      setRecordings(prev =>
        prev.map(r => r.id === recording.id ? { ...r, status: 'uploading' } : r)
      );

      const formData = new FormData();
      const filename = `voice-${recording.id}.webm`;
      formData.append('file', recording.blob, filename);
      formData.append('duration', recording.duration.toString());
      formData.append('purpose', 'voice_training');

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setRecordings(prev =>
        prev.map(r => r.id === recording.id ? { ...r, status: 'success' } : r)
      );

      console.log('Voice recording uploaded:', result);
    } catch (error) {
      console.error('Upload error:', error);
      setRecordings(prev =>
        prev.map(r => r.id === recording.id ? { ...r, status: 'error' } : r)
      );
    }
  };

  const handleTrainVoice = async () => {
    if (!user || !session) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/voice/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recordingIds: recordings.map(r => r.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Voice training failed');
      }

      const result = await response.json();
      setVoiceModelId(result.voiceModelId);

      console.log('Voice model created:', result);
    } catch (error) {
      console.error('Voice training error:', error);
      alert('Failed to train voice model. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/steps/personality');
  };

  const handleSkip = () => {
    router.push('/onboarding/steps/personality');
  };

  const allRecordingsComplete = recordings.length === VOICE_PROMPTS.length &&
    recordings.every(r => r.status === 'success');

  return (
    <StepWrapper
      currentStep={3}
      totalSteps={5}
      onBack={() => router.push('/onboarding/steps/avatar')}
      showSkip={!voiceModelId}
      onSkip={handleSkip}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl"
            >
              🎙️
            </motion.div>
          </div>

          <h1 className="heading-xl mb-4">
            Clone Your Voice
          </h1>

          <p className="body-lg text-gray-600 max-w-2xl mx-auto">
            Record yourself reading these prompts so your digital self can speak with your voice.
            This takes less than 2 minutes.
          </p>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!voiceModelId ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Recording {recordings.length + 1} of {VOICE_PROMPTS.length}</span>
                  <span>{Math.round((recordings.length / VOICE_PROMPTS.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(recordings.length / VOICE_PROMPTS.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {currentPrompt < VOICE_PROMPTS.length && (
                <div className="glass-card p-12 mb-8">
                  {/* Current Prompt */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                      Read This Aloud:
                    </h2>
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 mb-8">
                      <p className="text-lg text-gray-800 leading-relaxed">
                        "{VOICE_PROMPTS[currentPrompt]}"
                      </p>
                    </div>
                  </div>

                  {/* Audio Visualizer */}
                  <AudioVisualizer isRecording={isRecording} audioStream={audioStream} />

                  {/* Recording Controls */}
                  <div className="text-center mt-8">
                    {!isRecording ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startRecording}
                        className="btn btn-primary px-8 py-4 text-lg"
                      >
                        <svg className="w-6 h-6 inline-block mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 4a3 3 0 016 0v6a3 3 0 01-6 0V4z" />
                        </svg>
                        Start Recording
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={stopRecording}
                        className="btn btn-secondary px-8 py-4 text-lg"
                      >
                        <div className="w-4 h-4 bg-red-500 rounded-sm inline-block mr-2 animate-pulse" />
                        Stop Recording
                      </motion.button>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">💡 Tip:</span> Speak naturally in a quiet environment
                      for the best results. Read slowly and clearly.
                    </p>
                  </div>
                </div>
              )}

              {/* Recordings List */}
              {recordings.length > 0 && (
                <div className="glass-card p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Recordings:</h3>
                  <div className="space-y-3">
                    {recordings.map((recording, index) => (
                      <div key={recording.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            recording.status === 'success' ? 'bg-green-500' :
                            recording.status === 'uploading' ? 'bg-blue-500 animate-pulse' :
                            recording.status === 'error' ? 'bg-red-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-sm text-gray-700">Recording {index + 1}</span>
                        </div>
                        <span className="text-sm text-gray-500">{recording.duration}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Train Voice Button */}
              {allRecordingsComplete && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <button
                    onClick={handleTrainVoice}
                    className="btn btn-primary px-12 py-4 text-lg"
                  >
                    Train My Voice →
                  </button>
                  <p className="text-gray-500 text-sm mt-4">
                    This will create your voice model (takes ~30 seconds)
                  </p>
                </motion.div>
              )}

              {/* Processing State */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-12 text-center"
                >
                  <div className="w-16 h-16 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Training Your Voice Model...
                  </h3>
                  <p className="text-gray-600">
                    Our AI is learning your unique voice patterns and characteristics
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Success State */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-block mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>

              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Your Voice is Cloned!
              </h2>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Amazing! Your digital self can now speak with your authentic voice.
                The resemblance will be remarkable.
              </p>

              <button
                onClick={handleContinue}
                className="btn btn-primary px-12 py-4 text-lg"
              >
                Continue to Personality Setup →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepWrapper>
  );
}
