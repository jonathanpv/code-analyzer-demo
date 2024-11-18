import React, { forwardRef, useEffect, useRef } from 'react';

export const VisualizerContainer = forwardRef<HTMLDivElement>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const event = new CustomEvent('visualizer-resize');
        containerRef.current.dispatchEvent(event);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div
          ref={(node) => {
            // Forward the ref to parent component
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            // Store ref locally
            containerRef.current = node;
          }}
          className="w-full h-[600px] border border-gray-200 rounded-lg"
        />
      </div>
    </div>
  );
});