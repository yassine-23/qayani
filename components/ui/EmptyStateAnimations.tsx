'use client';

import { motion } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Animated SVG illustrations for empty states.
   All use the dark neon (#00FF66) Qayani design language.
   ───────────────────────────────────────────────────────────── */

// ── Memories: Floating constellation of memory orbs ──────────
export function MemoriesIllustration() {
  const orbs = [
    { cx: 80, cy: 60, r: 6, delay: 0 },
    { cx: 140, cy: 40, r: 4, delay: 0.3 },
    { cx: 120, cy: 100, r: 8, delay: 0.6 },
    { cx: 60, cy: 110, r: 5, delay: 0.9 },
    { cx: 170, cy: 90, r: 3, delay: 1.2 },
    { cx: 100, cy: 75, r: 10, delay: 0.15 },
    { cx: 45, cy: 50, r: 3.5, delay: 0.75 },
    { cx: 155, cy: 130, r: 4.5, delay: 0.45 },
  ];

  const connections = [
    [0, 5], [5, 2], [2, 3], [0, 1], [1, 4], [5, 1], [3, 6], [4, 7],
  ];

  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <radialGradient id="mem-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
        </radialGradient>
        <filter id="mem-blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Connection lines */}
      {connections.map(([a, b], i) => (
        <motion.line
          key={`conn-${i}`}
          x1={orbs[a].cx}
          y1={orbs[a].cy}
          x2={orbs[b].cx}
          y2={orbs[b].cy}
          stroke="#00FF66"
          strokeOpacity="0.08"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5 + i * 0.15, duration: 1, ease: 'easeOut' }}
        />
      ))}

      {/* Glowing orbs */}
      {orbs.map((orb, i) => (
        <g key={`orb-${i}`}>
          {/* Outer glow */}
          <motion.circle
            cx={orb.cx}
            cy={orb.cy}
            r={orb.r * 3}
            fill="url(#mem-glow)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.6, 0.3, 0.6],
              scale: [0.8, 1.2, 1, 1.2],
            }}
            transition={{
              delay: orb.delay,
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Core */}
          <motion.circle
            cx={orb.cx}
            cy={orb.cy}
            r={orb.r}
            fill="#00FF66"
            fillOpacity="0.15"
            stroke="#00FF66"
            strokeOpacity="0.4"
            strokeWidth="1"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: orb.delay, duration: 0.6, ease: 'backOut' }}
          />
          {/* Bright center */}
          <motion.circle
            cx={orb.cx}
            cy={orb.cy}
            r={orb.r * 0.4}
            fill="#00FF66"
            fillOpacity="0.6"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{
              delay: orb.delay + 0.3,
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </g>
      ))}

      {/* Central brain-like icon */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: 'backOut' }}
      >
        <motion.circle
          cx="100"
          cy="75"
          r="18"
          fill="none"
          stroke="#00FF66"
          strokeOpacity="0.2"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 75px' }}
        />
      </motion.g>
    </motion.svg>
  );
}

