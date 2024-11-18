import React from 'react';
import { GitGraph, Upload, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface HeaderProps {
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function Header({ isAnalyzing, onAnalyze }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GitGraph className="h-8 w-8 text-indigo-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">
              React Code Dependency Analyzer
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isAnalyzing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
            </button>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-full hover:bg-gray-100" title="Zoom In">
                <ZoomIn className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100" title="Zoom Out">
                <ZoomOut className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100" title="Pan">
                <Move className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}