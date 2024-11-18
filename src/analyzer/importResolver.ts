import { resolve } from 'enhanced-resolve';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ImportResolver {
  private resolver: any;
  private cache: Map<string, string[]> = new Map();
  private visited: Set<string> = new Set();

  constructor() {
    this.resolver = resolve.create({
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      conditionNames: ['import', 'require', 'node'],
      mainFields: ['browser', 'module', 'main'],
    });
  }

  async resolveImports(filePath: string, depth: number = 3): Promise<Map<string, string[]>> {
    if (depth === 0 || this.visited.has(filePath)) {
      return this.cache;
    }

    this.visited.add(filePath);
    const imports = await this.extractImports(filePath);
    this.cache.set(filePath, imports);

    for (const importPath of imports) {
      try {
        const resolvedPath = await this.resolvePath(importPath, filePath);
        if (resolvedPath) {
          await this.resolveImports(resolvedPath, depth - 1);
        }
      } catch (error) {
        console.warn(`Failed to resolve import: ${importPath}`);
      }
    }

    return this.cache;
  }

  private async resolvePath(importPath: string, context: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.resolver(
        {},
        dirname(context),
        importPath,
        (err: Error | null, result: string) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
  }

  private async extractImports(filePath: string): Promise<string[]> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"](.*)['"]/g;
      const matches = [...content.matchAll(importRegex)];
      return matches.map(match => match[1]);
    } catch (error) {
      console.error(`Error reading file: ${filePath}`);
      return [];
    }
  }
}