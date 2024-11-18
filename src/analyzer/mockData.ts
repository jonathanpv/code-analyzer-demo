import { DependencyData } from './types';

export const mockDependencies: DependencyData = {
  nodes: [
    {
      id: "setVisualizer",
      type: "function",
      code: "const [visualizer, setVisualizer] = useState<DependencyVisualizer | null>(null);",
      dependencies: ["useState", "DependencyVisualizer"],
      position: { start: 0, end: 100 }
    },
    {
      id: "handleNodeClick",
      type: "function",
      code: "const handleNodeClick = (node: Node) => {\n  const codePath = codePathTracer.getCodePath(node.id);\n  setSelectedNodePath(codePath);\n  setIsModalOpen(true);\n};",
      dependencies: ["setSelectedNodePath", "setIsModalOpen"],
      position: { start: 100, end: 200 }
    }
  ],
  links: [
    { source: "setVisualizer", target: "useState" },
    { source: "handleNodeClick", target: "setSelectedNodePath" }
  ]
};