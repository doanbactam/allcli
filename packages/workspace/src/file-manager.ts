import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import type { FileDirectorySnapshot, FileEntry, FilePreview } from "./types.js";

const EXCLUDED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);
const MAX_PREVIEW_BYTES = 200_000;

export class FileManager {
  constructor(private readonly workspaceRoot: string) {}

  async readFile(filePath: string): Promise<string> {
    const absolute = this.resolvePath(filePath);
    return readFileSync(absolute, "utf8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const absolute = this.resolvePath(filePath);
    writeFileSync(absolute, content);
  }

  async listDirectory(directory: string = ""): Promise<FileDirectorySnapshot> {
    const absolute = this.resolvePath(directory);
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
      throw new Error(`Directory not found: ${directory || "."}`);
    }

    const entries = readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => !(entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)))
      .map<FileEntry>((entry) => {
        const fullPath = resolve(absolute, entry.name);
        const stats = statSync(fullPath);
        const relativePath = this.toRelativePath(fullPath);
        return {
          name: entry.name,
          path: relativePath,
          type: entry.isDirectory() ? "directory" : "file",
          size: entry.isDirectory() ? 0 : stats.size
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

    return {
      path: this.normalizeRelativePath(directory),
      entries
    };
  }

  async readPreview(filePath: string, maxBytes: number = MAX_PREVIEW_BYTES): Promise<FilePreview> {
    const absolute = this.resolvePath(filePath);
    const contents = readFileSync(absolute);
    const isBinary = contents.includes(0);
    const truncated = contents.byteLength > maxBytes;
    const previewBuffer = truncated ? contents.subarray(0, maxBytes) : contents;

    return {
      path: this.normalizeRelativePath(filePath),
      content: isBinary ? "" : previewBuffer.toString("utf8"),
      isBinary,
      truncated,
      size: contents.byteLength
    };
  }

  async searchFiles(directory: string, pattern: string): Promise<string[]> {
    const start = this.resolvePath(directory);
    const results: string[] = [];

    const scan = (currentDir: string): void => {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = resolve(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
            continue;
          }
          scan(fullPath);
          continue;
        }

        if (fullPath.includes(pattern)) {
          results.push(this.toRelativePath(fullPath));
        }
      }
    };

    if (existsSync(start) && statSync(start).isDirectory()) {
      scan(start);
    }

    return results;
  }

  exists(filePath: string): boolean {
    const absolute = this.resolvePath(filePath);
    return existsSync(absolute);
  }

  private resolvePath(filePath: string = ""): string {
    const absolute = resolve(this.workspaceRoot, filePath);
    const root = resolve(this.workspaceRoot);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error(`Path escapes workspace root: ${filePath}`);
    }

    return absolute;
  }

  private normalizeRelativePath(filePath: string): string {
    if (!filePath) {
      return "";
    }

    return filePath.split(/[\\/]+/).filter(Boolean).join("/");
  }

  private toRelativePath(filePath: string): string {
    return relative(resolve(this.workspaceRoot), filePath).split(/[\\/]+/).join("/");
  }
}
