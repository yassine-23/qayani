'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import AvatarRing from '@/components/ui/AvatarRing';
import Button from '@/components/ui/Button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  memoryTag?: string;
}

/* ============================================
   Unauthenticated — Simple sign-in prompt
   ============================================ */
function SignInPrompt() {
  return (
    <main className="h-screen w-screen bg-void flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm text-center px-6"
      >
        <AvatarRing
          size="hero"
          status="idle"
          showTierBadge={false}
          className="mx-auto mb-8"
        />
        <h1 className="text-heading-lg text-primary mb-3">
          Talk to your avatar
        </h1>
        <p className="text-body-md text-muted mb-8">
          Sign in to start a conversation with your digital self. Your wisdom
          and memories, preserved forever.
        </p>
        <Link href="/auth">
          <Button variant="primary" size="lg">
            Sign In to Begin
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}

/* ============================================
   Authenticated — Eternal Chat Interface
   ============================================ */
export default function EternalChat() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const avatarName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Avatar';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasInitialized && user) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello. I am your digital self — a reflection of your essence, built to learn from you and preserve what matters most about who you are.\n\nEvery conversation we have trains me to become more authentically you. Share your thoughts, your stories, your wisdom. Help me become the legacy that keeps your spirit alive for generations to come.`,
          timestamp: new Date(),
        },
      ]);
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: messages.slice(-10),
        }),
      });

      const data = await response.json();

      if (data.response) {
        // Detect memory references in the response
        const memoryKeywords = [
          'you once told me',
          'you mentioned',
          'I remember you',
          'from your memory',
          'you shared',
          'you recorded',
        ];
        const hasMemory = memoryKeywords.some((kw) =>
          data.response.toLowerCase().includes(kw)
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            memoryTag: hasMemory ? 'Memory unlocked' : undefined,
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'I am having trouble responding right now. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Loading
  if (loading) {
    return (
      <main className="h-screen w-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-rim border-t-cube rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body-sm text-muted">Loading your digital self...</p>
        </div>
      </main>
    );
  }

  // Not authenticated
  if (!user) {
    return <SignInPrompt />;
  }

  return (
    <main className="h-screen w-screen bg-void flex flex-col overflow-hidden">
      {/* ---- Top bar ---- */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/[0.06] bg-deep/80 backdrop-blur-[12px]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted hover:text-primary hover:bg-white/[0.04] transition-colors duration-interaction"
              aria-label="Back to dashboard"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </Link>
          <span className="text-body-sm font-medium text-primary">{avatarName}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-cube/10 text-cube-bright text-label uppercase tracking-wider">
            Eternal
          </span>
        </div>
      </header>

      {/* ---- Main content: sidebar + chat ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop left panel — avatar */}
        <aside className="hidden lg:flex flex-col items-center justify-center w-60 shrink-0 border-r border-white/[0.06] bg-deep/40">
          <AvatarRing
            size="hero"
            status={isLoading ? 'thinking' : 'alive'}
            name={avatarName}
            src={user.user_metadata?.avatar_url}
            showTierBadge={false}
            className="mb-4"
          />
          <p className="text-body-sm font-medium text-primary mb-1">{avatarName}</p>
          <p className="text-caption text-muted">Digital Legacy</p>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[75%] md:max-w-[60%]">
                    {/* Memory tag */}
                    {message.memoryTag && (
                      <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cube-bright">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-label text-cube-bright uppercase tracking-wider">
                          {message.memoryTag}
                        </span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-md ${
                        message.role === 'user'
                          ? 'bg-cube text-white'
                          : 'bg-lifted border border-white/[0.06] text-primary'
                      }`}
                    >
                      <p className="text-body-sm whitespace-pre-line leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-caption mt-1.5 ${
                          message.role === 'user' ? 'text-white/50' : 'text-muted'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-lifted border border-white/[0.06] rounded-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce [animation-delay:100ms]" />
                    <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce [animation-delay:200ms]" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-white/[0.06] bg-deep/80 backdrop-blur-[12px] px-4">
            <div className="flex items-center gap-3 h-14">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 h-10 bg-lifted border border-white/[0.06] rounded-md px-4 text-body-sm text-primary placeholder:text-muted focus:outline-none focus:border-cube/50 transition-colors duration-interaction disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 bg-cube text-white hover:bg-cube-bright hover:text-void disabled:bg-cube/30 disabled:text-white/40 transition-colors duration-interaction disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
