'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

/* ============================================
   Button — Atomic Button Component

   Variants: primary, secondary, ghost, destructive
   Sizes: sm, md, lg, xl
   Every button in the app should use this.
   ============================================ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    'bg-cube text-void',
    'hover:bg-cube-bright',
    'active:scale-[0.98]',
    'shadow-glow-violet',
    'disabled:bg-cube/30 disabled:text-void/40 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-transparent text-primary',
    'border border-rim',
    'hover:bg-white/[0.04] hover:border-subtle',
    'active:scale-[0.98]',
    'disabled:text-muted disabled:border-rim/50',
  ].join(' '),
  ghost: [
    'bg-transparent text-subtle',
    'hover:text-primary hover:bg-white/[0.04]',
    'active:scale-[0.98]',
    'disabled:text-muted',
  ].join(' '),
  destructive: [
    'bg-transparent text-error',
    'border border-error/20',
    'hover:bg-error/10 hover:border-error/40',
    'active:scale-[0.98]',
    'disabled:text-error/40 disabled:border-error/10',
  ].join(' '),
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-body-sm gap-1.5 rounded-sm',
  md: 'h-10 px-4 text-body-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-body-md gap-2 rounded-md',
  xl: 'h-14 px-8 text-body-lg gap-3 rounded-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      children,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center',
          'font-medium',
          'transition-all duration-interaction ease-spring',
          'select-none whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-cube/60 focus-visible:outline-offset-2',
          'cursor-pointer disabled:cursor-not-allowed',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin"
            style={{ width: size === 'sm' ? 14 : 16, height: size === 'sm' ? 14 : 16 }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
