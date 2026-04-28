'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth/context';
import { ProtectedRoute } from '../../../lib/auth/protected-route';
import TalkingAvatar from '../../../components/TalkingAvatar';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: string;
}

interface ChatMetadata {
  sessionId: string;
  messageCount: number;
  personalityQuality?: any;
  ragContext?: {
    memoriesUsed: number;
    conversationsUsed: number;
    hasContext: boolean;
  };
}

const icons = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>,
  voice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>,
};

const SUGGESTED_PROMPTS = [
  'Tell me about my family memories',
  'What are my core values?',
  'Share some wisdom with me',
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadUserAvatar();
  }, [user]);

  const loadUserAvatar = async () => {
    try {
      const response = await fetch('/api/avatars/me');
      if (response.ok) {
        const data = await response.json();
        setUserAvatar(data.avatar);
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId: metadata?.sessionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        audioUrl: data.audioUrl,
        timestamp: data.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setMetadata({
        sessionId: data.sessionId,
        messageCount: data.messageCount,
        personalityQuality: data.personalityQuality,
        ragContext: data.ragContext,
      });

      if (data.audioUrl) {
        setCurrentAudioUrl(data.audioUrl);
        setIsAvatarSpeaking(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
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
                  // conversation
                </p>
                <h1 className="text-3xl font-bold tracking-[-0.035em] text-white">
                  Talk to Your Digital Twin
                </h1>
                <p className="mt-2 text-[14px] text-white/30">
                  Your digital twin learns from every conversation
                </p>
              </div>
            </div>

            {/* Metadata pills */}
            {metadata && (
              <div className="mt-4 flex gap-2">
                <div className="px-3 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-[11px] font-mono text-white/30">
                  {metadata.messageCount} messages
                </div>
                {metadata.ragContext?.hasContext && (
                  <div className="px-3 py-1 rounded-md border border-neon/10 bg-neon/[0.03] text-[11px] font-mono text-neon/50">
                    {metadata.ragContext.memoriesUsed} memories active
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Avatar Panel */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 sticky top-24">
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 mb-4">
                  Digital Twin
                </p>

                {/* Avatar display */}
                <div className="aspect-square rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.04] mb-4">
                  {userAvatar && userAvatar.glb_file_url && currentAudioUrl ? (
                    <TalkingAvatar
                      avatarUrl={userAvatar.glb_file_url}
                      audioUrl={currentAudioUrl}
                      isSpeaking={isAvatarSpeaking}
                      onAudioEnd={() => {
                        setIsAvatarSpeaking(false);
                        setCurrentAudioUrl(null);
                      }}
                    />
                  ) : userAvatar?.preview_image_url ? (
                    <img
                      src={userAvatar.preview_image_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <EmptyState
                      variant="avatar"
                      title="No avatar yet"
                      description="Create a visual identity for your digital twin."
                      actions={[{ label: 'Create Avatar', href: '/dashboard/avatar/create' }]}
                      className="py-8"
                    />
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${isAvatarSpeaking ? 'bg-neon shadow-[0_0_8px_rgba(0,255,102,0.5)] animate-pulse' : 'bg-white/10'}`} />
                  <span className="text-[12px] text-white/30">
                    {isAvatarSpeaking ? 'Speaking' : 'Listening'}
                  </span>
                </div>

                {/* Session info */}
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/20">Session</span>
                    <span className="text-white/50 font-mono">{metadata ? 'Active' : 'New'}</span>
                  </div>
                  {metadata?.personalityQuality && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/20">Data Quality</span>
                      <span className="text-white/50 font-mono">
                        {metadata.personalityQuality.conversationCount > 20
                          ? 'Excellent'
                          : metadata.personalityQuality.conversationCount > 10
                          ? 'Good'
                          : 'Learning'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Chat Panel */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2"
            >
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] h-[680px] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <AnimatePresence>
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-sm">
                          <EmptyState
                            variant="chat"
                            title="Start a conversation"
                            description="Ask questions, share memories, or just chat. Your digital twin responds with your personality and memories."
                            className="py-4"
                          />
                          <div className="space-y-2 mt-2">
                            {SUGGESTED_PROMPTS.map((prompt) => (
                              <button
                                key={prompt}
                                onClick={() => setInput(prompt)}
                                className="block w-full text-left px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[13px] text-white/40 hover:bg-neon/[0.04] hover:border-neon/15 hover:text-white/60 transition-all"
                              >
                                &ldquo;{prompt}&rdquo;
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-neon/[0.08] border border-neon/15 text-white/80'
                                : 'bg-white/[0.04] border border-white/[0.06] text-white/65'
                            }`}
                          >
                            <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            {message.audioUrl && (
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neon/40">
                                {icons.voice}
                                <span>Voice response</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 h-1.5 bg-white/20 rounded-full"
                              animate={{ opacity: [0.2, 0.6, 0.2] }}
                              transition={{ delay: i * 0.15, duration: 0.8, repeat: Infinity }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/[0.04]">
                  <div className="flex gap-3">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-neon/25 focus:bg-neon/[0.02] transition-all"
                      rows={2}
                      disabled={isLoading}
                    />
                    <motion.button
                      onClick={handleSendMessage}
                      disabled={isLoading || !input.trim()}
                      className={`px-5 rounded-lg flex items-center justify-center transition-all ${
                        isLoading || !input.trim()
                          ? 'bg-white/[0.03] border border-white/[0.04] text-white/15 cursor-not-allowed'
                          : 'bg-neon/[0.1] border border-neon/20 text-neon hover:bg-neon/[0.15]'
                      }`}
                      whileHover={!isLoading && input.trim() ? { scale: 1.02 } : {}}
                      whileTap={!isLoading && input.trim() ? { scale: 0.98 } : {}}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
                      ) : (
                        icons.send
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
