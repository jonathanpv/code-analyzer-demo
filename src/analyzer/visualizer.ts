import * as d3 from 'd3';
import { Node } from './dependencyGraph';

export class DependencyVisualizer {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private simulation: d3.Simulation<any, undefined>;

  constructor(container: HTMLElement, width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
  }

  visualize(nodes: Map<string, Node>) {
    const nodeArray = Array.from(nodes.values());
    const links = this.createLinks(nodeArray);

    const link = this.svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    const node = this.svg.append('g')
      .selectAll('circle')
      .data(nodeArray)
      .enter().append('circle')
      .attr('r', 10)
      .attr('fill', d => this.getNodeColor(d))
      .call(this.drag(this.simulation));

    const label = this.svg.append('g')
      .selectAll('text')
      .data(nodeArray)
      .enter().append('text')
      .text(d => d.id)
      .attr('font-size', '12px')
      .attr('dx', 15)
      .attr('dy', 4);

    node.on('click', (event, d) => {
      this.handleNodeClick(d);
    });

    this.simulation
      .nodes(nodeArray)
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });

    (this.simulation.force('link') as d3.ForceLink<any, any>)
      .links(links);
  }

  private createLinks(nodes: Node[]) {
    const links: Array<{source: string, target: string}> = [];
    nodes.forEach(node => {
      node.dependencies.forEach(dep => {
        links.push({
          source: node.id,
          target: dep
        });
      });
    });
    return links;
  }

  private getNodeColor(node: Node): string {
    switch(node.type) {
      case 'function': return '#4299e1';
      case 'variable': return '#48bb78';
      case 'import': return '#ed8936';
      default: return '#a0aec0';
    }
  }

  private drag(simulation: d3.Simulation<any, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  private handleNodeClick(node: Node) {
    const codeString = this.generateCodeString(node);
    navigator.clipboard.writeText(codeString).then(() => {
      console.log('Code copied to clipboard');
    });
  }

  private generateCodeString(node: Node): string {
    let result = `// ${node.type.toUpperCase()}: ${node.id}\n\n`;
    result += node.code + '\n\n';
    
    if (node.dependencies.length > 0) {
      result += '// Dependencies:\n';
      node.dependencies.forEach(dep => {
        const depNode = Array.from(this.simulation.nodes()).find(n => n.id === dep);
        if (depNode) {
          result += `// ${dep}:\n${depNode.code}\n\n`;
        }
      });
    }
    
    return result;
  }
}