# P2.2 Reviewer Operations Staging Verification — 2026-07-17

## Status

**Staging backup, additive migration, and corrected transactional security proof are complete. UI rollout, dedicated/full canaries, rollback/restore rehearsal, and human sign-off remain pending.**

This record is not a broad-release approval. P2/P2.1 content, rubric, and usability sign-offs remain separate open gates.

## Candidate and environment

| Field | Value |
|---|---|
| Merged implementation | `main@ab20e3a9cfe4b8d8078574e0f9184c75b3157d5e` |
| Implementation PR | `#16` |
| Additive migration | `202607160001_p2_reviewer_operations.sql` |
| Migration target | Linked staging Supabase project |
| UI state during migration/proof | P2.2 pagination flag OFF |
| Evidence window | `2026-07-16T17:57:46Z` through `2026-07-16T18:05:09Z` |

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

## Remaining rollout gates

1. Merge the fixture-isolation proof correction through protected CI.
2. Deploy the exact merged SHA with `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=true` while LWW, P2 evidence, and P2.1 review remain enabled.
3. Run `p2-review-ops`, then `full`, and retain sanitized evidence.
4. Redeploy the same SHA with only P2.2 pagination disabled and run `p2-review-ops-rollback`.
5. Confirm all eight migrations and existing submission/reviewer history remain intact.
6. Restore only the P2.2 flag and rerun `p2-review-ops`.
7. Complete named reviewer-operations usability and release sign-off before broad exposure.
