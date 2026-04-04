import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { JsonFileStore } from "@allcli/core";
import type { InboxMessage } from "./types.js";

export class Inbox {
  private readonly store: JsonFileStore<InboxMessage>;

  constructor(
    private readonly workspaceRoot: string,
    private readonly stateFilePath = resolve(workspaceRoot, ".allcli", "inbox.json")
  ) {
    this.store = new JsonFileStore<InboxMessage>(stateFilePath);
  }

  async send(from: string, to: string, body: string): Promise<InboxMessage> {
    const messages = this.store.load();
    const message: InboxMessage = {
      id: randomUUID(),
      from,
      to,
      body,
      timestamp: new Date().toISOString(),
      read: false
    };

    messages.push(message);
    this.store.save(messages);
    return message;
  }

  async receive(agentName: string): Promise<InboxMessage[]> {
    const messages = this.store.load();
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

    this.store.save(marked);
    return unread;
  }

  async peek(agentName: string): Promise<InboxMessage[]> {
    return this.store.load().filter((message) => message.to === agentName && !message.read);
  }

  async broadcast(from: string, body: string): Promise<void> {
    const messages = this.store.load();
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

    this.store.save(messages);
  }
}
