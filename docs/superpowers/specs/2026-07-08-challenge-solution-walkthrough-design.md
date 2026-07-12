# Challenge Solution Walkthrough Design

Date: 2026-07-08
Status: Approved for planning
Project: AI Engineer Roadmap 2026

## Goal

Improve Challenge UX by turning code challenges from a binary pass/fail experience into a guided learning flow. Learners should be encouraged to try solving first, then receive a structured solution walkthrough after enough failed submit attempts or after solving the challenge.

The feature focuses on solution walkthroughs, not adaptive recommendations or AI-generated debugging feedback.

## Current Context

The project already has a practice challenge system:

- `/practice` lists challenges with category/difficulty filters and solved progress.
- `/practice/[id]` renders challenge description, hint, editor, test results, bookmark, and save-snippet actions.
- Challenge data lives in `content/challenges/*.json`.
- `getChallenge(id)` strips `solution` by default before sending challenge data to the client.
- `getChallenge(id, true)` can read full challenge data server-side.
- All 35 current challenges include `solution` and hidden tests.
- Progress state already tracks challenge attempts via `ChallengeResult`:
  - `solvedAt: string | null`
  - `attempts: number`
  - `lastPassed: boolean`

This design should preserve the existing security posture: the reference solution is not included in the initial page payload.

## UX Flow

### Initial State

When a learner opens a challenge:

- They see the existing challenge description, optional hint, editor, visible test runner, submit button, and status.
- The solution is locked if the learner has not solved the challenge and has fewer than 3 submit attempts.
- The locked panel explains how to unlock the walkthrough.
- The locked panel must not fetch the solution payload.

### Submit Attempts

Only `Submit` increments challenge attempts and counts toward unlock. `Run tests` remains a free debugging action and does not affect unlock progress.

After a failed submit below the unlock threshold, the UI shows progress toward unlock, for example:

- `1/3 submit attempts before walkthrough unlock`
- `2/3 submit attempts before walkthrough unlock`

### Unlock Rule

Use a constant:

```ts
export const SOLUTION_UNLOCK_FAILED_ATTEMPTS = 3;
```

The walkthrough is unlocked when either condition is true:

1. The challenge is solved (`solvedAt != null`).
2. The learner has at least 3 submit attempts and has not solved the challenge.

Effective logic:

```ts
const attempts = result?.attempts ?? 0;
const solved = result?.solvedAt != null;
const unlocked = solved || attempts >= SOLUTION_UNLOCK_FAILED_ATTEMPTS;
```

### Unlocked State

Once unlocked, the learner can open a `Solution Walkthrough` panel with progressive sections:

1. Approach — the core idea.
2. Steps — ordered solution steps.
3. Edge cases — common cases that fail hidden tests.
4. Complexity — optional time/space complexity.
5. Reference solution — full code sample, shown last.

If the learner has solved the challenge, the panel is always available so they can compare their solution with the reference solution.

### Refresh Behavior

Unlock state should persist across refresh because it is derived from existing progress state. Anonymous users use localStorage progress; authenticated users sync progress through the current Supabase progress path.

## Data Model

Extend challenge types with optional walkthrough metadata.

```ts
export type SolutionWalkthrough = {
  approach: string;
  steps: string[];
  edgeCases?: string[];
  complexity?: string;
};

export type ChallengeSolutionPayload = {
  id: string;
  solution: string;
  solutionWalkthrough?: SolutionWalkthrough;
};
```

Extend `Challenge`:

```ts
export type Challenge = {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  tags: string[];
  description: string;
  starterCode: string;
  testCases: TestCase[];
  solution?: string;
  solutionWalkthrough?: SolutionWalkthrough;
  hint?: string;
};
```

`solutionWalkthrough` is optional. A challenge remains valid if it has a `solution` but no structured walkthrough.

Example:

```json
{
  "solutionWalkthrough": {
    "approach": "Use an iterative Fibonacci loop with two variables instead of recursive branching.",
    "steps": [
      "Initialize a = 0 and b = 1 for F(0) and F(1).",
      "Repeat n times, replacing a with b and b with a + b.",
      "Return a after the loop."
    ],
    "edgeCases": [
      "n = 0 must return 0.",
      "n = 1 must return 1.",
      "Avoid exponential recursion for larger n."
    ],
    "complexity": "Time O(n), space O(1)."
  }
}
```

## Server/API Design

### Existing Challenge Loader

Keep `getChallenge(id)` behavior unchanged: by default it strips `solution` from returned data.

When `includeSolution` is false, returned client-safe challenge data should also exclude `solutionWalkthrough` if the walkthrough is considered part of the solution content. This keeps the initial payload focused on problem-solving and avoids revealing the approach too early.

### New Server Accessor

Add a server-only helper:

```ts
export async function getChallengeSolution(
  id: string
): Promise<ChallengeSolutionPayload | null>;
```

Behavior:

