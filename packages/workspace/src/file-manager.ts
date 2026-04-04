import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export class FileManager {
  constructor(private readonly workspaceRoot: string) {}

  private validatePath(filePath: string): string {
    const absolute = resolve(this.workspaceRoot, filePath);
    const relativePath = relative(this.workspaceRoot, absolute);
    if (relativePath.startsWith("..") || relativePath.startsWith("/")) {
      throw new Error(`Path traversal detected: ${filePath}`);
    }
    return absolute;
  }

  async readFile(filePath: string): Promise<string> {
    return readFileSync(this.validatePath(filePath), "utf8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    writeFileSync(this.validatePath(filePath), content);
  }

  async searchFiles(directory: string, pattern: string): Promise<string[]> {
    const start = this.validatePath(directory);
    const results: string[] = [];

    const scan = (currentDir: string): void => {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = resolve(currentDir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
          continue;
        }

        if (fullPath.includes(pattern)) {
          results.push(fullPath);
        }
      }
    };

    if (existsSync(start) && statSync(start).isDirectory()) {
      scan(start);
    }

    return results;
  }

  exists(filePath: string): boolean {
    return existsSync(this.validatePath(filePath));
  }
}
