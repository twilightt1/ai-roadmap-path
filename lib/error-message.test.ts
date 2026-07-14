import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error-message";

describe("getErrorMessage", () => {
  it("preserves Error, string, and structured API messages", () => {
    expect(getErrorMessage(new Error("Network unavailable"))).toBe("Network unavailable");
    expect(getErrorMessage("Request aborted")).toBe("Request aborted");
    expect(getErrorMessage({ message: "Permission denied", code: "42501" })).toBe("Permission denied");
  });

  it("uses a stable code or fallback instead of rendering object coercion", () => {
    expect(getErrorMessage({ code: "PGRST301" })).toBe("Yêu cầu thất bại (PGRST301). Vui lòng thử lại.");
    expect(getErrorMessage({ message: {} })).toBe("Yêu cầu không thể hoàn tất. Vui lòng thử lại.");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});
