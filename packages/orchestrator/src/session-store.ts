import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SessionRecord } from "@allcli/core";

export class SessionStore {
  constructor(private readonly stateFilePath: string) {}

  load(): SessionRecord[] {
    if (!existsSync(this.stateFilePath)) {
      return [];
    }

    const raw = readFileSync(this.stateFilePath, "utf8");
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as SessionRecord[];
  }

  save(records: SessionRecord[]): void {
    const absolute = resolve(this.stateFilePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(records, null, 2));
  }
}
