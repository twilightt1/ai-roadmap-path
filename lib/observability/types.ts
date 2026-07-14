export type PlatformErrorCode =
  | "CONTENT_INVALID"
  | "RUNNER_LOAD_FAILED"
  | "RUNNER_TIMEOUT"
  | "RUNNER_EXECUTION_FAILED"
  | "RUNNER_OUTPUT_LIMIT"
  | "SYNC_OFFLINE"
  | "SYNC_CONFLICT"
  | "SYNC_AUTH_CHANGED"
  | "SYNC_REMOTE_FAILED"
  | "LEARNING_PROFILE_SYNC_FAILED"
  | "PROJECT_EVIDENCE_SYNC_FAILED";

export type PlatformEventName =
  | "runner.lifecycle"
  | "progress.outbox"
  | "progress.auth_invalidated"
  | "content.validation_failed"
  | "practice.step"
  | "practice.walkthrough"
  | "learning_loop.diagnostic";

/** Values permitted in platform diagnostics metadata after redaction. */
export type ObservabilityMetadataValue = string | number | boolean | null;

/**
 * Diagnostics metadata is deliberately flat: nested data can contain raw learner
 * content and is not accepted by the observability boundary.
 */
export type ObservabilityMetadata = Record<string, ObservabilityMetadataValue>;

export type PlatformEvent = {
  name: PlatformEventName;
  outcome: string;
  metadata?: ObservabilityMetadata;
};

export type PlatformError = {
  code: PlatformErrorCode;
  message?: string;
  metadata?: ObservabilityMetadata;
};

export type ObservabilityAdapter = {
  captureEvent(event: PlatformEvent): void;
  captureError(error: PlatformError): void;
};
