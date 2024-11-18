import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, Search, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Reference {
  id: string;
  type: string;
  sourceCode: string;
  filePath: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  sourceInfo: string;
}

interface SymbolsPanelProps {
  symbol: string;
  onClose: () => void;
}

export function SymbolsPanel({ symbol, onClose }: SymbolsPanelProps) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRefs, setExpandedRefs] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchReferences = async () => {
      if (!symbol) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/trace/${symbol}`);
        if (!response.ok) {
          throw new Error('Failed to fetch references');
        }
        const data = await response.json();
        setReferences(data.path || []);
        toast.success(`Found ${data.path.length} references`);
      } catch (error) {
        console.error('Failed to fetch references:', error);
        toast.error('Failed to fetch references');
      } finally {
        setLoading(false);
      }
    };

    fetchReferences();
  }, [symbol]);

  const filteredReferences = references.filter(ref => 
    ref.sourceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.filePath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleReference = (index: number) => {
    const newExpanded = new Set(expandedRefs);
    if (expandedRefs.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRefs(newExpanded);
  };

  if (!symbol) {
    return (
      <div className="flex flex-col h-full bg-background border-l">
        <div className="p-4 text-center text-muted-foreground">
          Select a symbol to view its references
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Symbol References</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b">
        <div className="font-mono text-sm bg-muted p-2 rounded-md">
          {symbol}
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading references...
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No references found
            </div>
          ) : (
            <div className="p-4">
              {filteredReferences.map((ref, index) => (
                <div key={index} className="mb-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-mono text-sm"
                    onClick={() => toggleReference(index)}
                  >
                    {expandedRefs.has(index) ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <span className="truncate">{ref.filePath}</span>
                  </Button>
                  
                  {expandedRefs.has(index) && (
                    <div className="mt-2 pl-6 border-l-2 border-muted ml-2">
                      <div className="text-xs text-muted-foreground mb-2">
                        {ref.sourceInfo}
                      </div>
                      <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                        <code>{ref.sourceCode}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            toast.info('Global search coming soon');
          }}
        >
          <Search className="h-4 w-4 mr-2" />
          Search all files
        </Button>
      </div>
    </div>
  );
}