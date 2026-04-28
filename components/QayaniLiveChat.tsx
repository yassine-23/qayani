/**
 * Qayani Live Chat Interface (Supabase + OpenAI Realtime API)
 *
 * High-end live voice chat with 3D avatar and real-time lip-sync.
 * Features Apple-inspired glassmorphism design with <300ms latency.
 * All conversations are persisted to Supabase for analytics and history.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { QayaniLiveAvatar } from './3d/QayaniLiveAvatar';
import { useLiveChatSession } from '@/lib/hooks/useLiveChatSession';
import { motion, AnimatePresence } from 'framer-motion';

interface QayaniLiveChatProps {
  userId?: string;
  userName?: string;
  avatarUrl?: string;
}

export default function QayaniLiveChat({
  userId,
  userName = 'User',
  avatarUrl,
}: QayaniLiveChatProps) {
  const {
    startSession,
    endSession,
    isSpeaking,
    isListening,
    isConnected,
    isConnecting,
    transcript,
    messages,
    error,
    audioContext,
    analyzerNode,
    sessionId,
  } = useLiveChatSession();

  const [showTranscript, setShowTranscript] = useState(true);
  const [showMessages, setShowMessages] = useState(false);

  const toggleConnection = async () => {
    if (isConnected) {
      await endSession();
    } else {
      await startSession();
    }
  };

  // Auto-clear old transcripts
  useEffect(() => {
    if (transcript && !isSpeaking) {
      const timer = setTimeout(() => {
        // Transcript will be replaced by next message
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [transcript, isSpeaking]);

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {/* --- Minimalist Header --- */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-black rounded-full" />
          <h1 className="heading-sm text-gray-900">
            Qayani <span className="text-gray-400">Live</span>
          </h1>
        </div>

        <div className="glass-card px-4 py-2 text-xs font-semibold text-gray-600">
          GPT-4o Realtime
        </div>
      </header>

      {/* --- 3D Avatar Stage --- */}
      <div className="absolute inset-0 z-10">
        <Canvas
          shadows
          camera={{ position: [0, 0, 2], fov: 35 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100"
        >
          {/* Studio lighting for premium look */}
          <Environment preset="studio" />
          <ambientLight intensity={0.5} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={0.5}
            castShadow
          />

          {/* The Live Avatar */}
          <QayaniLiveAvatar
            audioContext={audioContext}
            analyzerNode={analyzerNode}
            isLive={isConnected}
            modelUrl={avatarUrl}
          />

          {/* Contact shadows for grounding */}
          <ContactShadows
            opacity={0.3}
            scale={10}
            blur={2.5}
            far={4}
            position={[0, -1.5, 0]}
          />

          {/* Optional: Allow user to rotate view */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 1.8}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      {/* --- Transcript Display --- */}
      <AnimatePresence>
        {showTranscript && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-full px-6"
          >
            <div className="glass-card text-center">
              <p className="body-md text-gray-700">{transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Error Display --- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 max-w-md w-full px-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="body-sm text-red-700 text-center">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Apple-Style Control Island --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-6">
        {/* Status Pill */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.05, 1] : 1,
          }}
          transition={{
            repeat: isSpeaking ? Infinity : 0,
            duration: 1.5,
          }}
          className={`px-6 py-3 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${
            isSpeaking
              ? 'bg-green-500/10 border-green-500/20'
              : isListening
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-white/60 border-white/40'
          }`}
        >
          <span className="body-sm font-medium flex items-center gap-2">
            {isConnecting ? (
              <>
                <span className="animate-spin w-2 h-2 border border-gray-400 border-t-transparent rounded-full" />
                <span className="text-gray-600">Connecting...</span>
              </>
            ) : isSpeaking ? (
              <>
                <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-600">Qayani is speaking...</span>
              </>
            ) : isListening ? (
              <>
                <span className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-blue-600">Listening...</span>
              </>
            ) : isConnected ? (
              <span className="text-gray-600">Connected</span>
            ) : (
              <span className="text-gray-500">Ready to connect</span>
            )}
          </span>
        </motion.div>

        {/* Main Action Button */}
        <motion.button
          onClick={toggleConnection}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          className={`group relative flex items-center justify-center w-20 h-20 rounded-full backdrop-blur-xl shadow-2xl border transition-all duration-300 ${
            isConnected
              ? 'bg-red-500/10 border-red-200 hover:bg-red-500/20'
              : 'bg-white/70 border-white/50 hover:bg-white/90'
          }`}
        >
          <motion.div
            animate={{
              rotate: isConnected ? 0 : 0,
            }}
            className={`w-8 h-8 transition-all duration-300 ${
              isConnected ? 'bg-red-500 rounded-md' : 'bg-black rounded-full'
            }`}
          />
        </motion.button>

        <p className="caption text-gray-400 font-medium">
          {isConnected ? 'Tap to disconnect' : 'Tap to start'}
        </p>

        {/* Settings Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="glass-card px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>
          {sessionId && (
            <button
              onClick={() => setShowMessages(!showMessages)}
              className="glass-card px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              {showMessages ? 'Hide' : 'Show'} History
              <span className="bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                {messages.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* --- Conversation History Sidebar --- */}
      <AnimatePresence>
        {showMessages && messages.length > 0 && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-96 z-40 backdrop-blur-xl bg-white/80 border-l border-white/60 shadow-2xl overflow-hidden"
          >
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="heading-sm text-gray-900">Conversation History</h3>
                  <button
                    onClick={() => setShowMessages(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {sessionId && (
                  <p className="caption text-gray-500 mt-1">
                    Session: {sessionId.slice(0, 8)}...
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex flex-col gap-1 ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="caption text-gray-400">
                        {message.role === 'user' ? 'You' : 'Qayani'}
                      </span>
                      <span className="caption text-gray-300">•</span>
                      <span className="caption text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="body-sm">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Background Ambient Glows --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-400/5 blur-[100px] rounded-full pointer-events-none mix-blend-multiply" />

      {/* Connection Instructions Overlay */}
      <AnimatePresence>
        {!isConnected && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-5 pointer-events-none"
          >
            <div className="glass-card text-center max-w-md pointer-events-auto">
              <h2 className="heading-md text-gray-900 mb-4">
                Welcome to Live Mode
              </h2>
              <p className="body-md text-gray-600 mb-6">
                Experience real-time conversations with your digital legacy.
                Speak naturally and Qayani will respond instantly.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Listening</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Speaking</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
