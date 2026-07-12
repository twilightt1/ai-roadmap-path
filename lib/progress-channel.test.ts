import { describe, expect, it } from "vitest";
import { createProgressChannel } from "./progress-channel";

describe("progress channel", () => {
  it("forwards a progress mutation to subscribers and closes the channel", () => {
    const received: unknown[] = [];
    let listener: ((event: MessageEvent) => void) | undefined;
    const close = () => undefined;
    const channel = {
      postMessage: (message: unknown) => listener?.({ data: message } as MessageEvent),
      close,
      set onmessage(value: ((event: MessageEvent) => void) | null) {
        listener = value ?? undefined;
      },
    };

    const progressChannel = createProgressChannel({
      createChannel: () => channel as never,
    });
    progressChannel.subscribe((message) => received.push(message));
    progressChannel.publish({
      type: "mutation",
      mutation: {
        scope: "lesson",
        itemKey: "phase-1/numpy",
        completed: true,
        clientUpdatedAt: "2026-07-11T12:00:00.000Z",
        mutationId: "m-1",
      },
    });
    progressChannel.close();

    expect(received).toEqual([
      {
        type: "mutation",
        mutation: {
          scope: "lesson",
          itemKey: "phase-1/numpy",
          completed: true,
          clientUpdatedAt: "2026-07-11T12:00:00.000Z",
          mutationId: "m-1",
        },
      },
    ]);
  });
});
