# Practice Ladder — Product Direction and Pilot Design

Date: 2026-07-10  
Status: Approved direction; ready for implementation planning  
Project: AI Engineer Roadmap 2026

## Executive Summary

The platform already has substantial learning coverage: 118 lessons with quizzes, 35 coding challenges, 52 projects, local/Supabase progress, browser-based code execution, and a personal learning workspace. The next product step should therefore not be adding more disconnected content or features.

The approved direction is to improve the transition from understanding a lesson to independently applying it in code. The proposed solution is a **Practice Ladder** pilot for 10 foundational Python, NumPy, and Pandas challenges.

Each ladder progressively reduces support:

```text
Lesson
  → Recall
  → Worked Example
  → Scaffolded Exercise
  → Independent Challenge
  → Layered Hints
  → Walkthrough
  → Transfer Exercise
```

The pilot's primary success signal is not raw completion. It is the percentage of learners who pass the independent challenge before seeing the walkthrough and without opening the most revealing hint.

Before rollout, the project should fix progress deletion semantics, isolate challenge execution in a worker with timeout/cancel, repair editor reset/state ownership, and add content validation plus automated quality gates.

## Current Context

The application is a Vietnamese self-learning platform for AI Engineering. Its current architecture combines:

- Static curriculum and versioned content in the repository.
- Server-rendered lesson pages.
- Client-side quiz, project, challenge, and playground experiences.
- Local-first learning progress.
- Supabase authentication and synchronized personal data.

Current learning assets include:

- 118 roadmap topics and MDX lessons.
- 118 lesson quizzes.
- 35 coding challenges.
- 52 projects.
- Four learning paths and three skill tiers.
- Personal bookmarks, notes, and saved snippets.

The primary product gap is no longer curriculum coverage. It is the lack of a structured bridge between consuming an explanation and independently implementing the concept.

## Understanding Summary

- The next 6–8 weeks should increase learning value rather than focus on monetization or broad feature expansion.
- The initial target learner is a beginner in AI who can follow explanations but struggles to write a solution independently.
- The priority learning journey is lesson → guided application → independent challenge.
- The primary outcome is a higher independent challenge pass rate.
- The first pilot should cover 10 foundational Python, NumPy, and Pandas challenges.
- Progress correctness, runtime reliability, and content validation are prerequisites for credible learning measurement.
- Monetization, certificates, secure assessment, mentor workflows, peer review, and large-scale personalization are outside this pilot.

## Assumptions

### Team and schedule

- One developer or a small team is available for approximately eight weeks.
- Content review capacity is limited, so the content model must be repeatable and reviewable through Git.
- The pilot may be reduced from 10 to 6 ladders if content authoring becomes the bottleneck.

### Performance and reliability

- After the runtime has loaded, learner actions should receive prompt feedback.
- Infinite loops or expensive code must not freeze the main UI.
- Learners must be able to cancel execution and retry a failed runtime load.
- Learning progress must survive refresh, logout/login, and temporary network failure without resurrecting deleted or unchecked state.

### Scale

- Initial traffic does not justify server-side grading infrastructure.
- The pilot can continue using browser execution if isolation and timeout behavior are improved.
- Early evaluation may rely on usability sessions and cohort comparison rather than statistically powered A/B testing.

### Security and privacy

- The product is a learning environment, not an exam-grade assessment system.
- Hidden browser tests are debugging aids and are not treated as confidential anti-cheat controls.
- Untrusted JavaScript must not continue running in the application's same-origin page.
- Analytics must not include source code, note contents, email addresses, or other unnecessary personal data.

### Maintenance

- Practice Ladder content remains versioned in the repository.
- Every ladder has a schema version and content version.
- CI validates content references and required fields before deployment.
- AI-generated runtime tutoring is intentionally deferred until the deterministic learning flow has been validated.

## Product Goal

Help beginner AI learners progress from recognizing a concept to applying it independently in code.

### Job to be done

