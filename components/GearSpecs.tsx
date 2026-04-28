'use client';

import React from 'react';

interface GearSpecsProps {
  params: {
    teeth: number;
    module: number;
    pressureAngle: number;
    gearType: string;
    material: string;
  };
  calculations: any;
}

export default function GearSpecs({ params, calculations }: GearSpecsProps) {
  const specs = [
    { label: 'Pitch Diameter', value: `${calculations.pitchDiameter.toFixed(2)} mm`, formula: 'D = m × z' },
    { label: 'Outside Diameter', value: `${calculations.outsideDiameter.toFixed(2)} mm`, formula: 'Da = m × (z + 2)' },
    { label: 'Root Diameter', value: `${calculations.rootDiameter.toFixed(2)} mm`, formula: 'Df = m × (z - 2.5)' },
    { label: 'Addendum', value: `${calculations.addendum.toFixed(2)} mm`, formula: 'ha = m' },
    { label: 'Dedendum', value: `${calculations.dedendum.toFixed(2)} mm`, formula: 'hf = 1.25 × m' },
    { label: 'Circular Pitch', value: `${calculations.circularPitch.toFixed(2)} mm`, formula: 'p = π × m' },
    { label: 'Base Circle', value: `${calculations.baseCircleDiameter.toFixed(2)} mm`, formula: 'Db = D × cos(α)' },
  ];

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Specifications</h3>

      <div className="space-y-3">
        {specs.map((spec, index) => (
          <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
            <div>
              <div className="text-sm font-medium text-gray-900">{spec.label}</div>
              <div className="text-xs text-gray-500 font-mono">{spec.formula}</div>
            </div>
            <div className="text-sm font-bold text-gray-900">{spec.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <div className="font-medium mb-2">Parameters:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>z = {params.teeth} teeth</div>
          <div>m = {params.module} mm</div>
          <div>α = {params.pressureAngle}°</div>
          <div>Type: {params.gearType}</div>
        </div>
      </div>
    </div>
  );
}