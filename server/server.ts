import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve as resolvePath, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import resolve from 'resolve';
import { promisify } from 'util';
import { parse } from '@babel/parser';
import * as babelTraverse from '@babel/traverse';

const traverse = babelTraverse.default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ROOT = resolvePath(__dirname, '../src');

// Path alias mapping
const PATH_ALIASES = {
  '@': resolvePath(__dirname, '../src'),
};

interface NodeDependency {
  id: string;
  type: 'function' | 'class' | 'variable';
  sourceCode: string;
  filePath: string;
  dependencies: string[];
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface Symbol {
  id: string;
  type: 'function' | 'class' | 'variable';
  sourceCode: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

class DependencyAnalyzer {
  private nodes: Map<string, NodeDependency> = new Map();
  private processedFiles: Set<string> = new Set();
  private resolveModule = promisify(resolve);
  private maxDepth: number;

  constructor(maxDepth: number = 3) {
    this.maxDepth = maxDepth;
  }

  private getParserOptions() {
    return {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread',
      ],
    };
  }

  async analyzeProject(entryPoint: string): Promise<NodeDependency[]> {
    await this.processFile(entryPoint, 0);
    return Array.from(this.nodes.values());
  }

  async analyzeFile(filePath: string): Promise<Symbol[]> {
    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const symbols: Symbol[] = [];
    const content = readFileSync(filePath, 'utf-8');
    
    try {
      const ast = parse(content, this.getParserOptions());

      traverse.default(ast, {
        FunctionDeclaration: (path) => {
          if (path.node.id) {
            symbols.push({
              id: path.node.id.name,
              type: 'function',
              sourceCode: content.slice(path.node.start!, path.node.end!),
              location: {
                start: path.node.loc!.start,
                end: path.node.loc!.end,
              },
            });
          }
        },
        ClassDeclaration: (path) => {
          if (path.node.id) {
            symbols.push({
              id: path.node.id.name,
              type: 'class',
              sourceCode: content.slice(path.node.start!, path.node.end!),
              location: {
                start: path.node.loc!.start,
                end: path.node.loc!.end,
              },
            });
          }
        },
        VariableDeclaration: (path) => {
          path.node.declarations.forEach((declarator) => {
            if (declarator.id.type === 'Identifier') {
              symbols.push({
                id: declarator.id.name,
                type: 'variable',
                sourceCode: content.slice(declarator.start!, declarator.end!),
                location: {
                  start: path.node.loc!.start,
                  end: path.node.loc!.end,
                },
              });
            }
          });
        },
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      throw error;
    }

    return symbols;
  }

  private async processFile(filePath: string, currentDepth: number): Promise<void> {
    if (currentDepth >= this.maxDepth || this.processedFiles.has(filePath)) {
      return;
    }

    filePath = this.ensureExtension(filePath);
    this.processedFiles.add(filePath);

    if (!existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const ast = parse(content, this.getParserOptions());

      const imports: Array<{ source: string }> = [];
      const dependencies: Set<string> = new Set();

      traverse.default(ast, {
        ImportDeclaration: (path) => {
          const source = path.node.source.value;
          imports.push({ source });

          path.node.specifiers.forEach((spec) => {
            const importedName = spec.local.name;
            this.nodes.set(importedName, {
              id: importedName,
              type: 'variable',
              sourceCode: `import ${spec.local.name} from '${source}';`,
              filePath,
              dependencies: [],
              location: {
                start: path.node.loc!.start,
                end: path.node.loc!.end,
              },
            });
          });
        },

        FunctionDeclaration: (path) => {
          if (path.node.id) {
            const functionName = path.node.id.name;
            const sourceCode = content.slice(path.node.start!, path.node.end!);
            
            dependencies.clear();
            
            path.traverse({
              Identifier: (idPath) => {
                if (idPath.node.name === functionName) return;
                if (path.node.params.some(param => 
                  param.type === 'Identifier' && param.name === idPath.node.name)) return;
                if (idPath.parent.type === 'VariableDeclarator' && idPath.parent.id === idPath.node) return;
                
                dependencies.add(idPath.node.name);
              }
            });

            this.nodes.set(functionName, {
              id: functionName,
              type: 'function',
              sourceCode,
              filePath,
              dependencies: Array.from(dependencies),
              location: {
                start: path.node.loc!.start,
                end: path.node.loc!.end,
              },
            });
          }
        },

        ClassDeclaration: (path) => {
          if (path.node.id) {
            const className = path.node.id.name;
            const sourceCode = content.slice(path.node.start!, path.node.end!);
            dependencies.clear();

            path.traverse({
              Identifier: (idPath) => {
                if (idPath.node.name === className) return;
                if (idPath.parent.type === 'VariableDeclarator' && idPath.parent.id === idPath.node) return;
                dependencies.add(idPath.node.name);
              }
            });

            this.nodes.set(className, {
              id: className,
              type: 'class',
              sourceCode,
              filePath,
              dependencies: Array.from(dependencies),
              location: {
                start: path.node.loc!.start,
                end: path.node.loc!.end,
              },
            });
          }
        },
      });

      // Process imported modules
      for (const imp of imports) {
        const resolvedPath = await this.resolveImportPath(imp.source, filePath);
        if (resolvedPath && !resolvedPath.includes('node_modules')) {
          await this.processFile(resolvedPath, currentDepth + 1);
        }
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  private ensureExtension(filePath: string): string {
    if (!extname(filePath)) {
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const pathWithExt = filePath + ext;
        if (existsSync(pathWithExt)) {
          return pathWithExt;
        }
      }
    }
    return filePath;
  }

  private async resolveImportPath(importPath: string, currentFile: string): Promise<string | null> {
    try {
      // Handle path aliases
      if (importPath.startsWith('@/')) {
        const aliasKey = '@';
        const aliasPath = PATH_ALIASES[aliasKey];
        if (aliasPath) {
          const resolvedPath = resolvePath(aliasPath, importPath.slice(2));
          return resolvedPath;
        }
      }

      const resolved = await this.resolveModule(importPath, {
        basedir: dirname(currentFile),
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      });
      return resolved;
    } catch (error) {
      console.error(`Cannot resolve import path: '${importPath}' from '${currentFile}'`, error);
      return null;
    }
  }

  async getFileTree(rootDir: string = PROJECT_ROOT): Promise<any> {
    const tree: any = {};
    const items = readdirSync(rootDir);

    for (const item of items) {
      const fullPath = join(rootDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        tree[item] = await this.getFileTree(fullPath);
      } else {
        const content = readFileSync(fullPath, 'utf-8');
        tree[item] = {
          type: 'file',
          content,
          path: fullPath,
        };
      }
    }

    return tree;
  }
}

app.post('/analyze', async (req, res) => {
  try {
    const depth = parseInt(req.query.depth as string) || 3;
    const analyzer = new DependencyAnalyzer(depth);
    const entryPoint = join(PROJECT_ROOT, 'App.tsx');
    const nodes = await analyzer.analyzeProject(entryPoint);
    res.json({ nodes });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.post('/analyze-file', async (req, res) => {
  try {
    const { filePath } = req.body;
    const analyzer = new DependencyAnalyzer();
    const symbols = await analyzer.analyzeFile(filePath);
    res.json({ symbols });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.get('/files', async (req, res) => {
  try {
    const analyzer = new DependencyAnalyzer();
    const fileTree = await analyzer.getFileTree();
    res.json({ fileTree });
  } catch (error) {
    console.error('File tree error:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.get('/trace/:functionName', async (req, res) => {
  try {
    const { functionName } = req.params;
    const analyzer = new DependencyAnalyzer();
    const entryPoint = join(PROJECT_ROOT, 'App.tsx');
    const nodes = await analyzer.analyzeProject(entryPoint);

    const targetNode = nodes.find((node) => node.id === functionName);
    if (!targetNode) {
      throw new Error(`Function '${functionName}' not found`);
    }

    const path: NodeDependency[] = [];
    const visited = new Set<string>();

    const collectDependencies = (node: NodeDependency) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      path.push(node);
      for (const depId of node.dependencies) {
        const depNode = nodes.find((n) => n.id === depId);
        if (depNode) {
          collectDependencies(depNode);
        }
      }
    };

    collectDependencies(targetNode);

    const formattedPath = path.map((node) => ({
      ...node,
      sourceInfo: `Declaration: ${node.filePath}\nLocation: Line ${node.location.start.line}, Column ${node.location.start.column}`,
      sourceCode: node.sourceCode.trim(),
    }));

    res.json({ path: formattedPath });
  } catch (error) {
    console.error('Trace error:', error);
    res.status(500).json({ error: String(error) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});