> When I finish an AI/Python lesson but cannot start the related coding task, help me practice in progressively harder steps so that I can write and validate a solution without immediately copying the answer.

## Non-goals

The pilot does not include:

- AI-generated personalized code feedback.
- Adaptive recommendations or prerequisite graph personalization.
- Streaks, XP, badges, or other gamification systems.
- Public code sharing.
- Mentor or peer review.
- Secure server-side assessment or anti-cheat.
- Certificates or verified skill credentials.
- Portfolio submission and project grading.
- Practice Ladders for all 35 challenges or all 118 lessons.
- Additional curriculum phases.

## Alternatives Considered

### Option A — Practice Ladder (selected)

Add worked examples, scaffolded exercises, layered hints, walkthroughs, and transfer exercises around foundational challenges.

Advantages:

- Directly targets the identified learning gap.
- Reuses lessons, challenges, tests, progress, and the existing walkthrough proposal.
- Can be piloted on a small content set.
- Produces observable learning signals.

Trade-offs:

- Requires substantial content authoring and review.
- Needs additional learner-state tracking.
- Benefits depend on the quality of scaffolding, not only implementation quality.

### Option B — Learning Navigator

Add diagnostic assessments, prerequisite mapping, and personalized next-step recommendations.

Why deferred:

- It optimizes what to learn next rather than how to apply a concept.
- It requires more behavioral data and more complex recommendation logic.
- It is better suited to a later phase after practice outcomes are measurable.

### Option C — Project-first learning

Organize lessons and challenges around mini-projects and practical portfolio outcomes.

Why deferred:

- It has high long-term value but significantly larger content and tracking scope.
- It introduces evidence, rubric, submission, and potentially review workflows.
- It is not realistic as the primary one-developer initiative for this eight-week pilot.

## Learner Experience

The pilot starts with 10 foundational challenges across Python, NumPy, and Pandas. These topics are selected because they are prerequisites for later ML work and are likely to expose the gap between conceptual understanding and implementation.

### Step 1 — Recall

A 30–60 second check verifies the concept or API needed for the exercise.

Examples:

- Identify the correct array operation.
- Predict a simple output.
- Choose the correct condition or data shape.

This is not a replacement for the lesson quiz. Its purpose is to reactivate the specific knowledge required for the next coding step.

### Step 2 — Worked Example

The learner sees a related but not identical example with explicit reasoning:

1. Restate the problem.
2. Identify inputs and expected outputs.
3. Decompose the operation.
4. Predict an intermediate or final result.
5. Reveal and explain the implementation.
6. Verify the output.

The learner should make at least one prediction before seeing the full explanation. Worked examples must explain decisions, not merely display finished code.

### Step 3 — Scaffolded Exercise

The learner completes starter code with 2–4 meaningful gaps. Tests provide feedback tied to the target skill.

The scaffold should remove incidental difficulty while preserving the core concept. It must not be so close to the independent challenge that the learner can mechanically copy the answer.

### Step 4 — Independent Challenge

The learner attempts the existing challenge without a full solution. Run and Submit remain distinct:

- `Run` supports iteration and visible feedback.
- `Submit` evaluates the complete test set and records an attempt.

### Layered hints

Hints progressively disclose more structure:

1. **Hint 1 — Concept reminder:** points to the relevant concept or API.
2. **Hint 2 — Strategy:** suggests the sequence of operations.
3. **Hint 3 — Pseudocode:** outlines the solution without providing complete source code.

Opening a hint is not treated as failure. Hint usage classifies the level of independence and helps identify where learners get stuck.

### Step 5 — Walkthrough

The walkthrough unlocks when either condition is true:

- The challenge is solved.
- The learner has made at least three failed Submit attempts.

The walkthrough includes:

1. Approach.
2. Step-by-step reasoning.
3. Edge cases.
4. Complexity where relevant.
5. Common mistakes.
6. Reference solution, shown last.

The walkthrough should build on the existing challenge solution walkthrough design. It is an instructional gate, not a secure anti-cheat mechanism.

