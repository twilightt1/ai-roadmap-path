import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalProgressState,
  loadLocalProgressState,
  persistLocalProgressState,
} from "./progress-local-storage";
import { createEmptyProgressState } from "./progress-types";

const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
const QUIZ_RESULTS_KEY = "ai-roadmap:quiz-results:v1";
const CHALLENGE_RESULTS_KEY = "ai-roadmap:challenge-results:v1";
const V2_STORAGE_KEY = "ai-roadmap:progress:v2";
const V3_STORAGE_KEY = "ai-roadmap:progress:v3";

function createLocalStorageMock() {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    seed(key: string, value: string) {
      values.set(key, value);
    },
    value(key: string) {
      return values.get(key) ?? null;
    },
  };
}

describe("progress local storage", () => {
  let storage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storage = createLocalStorageMock();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads state from the existing compatible storage keys", () => {
    storage.seed(COMPLETED_KEY, JSON.stringify(["phase-1/a"]));
    storage.seed(PROJECT_FEATURES_KEY, JSON.stringify(["project-1/0"]));
    storage.seed(
      QUIZ_RESULTS_KEY,
      JSON.stringify({
        "phase-1/a": {
          score: 10,
          total: 10,
          passedAt: "2026-01-01T00:00:00.000Z",
          attempts: 2,
        },
      })
    );
    storage.seed(
      CHALLENGE_RESULTS_KEY,
      JSON.stringify({
        "numpy-1": {
          solvedAt: "2026-01-02T00:00:00.000Z",
          attempts: 3,
          lastPassed: true,
        },
      })
    );
    storage.seed(STORAGE_KEY, "2026-01-03T00:00:00.000Z");
    storage.seed(STARTED_KEY, "2026-01-01T00:00:00.000Z");

    const state = loadLocalProgressState();

    expect([...state.completed]).toEqual(["phase-1/a"]);
    expect([...state.projectFeatures]).toEqual(["project-1/0"]);
    expect(state.quizResults.get("phase-1/a")).toEqual({
      score: 10,
      total: 10,
      passedAt: "2026-01-01T00:00:00.000Z",
      attempts: 2,
    });
    expect(state.challengeResults.get("numpy-1")).toEqual({
      solvedAt: "2026-01-02T00:00:00.000Z",
      attempts: 3,
      lastPassed: true,
    });
    expect(state.lastVisit).toBe("2026-01-03T00:00:00.000Z");
    expect(state.startedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("migrates v1 data into a V3 document", () => {
    storage.seed(COMPLETED_KEY, JSON.stringify(["phase-1/a"]));
    storage.seed(PROJECT_FEATURES_KEY, JSON.stringify(["project-1/0"]));
    storage.seed(STORAGE_KEY, "2026-01-03T00:00:00.000Z");

    const state = loadLocalProgressState();
    const document = JSON.parse(storage.value(V3_STORAGE_KEY) ?? "{}");

    expect(state.itemStates.get("lesson\u0000phase-1/a")).toMatchObject({
      scope: "lesson",
      itemKey: "phase-1/a",
      completed: true,
      clientUpdatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(state.itemStates.get("project_feature\u0000project-1/0")).toMatchObject({
      scope: "project_feature",
      itemKey: "project-1/0",
      completed: true,
      clientUpdatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(document).toMatchObject({
      schemaVersion: 3,
      itemStates: expect.arrayContaining([
        expect.objectContaining({ scope: "lesson", itemKey: "phase-1/a", completed: true }),
        expect.objectContaining({ scope: "project_feature", itemKey: "project-1/0", completed: true }),
      ]),
    });
    expect(storage.value(COMPLETED_KEY)).toBeNull();
    expect(storage.value(V2_STORAGE_KEY)).toBeNull();
  });

  it("migrates a V2 document into V3", () => {
    storage.seed(
      V2_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        syncEpoch: null,
        pendingItemMutations: [],
        pendingPracticeEvents: [],
        itemStates: [
          {
            scope: "lesson",
            itemKey: "phase-1/a",
            completed: true,
            clientUpdatedAt: "2026-01-03T00:00:00.000Z",
            mutationId: "00000000-0000-4000-8000-000000000001",
          },
        ],
        quizResults: {},
        challengeResults: {},
        startedAt: null,
        lastVisit: "2026-01-03T00:00:00.000Z",
      })
    );

    expect([...loadLocalProgressState().completed]).toEqual(["phase-1/a"]);
    expect(JSON.parse(storage.value(V3_STORAGE_KEY) ?? "{}")).toMatchObject({ schemaVersion: 3 });
    expect(storage.value(V2_STORAGE_KEY)).toBeNull();
  });

  it("falls back from corrupt V3 data to V2 without deleting the corrupt value", () => {
    storage.seed(V3_STORAGE_KEY, "not-json");
    storage.seed(V2_STORAGE_KEY, "not-json");

    expect(loadLocalProgressState()).toEqual(createEmptyProgressState());
    expect(storage.value(V3_STORAGE_KEY)).toBe("not-json");
    expect(storage.value(V2_STORAGE_KEY)).toBe("not-json");
  });

  it("falls back to an empty state when stored JSON is corrupt", () => {
    storage.seed(COMPLETED_KEY, "not-json");

    expect(loadLocalProgressState()).toEqual(createEmptyProgressState());
  });

  it("falls back safely when a v2 document is invalid", () => {
    storage.seed(V2_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, itemStates: "not-an-array" }));

    expect(loadLocalProgressState()).toEqual(createEmptyProgressState());
  });

  it("persists writes to a versioned V3 document", () => {
    persistLocalProgressState({
      completed: new Set(["phase-1/a"]),
      projectFeatures: new Set(["project-1/0"]),
      pendingItemMutations: [],
      pendingPracticeEvents: [],
      syncEpoch: null,
      itemStates: new Map([
        [
          "lesson\u0000phase-1/a",
          {
            scope: "lesson",
            itemKey: "phase-1/a",
            completed: true,
            clientUpdatedAt: "2026-01-03T00:00:00.000Z",
            mutationId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      ]),
      quizResults: new Map([
        [
          "phase-1/a",
          { score: 9, total: 10, passedAt: "2026-01-01T00:00:00.000Z", attempts: 2 },
        ],
      ]),
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-01-02T00:00:00.000Z", attempts: 3, lastPassed: true }],
      ]),
      lastVisit: "2026-01-03T00:00:00.000Z",
      startedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(JSON.parse(storage.value(V3_STORAGE_KEY) ?? "{}")).toMatchObject({
      schemaVersion: 3,
      itemStates: [
        {
          scope: "lesson",
          itemKey: "phase-1/a",
          completed: true,
          clientUpdatedAt: "2026-01-03T00:00:00.000Z",
          mutationId: "00000000-0000-4000-8000-000000000001",
        },
      ],
    });
    expect(storage.value(COMPLETED_KEY)).toBeNull();
    expect(storage.value(PROJECT_FEATURES_KEY)).toBeNull();
    expect(storage.value(QUIZ_RESULTS_KEY)).toBeNull();
    expect(storage.value(CHALLENGE_RESULTS_KEY)).toBeNull();
    expect(storage.value(STORAGE_KEY)).toBeNull();
    expect(storage.value(STARTED_KEY)).toBeNull();
  });

  it("clears prior reset keys including startedAt", () => {
    clearLocalProgressState();

    expect(storage.removeItem).toHaveBeenCalledWith(COMPLETED_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(PROJECT_FEATURES_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(QUIZ_RESULTS_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(CHALLENGE_RESULTS_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(STARTED_KEY);
  });

  it("separates anonymous and authenticated storage namespaces", () => {
    persistLocalProgressState({
      ...createEmptyProgressState(),
      completed: new Set(["anonymous/topic"]),
      lastVisit: "2026-01-01T00:00:00.000Z",
    });
    persistLocalProgressState(
      {
        ...createEmptyProgressState(),
        completed: new Set(["user/topic"]),
        lastVisit: "2026-01-02T00:00:00.000Z",
      },
      "user-a"
    );

    expect([...loadLocalProgressState().completed]).toEqual(["anonymous/topic"]);
    expect([...loadLocalProgressState("user-a").completed]).toEqual(["user/topic"]);
    expect(loadLocalProgressState("user-b")).toEqual(createEmptyProgressState());
  });
});
