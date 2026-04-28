'use client';

import React, { useRef, useEffect, useState } from 'react';

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

export default function SimpleGearVisualization({ params, calculations, isAnimating, setIsAnimating }: GearVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const generateGearPath = () => {
    const teeth = params.teeth;
    const outerRadius = calculations.outsideDiameter / 2;
    const pitchRadius = calculations.pitchDiameter / 2;
    const rootRadius = calculations.rootDiameter / 2;

    const angleStep = (2 * Math.PI) / teeth;
    const toothWidth = angleStep * 0.4;

    let path = '';

    for (let i = 0; i < teeth; i++) {
      const angle = i * angleStep;

      // Tooth tip
      const tipX1 = Math.cos(angle - toothWidth/2) * outerRadius;
      const tipY1 = Math.sin(angle - toothWidth/2) * outerRadius;
      const tipX2 = Math.cos(angle + toothWidth/2) * outerRadius;
      const tipY2 = Math.sin(angle + toothWidth/2) * outerRadius;

      // Tooth root
      const rootX1 = Math.cos(angle - angleStep/2) * rootRadius;
      const rootY1 = Math.sin(angle - angleStep/2) * rootRadius;
      const rootX2 = Math.cos(angle + angleStep/2) * rootRadius;
      const rootY2 = Math.sin(angle + angleStep/2) * rootRadius;

      if (i === 0) {
        path += `M ${rootX1} ${rootY1}`;
      }

      path += ` L ${tipX1} ${tipY1} L ${tipX2} ${tipY2} L ${rootX2} ${rootY2}`;
    }

    path += ' Z';
    return path;
  };

  return (
    <div className="relative h-[400px] sm:h-[500px] w-full flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl overflow-hidden">

      {/* Background Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main SVG Gear */}
      <svg
        ref={svgRef}
        viewBox="-150 -150 300 300"
        className="w-full h-full max-w-md max-h-md"
        style={{
          filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
        }}
      >
        {/* Gear Shadow */}
        <g transform={`rotate(${rotation}) translate(2, 2)`}>
          <path
            d={generateGearPath()}
            fill="rgba(0,0,0,0.2)"
            opacity="0.3"
          />
          <circle
            cx="0"
            cy="0"
            r={calculations.rootDiameter / 3}
            fill="rgba(0,0,0,0.2)"
            opacity="0.3"
          />
        </g>

        {/* Main Gear Body */}
        <g transform={`rotate(${rotation})`}>
          {/* Gear Teeth */}
          <path
            d={generateGearPath()}
            fill="url(#gearGradient)"
            stroke="#4a5568"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Center Hub */}
          <circle
            cx="0"
            cy="0"
            r={calculations.rootDiameter / 3}
            fill="url(#hubGradient)"
            stroke="#4a5568"
            strokeWidth="2"
          />

          {/* Center Hole */}
          <circle
            cx="0"
            cy="0"
            r={calculations.rootDiameter / 6}
            fill="#2d3748"
            stroke="#1a202c"
            strokeWidth="1"
          />

          {/* Hub Details */}
          <circle
            cx="0"
            cy="0"
            r={calculations.rootDiameter / 4}
            fill="none"
            stroke="#718096"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </g>

        {/* Gradients */}
        <defs>
          <radialGradient id="gearGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#f7fafc" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#cbd5e0" />
            <stop offset="100%" stopColor="#a0aec0" />
          </radialGradient>

          <radialGradient id="hubGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#edf2f7" />
            <stop offset="50%" stopColor="#cbd5e0" />
            <stop offset="100%" stopColor="#a0aec0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className="px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-gray-700 font-medium"
          style={{ fontFamily: '"Kalam", cursive' }}
        >
          {isAnimating ? '⏸️ Pause' : '▶️ Play'}
        </button>

        <button
          onClick={() => setRotation(0)}
          className="px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-gray-700 font-medium"
          style={{ fontFamily: '"Kalam", cursive' }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Info Display */}
      <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-sm rounded-xl p-3 text-sm" style={{ fontFamily: '"Kalam", cursive' }}>
        <div className="font-bold text-gray-700 mb-1">Material: {params.material}</div>
        <div className="text-gray-600">Type: {params.gearType}</div>
        <div className="text-gray-600">Teeth: {params.teeth}</div>
        <div className="text-gray-600">Module: {params.module}mm</div>
      </div>

      {/* Dimensions Display */}
      <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm rounded-xl p-3 text-sm" style={{ fontFamily: '"Kalam", cursive' }}>
        <div className="text-gray-600">Outer Ø: {calculations.outsideDiameter.toFixed(1)}mm</div>
        <div className="text-gray-600">Pitch Ø: {calculations.pitchDiameter.toFixed(1)}mm</div>
        <div className="text-gray-600">Root Ø: {calculations.rootDiameter.toFixed(1)}mm</div>
      </div>

      {/* Measurement Lines */}
      {!isAnimating && (
        <svg
          viewBox="-150 -150 300 300"
          className="absolute inset-0 w-full h-full max-w-md max-h-md pointer-events-none"
        >
          {/* Pitch Circle */}
          <circle
            cx="0"
            cy="0"
            r={calculations.pitchDiameter / 2}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.6"
          />

          {/* Outer Circle */}
          <circle
            cx="0"
            cy="0"
            r={calculations.outsideDiameter / 2}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.6"
          />

          {/* Root Circle */}
          <circle
            cx="0"
            cy="0"
            r={calculations.rootDiameter / 2}
            fill="none"
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.6"
          />
        </svg>
      )}
    </div>
  );
}