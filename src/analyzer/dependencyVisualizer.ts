import * as d3 from 'd3';
import { Node } from './types';

export class DependencyVisualizer {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>;
  private onNodeClick: (node: Node) => void;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private container: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

  constructor(container: HTMLElement, onNodeClick: (node: Node) => void) {
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.onNodeClick = onNodeClick;

    // Initialize SVG with zoom support
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, this.width, this.height] as any);

    // Add zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform);
      });

    this.svg.call(this.zoom as any);

    // Create container for zoomable content
    this.container = this.svg.append('g');

    // Initialize force simulation
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(50));
  }

  visualize(nodes: Node[]) {
    // Clear previous visualization
    this.container.selectAll('*').remove();

    // Create links data
    const links = this.createLinks(nodes);

    // Create the links
    const link = this.container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Create the nodes
    const node = this.container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(this.drag(this.simulation) as any)
      .on('click', (event, d) => this.onNodeClick(d));

    // Add circles to nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => this.getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node.append('text')
      .text(d => d.id)
      .attr('x', 25)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#666');

    // Update simulation
    this.simulation
      .nodes(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: any) => d.id))
      .on('tick', () => {
        link
          .attr('x1', d => (d as any).source.x)
          .attr('y1', d => (d as any).source.y)
          .attr('x2', d => (d as any).target.x)
          .attr('y2', d => (d as any).target.y);

        node
          .attr('transform', d => `translate(${(d as any).x},${(d as any).y})`);
      });

    // Reset zoom
    this.svg.call(this.zoom.transform as any, d3.zoomIdentity);
  }

  private createLinks(nodes: Node[]) {
    const links: Array<{source: string, target: string}> = [];
    nodes.forEach(node => {
      node.dependencies.forEach(dep => {
        if (nodes.some(n => n.id === dep)) {
          links.push({
            source: node.id,
            target: dep
          });
        }
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

  private drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
    const dragstarted = (event: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    };

    const dragged = (event: any) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    };

    const dragended = (event: any) => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    };

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  resize() {
    if (this.svg.node()?.parentElement) {
      const container = this.svg.node()?.parentElement;
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      this.svg.attr('viewBox', [0, 0, this.width, this.height] as any);
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.3).restart();
    }
  }
}