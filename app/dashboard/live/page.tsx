/**
 * Qayani Live Chat Page — Obsidian Depths
 *
 * Full-screen immersive live voice chat with avatar.
 * No navigation, no sidebar. Just the conversation.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AvatarRing from '@/components/ui/AvatarRing';
import Button from '@/components/ui/Button';

interface ChatMessage {
  id: string;
  role: 'user' | 'avatar';
  content: string;
  timestamp: Date;
}

function StatusDot({ status }: { status: 'alive' | 'speaking' | 'idle' }) {
  const colors: Record<string, string> = {
    alive: 'bg-alive',
    speaking: 'bg-speaking',
    idle: 'bg-muted',
  };
  const labels: Record<string, string> = {
    alive: 'Online',
    speaking: 'Speaking',
    idle: 'Offline',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`block w-2 h-2 rounded-full ${colors[status]} ${
          status === 'alive' || status === 'speaking' ? 'animate-pulse-alive' : ''
        }`}
      />
      <span className="text-caption text-muted">{labels[status]}</span>
    </span>
  );
}

export default function LiveChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<'alive' | 'speaking' | 'idle'>('alive');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const avatarName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Avatar';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'avatar',
          content: `Hello. I am your digital self, ready to converse. What would you like to talk about?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim() || isSending || !user) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsSending(true);
    setAvatarStatus('speaking');

    try {
      const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();

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
        setMessages((prev) => [
          ...prev,
          {
            id: `avatar-${Date.now()}`,
            role: 'avatar',
            content: data.response,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'avatar',
          content: 'I am having trouble responding right now. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
      setAvatarStatus('alive');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="h-screen w-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-rim border-t-cube rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  // Auth required
  if (!user) {
    return (
      <main className="h-screen w-screen bg-void flex items-center justify-center">
        <div className="bg-lifted/80 backdrop-blur-[12px] border border-white/[0.06] rounded-md p-8 max-w-sm text-center">
          <h1 className="text-heading-md text-primary mb-3">Sign in required</h1>
          <p className="text-body-sm text-muted mb-6">
            You need an account to access Live Chat.
          </p>
          <Link href="/auth">
            <Button variant="primary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-void flex flex-col overflow-hidden">
      {/* ---- Top bar ---- */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/[0.06] bg-deep/80 backdrop-blur-[12px]">
        <div className="flex items-center gap-3">
          <AvatarRing
            size="mini"
            status={avatarStatus}
            name={avatarName}
            src={user.user_metadata?.avatar_url}
            showTierBadge={false}
          />
          <div className="flex flex-col">
            <span className="text-body-sm font-medium text-primary leading-tight">
              {avatarName}
            </span>
            <StatusDot status={avatarStatus} />
          </div>
        </div>
        <Link href="/dashboard">
          <button
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted hover:text-primary hover:bg-white/[0.04] transition-colors duration-interaction"
            aria-label="Exit live chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Link>
      </header>

      {/* ---- Chat transcript ---- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] md:max-w-[60%] px-4 py-3 rounded-md ${
                msg.role === 'user'
                  ? 'bg-cube text-white'
                  : 'bg-lifted border border-white/[0.06] text-primary'
              }`}
            >
              <p className="text-body-sm whitespace-pre-line">{msg.content}</p>
              <p
                className={`text-caption mt-1.5 ${
                  msg.role === 'user' ? 'text-white/50' : 'text-muted'
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-lifted border border-white/[0.06] rounded-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce [animation-delay:100ms]" />
                <span className="w-1.5 h-1.5 bg-cube rounded-full animate-bounce [animation-delay:200ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ---- Bottom input bar ---- */}
      <div className="shrink-0 border-t border-white/[0.06] bg-deep/80 backdrop-blur-[12px] px-4">
        <div className="flex items-center gap-3 h-14">
          {/* Mic button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-colors duration-interaction ${
              isRecording
                ? 'bg-error/20 text-error'
                : 'text-muted hover:text-primary hover:bg-white/[0.04]'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 h-10 bg-lifted border border-white/[0.06] rounded-md px-4 text-body-sm text-primary placeholder:text-muted focus:outline-none focus:border-cube/50 transition-colors duration-interaction disabled:opacity-50"
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
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
    </main>
  );
}
