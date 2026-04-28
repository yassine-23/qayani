'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MemoriesIllustration,
  RecordingsIllustration,
  FamilyIllustration,
  ChatIllustration,
  AvatarIllustration,
  DashboardIllustration,
} from './EmptyStateAnimations';

/* ─────────────────────────────────────────────────────────────
   Reusable Empty State component — dark neon Qayani theme.
   Drop into any page where there is no data yet.
   ───────────────────────────────────────────────────────────── */

export type EmptyStateVariant =
  | 'memories'
  | 'recordings'
  | 'family'
  | 'chat'
  | 'avatar'
  | 'general';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  /** Optional secondary hint below the description */
  hint?: string;
  className?: string;
}

const illustrations: Record<EmptyStateVariant, React.FC> = {
  memories: MemoriesIllustration,
  recordings: RecordingsIllustration,
  family: FamilyIllustration,
  chat: ChatIllustration,
  avatar: AvatarIllustration,
  general: DashboardIllustration,
};

export default function EmptyState({
  variant = 'general',
  title,
  description,
  actions = [],
  hint,
  className = '',
}: EmptyStateProps) {
  const Illustration = illustrations[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`flex flex-col items-center justify-center px-6 py-16 ${className}`}
    >
      {/* Animated illustration */}
      <div className="w-56 h-44 mb-8">
        <Illustration />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-white/85 mb-2 text-center">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[14px] text-white/35 max-w-md text-center leading-relaxed mb-2">
        {description}
      </p>

      {/* Optional hint */}
      {hint && (
        <p className="text-[12px] font-mono text-white/15 mt-1 mb-6 text-center">
          {hint}
        </p>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex items-center gap-3 mt-6">
          {actions.map((action, i) => {
            const isPrimary = action.primary ?? i === 0;
            const cls = isPrimary
              ? 'inline-flex items-center gap-2 rounded-lg bg-neon/[0.12] border border-neon/20 px-5 py-2.5 text-[13px] font-semibold text-neon hover:bg-neon/[0.18] hover:border-neon/30 transition-all'
              : 'inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all';

            if (action.href) {
              return (
                <Link key={i} href={action.href}>
                  <motion.button
                    className={cls}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {action.label}
                  </motion.button>
                </Link>
              );
            }

            return (
              <motion.button
                key={i}
                onClick={action.onClick}
                className={cls}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {action.label}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
