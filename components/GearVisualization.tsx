'use client';

import React, { useRef, useEffect } from 'react';

interface GearVisualizationProps {
  params: {
    teeth: number;
    module: number;
    pressureAngle: number;
    gearType: string;
    material: string;
  };
  calculations: any;
  isAnimating: boolean;
  setIsAnimating: (val: boolean) => void;
}

export default function GearVisualization({ params, calculations, isAnimating, setIsAnimating }: GearVisualizationProps) {
  const gearRef = useRef<HTMLDivElement>(null);

  // Generate gear teeth
  const generateTeeth = () => {
    const teeth = [];
    const angleStep = 360 / params.teeth;

    for (let i = 0; i < params.teeth; i++) {
      const rotation = i * angleStep;
      teeth.push(
        <div
          key={i}
          className="absolute"
          style={{
            width: '8px',
            height: `${calculations.addendum * 10}px`,
            background: `linear-gradient(135deg,
              #e5e5e5 0%,
              #ffffff 20%,
              #d4d4d4 40%,
              #a3a3a3 60%,
              #737373 80%,
              #525252 100%)`,
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.6), inset 0 -1px 3px rgba(0,0,0,0.3)',
            transform: `rotate(${rotation}deg) translateY(-${calculations.pitchDiameter * 5}px)`,
            transformOrigin: 'center bottom',
            borderRadius: '2px 2px 0 0',
          }}
        />
      );
    }
    return teeth;
  };

  return (
    <div className="relative h-[400px] sm:h-[500px] w-full flex items-center justify-center perspective-1000">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/50 via-white to-amber-100/50 rounded-2xl" />

      {/* Light effects */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-radial from-yellow-200/30 to-transparent rounded-full blur-xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-radial from-amber-200/20 to-transparent rounded-full blur-2xl" />

      {/* 3D Gear Container */}
      <div
        className="relative transform-gpu"
        style={{
          transform: 'rotateX(20deg) rotateY(-20deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Main Gear Body */}
        <div
          ref={gearRef}
          className={`relative ${isAnimating ? 'animate-spin-slow' : ''}`}
          style={{
            width: `${calculations.outsideDiameter * 5}px`,
            height: `${calculations.outsideDiameter * 5}px`,
            transformStyle: 'preserve-3d',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Gear Base Circle */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background: `conic-gradient(from 0deg,
                #d4d4d8 0deg,
                #e4e4e7 30deg,
                #f4f4f5 60deg,
                #ffffff 90deg,
                #f4f4f5 120deg,
                #e4e4e7 150deg,
                #d4d4d8 180deg,
                #a1a1aa 210deg,
                #71717a 240deg,
                #52525b 270deg,
                #71717a 300deg,
                #a1a1aa 330deg,
                #d4d4d8 360deg)`,
              boxShadow: `
                inset 0 0 20px rgba(0,0,0,0.2),
                inset 0 5px 10px rgba(255,255,255,0.8),
                0 10px 30px rgba(0,0,0,0.2),
                0 20px 50px rgba(0,0,0,0.1)
              `,
            }}
          />

          {/* Center Hub */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${calculations.rootDiameter * 2}px`,
              height: `${calculations.rootDiameter * 2}px`,
              background: `radial-gradient(circle at 30% 30%,
                #ffffff 0%,
                #e5e5e5 20%,
                #a3a3a3 50%,
                #525252 100%)`,
              boxShadow: `
                inset -3px -3px 8px rgba(0,0,0,0.3),
                inset 3px 3px 8px rgba(255,255,255,0.9),
                0 0 15px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Center Hole */}
            <div className="absolute inset-4 rounded-full bg-gray-900/80 shadow-inner" />
          </div>

          {/* Gear Teeth */}
          <div className="absolute inset-0 flex items-center justify-center">
            {generateTeeth()}
          </div>

          {/* Metallic Sheen Overlay */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(135deg,
                transparent 0%,
                rgba(255,255,255,0.3) 20%,
                transparent 40%,
                rgba(255,255,255,0.1) 60%,
                transparent 100%)`,
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Floating Shadow */}
        <div
          className="absolute -bottom-10 left-1/2 transform -translate-x-1/2"
          style={{
            width: `${calculations.outsideDiameter * 4}px`,
            height: '40px',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
            transform: 'translateX(-50%) rotateX(90deg) translateZ(-50px)',
          }}
        />
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className="px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-gray-700 font-medium"
        >
          {isAnimating ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button
          className="px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-gray-700 font-medium"
        >
          🔄 Reset View
        </button>
      </div>

      {/* Specifications Display */}
      <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-bold text-gray-700 mb-1">Material: {params.material}</div>
        <div className="text-gray-600">Type: {params.gearType}</div>
        <div className="text-gray-600">Teeth: {params.teeth}</div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }

        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}