import { describe, expect, it, vi } from "vitest";
import { syncExternalEditorValue } from "./code-editor-state";

describe("syncExternalEditorValue", () => {
  it("replaces the document only when parent state differs from editor state", () => {
    const dispatch = vi.fn();
    const view = {
      state: { doc: { toString: () => "old value", length: 9 } },
      dispatch,
    };

    syncExternalEditorValue(view, "new value");

    expect(dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 9, insert: "new value" },
    });
  });

  it("does not dispatch when the editor already holds the parent value", () => {
    const dispatch = vi.fn();
    const view = {
      state: { doc: { toString: () => "same", length: 4 } },
      dispatch,
    };

    syncExternalEditorValue(view, "same");

    expect(dispatch).not.toHaveBeenCalled();
  });
});