### Step 6 — Transfer Exercise

The learner solves a short variation using the same concept in a slightly different context. This tests whether the learner can transfer the idea rather than only recognize the reference solution.

A transfer exercise should be brief enough to complete immediately and different enough that copying the reference solution is insufficient.

## Learning-State Semantics

Raw completion is not sufficient. The product distinguishes:

- **Strict independent pass:** challenge passed before walkthrough with no hints opened.
- **Independent pass:** challenge passed before walkthrough without opening Hint 3.
- **Assisted pass:** challenge passed before walkthrough after Hint 1 or Hint 2.
- **Guided completion:** challenge passed after Hint 3 or after opening the walkthrough.
- **Transfer pass:** transfer exercise passed after completing the challenge flow.

This classification is descriptive, not punitive. The learner UI should avoid language that makes asking for help feel like failure.

## Content Model

Each pilot challenge receives a versioned Practice Ladder artifact, preferably:

```text
content/practice-ladders/{challengeId}.json
```

Suggested conceptual shape:

```ts
type PracticeLadder = {
  schemaVersion: number;
  contentVersion: string;
  challengeId: string;
  linkedTopicIds: string[];
  prerequisiteTopicIds?: string[];
  recall: RecallStep;
  workedExample: WorkedExampleStep;
  scaffold: ScaffoldedExerciseStep;
  hints: [HintLevelOne, HintLevelTwo, HintLevelThree];
  walkthrough: SolutionWalkthrough;
  transfer: TransferExerciseStep;
};
```

Required validation includes:

- File ID matches `challengeId`.
- Referenced challenge exists.
- Linked topics and prerequisites exist.
- Exactly three ordered hint levels are present.
- Scaffold and transfer tests use supported comparison modes.
- Walkthrough contains an approach, ordered steps, common mistakes, and a reference solution.
- `schemaVersion` and `contentVersion` are present.
- No duplicate ladder exists for a challenge.

## Learner Progress Model

Each ladder should record enough state to resume the flow and evaluate the pilot:

```ts
type PracticeLadderProgress = {
  challengeId: string;
  contentVersion: string;
  currentStep: PracticeLadderStep;
  completedSteps: PracticeLadderStep[];
  runCount: number;
  submitCount: number;
  highestHintOpened: 0 | 1 | 2 | 3;
  walkthroughOpenedAt: string | null;
  challengePassedAt: string | null;
  transferPassedAt: string | null;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
};
```

Derived state such as `independenceLevel` should be computed from recorded events/state rather than stored in multiple conflicting fields.

### Version behavior

- Existing progress should remain viewable when content changes.
- Minor copy corrections may retain the same content version.
- Changes to tests, hints, or learning sequence should increment `contentVersion`.
- The pilot report must segment results by content version.

## Data Flow

```text
Versioned ladder content
  → build-time schema/reference validation
  → server route loads learner-safe ladder data
  → client resumes local-first ladder progress
  → learner completes recall/example/scaffold
  → challenge runtime executes in an isolated worker
  → hint/submit/walkthrough/transfer state updates locally
  → authenticated state synchronizes to Supabase
  → minimal learning events feed pilot metrics
```

The initial learner payload must not include the full walkthrough or reference solution. The client fetches solution content after the unlock condition is met. This is a UX constraint only; strict server enforcement is out of scope.

## Foundation Work Required Before Pilot

### 1. Correct progress deletion semantics

The current remote merge uses set union for completed lessons and project features. As a result, an unchecked remote item can reappear after synchronization.

Before adding ladder state, progress must support durable negative transitions. Viable models include:

- Authoritative snapshots after initial anonymous/account merge.
- Per-item status with last-write-wins timestamps.
- Operation log or tombstones.

The selected design must pass:

- Complete → sync → uncheck → reload remains unchecked.
- Offline uncheck → reconnect remains unchecked.
- Anonymous/account merge.
- Two-tab updates.
- Remote failure and retry.
- Full reset.

### 2. Isolate challenge execution

