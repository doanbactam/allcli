import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Inbox } from "../src/inbox.js";

describe("Inbox", () => {
  it("supports send, peek, and receive", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-inbox-"));
    const inbox = new Inbox(root);

    await inbox.send("agent-a", "agent-b", "hello");
    const unread = await inbox.peek("agent-b");
    expect(unread).toHaveLength(1);
    expect(unread[0]?.read).toBe(false);

    const received = await inbox.receive("agent-b");
    expect(received).toHaveLength(1);
    expect(received[0]?.body).toBe("hello");

    const after = await inbox.peek("agent-b");
    expect(after).toHaveLength(0);

    rmSync(root, { recursive: true, force: true });
  });

  it("broadcasts to all known agents except sender", async () => {
    const root = mkdtempSync(join(tmpdir(), "allcli-inbox-broadcast-"));
    const inbox = new Inbox(root);

    await inbox.send("agent-a", "agent-b", "msg-1");
    await inbox.send("agent-c", "agent-a", "msg-2");
    await inbox.broadcast("agent-a", "global");

    const toB = await inbox.peek("agent-b");
    const toC = await inbox.peek("agent-c");
    const toA = await inbox.peek("agent-a");

    expect(toB.some((message) => message.body === "global")).toBe(true);
    expect(toC.some((message) => message.body === "global")).toBe(true);
    expect(toA.some((message) => message.body === "global")).toBe(false);

    rmSync(root, { recursive: true, force: true });
  });
});
