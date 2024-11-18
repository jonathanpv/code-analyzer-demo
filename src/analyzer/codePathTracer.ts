import { Node } from './types';

export class CodePathTracer {
  private nodes: Map<string, Node>;
  private callGraph: Map<string, Set<string>>;

  constructor() {
    this.nodes = new Map();
    this.callGraph = new Map();
  }

  addNode(node: Node) {
    this.nodes.set(node.id, node);
    this.updateCallGraph(node);
  }

  private updateCallGraph(node: Node) {
    if (!this.callGraph.has(node.id)) {
      this.callGraph.set(node.id, new Set());
    }
    
    node.dependencies.forEach(dep => {
      this.callGraph.get(node.id)?.add(dep);
    });
  }

  tracePath(startNodeId: string): Node[] {
    const visited = new Set<string>();
    const path: Node[] = [];
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      visited.add(nodeId);
      path.push(node);
      
      const dependencies = this.callGraph.get(nodeId) || new Set();
      dependencies.forEach(depId => {
        const depNode = this.nodes.get(depId);
        if (depNode && !visited.has(depId)) {
          traverse(depId);
        }
      });
    };
    
    traverse(startNodeId);
    return path;
  }

  getCodePath(startNodeId: string): string {
    const path = this.tracePath(startNodeId);
    return path.map(node => (
      `// Function: ${node.id}\n` +
      `// Dependencies: ${node.dependencies.join(', ') || 'none'}\n` +
      `// Location: ${node.position.start}:${node.position.end}\n\n` +
      `${node.code}\n\n`
    )).join('-------------------\n');
  }
}