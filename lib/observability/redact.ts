import type { ObservabilityMetadata, ObservabilityMetadataValue } from "./types";

const RESTRICTED_KEY_PATTERN =
  /(token|cookie|password|authorization|code|answers?|note|snippet|source|output|email|user[_-]?id|supabase|service[_-]?role|anon[_-]?key|api[_-]?key|secret|credential|access[_-]?key|private[_-]?key)/i;

const ALLOWED_METADATA_KEYS = new Set([
  "requestId",
  "durationMs",
  "status",
  "attemptCount",
  "eventCount",
  "retry",
  "reason",
  "language",
  "resultCount",
]);

function isScalarMetadataValue(value: unknown): value is ObservabilityMetadataValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Returns only flat, scalar diagnostic metadata. Keys associated with credentials
 * or raw learner content are always removed before an adapter receives the data.
 */
export function redactMetadata(input: Record<string, unknown> | undefined): ObservabilityMetadata {
  if (!input) {
    return {};
  }

  const redacted: ObservabilityMetadata = {};

  for (const [key, value] of Object.entries(input)) {
    if (
      ALLOWED_METADATA_KEYS.has(key) &&
      !RESTRICTED_KEY_PATTERN.test(key) &&
      isScalarMetadataValue(value)
    ) {
      redacted[key] = value;
    }
  }

  return redacted;
}
