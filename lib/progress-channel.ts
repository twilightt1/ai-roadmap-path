import type { ProgressItemState } from "./progress-types";

const PROGRESS_CHANNEL_NAME = "ai-roadmap:progress";

export type ProgressChannelMessage =
  | {
      version: 1;
      senderId: string;
      type: "mutation";
      mutation: ProgressItemState;
    }
  | {
      version: 1;
      senderId: string;
      type: "reset";
      resetEpoch: number;
    };

export type ProgressChannelPublication =
  | { type: "mutation"; mutation: ProgressItemState }
  | { type: "reset"; resetEpoch: number };

type ChannelLike = {
  postMessage(message: ProgressChannelMessage): void;
  close(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};

type StorageLike = Pick<Storage, "setItem" | "removeItem">;
type StorageEventLike = { key: string | null; newValue: string | null };

export type ProgressChannelDependencies = {
  senderId?: string;
  createChannel?: () => ChannelLike | undefined;
  storage?: StorageLike;
  addStorageListener?: (listener: (event: StorageEventLike) => void) => void;
  removeStorageListener?: (listener: (event: StorageEventLike) => void) => void;
};

function createSenderId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `progress-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isProgressItemState(value: unknown): value is ProgressItemState {
  if (!value || typeof value !== "object") return false;
  const mutation = value as Record<string, unknown>;
  return (
    (mutation.scope === "lesson" || mutation.scope === "project_feature") &&
    typeof mutation.itemKey === "string" &&
    mutation.itemKey.length > 0 &&
    typeof mutation.completed === "boolean" &&
    typeof mutation.clientUpdatedAt === "string" &&
    !Number.isNaN(Date.parse(mutation.clientUpdatedAt)) &&
    typeof mutation.mutationId === "string" &&
    mutation.mutationId.length > 0
  );
}

export function parseProgressChannelMessage(value: unknown): ProgressChannelMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.version !== 1 || typeof message.senderId !== "string" || message.senderId.length === 0) {
    return null;
  }

  if (message.type === "mutation" && isProgressItemState(message.mutation)) {
    return {
      version: 1,
      senderId: message.senderId,
      type: "mutation",
      mutation: message.mutation,
    };
  }

  if (
    message.type === "reset" &&
    typeof message.resetEpoch === "number" &&
    Number.isSafeInteger(message.resetEpoch) &&
    message.resetEpoch >= 0
  ) {
    return {
      version: 1,
      senderId: message.senderId,
      type: "reset",
      resetEpoch: message.resetEpoch,
    };
  }

  return null;
}

export function createProgressChannel(dependencies: ProgressChannelDependencies = {}) {
  const senderId = dependencies.senderId ?? createSenderId();
  const createChannel =
    dependencies.createChannel ??
    (typeof BroadcastChannel === "undefined"
      ? undefined
      : () => new BroadcastChannel(PROGRESS_CHANNEL_NAME) as unknown as ChannelLike);
  const channel = createChannel?.();
  const storage = dependencies.storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  const addStorageListener =
    dependencies.addStorageListener ??
    (typeof window === "undefined" ? undefined : (listener) => window.addEventListener("storage", listener));
  const removeStorageListener =
    dependencies.removeStorageListener ??
    (typeof window === "undefined" ? undefined : (listener) => window.removeEventListener("storage", listener));
  const subscribers = new Set<(message: ProgressChannelMessage) => void>();

  const receive = (value: unknown) => {
    const message = parseProgressChannelMessage(value);
    if (!message || message.senderId === senderId) return;
    subscribers.forEach((subscriber) => subscriber(message));
  };
  const onStorage = (event: StorageEventLike) => {
    if (event.key !== PROGRESS_CHANNEL_NAME || !event.newValue) return;
    try {
      receive(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed third-party storage events.
    }
  };

  if (channel) {
    channel.onmessage = (event) => receive(event.data);
  } else if (storage && addStorageListener) {
    addStorageListener(onStorage);
  }

  return {
    publish(publication: ProgressChannelPublication) {
      const message: ProgressChannelMessage =
        publication.type === "mutation"
          ? { version: 1, senderId, type: "mutation", mutation: publication.mutation }
          : { version: 1, senderId, type: "reset", resetEpoch: publication.resetEpoch };

      if (channel) {
        channel.postMessage(message);
      } else if (storage) {
        storage.setItem(PROGRESS_CHANNEL_NAME, JSON.stringify(message));
        storage.removeItem(PROGRESS_CHANNEL_NAME);
      }
    },
    subscribe(subscriber: (message: ProgressChannelMessage) => void) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    close() {
      channel?.close();
      if (!channel) removeStorageListener?.(onStorage);
      subscribers.clear();
    },
  };
}
