import React from 'react';

export function LegendGrid() {
  return (
    <div className="mt-8 grid grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Functions</h2>
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-blue-500 mr-2" />
          <span className="text-sm text-gray-600">Function declarations and expressions</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Variables</h2>
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-green-500 mr-2" />
          <span className="text-sm text-gray-600">Global and module-level variables</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Imports</h2>
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-orange-500 mr-2" />
          <span className="text-sm text-gray-600">Module imports and dependencies</span>
        </div>
      </div>
    </div>
  );
}