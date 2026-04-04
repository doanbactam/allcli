import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { InboxMessage } from "./types.js";

export class Inbox {
  constructor(
    private readonly workspaceRoot: string,
    private readonly stateFilePath = resolve(workspaceRoot, ".allcli", "inbox.json")
  ) {}

  async send(from: string, to: string, body: string): Promise<InboxMessage> {
    const messages = this.loadMessages();
    const message: InboxMessage = {
      id: randomUUID(),
      from,
      to,
      body,
      timestamp: new Date().toISOString(),
      read: false
    };

    messages.push(message);
    this.saveMessages(messages);
    return message;
  }

  async receive(agentName: string): Promise<InboxMessage[]> {
    const messages = this.loadMessages();
    const unread = messages.filter((message) => message.to === agentName && !message.read);
    if (unread.length === 0) {
      return [];
    }

    const unreadIds = new Set(unread.map((message) => message.id));
    const marked = messages.map((message) => {
      if (!unreadIds.has(message.id)) {
        return message;
      }

      return {
        ...message,
        read: true
      };
    });

    this.saveMessages(marked);
    return unread;
  }

  async peek(agentName: string): Promise<InboxMessage[]> {
    return this.loadMessages().filter((message) => message.to === agentName && !message.read);
  }

  async broadcast(from: string, body: string): Promise<void> {
    const messages = this.loadMessages();
    const agents = new Set<string>();

    for (const message of messages) {
      agents.add(message.from);
      agents.add(message.to);
    }

    agents.delete(from);

    const timestamp = new Date().toISOString();
    for (const agent of agents) {
      messages.push({
        id: randomUUID(),
        from,
        to: agent,
        body,
        timestamp,
        read: false
      });
    }

    this.saveMessages(messages);
  }

  private loadMessages(): InboxMessage[] {
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

    return parsed as InboxMessage[];
  }

  private saveMessages(messages: InboxMessage[]): void {
    const absolute = resolve(this.stateFilePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify(messages, null, 2));
  }
}
