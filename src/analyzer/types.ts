export interface Node {
  id: string;
  type: 'function' | 'variable' | 'import';
  code: string;
  dependencies: string[];
  position: { start: number; end: number };
}

export interface DependencyData {
  nodes: Node[];
  links: Array<{ source: string; target: string }>;
}