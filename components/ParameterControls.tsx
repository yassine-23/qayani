'use client';

import React from 'react';

interface ParameterControlsProps {
  params: {
    teeth: number;
    module: number;
    pressureAngle: number;
    gearType: string;
    material: string;
  };
  updateParameter: (param: string, value: number | string) => void;
}

export default function ParameterControls({ params, updateParameter }: ParameterControlsProps) {
  const materials = [
    { value: 'steel', label: 'Steel' },
    { value: 'brass', label: 'Brass' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'aluminum', label: 'Aluminum' },
  ];

  const gearTypes = [
    { value: 'spur', label: 'Spur' },
    { value: 'helical', label: 'Helical' },
    { value: 'bevel', label: 'Bevel' },
    { value: 'internal', label: 'Internal' },
  ];

  const pressureAngles = [14.5, 20, 25];

  return (
    <div className="space-y-6">
      {/* Main Parameters */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Parameters</h3>

        {/* Number of Teeth */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teeth: <span className="font-bold">{params.teeth}</span>
          </label>
          <input
            type="range"
            min="6"
            max="200"
            value={params.teeth}
            onChange={(e) => updateParameter('teeth', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>6</span>
            <span>200</span>
          </div>
        </div>

        {/* Module */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Module: <span className="font-bold">{params.module} mm</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.1"
            value={params.module}
            onChange={(e) => updateParameter('module', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5</span>
            <span>10</span>
          </div>
        </div>

        {/* Pressure Angle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pressure Angle: <span className="font-bold">{params.pressureAngle}°</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {pressureAngles.map((angle) => (
              <button
                key={angle}
                onClick={() => updateParameter('pressureAngle', angle)}
                className={`p-2 rounded-md text-sm transition-colors ${
                  params.pressureAngle === angle
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Material Selection */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3">Material</h3>
        <div className="grid grid-cols-2 gap-2">
          {materials.map((mat) => (
            <button
              key={mat.value}
              onClick={() => updateParameter('material', mat.value)}
              className={`p-2 rounded-md text-sm transition-colors ${
                params.material === mat.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {mat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gear Type Selection */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3">Type</h3>
        <div className="grid grid-cols-2 gap-2">
          {gearTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateParameter('gearType', type.value)}
              className={`p-2 rounded-md text-sm transition-colors ${
                params.gearType === type.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}