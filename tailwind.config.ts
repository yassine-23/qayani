import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ================================
         OBSIDIAN DEPTHS — Color System
         ================================ */
      colors: {
        // --- Surface palette (dark navy matching QAYANI logo) ---
        void: '#0A1222',
        deep: '#0F1A2E',
        lifted: '#152238',
        rim: '#1E2D47',
        muted: '#71717A',
        subtle: '#A1A1AA',
        primary: '#F4F4F5',

        // --- Tier: Tetrahedron (Free) — Amber/Copper ---
        tetra: {
          DEFAULT: '#D97706',
          bright: '#FCD34D',
          dim: '#78350F',
          50: 'rgba(217, 119, 6, 0.05)',
          100: 'rgba(217, 119, 6, 0.10)',
          200: 'rgba(217, 119, 6, 0.20)',
        },

        // --- Tier: Octahedron (Premium) — Golden Yellow ---
        cube: {
          DEFAULT: '#FACC15',
          bright: '#FDE68A',
          dim: '#713F12',
          50: 'rgba(250, 204, 21, 0.05)',
          100: 'rgba(250, 204, 21, 0.10)',
          200: 'rgba(250, 204, 21, 0.20)',
        },

        // --- Tier: Icosahedron (Enterprise) — Celestial Blue ---
        ico: {
          DEFAULT: '#3B82F6',
          bright: '#93C5FD',
          dim: '#0C1445',
          50: 'rgba(59, 130, 246, 0.05)',
          100: 'rgba(59, 130, 246, 0.10)',
          200: 'rgba(59, 130, 246, 0.20)',
        },

        // --- Node type colors (workflow builder) ---
        'node-llm': '#8B5CF6',
        'node-memory': '#0EA5E9',
        'node-tool': '#10B981',
        'node-output': '#F59E0B',
        'node-trigger': '#EF4444',

        // --- Status colors ---
        alive: '#22C55E',
        thinking: '#A78BFA',
        speaking: '#38BDF8',
        sleeping: '#3F3F46',
        error: '#F87171',

        // --- Legacy aliases (prevent breakage during migration) ---
        neon: {
          DEFAULT: '#FACC15',
          bright: '#FDE68A',
          dim: '#713F12',
          50: 'rgba(250, 204, 21, 0.05)',
          100: 'rgba(250, 204, 21, 0.10)',
          200: 'rgba(250, 204, 21, 0.20)',
        },
        surface: {
          DEFAULT: '#0A1222',
          50: '#0D1628',
          100: '#0F1A2E',
          200: '#152238',
          300: '#1E2D47',
        },
        'qayani-gold': '#7C3AED',
        'qayani-gold-light': '#C4B5FD',
        'qayani-gold-dark': '#2E1065',
        'qayani-black': '#09090B',
        'qayani-gray': '#18181B',
      },

      /* ================================
         Typography — Geist Family
         ================================ */
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'SF Mono',
          'Fira Code',
          'monospace',
        ],
        display: [
          'var(--font-geist-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },

      fontSize: {
        'display-2xl': ['72px', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '300' }],
        'display-xl': ['60px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '300' }],
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'heading-xl': ['36px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-lg': ['30px', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-sm': ['20px', { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '400' }],
        'mono-md': ['14px', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'mono-sm': ['12px', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '400' }],
        'label': ['11px', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '500' }],
      },

      /* ================================
         Spacing — 4px base grid
         ================================ */
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
        '34': '136px',
      },

      /* ================================
         Border Radius
         ================================ */
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },

      /* ================================
         Shadows — Layered Depth
         ================================ */
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.5)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.7)',
        // Tier glows
        'glow-amber': '0 0 40px rgba(217, 119, 6, 0.15)',
        'glow-violet': '0 0 40px rgba(250, 204, 21, 0.15)',
        'glow-blue': '0 0 40px rgba(59, 130, 246, 0.15)',
        'glow-amber-lg': '0 0 80px rgba(217, 119, 6, 0.25)',
        'glow-violet-lg': '0 0 80px rgba(250, 204, 21, 0.25)',
        'glow-blue-lg': '0 0 80px rgba(59, 130, 246, 0.25)',
        // Status glows
        'glow-alive': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-speaking': '0 0 20px rgba(56, 189, 248, 0.3)',
        'glow-error': '0 0 20px rgba(248, 113, 113, 0.3)',
        // Inner highlight
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        // Legacy aliases
        'neon-sm': '0 0 12px rgba(250, 204, 21, 0.15)',
        'neon-md': '0 0 24px rgba(250, 204, 21, 0.25)',
        'neon-lg': '0 0 48px rgba(250, 204, 21, 0.35)',
        'neon-glow': '0 0 80px rgba(250, 204, 21, 0.25)',
      },

      /* ================================
         Animation — Motion System
         ================================ */
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'exit': 'cubic-bezier(0.5, 0, 1, 0.5)',
        'apple': 'cubic-bezier(0.42, 0, 0.58, 1)',
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      transitionDuration: {
        'micro': '80ms',
        'interaction': '150ms',
        'transition': '300ms',
        'page': '600ms',
        'complex': '1200ms',
      },

      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 6s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'ring-spin': 'ringSpin 20s linear infinite',
        'pulse-alive': 'pulseAlive 2s ease-in-out infinite',
        'pulse-thinking': 'pulseThinking 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'orbit': 'orbit 25s linear infinite',
        'orbit-reverse': 'orbit 30s linear infinite reverse',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 4s linear infinite',
        'data-stream': 'dataStream 2s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.008)' },
        },
        ringSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseAlive: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 16px rgba(34, 197, 94, 0.5)' },
        },
        pulseThinking: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(140px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(140px) rotate(-360deg)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(250, 204, 21, 0.2)' },
          '100%': { boxShadow: '0 0 50px rgba(250, 204, 21, 0.4)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        dataStream: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '30%': { opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
      },

      /* ================================
         Background Images
         ================================ */
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-void': 'linear-gradient(180deg, #09090B 0%, #111113 50%, #09090B 100%)',
        'dot-grid': 'radial-gradient(circle, rgba(244, 244, 245, 0.03) 1px, transparent 1px)',
      },

      backgroundSize: {
        'dot-grid': '20px 20px',
      },
    },
  },
  plugins: [],
}
export default config
