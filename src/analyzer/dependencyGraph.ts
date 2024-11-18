import Parser from 'web-tree-sitter';

export interface Node {
  id: string;
  type: 'function' | 'variable' | 'import';
  code: string;
  dependencies: string[];
  position: { start: number; end: number };
}

export class DependencyGraph {
  private nodes: Map<string, Node> = new Map();
  private parser: Parser;

  constructor() {
    this.initializeParser();
  }

  private async initializeParser() {
    await Parser.init();
    this.parser = new Parser();
    const Lang = await Parser.Language.load('tree-sitter-javascript.wasm');
    this.parser.setLanguage(Lang);
  }

  async analyzeDependencies(sourceCode: string): Promise<Map<string, Node>> {
    const tree = this.parser.parse(sourceCode);
    this.traverseTree(tree.rootNode, null);
    return this.nodes;
  }

  private traverseTree(node: Parser.SyntaxNode, parentNode: Parser.SyntaxNode | null) {
    if (node.type === 'function_declaration' || node.type === 'arrow_function') {
      this.addFunctionNode(node);
    } else if (node.type === 'variable_declaration') {
      this.addVariableNode(node);
    }

    for (const child of node.children) {
      this.traverseTree(child, node);
    }
  }

  private addFunctionNode(node: Parser.SyntaxNode) {
    const functionName = this.getFunctionName(node);
    if (functionName) {
      this.nodes.set(functionName, {
        id: functionName,
        type: 'function',
        code: node.text,
        dependencies: this.findDependencies(node),
        position: {
          start: node.startIndex,
          end: node.endIndex
        }
      });
    }
  }

  private addVariableNode(node: Parser.SyntaxNode) {
    const variableName = this.getVariableName(node);
    if (variableName) {
      this.nodes.set(variableName, {
        id: variableName,
        type: 'variable',
        code: node.text,
        dependencies: this.findDependencies(node),
        position: {
          start: node.startIndex,
          end: node.endIndex
        }
      });
    }
  }

  private getFunctionName(node: Parser.SyntaxNode): string | null {
    const identifier = node.childForFieldName('name');
    return identifier ? identifier.text : null;
  }

  private getVariableName(node: Parser.SyntaxNode): string | null {
    const declarator = node.childForFieldName('declarations');
    if (declarator) {
      const identifier = declarator.childForFieldName('name');
      return identifier ? identifier.text : null;
    }
    return null;
  }

  private findDependencies(node: Parser.SyntaxNode): string[] {
    const dependencies: string[] = [];
    const cursor = node.walk();

    do {
      const currentNode = cursor.currentNode();
      if (currentNode.type === 'identifier') {
        const name = currentNode.text;
        if (this.nodes.has(name)) {
          dependencies.push(name);
        }
      }
    } while(cursor.gotoNextSibling());

    return [...new Set(dependencies)];
  }
}