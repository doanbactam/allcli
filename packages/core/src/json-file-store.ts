import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export class JsonFileStore<T> {
  constructor(private readonly filePath: string) {}

  load(): T[] {
    const absolute = resolve(this.filePath);
    if (!existsSync(absolute)) return [];

    const raw = readFileSync(absolute, "utf8");
    if (!raw.trim()) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        // Backup corrupt/non-array data instead of silently discarding
        const bak = absolute + ".bak";
        renameSync(absolute, bak);
        return [];
      }
      return parsed as T[];
    } catch {
      // Backup malformed JSON
      const bak = absolute + ".bak";
      try { renameSync(absolute, bak); } catch { /* ignore */ }
      return [];
    }
  }

  save(records: T[]): void {
    const absolute = resolve(this.filePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(records, null, 2));
  }
}
