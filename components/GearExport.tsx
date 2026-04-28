'use client';

import React, { useState } from 'react';

interface GearExportProps {
  params: {
    teeth: number;
    module: number;
    pressureAngle: number;
    gearType: string;
    material: string;
  };
  calculations: any;
}

export default function GearExport({ params, calculations }: GearExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generateGearData = () => {
    return {
      parameters: {
        teeth: params.teeth,
        module: params.module,
        pressureAngle: params.pressureAngle,
        gearType: params.gearType,
        material: params.material
      },
      dimensions: {
        pitchDiameter: calculations.pitchDiameter,
        outsideDiameter: calculations.outsideDiameter,
        rootDiameter: calculations.rootDiameter,
        addendum: calculations.addendum,
        dedendum: calculations.dedendum,
        workingDepth: calculations.workingDepth,
        wholeDepth: calculations.wholeDepth,
        circularPitch: calculations.circularPitch,
        toothThickness: calculations.toothThickness,
        baseCircleDiameter: calculations.baseCircleDiameter,
        faceWidth: calculations.faceWidth,
        centerDistance: calculations.centerDistance
      },
      generated: new Date().toISOString()
    };
  };

  const exportAsJSON = () => {
    const data = generateGearData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-${params.teeth}t-m${params.module}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const data = generateGearData();
    let csv = 'Property,Value,Unit\n';

    // Parameters
    csv += `Teeth,${data.parameters.teeth},count\n`;
    csv += `Module,${data.parameters.module},mm\n`;
    csv += `Pressure Angle,${data.parameters.pressureAngle},degrees\n`;
    csv += `Gear Type,${data.parameters.gearType},-\n`;
    csv += `Material,${data.parameters.material},-\n`;

    // Dimensions
    csv += `Pitch Diameter,${data.dimensions.pitchDiameter.toFixed(3)},mm\n`;
    csv += `Outside Diameter,${data.dimensions.outsideDiameter.toFixed(3)},mm\n`;
    csv += `Root Diameter,${data.dimensions.rootDiameter.toFixed(3)},mm\n`;
    csv += `Addendum,${data.dimensions.addendum.toFixed(3)},mm\n`;
    csv += `Dedendum,${data.dimensions.dedendum.toFixed(3)},mm\n`;
    csv += `Working Depth,${data.dimensions.workingDepth.toFixed(3)},mm\n`;
    csv += `Whole Depth,${data.dimensions.wholeDepth.toFixed(3)},mm\n`;
    csv += `Circular Pitch,${data.dimensions.circularPitch.toFixed(3)},mm\n`;
    csv += `Tooth Thickness,${data.dimensions.toothThickness.toFixed(3)},mm\n`;
    csv += `Base Circle Diameter,${data.dimensions.baseCircleDiameter.toFixed(3)},mm\n`;
    csv += `Face Width,${data.dimensions.faceWidth.toFixed(3)},mm\n`;
    csv += `Center Distance,${data.dimensions.centerDistance.toFixed(3)},mm\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-${params.teeth}t-m${params.module}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = async () => {
    setIsExporting(true);

    // Simple text-based PDF content
    const data = generateGearData();
    let content = `GEAR SPECIFICATIONS\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    content += `PARAMETERS:\n`;
    content += `• Teeth: ${data.parameters.teeth}\n`;
    content += `• Module: ${data.parameters.module} mm\n`;
    content += `• Pressure Angle: ${data.parameters.pressureAngle}°\n`;
    content += `• Type: ${data.parameters.gearType}\n`;
    content += `• Material: ${data.parameters.material}\n\n`;
    content += `DIMENSIONS:\n`;
    content += `• Pitch Diameter: ${data.dimensions.pitchDiameter.toFixed(3)} mm\n`;
    content += `• Outside Diameter: ${data.dimensions.outsideDiameter.toFixed(3)} mm\n`;
    content += `• Root Diameter: ${data.dimensions.rootDiameter.toFixed(3)} mm\n`;
    content += `• Addendum: ${data.dimensions.addendum.toFixed(3)} mm\n`;
    content += `• Dedendum: ${data.dimensions.dedendum.toFixed(3)} mm\n`;
    content += `• Working Depth: ${data.dimensions.workingDepth.toFixed(3)} mm\n`;
    content += `• Whole Depth: ${data.dimensions.wholeDepth.toFixed(3)} mm\n`;
    content += `• Circular Pitch: ${data.dimensions.circularPitch.toFixed(3)} mm\n`;
    content += `• Tooth Thickness: ${data.dimensions.toothThickness.toFixed(3)} mm\n`;
    content += `• Base Circle Diameter: ${data.dimensions.baseCircleDiameter.toFixed(3)} mm\n`;
    content += `• Face Width: ${data.dimensions.faceWidth.toFixed(3)} mm\n`;
    content += `• Center Distance: ${data.dimensions.centerDistance.toFixed(3)} mm\n`;

    // Create a simple text file as PDF alternative
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-${params.teeth}t-m${params.module}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-3">Export Specifications</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={exportAsJSON}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          JSON
        </button>

        <button
          onClick={exportAsCSV}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV
        </button>

        <button
          onClick={exportAsPDF}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm disabled:opacity-50"
        >
          {isExporting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          TXT
        </button>
      </div>

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        Export includes all parameters and calculated dimensions
      </div>
    </div>
  );
}