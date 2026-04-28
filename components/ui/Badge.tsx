'use client';

/* ============================================
   Badge — Status dots, labels, and counts

   Used for: status indicators, tier badges,
   node type indicators, count badges.
   ============================================ */

type BadgeVariant = 'status' | 'tier' | 'node' | 'count' | 'label';

interface BadgeProps {
  variant?: BadgeVariant;
  color?: string;
  children?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  variant = 'label',
  color,
  children,
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  if (variant === 'status' || dot) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${pulse ? 'animate-pulse-alive' : ''}`}
          style={{ backgroundColor: color || '#3F3F46' }}
        />
        {children && (
          <span className="text-caption font-medium text-subtle">{children}</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'px-2 py-0.5 rounded-xs',
        'text-caption font-medium',
        'bg-white/[0.06] text-subtle',
        'border border-white/[0.06]',
        className,
      ].join(' ')}
      style={color ? { borderColor: `${color}20`, backgroundColor: `${color}10`, color } : undefined}
    >
      {children}
    </span>
  );
}

/* StatusDot — Standalone status indicator */
export function StatusDot({
  status = 'idle',
  size = 8,
  className = '',
}: {
  status?: 'alive' | 'thinking' | 'speaking' | 'idle' | 'error';
  size?: number;
  className?: string;
}) {
  const colors: Record<string, string> = {
    alive: '#22C55E',
    thinking: '#A78BFA',
    speaking: '#38BDF8',
    idle: '#3F3F46',
    error: '#F87171',
  };

  const isActive = status !== 'idle';

  return (
    <span
      className={`inline-block rounded-full shrink-0 ${isActive ? 'animate-pulse-alive' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors[status],
      }}
    />
  );
}
