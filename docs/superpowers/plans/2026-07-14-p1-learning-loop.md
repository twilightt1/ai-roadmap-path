# P1 Learning Loop Implementation Plan

## Phase 1 — Foundation

- [x] Add the P1 rollout flag and create `codex/p1-learning-loop` from the P0 candidate.
- [x] Define versioned learning-profile types, validators, local keys, and field-level merge helpers.
- [x] Add a Supabase learning profile table, owner-read RLS, authenticated merge RPC, and SQL assertions.

## Phase 2 — Intelligence without AI

- [x] Add the curated diagnostic manifest and server-side quiz assembly.
- [x] Add pure mastery, evidence-confidence, weekly-progress, and next-recommendation functions.
- [x] Cover edge cases and deterministic ordering with unit tests.

## Phase 3 — Learner experience

- [x] Add the `/diagnostic` assessment flow.
- [x] Add weekly goal, continue-learning, and phase mastery panels to the dashboard.
- [x] Add an entry point from the roadmap/dashboard while preserving the flag-off experience.

## Phase 4 — Verification

- [x] Add anonymous and authenticated cross-context diagnostic/profile E2E coverage.
- [x] Run content validation, typecheck, lint, unit tests, build, DB/RLS tests, and local E2E.
- [x] Record a P1 local verification report and remaining staging/canary gates.
