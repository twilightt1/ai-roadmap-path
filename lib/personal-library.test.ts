import { describe, expect, it } from "vitest";
import {
  BOOKMARK_TARGET_TYPES,
  buildBookmarkHref,
  buildNoteHref,
  buildSnippetHref,
  mapBookmarkRow,
  mapNoteRow,
  mapSavedSnippetRow,
  normalizeBookmarkTarget,
  validateNoteContent,
  validateSnippetInput,
} from "./personal-library";

describe("personal-library helpers", () => {
  it("defines the supported bookmark target types", () => {
    expect(BOOKMARK_TARGET_TYPES).toEqual(["lesson", "project", "challenge"]);
  });

  it("normalizes bookmark targets", () => {
    expect(normalizeBookmarkTarget("lesson", " phase-1/numpy ")).toEqual({
      targetType: "lesson",
      targetSlug: "phase-1/numpy",
    });
    expect(() => normalizeBookmarkTarget("quiz" as never, "phase-1/numpy")).toThrow(
      "Unsupported bookmark target type: quiz"
    );
    expect(() => normalizeBookmarkTarget("lesson", "   ")).toThrow(
      "Bookmark target slug is required"
    );
  });

  it("maps Supabase rows to camelCase records", () => {
    expect(
      mapBookmarkRow({
        id: "bookmark-1",
        target_type: "lesson",
        target_slug: "phase-1/numpy",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "bookmark-1",
      targetType: "lesson",
      targetSlug: "phase-1/numpy",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });

    expect(
      mapNoteRow({
        id: "note-1",
        lesson_slug: "phase-1/numpy",
        content: "Remember broadcasting rules",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "note-1",
      lessonSlug: "phase-1/numpy",
      content: "Remember broadcasting rules",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });

    expect(
      mapSavedSnippetRow({
        id: "snippet-1",
        title: "Mean helper",
        language: "python",
        code: "print(1)",
        lesson_slug: null,
        challenge_slug: "numpy-mean-array",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toEqual({
      id: "snippet-1",
      title: "Mean helper",
      language: "python",
      code: "print(1)",
      lessonSlug: null,
      challengeSlug: "numpy-mean-array",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T01:00:00.000Z",
    });
  });

  it("rejects invalid rows", () => {
    expect(() =>
      mapBookmarkRow({
        id: "bookmark-1",
        target_type: "quiz",
        target_slug: "phase-1/numpy",
        created_at: "2026-07-07T00:00:00.000Z",
        updated_at: "2026-07-07T01:00:00.000Z",
      })
    ).toThrow("Unsupported bookmark target type: quiz");

    expect(() => mapNoteRow({ id: "note-1" })).toThrow("Invalid notes row: lesson_slug must be a string");
    expect(() => mapSavedSnippetRow({ id: "snippet-1" })).toThrow(
      "Invalid saved_snippets row: title must be a string"
    );
  });

  it("validates note content", () => {
    expect(validateNoteContent("  Learn axis=0 vs axis=1  ")).toBe("Learn axis=0 vs axis=1");
    expect(() => validateNoteContent("   ")).toThrow("Note content is required");
    expect(() => validateNoteContent("x".repeat(20_001))).toThrow(
      "Note content must be at most 20000 characters"
    );
  });

  it("validates snippet input", () => {
    expect(
      validateSnippetInput({
        title: "  Mean helper  ",
        language: " Python ",
        code: " print(values.mean()) ",
        challengeSlug: " numpy-mean-array ",
      })
    ).toEqual({
      title: "Mean helper",
      language: "python",
      code: " print(values.mean()) ",
      lessonSlug: null,
      challengeSlug: "numpy-mean-array",
    });

    expect(() =>
      validateSnippetInput({ title: "", language: "python", code: "print(1)" })
    ).toThrow("Snippet title is required");
    expect(() =>
      validateSnippetInput({ title: "x".repeat(121), language: "python", code: "print(1)" })
    ).toThrow("Snippet title must be at most 120 characters");
    expect(() =>
      validateSnippetInput({ title: "Example", language: " ", code: "print(1)" })
    ).toThrow("Snippet language is required");
    expect(() =>
      validateSnippetInput({ title: "Example", language: "python", code: "   " })
    ).toThrow("Snippet code is required");
    expect(() =>
      validateSnippetInput({ title: "Example", language: "python", code: "x".repeat(100_001) })
    ).toThrow("Snippet code must be at most 100000 characters");
  });

  it("builds destination URLs", () => {
    expect(buildBookmarkHref({ targetType: "lesson", targetSlug: "phase-1/numpy" })).toBe(
      "/phase/phase-1/numpy"
    );
    expect(buildBookmarkHref({ targetType: "project", targetSlug: "portfolio-rag" })).toBe(
      "/projects/portfolio-rag"
    );
    expect(buildBookmarkHref({ targetType: "challenge", targetSlug: "numpy-mean-array" })).toBe(
      "/practice/numpy-mean-array"
    );
    expect(buildNoteHref({ lessonSlug: "phase-1/numpy" })).toBe("/phase/phase-1/numpy");
    expect(buildSnippetHref({ lessonSlug: "phase-1/numpy", challengeSlug: null })).toBe(
      "/phase/phase-1/numpy"
    );
    expect(buildSnippetHref({ lessonSlug: null, challengeSlug: "numpy-mean-array" })).toBe(
      "/practice/numpy-mean-array"
    );
    expect(buildSnippetHref({ lessonSlug: null, challengeSlug: null })).toBe("/playground");
  });
});
