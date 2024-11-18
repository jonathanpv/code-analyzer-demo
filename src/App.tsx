import React, { useEffect, useRef, useState } from 'react';
import { DependencyVisualizer } from './analyzer/dependencyVisualizer';
import { CodePathTracer } from './analyzer/codePathTracer';
import { CodePathModal } from './components/CodePathModal';
import { VisualizerContainer } from './components/VisualizerContainer';
import { LegendGrid } from './components/LegendGrid';
import { ErrorMessage } from './components/ErrorMessage';
import { Node } from './analyzer/types';
import { FileViewer } from './components/FileViewer';
import { SidebarProvider } from './components/ui/sidebar';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Search } from 'lucide-react';
import { SymbolsPanel } from './components/SymbolsPanel';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

interface CodePathNode extends Node {
  sourceInfo: string;
  sourceCode: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visualizer, setVisualizer] = useState<DependencyVisualizer | null>(null);
  const [codePathTracer] = useState(() => new CodePathTracer());
  const [selectedNodePath, setSelectedNodePath] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'graph' | 'files'>('files');
  const [analysisDepth, setAnalysisDepth] = useState<number>(3);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    if (containerRef.current && !visualizer && activeView === 'graph') {
      const viz = new DependencyVisualizer(containerRef.current, handleNodeClick);
      setVisualizer(viz);

      const handleResize = () => viz.resize();
      containerRef.current.addEventListener('visualizer-resize', handleResize);

      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('visualizer-resize', handleResize);
        }
      };
    }
  }, [containerRef.current, activeView]);

  const analyzeCurrentProject = async () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      toast.promise(
        fetch(`http://localhost:3001/analyze?depth=${analysisDepth}`, {
          method: 'POST'
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Analysis failed. Please try again.');
          }
          const data = await response.json();
          data.nodes.forEach((node: Node) => codePathTracer.addNode(node));
          visualizer?.visualize(data.nodes);
          return data;
        }),
        {
          loading: 'Analyzing project...',
          success: 'Project analysis complete',
          error: 'Failed to analyze project',
        }
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      console.error('Failed to analyze project:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNodeClick = async (node: Node) => {
    try {
      setError(null);
      setSelectedSymbol(node.id);
      toast.success(`Selected symbol: ${node.id}`);
    } catch (error) {
      toast.error('Failed to get code path');
      console.error('Failed to get code path:', error);
    }
  };

  const handleFileSelect = async (content: string, path: string) => {
    try {
      setSelectedFile(path);
      setFileContent(content);
      
      toast.promise(
        fetch(`http://localhost:3001/analyze-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath: path }),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to analyze file');
          }
          const data = await response.json();
          if (data.symbols && data.symbols.length > 0) {
            setSelectedSymbol(data.symbols[0].id);
          }
          return data;
        }),
        {
          loading: 'Analyzing file...',
          success: 'File analysis complete',
          error: 'Failed to analyze file',
        }
      );
    } catch (error) {
      console.error('Failed to analyze file:', error);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* Left Sidebar - File Viewer */}
        <FileViewer 
          onSymbolClick={handleNodeClick}
          activeView={activeView}
          setActiveView={setActiveView}
          onFileSelect={handleFileSelect}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="flex items-center justify-between border-b px-6 py-3">
              <div className="flex items-center space-x-4">
                <Input
                  id="analysis-depth"
                  type="number"
                  value={analysisDepth}
                  onChange={(e) => setAnalysisDepth(Number(e.target.value))}
                  className="w-20"
                  min={1}
                  max={10}
                  placeholder="Depth"
                />
                <Button 
                  onClick={analyzeCurrentProject}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
                </Button>
              </div>
            </header>

            <main className="flex-1 p-6 overflow-auto">
              <ErrorMessage error={error} />
              
              {activeView === 'graph' ? (
                <div className="h-full">
                  <VisualizerContainer ref={containerRef} />
                  <LegendGrid />
                </div>
              ) : (
                selectedFile && (
                  <div className="mt-4">
                    <h2 className="mb-2 text-lg font-semibold">{selectedFile}</h2>
                    <pre className="rounded-lg bg-muted p-4 font-mono text-sm">
                      {fileContent}
                    </pre>
                  </div>
                )
              )}
            </main>
          </div>

          {/* Right Sidebar - Symbols Panel */}
          <div className="w-96 border-l h-screen">
            <SymbolsPanel
              symbol={selectedSymbol || ''}
              onClose={() => setSelectedSymbol(null)}
            />
          </div>
        </div>

        <CodePathModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          codePath={selectedNodePath}
        />
        <Toaster />
      </div>
    </SidebarProvider>
  );
}

export default App;