Python challenge execution should move off the main thread into a Web Worker with:

- Execution timeout.
- Cancel through worker termination.
- Clean worker recreation.
- Runtime load retry.
- Separate loading and executing states.

JavaScript execution must not use `new Function` in the same-origin application page. If JavaScript challenges become part of the ladder, use an isolated worker or sandboxed cross-origin iframe with narrowly defined capabilities.

### 3. Repair editor state ownership

Choose one owner for editor code state. CodeMirror must respond safely to external reset, language switch, deep-linked code, and resumed ladder state without stale document contents.

### 4. Establish quality gates

Add a single automated check path covering:

- Content validation.
- TypeScript.
- ESLint.
- Unit/integration tests.
- Production build and Pagefind generation.

Exclude `.worktrees/**` from test and lint discovery.

## Error Handling

### Content errors

- Invalid ladder content fails CI rather than silently disappearing at runtime.
- A missing ladder must not break the original challenge route.
- Unsupported content versions produce a clear fallback and telemetry event.

### Runtime errors

- Runtime load failure offers Retry.
- Timeout reports that execution was stopped and preserves code.
- Cancel preserves code and allows a fresh run.
- Test harness errors are distinguished from learner assertion failures.

### Progress errors

- Local progress remains usable when Supabase is unavailable.
- The UI shows `Local only`, `Syncing`, `Synced`, or `Sync failed` where appropriate.
- Retry does not duplicate attempts or resurrect older state.

### Walkthrough errors

- A failed walkthrough request can be retried.
- Unlock state remains intact across refresh.
- Missing optional sections are hidden; the reference solution remains available when the payload is valid.

## Accessibility and Mobile Requirements

- Every step is operable by keyboard.
- Filter and step controls expose selected/current state with appropriate ARIA attributes.
- Icon-only controls have explicit accessible names.
- Code actions are discoverable on touch and keyboard, not only hover.
- Focus moves predictably when a step is completed or a panel opens.
- Runtime/test status is announced without causing excessive screen-reader noise.
- Motion respects reduced-motion preferences.
- The full ladder remains usable on a narrow mobile viewport, acknowledging that extended code editing is best on larger screens.

## Measurement Plan

### North Star metric

**Independent Challenge Pass Rate**

```text
Learners who pass before walkthrough and without opening Hint 3
──────────────────────────────────────────────────────────────
Learners who start the independent challenge step
```

### Supporting classifications

- Strict independent pass rate.
- Assisted pass rate after Hint 1/2.
- Guided completion rate after Hint 3/walkthrough.
- Transfer pass rate.

### Funnel

```text
Open ladder
  → complete recall
  → complete scaffold
  → start independent challenge
  → pass independently or with assistance
  → complete transfer exercise
```

### Supporting metrics

- Drop-off by step.
- Median Submit attempts before pass.
- Hint 1/2/3 open rate.
- Median time from challenge start to pass.
- Transfer pass rate after walkthrough.
- Seven-day return-to-complete rate.
- Runtime error and timeout rate.
- Progress synchronization failure rate.

### Privacy constraints

Learning events may include:

- Pseudonymous learner/session ID.
- Challenge ID.
- Content version.
- Step and event type.
- Hint level.
- Attempt count.
- Pass/fail classification.
- Duration bucket or timestamp.

Learning events must not include:

- Source code.
- Notes or snippet contents.
- Email address.
- Full runtime output when it may contain learner-entered data.
- Unnecessary personal profile attributes.

## Evaluation Strategy

A statistically powered A/B test is not required for the first pilot.

### Phase 1 — Baseline

Record current challenge-start, Submit, pass, duration, and runtime-error behavior for 1–2 weeks where traffic permits.

### Phase 2 — Moderated usability

Test the first two end-to-end ladders with 5–8 beginner AI learners. Observe:

- Whether the task is understood.
- Where the learner becomes stuck.
- Whether hints are appropriately progressive.
- Whether scaffold feedback teaches or merely reveals the answer.
- Whether the transfer exercise demonstrates genuine understanding.

