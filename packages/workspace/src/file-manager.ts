import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export class FileManager {
  constructor(private readonly workspaceRoot: string) {}

  async readFile(filePath: string): Promise<string> {
    const absolute = resolve(this.workspaceRoot, filePath);
    return readFileSync(absolute, "utf8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const absolute = resolve(this.workspaceRoot, filePath);
    writeFileSync(absolute, content);
  }

  async searchFiles(directory: string, pattern: string): Promise<string[]> {
    const start = resolve(this.workspaceRoot, directory);
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
    const absolute = resolve(this.workspaceRoot, filePath);
    return existsSync(absolute);
  }
}