// ── Recordings: Pulsing waveform with microphone ─────────────
export function RecordingsIllustration() {
  const bars = Array.from({ length: 32 }, (_, i) => ({
    x: 30 + i * 5,
    height: Math.sin(i / 3) * 25 + 30,
    delay: i * 0.05,
  }));

  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="mic-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Waveform bars */}
      {bars.map((bar, i) => (
        <motion.rect
          key={i}
          x={bar.x}
          width="3"
          rx="1.5"
          fill="url(#wave-grad)"
          initial={{ height: 4, y: 85 }}
          animate={{
            height: [4, bar.height, 8, bar.height * 0.7, 4],
            y: [85, 85 - bar.height / 2, 83, 85 - bar.height * 0.35, 85],
          }}
          transition={{
            delay: bar.delay,
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 0.5,
          }}
        />
      ))}

      {/* Center microphone icon */}
      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {/* Mic glow */}
        <circle cx="110" cy="85" r="30" fill="url(#mic-glow)" />

        {/* Mic body */}
        <motion.rect
          x="104"
          y="68"
          width="12"
          height="22"
          rx="6"
          fill="none"
          stroke="#00FF66"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          animate={{ strokeOpacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Mic arc */}
        <motion.path
          d="M98 82 C98 92 110 100 110 100 C110 100 122 92 122 82"
          fill="none"
          stroke="#00FF66"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Mic stand */}
        <line x1="110" y1="100" x2="110" y2="108" stroke="#00FF66" strokeOpacity="0.3" strokeWidth="1.5" />
        <line x1="103" y1="108" x2="117" y2="108" stroke="#00FF66" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>

      {/* Expanding rings */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={`ring-${i}`}
          cx="110"
          cy="85"
          r="15"
          fill="none"
          stroke="#00FF66"
          strokeWidth="0.5"
          initial={{ r: 15, opacity: 0.4 }}
          animate={{ r: 45, opacity: 0 }}
          transition={{
            delay: i * 1.2,
            duration: 3,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.svg>
  );
}

// ── Family: Network of connected nodes ───────────────────────
export function FamilyIllustration() {
  const nodes = [
    { cx: 110, cy: 45, r: 8, label: 'You' },
    { cx: 65, cy: 85, r: 6 },
    { cx: 155, cy: 85, r: 6 },
    { cx: 40, cy: 125, r: 5 },
    { cx: 90, cy: 125, r: 5 },
    { cx: 130, cy: 125, r: 5 },
    { cx: 180, cy: 125, r: 5 },
  ];

  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];

  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <radialGradient id="fam-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connection lines with animated draw */}
      {edges.map(([a, b], i) => (
        <motion.line
          key={`edge-${i}`}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="#00FF66"
          strokeOpacity="0.15"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3 + i * 0.2, duration: 0.8, ease: 'easeOut' }}
        />
      ))}

      {/* Animated data particles traveling along edges */}
      {edges.map(([a, b], i) => (
        <motion.circle
          key={`particle-${i}`}
          r="1.5"
          fill="#00FF66"
          fillOpacity="0.6"
          initial={{ cx: nodes[a].cx, cy: nodes[a].cy, opacity: 0 }}
          animate={{
            cx: [nodes[a].cx, nodes[b].cx, nodes[a].cx],
            cy: [nodes[a].cy, nodes[b].cy, nodes[a].cy],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            delay: 1.5 + i * 0.6,
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          {/* Outer glow */}
          <motion.circle
            cx={node.cx}
            cy={node.cy}
            r={node.r * 3}
            fill="url(#fam-glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ delay: i * 0.15, duration: 3, repeat: Infinity }}
          />

          {/* Node ring */}
          <motion.circle
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="#00FF66"
            fillOpacity={i === 0 ? '0.15' : '0.08'}
            stroke="#00FF66"
            strokeOpacity={i === 0 ? '0.6' : '0.25'}
            strokeWidth={i === 0 ? '2' : '1'}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'backOut' }}
          />

          {/* Person icon inside node */}
          <motion.circle
            cx={node.cx}
            cy={node.cy - node.r * 0.2}
            r={node.r * 0.25}
            fill="#00FF66"
            fillOpacity="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
          <motion.path
            d={`M${node.cx - node.r * 0.35} ${node.cy + node.r * 0.35} Q${node.cx} ${node.cy + node.r * 0.1} ${node.cx + node.r * 0.35} ${node.cy + node.r * 0.35}`}
            fill="#00FF66"
            fillOpacity="0.3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          />
        </g>
      ))}

      {/* Dashed orbit around root */}
      <motion.circle
        cx="110"
        cy="45"
        r="16"
        fill="none"
        stroke="#00FF66"
        strokeOpacity="0.12"
        strokeWidth="1"
        strokeDasharray="3 3"
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '110px 45px' }}
      />
    </motion.svg>
  );
}

// ── Chat: Floating message bubbles ───────────────────────────
export function ChatIllustration() {
  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <linearGradient id="chat-grad-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="chat-grad-2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* User message bubble (right) */}
      <motion.g
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <rect x="110" y="30" width="80" height="28" rx="12" fill="url(#chat-grad-1)" stroke="#00FF66" strokeOpacity="0.2" strokeWidth="1" />
        {/* Text lines */}
        <rect x="120" y="39" width="45" height="3" rx="1.5" fill="#00FF66" fillOpacity="0.3" />
        <rect x="120" y="46" width="30" height="3" rx="1.5" fill="#00FF66" fillOpacity="0.2" />
      </motion.g>

      {/* AI response bubble (left) */}
      <motion.g
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <rect x="30" y="70" width="100" height="36" rx="12" fill="url(#chat-grad-2)" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
        {/* Text lines */}
        <rect x="42" y="80" width="60" height="3" rx="1.5" fill="white" fillOpacity="0.15" />
        <rect x="42" y="87" width="75" height="3" rx="1.5" fill="white" fillOpacity="0.1" />
        <rect x="42" y="94" width="40" height="3" rx="1.5" fill="white" fillOpacity="0.08" />
      </motion.g>

      {/* Second user message */}
      <motion.g
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.6 }}
      >
        <rect x="120" y="118" width="70" height="28" rx="12" fill="url(#chat-grad-1)" stroke="#00FF66" strokeOpacity="0.2" strokeWidth="1" />
        <rect x="130" y="127" width="40" height="3" rx="1.5" fill="#00FF66" fillOpacity="0.3" />
        <rect x="130" y="134" width="25" height="3" rx="1.5" fill="#00FF66" fillOpacity="0.2" />
      </motion.g>

      {/* Typing indicator */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        <rect x="30" y="125" width="50" height="24" rx="12" fill="url(#chat-grad-2)" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={47 + i * 10}
            cy="137"
            r="2.5"
            fill="white"
            fillOpacity="0.2"
            animate={{ fillOpacity: [0.1, 0.4, 0.1] }}
            transition={{
              delay: 2 + i * 0.2,
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.g>

      {/* Subtle sparkle on neon bubble */}
      <motion.circle
        cx="185"
        cy="32"
        r="1.5"
        fill="#00FF66"
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 0.5] }}
        transition={{ delay: 1, duration: 2, repeat: Infinity }}
      />
    </motion.svg>
  );
}

