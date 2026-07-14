import { redactMetadata } from "./redact";
import type {
  ObservabilityAdapter,
  PlatformError,
  PlatformEvent,
} from "./types";

let registeredAdapter: ObservabilityAdapter | undefined;

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

function emitWithFallback(
  method: "captureEvent" | "captureError",
  payload: PlatformEvent | PlatformError
): void {
  if (registeredAdapter) {
    registeredAdapter[method](payload as never);
    return;
  }

  if (!isDevelopmentEnvironment()) {
    return;
  }

  if (method === "captureEvent") {
    console.info("[observability]", payload);
    return;
  }

  console.error("[observability]", payload);
}

/** Registers a vendor adapter and returns a cleanup function for that registration. */
export function registerObservabilityAdapter(adapter: ObservabilityAdapter): () => void {
  registeredAdapter = adapter;

  return () => {
    if (registeredAdapter === adapter) {
      registeredAdapter = undefined;
    }
  };
}

/** Emits a stable platform diagnostic event without forwarding restricted metadata. */
export function emitPlatformEvent(event: PlatformEvent): void {
  emitWithFallback("captureEvent", {
    ...event,
    metadata: redactMetadata(event.metadata),
  });
}

/** Captures a stable platform diagnostic error without forwarding restricted metadata. */
export function capturePlatformError(error: PlatformError): void {
  emitWithFallback("captureError", {
    ...error,
    metadata: redactMetadata(error.metadata),
  });
}
