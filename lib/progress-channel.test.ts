import { describe, expect, it } from "vitest";
import { createProgressChannel } from "./progress-channel";

const mutation = {
  scope: "lesson" as const,
  itemKey: "phase-1/numpy",
  completed: true,
  clientUpdatedAt: "2026-07-11T12:00:00.000Z",
  mutationId: "m-1",
};

type Listener = (event: MessageEvent<unknown>) => void;

function createBroadcastChannel() {
  let listener: Listener | null = null;
  const posted: unknown[] = [];
  let closed = false;

  return {
    channel: {
      postMessage(message: unknown) {
        posted.push(message);
      },
      close() {
        closed = true;
      },
      get onmessage() {
        return listener;
      },
      set onmessage(value: Listener | null) {
        listener = value;
      },
    },
    posted,
    dispatch(message: unknown) {
      listener?.({ data: message } as MessageEvent<unknown>);
    },
    get closed() {
      return closed;
    },
  };
}

describe("progress channel", () => {
  it("wraps published mutations in the versioned envelope with its sender ID", () => {
    const broadcast = createBroadcastChannel();
    const progressChannel = createProgressChannel({
      senderId: "tab-a",
      createChannel: () => broadcast.channel,
    });

    progressChannel.publish({ type: "mutation", mutation });

    expect(broadcast.posted).toEqual([
      { version: 1, senderId: "tab-a", type: "mutation", mutation },
    ]);
  });

  it("delivers a valid remote mutation once without rebroadcasting it", () => {
    const broadcast = createBroadcastChannel();
    const received: unknown[] = [];
    const progressChannel = createProgressChannel({
      senderId: "tab-a",
      createChannel: () => broadcast.channel,
    });
    progressChannel.subscribe((message) => received.push(message));

    broadcast.dispatch({ version: 1, senderId: "tab-b", type: "mutation", mutation });

    expect(received).toEqual([
      { version: 1, senderId: "tab-b", type: "mutation", mutation },
    ]);
    expect(broadcast.posted).toEqual([]);
  });

  it("ignores self-sent and malformed channel messages", () => {
    const broadcast = createBroadcastChannel();
    const received: unknown[] = [];
    const progressChannel = createProgressChannel({
      senderId: "tab-a",
      createChannel: () => broadcast.channel,
    });
    progressChannel.subscribe((message) => received.push(message));

    broadcast.dispatch({ version: 1, senderId: "tab-a", type: "mutation", mutation });
    broadcast.dispatch({ version: 1, senderId: "tab-b", type: "mutation" });
    broadcast.dispatch({ version: 2, senderId: "tab-b", type: "reset", resetEpoch: 1 });
    broadcast.dispatch({ version: 1, senderId: "tab-b", type: "reset", resetEpoch: -1 });
    broadcast.dispatch("not an envelope");

    expect(received).toEqual([]);
  });

  it("uses localStorage events when BroadcastChannel is unavailable and removes its listener on close", () => {
    const writes: Array<[string, string]> = [];
    const received: unknown[] = [];
    let storageListener: ((event: { key: string | null; newValue: string | null }) => void) | undefined;
    let removedListener: ((event: { key: string | null; newValue: string | null }) => void) | undefined;
    const progressChannel = createProgressChannel({
      senderId: "tab-a",
      createChannel: () => undefined,
      storage: {
        setItem(key, value) {
          writes.push([key, value]);
        },
        removeItem() {},
      },
      addStorageListener(listener) {
        storageListener = listener;
      },
      removeStorageListener(listener) {
        removedListener = listener;
      },
    });
    progressChannel.subscribe((message) => received.push(message));

    progressChannel.publish({ type: "reset", resetEpoch: 3 });
    storageListener?.({
      key: "ai-roadmap:progress",
      newValue: JSON.stringify({ version: 1, senderId: "tab-b", type: "reset", resetEpoch: 3 }),
    });
    progressChannel.close();

    expect(JSON.parse(writes[0][1])).toEqual({
      version: 1,
      senderId: "tab-a",
      type: "reset",
      resetEpoch: 3,
    });
    expect(received).toEqual([
      { version: 1, senderId: "tab-b", type: "reset", resetEpoch: 3 },
    ]);
    expect(removedListener).toBe(storageListener);
  });
});
