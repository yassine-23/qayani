'use client';

/* ============================================
   QMark — The QAYANI Brand Mark

   The Q with radiating yellow rays.
   Echoes the logo on every page.
   Available in multiple sizes.
   Can animate (rays pulse/rotate).
   ============================================ */

interface QMarkProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export default function QMark({ size = 32, animate = false, className = '' }: QMarkProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        width={size}
        height={size}
        aria-label="QAYANI"
      >
        {/* Radiating rays */}
        <g
          opacity="0.9"
          style={animate ? { animation: 'ringSpin 30s linear infinite' } : undefined}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const innerR = 22;
            const outerR = 30;
            const x1 = 32 + Math.cos(angle) * innerR;
            const y1 = 32 + Math.sin(angle) * innerR;
            const x2 = 32 + Math.cos(angle) * outerR;
            const y2 = 32 + Math.sin(angle) * outerR;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#FACC15"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Q letterform */}
        <text
          x="32"
          y="37"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="28"
          fontWeight="700"
          fontFamily="var(--font-geist-sans), -apple-system, sans-serif"
        >
          Q
        </text>
      </svg>
    </div>
  );
}

/* Larger hero variant with glow */
export function QMarkHero({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow behind */}
      <div
        className="absolute rounded-full blur-[40px] opacity-20"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          background: 'radial-gradient(circle, #FACC15 0%, transparent 70%)',
        }}
      />
      <QMark size={size} animate />
    </div>
  );
}
