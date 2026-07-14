import { afterEach, describe, expect, it, vi } from "vitest";

import {
  capturePlatformError,
  emitPlatformEvent,
  registerObservabilityAdapter,
} from "./client";
import type { ObservabilityAdapter } from "./types";

function createAdapter(): ObservabilityAdapter {
  return {
    captureEvent: vi.fn(),
    captureError: vi.fn(),
  };
}

describe("observability client", () => {
  let unregister: (() => void) | undefined;

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    vi.restoreAllMocks();
  });

  it("forwards redacted platform errors to the registered adapter", () => {
    const adapter = createAdapter();
    unregister = registerObservabilityAdapter(adapter);

    capturePlatformError({
      code: "RUNNER_TIMEOUT",
      metadata: { requestId: "r1", token: "secret", code: "while(true) {}" },
    });

    expect(adapter.captureError).toHaveBeenCalledWith({
      code: "RUNNER_TIMEOUT",
      metadata: { requestId: "r1" },
    });
  });

  it("forwards valid events without throwing", () => {
    const adapter = createAdapter();
    unregister = registerObservabilityAdapter(adapter);

    expect(() =>
      emitPlatformEvent({
        name: "runner.lifecycle",
        outcome: "started",
        metadata: { requestId: "r1" },
      })
    ).not.toThrow();
    expect(adapter.captureEvent).toHaveBeenCalledTimes(1);
  });

  it("uses structured console fallbacks only in development", () => {
    const environment = process.env as { NODE_ENV?: string };
    const previousEnvironment = environment.NODE_ENV;
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    environment.NODE_ENV = "development";

    emitPlatformEvent({ name: "progress.outbox", outcome: "queued" });
    capturePlatformError({ code: "SYNC_OFFLINE" });

    expect(info).toHaveBeenCalledWith("[observability]", {
      name: "progress.outbox",
      outcome: "queued",
      metadata: {},
    });
    expect(error).toHaveBeenCalledWith("[observability]", {
      code: "SYNC_OFFLINE",
      metadata: {},
    });
    environment.NODE_ENV = previousEnvironment;
  });

  it("does nothing without an adapter in production", () => {
    const environment = process.env as { NODE_ENV?: string };
    const previousEnvironment = environment.NODE_ENV;
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    environment.NODE_ENV = "production";

    emitPlatformEvent({ name: "progress.outbox", outcome: "queued" });
    capturePlatformError({ code: "SYNC_OFFLINE" });

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    environment.NODE_ENV = previousEnvironment;
  });
});
