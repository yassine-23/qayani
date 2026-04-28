'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AvatarRing from '../ui/AvatarRing';
import QMark from '../ui/QMark';

/* ============================================
   Sidebar — Left Navigation

   72px collapsed (icons only).
   240px expanded on hover.
   Avatar nano at top, tier indicator at bottom.
   Clean, quiet, out of the way.
   ============================================ */

interface SidebarProps {
  avatarName?: string;
  avatarSrc?: string;
  tier?: 'free' | 'premium' | 'enterprise';
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: GridIcon },
  { href: '/dashboard/chat', label: 'Chat', icon: ChatIcon },
  { href: '/eternal', label: 'Eternal', icon: InfinityIcon },
  { href: '/dashboard/agent', label: 'Studio', icon: SlidersIcon },
  { href: '/lab', label: 'Lab', icon: FlaskIcon },
  { href: '/dashboard/memories', label: 'Memories', icon: LeafIcon },
  { href: '/dashboard/family', label: 'Family', icon: NetworkIcon },
  { href: '/dashboard/avatar/marketplace', label: 'Market', icon: ShopIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: GearIcon },
];

export default function Sidebar({ avatarName, avatarSrc, tier = 'free' }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={[
        'fixed left-0 top-0 h-screen z-40',
        'flex flex-col items-center py-5 gap-1',
        'bg-void/95 backdrop-blur-[12px]',
        'border-r border-white/[0.04]',
        'transition-all duration-transition ease-spring',
        expanded ? 'w-[240px] items-start px-4' : 'w-[72px]',
      ].join(' ')}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo at top */}
      <Link href="/dashboard" className="mb-4 mt-1 flex items-center gap-3">
        <QMark size={expanded ? 28 : 24} />
        {expanded && (
          <span className="text-body-sm font-semibold text-white truncate animate-fade-in">
            QAYANI
          </span>
        )}
      </Link>

      {/* Divider */}
      <div className="w-full h-px bg-white/[0.04] mb-2" />

      {/* Nav items */}
      <nav className="flex-1 w-full space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-md',
                'transition-all duration-interaction ease-spring',
                'group relative',
                isActive
                  ? 'bg-cube/[0.08] text-cube-bright'
                  : 'text-muted hover:text-primary hover:bg-white/[0.03]',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-cube' : ''}`}
              />
              {expanded && (
                <span className="text-body-sm font-medium truncate animate-fade-in">
                  {label}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {!expanded && (
                <span className="absolute left-full ml-3 px-2 py-1 rounded-sm bg-lifted border border-white/[0.08] text-caption text-primary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-micro whitespace-nowrap z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tier indicator at bottom */}
      <div className="w-full h-px bg-white/[0.04] mt-2" />
      <div className={`py-3 flex items-center gap-2 ${expanded ? 'px-3' : 'justify-center'}`}>
        <div
          className={`w-3 h-3 rounded-full ${
            tier === 'free' ? 'bg-tetra' : tier === 'premium' ? 'bg-cube' : 'bg-ico'
          }`}
        />
        {expanded && (
          <span className="text-caption text-muted animate-fade-in">
            {tier === 'free' ? 'Free' : tier === 'premium' ? 'Premium' : 'Enterprise'}
          </span>
        )}
      </div>
    </aside>
  );
}

/* ============================================
   Icon Components — Minimal, 18x18, stroke only
   ============================================ */

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M3 13.5V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 15 4.5v6a1.5 1.5 0 0 1-1.5 1.5H6L3 13.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function InfinityIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M5.25 9c-1.5-2-3.75-2-3.75 0s2.25 2 3.75 0m7.5 0c1.5 2 3.75 2 3.75 0s-2.25-2-3.75 0m-7.5 0c1.5 2 3 2 3.75 1s1.5-3 3.75-1" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <line x1="3" y1="5" x2="15" y2="5" /><circle cx="6" cy="5" r="1.5" fill="currentColor" />
      <line x1="3" y1="9" x2="15" y2="9" /><circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <line x1="3" y1="13" x2="15" y2="13" /><circle cx="8" cy="13" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M7 2h4M8 2v5l-4.5 7a1 1 0 0 0 .85 1.5h9.3a1 1 0 0 0 .85-1.5L10 7V2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M4 15c1-4 4-8 10-11C12 8 10 12 4 15Z" strokeLinejoin="round" />
      <path d="M4 15c3-3 6-5 10-7" strokeLinecap="round" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="9" cy="5" r="2" /><circle cx="4" cy="13" r="2" /><circle cx="14" cy="13" r="2" />
      <line x1="7.5" y1="6.5" x2="5.5" y2="11.5" /><line x1="10.5" y1="6.5" x2="12.5" y2="11.5" />
    </svg>
  );
}

function ShopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path d="M2.5 7h13l-.75 7.5a1 1 0 0 1-1 .9H4.25a1 1 0 0 1-1-.9L2.5 7Z" strokeLinejoin="round" />
      <path d="M6 7V4.5a3 3 0 0 1 6 0V7" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1.5l.9 2.1a.5.5 0 0 0 .6.3l2.1-.9.9.9-0.9 2.1a.5.5 0 0 0 .3.6l2.1.9v1.2l-2.1.9a.5.5 0 0 0-.3.6l.9 2.1-.9.9-2.1-.9a.5.5 0 0 0-.6.3l-.9 2.1H7.8l-.9-2.1a.5.5 0 0 0-.6-.3l-2.1.9-.9-.9.9-2.1a.5.5 0 0 0-.3-.6L1.5 9.6V8.4l2.1-.9a.5.5 0 0 0 .3-.6L3 4.8l.9-.9 2.1.9a.5.5 0 0 0 .6-.3L7.5 1.5H9Z" />
    </svg>
  );
}
