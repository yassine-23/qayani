'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   GlassCard — Dark Refined Glassmorphism

   Not heavy or blurry. Subtle, elevated, tactile.
   rgba(24,24,27,0.8) bg, 12px blur, 1px rim border.
   Hover: border brightens, 2px lift.
   ============================================ */

type CardVariant = 'default' | 'interactive' | 'elevated' | 'ghost';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: 'amber' | 'violet' | 'blue' | 'none';
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: [
    'bg-lifted/80 backdrop-blur-[12px]',
    'border border-white/[0.06]',
  ].join(' '),
  interactive: [
    'bg-lifted/80 backdrop-blur-[12px]',
    'border border-white/[0.06]',
    'hover:border-white/[0.1] hover:-translate-y-0.5',
    'transition-all duration-transition ease-spring',
    'cursor-pointer',
  ].join(' '),
  elevated: [
    'bg-lifted/90 backdrop-blur-[16px]',
    'border border-white/[0.08]',
    'shadow-card',
  ].join(' '),
  ghost: [
    'bg-white/[0.02]',
    'border border-white/[0.04]',
  ].join(' '),
};

const PADDING_STYLES: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

const GLOW_STYLES: Record<string, string> = {
  none: '',
  amber: 'shadow-glow-amber',
  violet: 'shadow-glow-violet',
  blue: 'shadow-glow-blue',
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      glow = 'none',
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={[
          'rounded-md',
          VARIANT_STYLES[variant],
          PADDING_STYLES[padding],
          GLOW_STYLES[glow],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = 'GlassCard';
export default GlassCard;
