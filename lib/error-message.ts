/** Converts unknown client/runtime failures into a bounded, user-facing message. */
export function getErrorMessage(
  error: unknown,
  fallback = "Yêu cầu không thể hoàn tất. Vui lòng thử lại."
): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
    if (typeof candidate.code === "string" && candidate.code.trim()) {
      return `Yêu cầu thất bại (${candidate.code}). Vui lòng thử lại.`;
    }
  }

  return fallback;
}
