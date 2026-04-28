/**
 * Voice Training Page
 *
 * Creators upload 5-10 audio samples to train their custom voice.
 * The digital twin will then sound exactly like them.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface AudioSample {
  id: string;
  file: File;
  duration: number;
  preview: string; // blob URL
}

interface VoiceProfile {
  hasVoice: boolean;
  voice_id?: string;
  voice_name?: string;
  sample_count?: number;
  preview_url?: string;
}

export default function VoiceTrainingPage() {
  const { user } = useAuth();
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchVoiceProfile();
  }, [user]);

  const fetchVoiceProfile = async () => {
    try {
      const response = await fetch('/api/voice/clone');
      const data = await response.json();
      if (data.success) {
        setVoiceProfile(data.data);
        if (data.data.voice_name) {
          setVoiceName(data.data.voice_name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch voice profile:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      if (audioSamples.length >= 10) {
        setError('Maximum 10 audio samples allowed');
        return;
      }

      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        const sample: AudioSample = {
          id: Math.random().toString(36),
          file,
          duration: audio.duration,
          preview: objectUrl,
        };

        setAudioSamples((prev) => [...prev, sample]);
      };

      audio.src = objectUrl;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], `recording_${Date.now()}.wav`, {
          type: 'audio/wav',
        });

        const audio = new Audio();
        const objectUrl = URL.createObjectURL(blob);

        audio.onloadedmetadata = () => {
          const sample: AudioSample = {
            id: Math.random().toString(36),
            file,
            duration: audio.duration,
            preview: objectUrl,
          };

          setAudioSamples((prev) => [...prev, sample]);
        };

        audio.src = objectUrl;

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeSample = (id: string) => {
    setAudioSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const trainVoice = async () => {
    if (audioSamples.length < 1) {
      setError('Please upload at least 1 audio sample');
      return;
    }

    if (!voiceName.trim()) {
      setError('Please enter a name for your voice');
      return;
    }

    setIsTraining(true);
    setError(null);
    setTrainingProgress(0);

    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', `Voice for ${user?.email || 'creator'}`);

    audioSamples.forEach((sample, index) => {
      formData.append(`file_${index}`, sample.file);
    });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setTrainingProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setTrainingProgress(100);

      const data = await response.json();

      if (data.success) {
        // Success!
        setTimeout(() => {
          fetchVoiceProfile();
          setAudioSamples([]);
          setIsTraining(false);
          setTrainingProgress(0);
        }, 1000);
      } else {
        throw new Error(data.error || 'Training failed');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to train voice');
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  const deleteVoice = async () => {
    if (!confirm('Are you sure you want to delete your custom voice?')) {
      return;
    }

    try {
      const response = await fetch('/api/voice/clone', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchVoiceProfile();
      }
    } catch (error) {
      setError('Failed to delete voice');
    }
  };

  const totalDuration = audioSamples.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard/creator"
                className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="heading-lg text-gray-900">Voice Training</h1>
              <p className="body-sm text-gray-500 mt-1">
                Train your digital twin to sound exactly like you
              </p>
            </div>

            {voiceProfile?.hasVoice && (
              <button
                onClick={deleteVoice}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Delete Voice
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Current Voice Profile */}
        {voiceProfile?.hasVoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="heading-md text-gray-900 mb-2">
                  ✅ Your Voice is Ready
                </h2>
                <p className="body-md text-gray-600 mb-1">
                  <strong>Name:</strong> {voiceProfile.voice_name}
                </p>
                <p className="body-sm text-gray-500">
                  {voiceProfile.sample_count} audio samples • Voice ID: {voiceProfile.voice_id?.slice(0, 8)}...
                </p>
              </div>

              {voiceProfile.preview_url && (
                <audio
                  controls
                  src={voiceProfile.preview_url}
                  className="max-w-xs"
                >
                  Your browser does not support audio playback.
                </audio>
              )}
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="glass-card mb-8">
          <h2 className="heading-md text-gray-900 mb-4">📋 Instructions</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                1
              </span>
              <p className="body-md">
                <strong>Upload 5-10 audio samples</strong> of your voice (minimum 30 seconds total)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                2
              </span>
              <p className="body-md">
                <strong>Speak naturally</strong> in a quiet environment with good microphone quality
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                3
              </span>
              <p className="body-md">
                <strong>Include variety</strong> - different tones, emotions, and speaking speeds
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                4
              </span>
              <p className="body-md">
                <strong>Click "Train Voice"</strong> and wait 2-3 minutes for processing
              </p>
            </div>
          </div>
        </div>

        {/* Voice Name Input */}
        <div className="glass-card mb-8">
          <label className="block mb-2 body-md font-semibold text-gray-900">
            Voice Name
          </label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="My Digital Twin Voice"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        {/* Upload Section */}
        <div className="glass-card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="heading-md text-gray-900">Audio Samples</h2>
              <p className="body-sm text-gray-500 mt-1">
                {audioSamples.length}/10 samples • {Math.round(totalDuration)}s total
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                disabled={audioSamples.length >= 10}
              >
                📁 Upload Files
              </button>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
                disabled={audioSamples.length >= 10}
              >
                {isRecording ? '⏹️ Stop Recording' : '🎙️ Record'}
              </button>
            </div>
          </div>

          {/* Samples Grid */}
          {audioSamples.length > 0 ? (
            <div className="space-y-3">
              {audioSamples.map((sample, index) => (
                <motion.div
                  key={sample.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <span className="text-xl">🎵</span>
                  <div className="flex-1">
                    <p className="body-sm font-medium text-gray-900">
                      Sample {index + 1}
                    </p>
                    <p className="caption text-gray-500">
                      {Math.round(sample.duration)}s • {Math.round(sample.file.size / 1024)}KB
                    </p>
                  </div>
                  <audio controls src={sample.preview} className="max-w-xs" />
                  <button
                    onClick={() => removeSample(sample.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-5xl mb-4">🎤</p>
              <p className="body-md">No audio samples yet</p>
              <p className="caption">Upload files or record your voice to get started</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8"
            >
              <p className="body-sm text-red-700">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Train Button */}
        <button
          onClick={trainVoice}
          disabled={audioSamples.length < 1 || isTraining || !voiceName.trim()}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isTraining ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Training Voice... {trainingProgress}%
            </>
          ) : (
            <>
              ⚡ Train My Voice
            </>
          )}
        </button>

        {/* Training Progress */}
        {isTraining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full h-3"
                initial={{ width: '0%' }}
                animate={{ width: `${trainingProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-center caption text-gray-600 mt-2">
              Processing your voice... This may take 2-3 minutes
            </p>
          </motion.div>
        )}

        {/* Tips */}
        <div className="mt-8 glass-card">
          <h3 className="heading-sm text-gray-900 mb-4">💡 Tips for Best Results</h3>
          <ul className="space-y-2 text-gray-700 body-sm">
            <li>• Use high-quality audio (no background noise)</li>
            <li>• Speak at a normal pace (not too fast or slow)</li>
            <li>• Include different emotions (happy, serious, excited)</li>
            <li>• Minimum 30 seconds total, recommend 2-5 minutes</li>
            <li>• Read from scripts, books, or speak naturally</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