// ── Avatar: Digital silhouette with scan lines ───────────────
export function AvatarIllustration() {
  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <linearGradient id="av-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0" />
          <stop offset="40%" stopColor="#00FF66" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#00FF66" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#00FF66" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
        </linearGradient>
        <clipPath id="av-clip">
          <rect x="60" y="15" width="100" height="140" />
        </clipPath>
      </defs>

      {/* Head circle */}
      <motion.circle
        cx="110"
        cy="55"
        r="25"
        fill="none"
        stroke="#00FF66"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Shoulders / body arc */}
      <motion.path
        d="M65 130 C65 100 85 90 110 90 C135 90 155 100 155 130"
        fill="none"
        stroke="#00FF66"
        strokeOpacity="0.15"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
      />

      {/* Inner face features - eyes */}
      <motion.circle
        cx="100"
        cy="52"
        r="2"
        fill="#00FF66"
        fillOpacity="0.4"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="120"
        cy="52"
        r="2"
        fill="#00FF66"
        fillOpacity="0.4"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ delay: 1.6, duration: 2, repeat: Infinity }}
      />

      {/* Grid / digital pattern behind */}
      {Array.from({ length: 8 }, (_, i) => (
        <motion.line
          key={`h-${i}`}
          x1="60"
          x2="160"
          y1={30 + i * 16}
          y2={30 + i * 16}
          stroke="#00FF66"
          strokeOpacity="0.03"
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 * i }}
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <motion.line
          key={`v-${i}`}
          x1={70 + i * 14}
          x2={70 + i * 14}
          y1="25"
          y2="140"
          stroke="#00FF66"
          strokeOpacity="0.03"
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 * i }}
        />
      ))}

      {/* Scanning line */}
      <motion.rect
        x="55"
        y="0"
        width="110"
        height="50"
        fill="url(#av-scan)"
        clipPath="url(#av-clip)"
        animate={{ y: [-50, 170] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
      />

      {/* Corner brackets */}
      <motion.g
        stroke="#00FF66"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {/* Top-left */}
        <path d="M70 30 L70 22 L78 22" fill="none" />
        {/* Top-right */}
        <path d="M150 30 L150 22 L142 22" fill="none" />
        {/* Bottom-left */}
        <path d="M70 135 L70 143 L78 143" fill="none" />
        {/* Bottom-right */}
        <path d="M150 135 L150 143 L142 143" fill="none" />
      </motion.g>

      {/* Status text */}
      <motion.text
        x="110"
        y="160"
        textAnchor="middle"
        fill="#00FF66"
        fillOpacity="0.25"
        fontSize="8"
        fontFamily="monospace"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ delay: 2, duration: 2, repeat: Infinity }}
      >
        AWAITING INPUT
      </motion.text>
    </motion.svg>
  );
}

// ── Dashboard: General purpose empty / status illustration ───
export function DashboardIllustration() {
  return (
    <motion.svg
      viewBox="0 0 220 170"
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <defs>
        <radialGradient id="dash-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00FF66" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central glow */}
      <circle cx="110" cy="85" r="60" fill="url(#dash-center)" />

      {/* Hexagonal ring */}
      <motion.polygon
        points="110,40 145,57 145,93 110,110 75,93 75,57"
        fill="none"
        stroke="#00FF66"
        strokeOpacity="0.12"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      {/* Rotating outer ring */}
      <motion.polygon
        points="110,30 152,50 152,100 110,120 68,100 68,50"
        fill="none"
        stroke="#00FF66"
        strokeOpacity="0.06"
        strokeWidth="0.5"
        strokeDasharray="4 8"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '110px 75px' }}
      />

      {/* Center icon - plus/add */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: 'backOut' }}
      >
        <circle cx="110" cy="75" r="14" fill="#00FF66" fillOpacity="0.06" stroke="#00FF66" strokeOpacity="0.25" strokeWidth="1" />
        <line x1="104" y1="75" x2="116" y2="75" stroke="#00FF66" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="110" y1="69" x2="110" y2="81" stroke="#00FF66" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>

      {/* Floating dots */}
      {[
        { cx: 80, cy: 50, delay: 0 },
        { cx: 140, cy: 50, delay: 0.3 },
        { cx: 145, cy: 95, delay: 0.6 },
        { cx: 75, cy: 95, delay: 0.9 },
      ].map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r="2"
          fill="#00FF66"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{
            delay: 1 + dot.delay,
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.svg>
  );
}
