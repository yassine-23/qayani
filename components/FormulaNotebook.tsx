'use client';

import React, { useState } from 'react';

interface FormulaNotebookProps {
  calculations: any;
  params: any;
  selectedFormula: string | null;
  setSelectedFormula: (formula: string | null) => void;
  onFormulaEdit: (formula: string, value: number) => void;
}

export default function FormulaNotebook({
  calculations,
  params,
  selectedFormula,
  setSelectedFormula,
  onFormulaEdit
}: FormulaNotebookProps) {
  const [editingValue, setEditingValue] = useState<string>('');

  const formulas = [
    {
      id: 'pitch',
      title: 'Pitch Diameter',
      formula: 'D = m × z',
      value: calculations.pitchDiameter.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'D'
    },
    {
      id: 'outside',
      title: 'Outside Diameter',
      formula: 'Da = m × (z + 2)',
      value: calculations.outsideDiameter.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'Da'
    },
    {
      id: 'root',
      title: 'Root Diameter',
      formula: 'Df = m × (z - 2.5)',
      value: calculations.rootDiameter.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'Df'
    },
    {
      id: 'addendum',
      title: 'Addendum',
      formula: 'ha = m',
      value: calculations.addendum.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'ha'
    },
    {
      id: 'dedendum',
      title: 'Dedendum',
      formula: 'hf = 1.25 × m',
      value: calculations.dedendum.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'hf'
    },
    {
      id: 'circular_pitch',
      title: 'Circular Pitch',
      formula: 'p = π × m',
      value: calculations.circularPitch.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'p'
    },
    {
      id: 'base_circle',
      title: 'Base Circle',
      formula: 'Db = D × cos(α)',
      value: calculations.baseCircleDiameter.toFixed(3),
      unit: 'mm',
      editable: false,
      symbol: 'Db'
    }
  ];

  const handleFormulaClick = (formulaId: string) => {
    setSelectedFormula(selectedFormula === formulaId ? null : formulaId);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden">
      {/* Notebook lines background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 31px,
            #cbd5e1 31px,
            #cbd5e1 32px
          )`,
        }} />
      </div>

      {/* Title */}
      <h2 className="relative text-2xl font-bold mb-6 text-center" style={{
        fontFamily: '"Kalam", cursive',
        color: '#1e293b',
        transform: 'rotate(-0.5deg)',
      }}>
        📐 Interactive Formulas
      </h2>

      {/* Formula Cards */}
      <div className="relative space-y-3">
        {formulas.map((formula, index) => (
          <div
            key={formula.id}
            className={`
              relative p-4 rounded-xl cursor-pointer transition-all duration-300
              ${selectedFormula === formula.id
                ? 'bg-gray-700 text-white scale-105 shadow-xl'
                : 'bg-white/70 hover:bg-white/90 hover:shadow-lg'}
            `}
            onClick={() => handleFormulaClick(formula.id)}
            style={{
              transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)`,
              fontFamily: '"Kalam", cursive',
            }}
          >
            {/* Formula Symbol Circle */}
            <div className={`
              absolute -left-3 top-1/2 transform -translate-y-1/2
              w-12 h-12 rounded-full flex items-center justify-center
              ${selectedFormula === formula.id
                ? 'bg-white text-gray-800'
                : 'bg-gray-600 text-white'}
              shadow-lg font-bold text-lg
            `}
              style={{ fontFamily: '"Kalam", cursive' }}>
              {formula.symbol}
            </div>

            {/* Formula Content */}
            <div className="ml-12">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-bold text-sm ${
                  selectedFormula === formula.id ? 'text-white' : 'text-gray-700'
                }`}>
                  {formula.title}
                </h3>
                <div className={`text-2xl font-bold ${
                  selectedFormula === formula.id ? 'text-white' : 'text-gray-800'
                }`}>
                  {formula.value} <span className="text-sm">{formula.unit}</span>
                </div>
              </div>

              {/* Formula Expression */}
              <div className={`text-lg font-medium ${
                selectedFormula === formula.id ? 'text-white/90' : 'text-gray-600'
              }`}>
                {formula.formula}
              </div>

              {/* Interactive Calculation Display */}
              {selectedFormula === formula.id && (
                <div className="mt-2 p-2 bg-white/20 rounded-lg">
                  <div className="text-sm">
                    {formula.id === 'pitch' && `${params.module} × ${params.teeth} = ${formula.value}`}
                    {formula.id === 'outside' && `${params.module} × (${params.teeth} + 2) = ${formula.value}`}
                    {formula.id === 'root' && `${params.module} × (${params.teeth} - 2.5) = ${formula.value}`}
                    {formula.id === 'addendum' && `${params.module} = ${formula.value}`}
                    {formula.id === 'dedendum' && `1.25 × ${params.module} = ${formula.value}`}
                    {formula.id === 'circular_pitch' && `π × ${params.module} = ${formula.value}`}
                    {formula.id === 'base_circle' && `${calculations.pitchDiameter.toFixed(1)} × cos(${params.pressureAngle}°) = ${formula.value}`}
                  </div>
                </div>
              )}
            </div>

            {/* Edit indicator */}
            {selectedFormula === formula.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Symbol Legend */}
      <div className="mt-6 p-4 bg-amber-50/50 rounded-xl">
        <h3 className="font-bold text-sm text-gray-700 mb-2" style={{ fontFamily: '"Kalam", cursive' }}>
          📚 Symbol Reference
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: '"Kalam", cursive' }}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">z:</span>
            <span className="text-gray-600">Number of teeth ({params.teeth})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">m:</span>
            <span className="text-gray-600">Module ({params.module} mm)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">α:</span>
            <span className="text-gray-600">Pressure angle ({params.pressureAngle}°)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">π:</span>
            <span className="text-gray-600">Pi (3.14159...)</span>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full opacity-20 blur-xl" />
      <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-20 blur-xl" />
    </div>
  );
}