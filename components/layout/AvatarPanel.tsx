'use client';

import { useState } from 'react';
import AvatarRing from '../ui/AvatarRing';
import Button from '../ui/Button';
import { StatusDot } from '../ui/Badge';

/* ============================================
   AvatarPanel — Right Panel (320px)

   The avatar's home on the dashboard.
   Always visible on desktop. Collapsed to FAB
   on mobile (56px floating button, bottom-right).

   Shows: avatar ring (180px), name, status,
   voice button, activity feed.
   ============================================ */

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

interface AvatarPanelProps {
  name?: string;
  avatarSrc?: string;
  tier?: 'free' | 'premium' | 'enterprise';
  status?: 'alive' | 'thinking' | 'speaking' | 'idle';
  activities?: ActivityItem[];
  onTalk?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  alive: 'Online',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
  idle: 'Offline',
};

export default function AvatarPanel({
  name = 'Your Avatar',
  avatarSrc,
  tier = 'free',
  status = 'idle',
  activities = [],
  onTalk,
}: AvatarPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop panel — always visible */}
      <aside className="hidden lg:flex flex-col items-center w-[320px] shrink-0 h-screen sticky top-0 bg-void/50 backdrop-blur-[8px] border-l border-white/[0.04] py-8 px-6 gap-5 overflow-y-auto">
        {/* Avatar */}
        <AvatarRing
          size="hero"
          tier={tier}
          status={status}
          name={name}
          src={avatarSrc}
        />

        {/* Name + Status */}
        <div className="text-center space-y-1">
          <h2 className="text-heading-sm text-primary font-semibold">{name}</h2>
          <div className="flex items-center justify-center gap-1.5">
            <StatusDot status={status} size={6} />
            <span className="text-caption text-muted">{STATUS_LABELS[status]}</span>
          </div>
        </div>

        {/* Voice button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onTalk}
          icon={
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path d="M9 1.5v9M6 5.5a3 3 0 0 0 6 0" strokeLinecap="round" />
              <path d="M4.5 8a4.5 4.5 0 0 0 9 0" strokeLinecap="round" />
              <line x1="9" y1="12.5" x2="9" y2="16.5" strokeLinecap="round" />
            </svg>
          }
        >
          Talk to {name.split(' ')[0]}
        </Button>

        {/* Divider */}
        <div className="w-full h-px bg-white/[0.04]" />

        {/* Activity feed */}
        <div className="w-full space-y-1">
          <h3 className="text-label uppercase tracking-[0.1em] text-muted mb-2">
            Recent Activity
          </h3>
          {activities.length > 0 ? (
            activities.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 py-2 border-b border-white/[0.03] last:border-0"
              >
                <div className="w-1 h-1 rounded-full bg-cube mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-subtle leading-snug truncate">
                    {item.text}
                  </p>
                  <p className="text-[10px] text-muted font-mono mt-0.5">{item.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-caption text-muted/50 text-center py-4">
              No activity yet
            </p>
          )}
        </div>
      </aside>

      {/* Mobile FAB */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-50 rounded-full shadow-modal"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Open avatar panel"
      >
        <AvatarRing
          size="mini"
          tier={tier}
          status={status}
          name={name}
          src={avatarSrc}
          showTierBadge={false}
        />
      </button>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-deep rounded-t-2xl border-t border-white/[0.06] p-6 animate-fade-in-up max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-1 rounded-full bg-rim" />
              <AvatarRing
                size="card"
                tier={tier}
                status={status}
                name={name}
                src={avatarSrc}
              />
              <h2 className="text-heading-sm text-primary font-semibold">{name}</h2>
              <div className="flex items-center gap-1.5">
                <StatusDot status={status} size={6} />
                <span className="text-caption text-muted">{STATUS_LABELS[status]}</span>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={onTalk}>
                Talk to {name.split(' ')[0]}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
