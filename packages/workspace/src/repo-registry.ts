import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { RepoWorkspace } from "./types.js";
import { atomicWrite } from "@allcli/core";

export class RepoRegistry {
  constructor(
    private readonly controlRoot: string,
    private readonly stateFilePath = resolve(controlRoot, ".allcli", "repos.json")
  ) {}

  list(): RepoWorkspace[] {
    return this.loadRecords().sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  }

  getById(id: string): RepoWorkspace | undefined {
    return this.loadRecords().find((record) => record.id === id);
  }

  ensure(rootPath: string): RepoWorkspace {
    return this.upsert(rootPath);
  }

  add(rootPath: string): RepoWorkspace {
    return this.upsert(rootPath);
  }

  remove(id: string): void {
    const records = this.loadRecords();
    this.saveRecords(records.filter((record) => record.id !== id));
  }

  private upsert(rootPath: string): RepoWorkspace {
    const absolutePath = this.validateRepoPath(rootPath);
    const records = this.loadRecords();
    const now = new Date().toISOString();
    const existing = records.find((record) => record.rootPath === absolutePath);

    if (existing) {
      existing.lastOpenedAt = now;
      this.saveRecords(records);
      return existing;
    }

    const created: RepoWorkspace = {
      id: randomUUID(),
      name: basename(absolutePath),
      rootPath: absolutePath,
      addedAt: now,
      lastOpenedAt: now
    };
    records.push(created);
    this.saveRecords(records);
    return created;
  }

  private validateRepoPath(rootPath: string): string {
    const absolutePath = resolve(rootPath);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
      throw new Error(`Repository path not found: ${absolutePath}`);
    }

    const configPath = join(absolutePath, "allcli.yaml");
    if (!existsSync(configPath)) {
      throw new Error(`Repository does not contain allcli.yaml: ${absolutePath}`);
    }

    return absolutePath;
  }

  private loadRecords(): RepoWorkspace[] {
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

    return parsed as RepoWorkspace[];
  }

  private saveRecords(records: RepoWorkspace[]): void {
    atomicWrite(this.stateFilePath, JSON.stringify(records, null, 2));
  }
}
