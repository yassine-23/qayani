'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/* ============================================
   CustomCursor — Branded Yellow Dot

   A small yellow dot that follows the mouse
   with spring physics. Expands on interactive
   elements. Inverts on CTAs. Hidden on mobile.

   Yellow = life. The cursor IS the brand.
   ============================================ */

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [isHovering, setIsHovering] = useState(false);
  const [isClickable, setIsClickable] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor="expand"]');
      const cta = target.closest('[data-cursor="invert"], .btn-primary, [type="submit"]');

      setIsHovering(!!interactive);
      setIsClickable(!!cta);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Main dot */}
      <motion.div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block mix-blend-difference"
        style={{ x, y }}
      >
        <motion.div
          className="rounded-full -translate-x-1/2 -translate-y-1/2"
          animate={{
            width: isClickable ? 56 : isHovering ? 40 : 12,
            height: isClickable ? 56 : isHovering ? 40 : 12,
            backgroundColor: isClickable
              ? '#FACC15'
              : isHovering
              ? 'rgba(250, 204, 21, 0.15)'
              : '#FACC15',
            border: isHovering && !isClickable ? '1px solid rgba(250, 204, 21, 0.4)' : 'none',
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        />
      </motion.div>

      {/* Trailing glow */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998] hidden md:block"
        style={{ x: cursorX, y: cursorY }}
      >
        <div
          className="w-24 h-24 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, #FACC15 0%, transparent 70%)',
          }}
        />
      </motion.div>
    </>
  );
}