- Read full challenge data server-side.
- Return `null` if the challenge does not exist or has no solution.
- Return only `{ id, solution, solutionWalkthrough }`.
- Do not return test cases, starter code, hidden tests, or unrelated metadata.

### API Route

Add:

```txt
app/api/challenges/[id]/solution/route.ts
```

`GET` behavior:

- Calls `getChallengeSolution(id)`.
- Returns `404` when missing.
- Returns JSON payload when found.

The client calls this API only after its local unlock condition is met.

### Enforcement Note

The unlock rule is enforced by the client UX. A direct API caller could request a solution endpoint early. This is acceptable for the current learning app scope because challenge data is static and the goal is learning UX, not exam-grade anti-cheat.

If strict enforcement becomes necessary later, the API can verify authenticated Supabase attempt history server-side before returning the payload.

## Component Design

### New Component

Add:

```txt
components/challenge/solution-walkthrough-panel.tsx
```

Props:

```ts
type SolutionWalkthroughPanelProps = {
  challengeId: string;
  unlocked: boolean;
  attempts: number;
  unlockThreshold: number;
  solved: boolean;
  hint?: string;
  challengeTitle?: string;
};
```

Responsibilities:

- Render locked state when `unlocked` is false.
- Show unlock progress based on attempts and threshold.
- Fetch solution payload only when unlocked and user opens the panel or when the unlocked panel first mounts.
- Render loading and error states.
- Render structured sections in this order:
  1. Approach
  2. Steps
  3. Edge cases
  4. Complexity
  5. Reference solution
- If `solutionWalkthrough` is missing, fallback gracefully:
  - Approach: use `hint` if available, otherwise show a short default message that no detailed walkthrough is available yet.
  - Steps, edge cases, and complexity: hide empty sections.
  - Reference solution: always show when payload includes `solution`.
- Optionally include `SaveSnippetButton` for the reference solution if the existing component fits without extra coupling.

### Integration Point

Update `ChallengeView`:

- Get challenge result via `getChallengeResult(challenge.id)` from `useProgress()`.
- Compute `attempts`, `solved`, and `unlocked`.
- Render `SolutionWalkthroughPanel` in the left column below hint/status.

The existing `ChallengeEditor` and test runner remain responsible for running/submitting code and recording attempts through `setChallengeResult`.

## Content Rollout

### Initial Content

Add structured walkthrough content to at least one challenge in the first implementation pass:

- `content/challenges/python-fibonacci.json`

Prefer adding 3–5 examples if time permits, covering multiple categories:

- Python
- NumPy
- Pandas
- ML

### Fallback for Remaining Challenges

All existing challenges already have `solution`, so the feature works for every challenge even if structured walkthrough metadata is not yet authored.

For challenges without `solutionWalkthrough`, the unlocked panel displays:

- fallback approach from `hint` when available,
- the reference solution,
- no empty placeholder sections.

## Testing Strategy

### Automated Tests

Add or update tests around server/data behavior:

1. `getChallenge(id)` does not return `solution` by default.
2. `getChallenge(id)` does not return `solutionWalkthrough` by default.
3. `getChallenge(id, true)` can read full server-side data.
4. `getChallengeSolution(id)` returns `{ id, solution, solutionWalkthrough? }` for valid challenges.
5. `getChallengeSolution(id)` returns `null` for missing challenges.
6. Challenge validation accepts records with and without `solutionWalkthrough`.

API route tests are optional if the project does not already have route-handler tests. At minimum, manually verify 200/404 behavior.

### Manual QA

1. Open a fresh challenge with no attempts:
   - Walkthrough panel is locked.
   - Solution endpoint is not fetched automatically.

2. Submit wrong solution once:
   - Attempts show `1/3`.
   - Panel remains locked.

3. Submit wrong solution twice:
   - Attempts show `2/3`.
   - Panel remains locked.

4. Submit wrong solution three times:
   - Panel unlocks.
   - Opening the panel fetches solution.
   - Approach/steps/reference solution render correctly.

5. Submit passing solution:
   - Challenge marks solved.
   - Panel unlocks immediately.

6. Refresh page:
   - Unlock state is preserved from progress state.

7. Check initial page payload behavior by code inspection or devtools:
   - `solution` is not present in the initial `ChallengeView` challenge prop.

## Out of Scope

This design does not include:

- AI-generated personalized feedback.
- Server-side anti-cheat enforcement of unlock state.
- Run history or code diffing.
- Adaptive practice recommendations.
- Batch authoring structured walkthroughs for all 35 challenges in the first implementation pass.

## Success Criteria

The feature is successful when:

- Learners cannot see the reference solution in the initial challenge page payload.
- The UI clearly communicates how to unlock the walkthrough.
- The walkthrough unlocks after 3 submit attempts or immediately after solving.
- The unlocked panel provides a useful learning path before showing full code.
- All existing challenges remain valid and usable without immediate content migration.
- Existing challenge submit/progress behavior continues to work unchanged.