### Phase 3 — Pilot rollout

Release 10 ladders and compare outcomes by challenge, learner cohort, and content version. Combine behavioral metrics with short qualitative feedback.

### Success gate

After approximately four weeks of pilot use:

- Independent challenge pass rate improves by at least 15% relative to baseline.
- At least 60% of learners who start the scaffold proceed to the independent challenge.
- Transfer pass rate is at least 50%.
- Runtime timeout/error rate is below 2%.
- There are no confirmed progress-loss or progress-resurrection regressions.

These are pilot decision thresholds, not permanent product targets. Small samples must be interpreted with confidence intervals and qualitative evidence rather than false precision.

## Eight-Week Roadmap

### Week 1 — Correctness and baseline

- Instrument the current challenge baseline.
- Fix progress uncheck/delete semantics.
- Exclude `.worktrees/**` from lint and test discovery.
- Add CI and a unified check command.

Exit criteria:

- Progress remains correct after reload and login.
- Lint, typecheck, tests, content checks, and build run automatically.

### Week 2 — Runtime and editor reliability

- Move Python challenge execution to a worker.
- Add timeout, cancel, clean restart, and retry.
- Fix CodeMirror reset and state ownership.
- Add targeted runtime/editor tests.

Exit criteria:

- Infinite loops do not freeze the page.
- Runtime load failures are recoverable.
- Reset, language change, and resumed content display correctly.

### Week 3 — Ladder model and measurement

- Define ladder content schema and validator.
- Define versioned progress model.
- Add minimal privacy-preserving learning events.
- Add resume/sync tests.

Exit criteria:

- Invalid content fails CI.
- Event payloads contain no code or direct personal data.
- A partial ladder can resume locally and after authenticated sync.

### Week 4 — Two vertical slices

- Implement the complete learner flow.
- Author two high-quality foundational ladders.
- Integrate layered hints and walkthrough unlock.
- Add transfer exercises.

Exit criteria:

- A learner can complete recall → transfer end to end.
- Walkthrough solution content is absent from the initial payload.
- Progress survives refresh and session changes.

### Week 5 — Usability and template refinement

- Test with 5–8 beginner learners.
- Revise instructions, hint disclosure, feedback, and difficulty.
- Freeze the content authoring/review template.

Exit criteria:

- The main comprehension and drop-off issues are documented.
- The content template is stable enough for repeated authoring.

### Week 6 — Expand to six ladders

- Author and review four additional ladders.
- Complete walkthrough and unlock polish.
- Monitor content-production time and defect rate.

Exit criteria:

- Six ladders pass the definition-of-done checklist.

### Week 7 — Complete the pilot set

- Author and review the final four ladders.
- Polish accessibility and responsive behavior.
- Test offline, sync, timeout, and retry scenarios.

Exit criteria:

- Ten ladders are ready, or six are accepted if content quality would otherwise fall.
- Keyboard and mobile flows are usable.
- No known critical progress or runtime defects remain.

### Week 8 — Rollout and decision

- Release the pilot.
- Monitor the learning funnel and technical health.
- Produce an initial pilot report.
- Decide `expand`, `iterate`, or `stop` per ladder and for the system overall.

Exit criteria:

- Baseline and pilot views are available.
- Failures can be segmented into learning difficulty versus product/runtime defects.
- The next investment decision is based on evidence.

## Scope Reduction Order

If capacity is lower than expected:

1. Preserve correctness, runtime isolation, measurement, and two complete vertical slices.
2. Reduce the pilot from 10 ladders to 6.
3. Simplify selected transfer exercises while preserving at least one per content category.
4. Defer visual polish that does not affect comprehension or accessibility.
5. Do not remove timeout/cancel, progress correctness, content validation, or privacy constraints.

## Definition of Done for Each Ladder

A ladder is complete when:

