import type { ProgressItemState } from "./progress-types";

export type ProgressChannelMessage = {
  type: "mutation";
  mutation: ProgressItemState;
};

type ChannelLike = {
  postMessage(message: ProgressChannelMessage): void;
  close(): void;
  onmessage: ((event: MessageEvent<ProgressChannelMessage>) => void) | null;
};

export function createProgressChannel(dependencies: {
  createChannel?: () => ChannelLike;
} = {}) {
  const createChannel =
    dependencies.createChannel ??
    (typeof BroadcastChannel === "undefined"
      ? undefined
      : () => new BroadcastChannel("ai-roadmap:progress") as unknown as ChannelLike);
  const channel = createChannel?.();
  const subscribers = new Set<(message: ProgressChannelMessage) => void>();

  if (channel) {
    channel.onmessage = (event) => {
      subscribers.forEach((subscriber) => subscriber(event.data));
    };
  }

  return {
    publish(message: ProgressChannelMessage) {
      channel?.postMessage(message);
    },
    subscribe(subscriber: (message: ProgressChannelMessage) => void) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    close() {
      channel?.close();
      subscribers.clear();
    },
  };
}
