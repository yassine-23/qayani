'use client';

import { ReactNode } from 'react';

/* ============================================
   AvatarRing — The Core UI Element of QAYANI

   A rotating, breathing ring that holds an avatar
   image or 3D canvas. Appears on EVERY page.
   The avatar is the main character of the product.
   ============================================ */

type AvatarSize = 'hero' | 'card' | 'mini' | 'nano';
type AvatarStatus = 'alive' | 'thinking' | 'speaking' | 'idle' | 'error';
type AvatarTier = 'free' | 'premium' | 'enterprise';

interface AvatarRingProps {
  size?: AvatarSize;
  status?: AvatarStatus;
  tier?: AvatarTier;
  name?: string;
  src?: string;
  children?: ReactNode;
  showTierBadge?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, { ring: number; border: number; badge: number; fontSize: string }> = {
  hero:  { ring: 200, border: 2, badge: 28, fontSize: 'text-caption' },
  card:  { ring: 80,  border: 2, badge: 20, fontSize: 'text-[9px]' },
  mini:  { ring: 40,  border: 1.5, badge: 14, fontSize: 'text-[7px]' },
  nano:  { ring: 24,  border: 1, badge: 0, fontSize: 'text-[6px]' },
};

const TIER_COLORS: Record<AvatarTier, { ring: string; glow: string; bg: string }> = {
  free:       { ring: '#D97706', glow: 'rgba(217, 119, 6, 0.15)', bg: 'bg-tetra' },
  premium:    { ring: '#FACC15', glow: 'rgba(250, 204, 21, 0.2)', bg: 'bg-cube' },
  enterprise: { ring: '#3B82F6', glow: 'rgba(59, 130, 246, 0.15)', bg: 'bg-ico' },
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
  alive:    '#22C55E',
  thinking: '#A78BFA',
  speaking: '#38BDF8',
  idle:     '#3F3F46',
  error:    '#F87171',
};

const TIER_LABELS: Record<AvatarTier, string> = {
  free: 'Free',
  premium: 'Pro',
  enterprise: 'Team',
};

export default function AvatarRing({
  size = 'card',
  status = 'idle',
  tier = 'free',
  name,
  src,
  children,
  showTierBadge = true,
  onClick,
  className = '',
}: AvatarRingProps) {
  const dims = SIZE_MAP[size];
  const tierColor = TIER_COLORS[tier];
  const statusColor = STATUS_COLORS[status];
  const isActive = status !== 'idle';
  const isSpeaking = status === 'speaking';
  const isNano = size === 'nano';

  return (
    <div
      className={`relative inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dims.ring, height: dims.ring }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={name ? `${name}'s avatar` : 'Avatar'}
    >
      {/* Breathing container */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ animation: isActive ? 'breathe 4s ease-in-out infinite' : undefined }}
      >
        {/* Outer rotating ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `${dims.border}px solid ${tierColor.ring}`,
            opacity: isActive ? 0.6 : 0.2,
            animation: isActive ? 'ringSpin 20s linear infinite' : undefined,
            transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Speaking ripple rings */}
        {isSpeaking && !isNano && (
          <>
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `${dims.border * 0.75}px solid ${tierColor.ring}`,
                animation: 'ring-ripple 1.5s ease-out infinite',
              }}
            />
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: `${dims.border * 0.75}px solid ${tierColor.ring}`,
                animation: 'ring-ripple 1.5s ease-out infinite 0.5s',
              }}
            />
          </>
        )}
      </div>

      {/* Inner content area */}
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center bg-deep"
        style={{
          width: dims.ring - dims.border * 6,
          height: dims.ring - dims.border * 6,
        }}
      >
        {children ? (
          children
        ) : src ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          /* Placeholder — initials or generic icon */
          <div className="w-full h-full flex items-center justify-center bg-deep">
            {name ? (
              <span
                className="font-semibold text-muted select-none"
                style={{ fontSize: dims.ring * 0.3 }}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="text-muted"
                style={{ width: dims.ring * 0.35, height: dims.ring * 0.35 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      {!isNano && (
        <div
          className="absolute rounded-full border-2 border-void"
          style={{
            width: Math.max(dims.ring * 0.14, 8),
            height: Math.max(dims.ring * 0.14, 8),
            backgroundColor: statusColor,
            bottom: dims.ring * 0.05,
            right: dims.ring * 0.05,
            animation: isActive ? 'status-pulse 2s ease-in-out infinite' : undefined,
          }}
        />
      )}

      {/* Tier badge */}
      {showTierBadge && dims.badge > 0 && (
        <div
          className={`absolute flex items-center justify-center rounded-full ${tierColor.bg} text-void font-semibold ${dims.fontSize}`}
          style={{
            width: dims.badge,
            height: dims.badge,
            bottom: -dims.badge * 0.15,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {tier === 'free' ? '4' : tier === 'premium' ? '8' : '20'}
        </div>
      )}
    </div>
  );
}