- It references valid lesson topics and prerequisites.
- Recall tests the exact knowledge needed for the next step.
- The worked example explains reasoning and requires a prediction.
- The scaffold preserves the target skill while reducing incidental complexity.
- Tests and feedback are deterministic and pedagogically useful.
- Hints disclose progressively and Hint 3 stops short of full source code.
- The walkthrough includes approach, ordered steps, common mistakes, edge cases where relevant, complexity where relevant, and a reference solution.
- The transfer exercise applies the same concept in a different context.
- Resume, refresh, sync, timeout, retry, keyboard, and narrow-screen behavior are verified.
- Analytics classify independence without collecting source code or direct personal data.

## Key Risks and Mitigations

### Content authoring becomes the bottleneck

Mitigation:

- Build two vertical slices before batch authoring.
- Use a strict authoring and review checklist.
- Reduce the number of ladders rather than lowering quality.

### Hints reveal too much

Mitigation:

- Define disclosure levels in the content template.
- Test each ladder with beginners before rollout.
- Track pass outcomes by highest hint opened.

### Completion rises without learning transfer

Mitigation:

- Keep transfer exercises in the pilot.
- Separate strict, independent, assisted, and guided completion.
- Review solution-copy patterns qualitatively during usability sessions.

### Runtime failures are mistaken for learner difficulty

Mitigation:

- Instrument runtime errors and timeouts separately.
- Fix isolation and retry behavior before the pilot.
- Exclude known technical-failure sessions from learning-effect analysis.

### Progress conflicts corrupt metrics

Mitigation:

- Resolve deletion semantics before adding ladder state.
- Version state and content.
- Test offline, multi-tab, login merge, and retry scenarios.

### Scope expands into AI tutoring or personalization

Mitigation:

- Keep deterministic content as the pilot boundary.
- Revisit AI feedback only after the ladder funnel demonstrates value and reveals specific feedback gaps.

## Decision Log

| Decision | Alternatives | Rationale |
|:---|:---|:---|
| Prioritize learning value for the next 6–8 weeks | Public-launch hardening, portfolio platform, monetization | The product already has broad curriculum coverage; the largest selected opportunity is helping learners apply knowledge. |
| Target beginner AI learners first | Developers moving into AI, intermediate learners, all segments | Beginners experience the strongest theory-to-code gap and benefit most from structured scaffolding. |
| Use independent challenge pass as the main signal | Lesson completion, project completion, quiz score | It directly measures the selected job: applying knowledge in code. |
| Select Practice Ladder as the main product direction | Learning Navigator, project-first learning | It has the most direct impact, reuses current assets, and fits an eight-week pilot. |
| Pilot on 10 foundational challenges | Five challenges, 20 challenges, all 35 challenges | Ten offers category coverage while remaining reducible to six if authoring quality is at risk. |
| Use five progressive learning stages plus transfer | Walkthrough-only enhancement, free-form practice | Gradual removal of support better addresses the novice application gap. |
| Distinguish independent, assisted, and guided completion | Single pass/fail state | Raw pass rate would overstate independent learning and hide where support is needed. |
| Keep versioned content in the repository | CMS, runtime AI generation | Repository content supports review, deterministic behavior, schema validation, and low operational complexity. |
| Defer AI tutoring | Add AI feedback in the pilot | AI increases cost, variability, privacy questions, and scope before the deterministic learning design is validated. |
| Treat walkthrough unlock as a learning UX gate | Server-enforced anti-cheat | The product is not a secure assessment platform; server enforcement does not improve the selected learning outcome enough for this pilot. |
| Fix correctness and runtime isolation before feature rollout | Build ladder UI first | Invalid progress and frozen execution would compromise both the learning experience and the pilot's measurements. |
| Preserve privacy-minimal analytics | Store code and rich learner traces | The pilot can evaluate the funnel without collecting sensitive or unnecessary learner content. |

## Recommended Next Step

Create an implementation plan that starts with foundation correctness and a two-ladder vertical slice. Do not begin batch content authoring until the two slices pass moderated usability testing and establish a stable content template.
