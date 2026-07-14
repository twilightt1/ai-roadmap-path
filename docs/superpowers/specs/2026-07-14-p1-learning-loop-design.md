# P1 Learning Loop Design

**Date:** 2026-07-14
**Status:** Implementation baseline

## Goal

Turn the existing progress dashboard into a deterministic learning loop that answers four learner questions:

1. Where should I start?
2. What should I learn next?
3. How much should I finish this week?
4. How strong is the available evidence for each foundation phase?

The first P1 slice implements a diagnostic assessment, a continue-learning recommendation, a weekly lesson goal, and an explainable mastery estimate. It deliberately does not generate advice with an LLM.

## Product scope

- A versioned foundation diagnostic assembled from eight existing, reviewed topic quizzes.
- A privacy-minimal diagnostic result containing only aggregate topic outcomes, never selected answers.
- A deterministic recommendation engine that prioritizes failed quiz evidence, weak diagnostic topics, and then the first incomplete roadmap topic.
- A phase mastery estimate derived from lesson completion, quiz outcomes, and diagnostic evidence.
- A separate evidence-confidence label so a high score from one weak signal is not presented as verified mastery.
- A weekly lesson goal with progress derived from canonical LWW lesson timestamps.
- Local-first anonymous persistence and user-scoped local persistence.
- Field-level LWW merge into an owner-scoped Supabase profile through an authenticated RPC.
- A `NEXT_PUBLIC_P1_LEARNING_LOOP` rollout flag, disabled by default.

## Non-goals

- AI-generated tutoring, recommendations, summaries, or feedback.
- Prerequisite graph authoring for all 118 topics.
- Spaced repetition or adaptive practice scheduling.
- Certificates, secure assessment, grading, or claims of verified competence.
- Storing answer selections, prompts, notes, source code, or other learner content in the learning profile.

## Diagnostic model

The assessment version is `foundation-v1`. It uses one stable question from each curated topic:

- AI Engineer orientation
- Python fundamentals
- asynchronous Python
- linear algebra
- supervised learning
- neural-network fundamentals
- prompt engineering
- RAG fundamentals

The server loads the existing quiz JSON and passes the selected questions to the client. The persisted result stores only:

- assessment version;
- completion timestamp;
- total score and total question count;
- per-topic `correct` and `total` aggregates.

## Learning profile

The profile has two independently versioned LWW fields:

- weekly goal: target lessons and `updatedAt`;
- latest diagnostic result and `updatedAt`.

Anonymous and authenticated local documents use different keys. On sign-in, anonymous, user-local, and remote fields are merged independently by timestamp; the merged profile is saved under the user key and the anonymous document is removed only after the merge is materialized locally. Remote writes use `merge_learning_profile`, derive ownership from `auth.uid()`, validate bounds, and accept a field only when its client timestamp is newer.

## Mastery estimate

For each phase, the engine calculates available evidence:

- lesson completion ratio, weight 50;
- average best quiz ratio, weight 30 when quiz evidence exists;
- diagnostic ratio for curated topics in the phase, weight 20 when diagnostic evidence exists.

The score is normalized across evidence that exists. Confidence is based on the amount and diversity of evidence, not on the score:

- low: completion evidence only or very sparse evidence;
- medium: at least two signal families;
- high: all three signal families with meaningful coverage.

The UI must call this an estimate and display the evidence explanation.

## Recommendation rules

The first matching rule wins:

1. A topic with a failed quiz attempt and incomplete lesson.
2. A topic answered incorrectly in the latest diagnostic and still incomplete.
3. The first incomplete topic in roadmap order.
4. The first unfinished project when every lesson is complete.
5. A completion state when all known learning items are complete.

Rules are deterministic and return a reason code plus user-facing explanation.

## Weekly goal

The learner selects 3, 5, or 7 lessons per ISO week. Weekly progress counts canonical `lesson` item states that are currently completed and whose latest client update occurred inside the current local week. The UI shows both count and percentage and never invents a streak from `daysSinceStart`.

## Rollout and safety

- Flag off: existing dashboard and routes keep their current behavior.
- Flag on: dashboard shows the learning loop and `/diagnostic` is available.
- Supabase table exposes owner reads only; writes occur through the authenticated merge RPC.
- Anonymous RPC calls and cross-user reads must fail in database tests.
- Remote diagnostic JSON is parsed defensively and bounded in SQL.
- No diagnostic answer selections are persisted or emitted to diagnostics.

## Acceptance criteria

- Diagnostic can be completed and resumed result is visible after reload.
- A failed diagnostic topic changes the next recommendation predictably.
- Weekly target persists and weekly progress changes when a lesson is completed.
- Anonymous profile merges into the authenticated profile without overwriting newer remote fields.
- Unit tests cover parsing, field-level merge, mastery, recommendation, and weekly counting.
- Database tests cover ownership, anonymous denial, stale-write rejection, and payload bounds.
- Playwright covers the anonymous diagnostic-to-dashboard journey with the P1 flag enabled.
- `pnpm check`, `pnpm test:db`, and local E2E pass.
