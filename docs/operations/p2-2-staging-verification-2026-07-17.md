# P2.2 Reviewer Operations Staging Verification — 2026-07-17

## Status

**The P2.2 technical staging rollout is complete: backup, additive migration, transactional security proof, enabled/full canaries, non-destructive rollback, and post-restore replay passed. Broad exposure remains pending named human sign-off.**

This record is not a broad-release approval. P2/P2.1 content, rubric, and usability sign-offs remain separate open gates.

## Candidate and environment

| Field | Value |
|---|---|
| Merged implementation | `main@ab20e3a9cfe4b8d8078574e0f9184c75b3157d5e` |
| Implementation PR | `#16` |
| Staging-proof candidate | `main@90019f2e51ec170fe6a780ef4fe867127fb3be50` |
| Staging-proof PR | `#17` |
| Additive migration | `202607160001_p2_reviewer_operations.sql` |
| Migration target | Linked staging Supabase project |
| UI state during migration/proof | P2.2 pagination flag OFF; later toggled ON/OFF/ON on the same candidate |
| Evidence window | `2026-07-16T17:57:46Z` through `2026-07-16T18:41:57Z` |

## Pre-migration backup evidence

Logical backup set `pre-p2-2-20260716-175746Z` was created outside the repository. Managed Dashboard backup type was not recorded; the verified logical set is the approved pre-migration recovery artifact for this change.

| File | Bytes | SHA-256 |
|---|---:|---|
| `roles.sql` | 297 | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` |
| `schema.sql` | 80,439 | `C5B782D156D4F8247A4E0F3DAC4CD2D9746AD6F103CB597927FA2DBFA3C90650` |
| `data.sql` | 67,317 | `EE694733CB87AFAE577C705CE240450190DCEE7ACCEA6DA96A9DD2359E20C6C2` |
| `migration-history.sql` | 78,012 | `263B38C2E928BE4ADD30C535A616F7BF79572E32ED5501C5F8DF28DA33EB0A21` |

The backup contents and database credentials are not stored in the repository or CI artifacts.

## Migration evidence

Before apply, remote migration history matched local through `202607150002`. A fresh `supabase db push --dry-run` selected only:

```text
202607160001_p2_reviewer_operations.sql
```

The reviewed push completed successfully. The only messages were expected `DROP ... IF EXISTS` notices for a new constraint and trigger. Post-apply migration history matched local/remote across all eight migrations through `202607160001`.

No schema rollback, destructive table operation, Auth-user deletion, snapshot deletion, event deletion, or browser-storage clearing was performed.

## Transactional staging proof

The first staging replay stopped at the last-active-reviewer assertion because the proof assumed a disposable database with no pre-existing reviewer. Staging correctly had one real active reviewer, so fixture reviewer B was not the last reviewer. The outer transaction aborted, and an immediate residue query confirmed zero fixture Auth users, memberships, submissions, and operation-journal rows.

The proof was corrected to temporarily mark every active membership except fixture reviewer B as revoked inside the existing outer transaction. This isolates the last-reviewer invariant without deleting or permanently changing real memberships; the final `ROLLBACK` restores all membership fields and trigger-updated timestamps.

The corrected staging replay passed:

- least-privilege queue/lifecycle RPC grants;
- denial of direct service-role membership and journal mutation;
- bounded `N+1` immutable queue order and non-overlapping cursor;
- invalid page/cursor and non-reviewer rejection;
- atomic reviewer revoke, claim release, and append-only release event;
- operation-ID idempotency;
- last-active-reviewer guard;
- reviewer restore and released-work reclaim.

Post-proof residue was zero for fixture Auth users, memberships, submissions, and operation rows. The pre-existing staging reviewer count returned to one active membership.

## Rollout, rollback, and restore evidence

The proof correction and this partial evidence record passed protected CI in PR `#17` and were squash-merged as `main@90019f2`. Post-merge Quality, Database integration, Dependency audit, Browser smoke, and Vercel deployment checks passed before the P2.2 flag was enabled.

The dependency flags remained enabled throughout:

```text
NEXT_PUBLIC_P0_LWW_PROGRESS=true
NEXT_PUBLIC_P2_PROJECT_EVIDENCE=true
NEXT_PUBLIC_P2_REVIEW_WORKFLOW=true
```

### Enabled rollout

The exact candidate was deployed with `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=true`. Vercel recorded a successful [enabled deployment](https://vercel.com/phamvantam03tk-4232s-projects/ai-roadmap-path/8wm4WPRhjouca4MieBpLMKKz1B3m) at `2026-07-16T18:22:21Z`.

- Dedicated [`p2-review-ops`](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29523714587): PASS on `90019f2`.
- [`full`](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29523837565): PASS on `90019f2`.
- Pre-rollback aggregate: 1 membership/active reviewer, 3 submissions, 3 workflows, 9 events, and 0 reviewer-operation rows.
- Migration history remained matched across all eight migrations.

### Non-destructive rollback

The same SHA was redeployed with only `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=false`. Vercel recorded the successful [rollback deployment](https://vercel.com/phamvantam03tk-4232s-projects/ai-roadmap-path/EVNMKS247XPzT19yuiHuNDM1YUkt) at `2026-07-16T18:31:18Z`; no database or data rollback was performed.

- [`p2-review-ops-rollback`](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29524313154): PASS.
- The P2.2 pagination controls were absent while the original P2.1 reviewer queue remained usable.
- Post-rollback aggregate exactly matched the pre-rollback baseline: 1 membership/active reviewer, 3 submissions, 3 workflows, 9 events, and 0 reviewer-operation rows.
- All eight migrations remained present and matched local history.

### Restore

The same SHA was restored with `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=true`. Vercel recorded the successful [restore deployment](https://vercel.com/phamvantam03tk-4232s-projects/ai-roadmap-path/ByBiZU8LLj8ih27v4h8q6R3hFz1r) at `2026-07-16T18:39:16Z`.

- Post-restore [`p2-review-ops`](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29524878239): PASS.
- Final aggregate: 1 membership/active reviewer, 4 submissions, 4 workflows, 12 events, and 0 reviewer-operation rows.
- The increase of one immutable submission/workflow and three audit events is the expected replay behavior of the dedicated learner/reviewer canary; no existing row was deleted or overwritten.
- Migration history remained matched through `202607160001`.

## Technical gate summary

| Gate | Result |
|---|---|
| Pre-migration logical backup and SHA-256 record | PASS |
| Dry-run selected only P2.2 migration | PASS |
| Additive migration and 8/8 history match | PASS |
| Transactional security proof and zero fixture residue | PASS |
| Protected implementation/proof CI | PASS |
| Enabled P2.2 dedicated canary | PASS |
| Full regression canary | PASS |
| Flag-only rollback and invariant comparison | PASS |
| Post-restore dedicated canary | PASS |
| Named reviewer-operations usability/release review | PENDING |
| Existing P2/P2.1 content/rubric human reviews | PENDING |

## Remaining release gates

1. Merge this completed technical record through protected CI.
2. Complete a named reviewer-operations usability review covering pagination, inactive-assignee reclaim language, and trusted operator CLI ergonomics.
3. Complete named release approval before broad P2.2 exposure.
4. Keep the independent P2/P2.1 content, rubric, and moderated-usability sign-offs open until their named reviewers approve them.
