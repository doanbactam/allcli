import { JsonFileStore } from "@allcli/core";
import type { SessionRecord } from "@allcli/core";

export class SessionStore {
  private readonly store: JsonFileStore<SessionRecord>;

  constructor(private readonly stateFilePath: string) {
    this.store = new JsonFileStore<SessionRecord>(stateFilePath);
  }

  load(): SessionRecord[] {
    return this.store.load();
  }

  save(records: SessionRecord[]): void {
    this.store.save(records);
  }
}
