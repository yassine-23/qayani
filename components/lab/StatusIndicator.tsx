'use client';

const STATUS_CONFIG = {
  active: {
    color: 'bg-neon',
    shadow: 'shadow-[0_0_8px_rgba(0,255,102,0.6)]',
    label: 'Active',
    pulse: true,
  },
  working: {
    color: 'bg-amber-400',
    shadow: 'shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    label: 'Working',
    pulse: true,
  },
  idle: {
    color: 'bg-gray-500',
    shadow: '',
    label: 'Idle',
    pulse: false,
  },
  error: {
    color: 'bg-red-500',
    shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    label: 'Error',
    pulse: true,
  },
} as const;

type AgentStatus = keyof typeof STATUS_CONFIG;

export default function StatusIndicator({
  status,
  size = 'sm',
  showLabel = false,
}: {
  status: AgentStatus;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const sizeClass = size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div className={`${sizeClass} rounded-full ${config.color} ${config.shadow}`} />
        {config.pulse && (
          <div className={`absolute inset-0 ${sizeClass} rounded-full ${config.color} animate-ping opacity-40`} />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 font-mono">{config.label}</span>
      )}
    </div>
  );
}
