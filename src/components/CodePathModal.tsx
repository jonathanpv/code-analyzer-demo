import React from 'react';
import { Copy, X } from 'lucide-react';

interface CodePathModalProps {
  isOpen: boolean;
  onClose: () => void;
  codePath: string;
}

export function CodePathModal({ isOpen, onClose, codePath }: CodePathModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codePath);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Code Execution Path</h2>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Copy to clipboard"
            >
              <Copy className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <pre className="p-4 overflow-auto max-h-[calc(80vh-4rem)] bg-gray-50 font-mono text-sm">
          {codePath}
        </pre>
      </div>
    </div>
  );
}