'use client';

import { useEffect, useRef, ReactNode } from 'react';
import Lenis from 'lenis';

/* ============================================
   SmoothScroll — Lenis Wrapper

   Buttery smooth scroll across the entire app.
   Wraps children. Self-initializes on mount.
   Exposes lenis instance via ref for GSAP sync.
   ============================================ */

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
