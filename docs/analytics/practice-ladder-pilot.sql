-- Practice Ladder pilot funnel.
-- The default pilot cohort intentionally excludes events originating while
-- anonymous; it measures learners who were authenticated at event creation.

with authenticated_events as (
  select
    user_id,
    challenge_id,
    content_version,
    event_type,
    step,
    hint_level,
    passed,
    occurred_at
  from public.practice_events
  where origin = 'authenticated'
),
per_learner_challenge as (
  select
    user_id,
    challenge_id,
    content_version,
    bool_or(event_type = 'challenge_started') as started,
    bool_or(event_type = 'step_completed' and step = 'scaffold' and passed is true) as scaffold_passed,
    bool_or(event_type = 'submit') as submitted,
    bool_or(event_type = 'challenge_passed' and passed is true) as challenge_passed,
    bool_or(event_type = 'transfer_passed' and passed is true) as transfer_passed,
    bool_or(event_type = 'walkthrough_opened') as walkthrough_opened,
    coalesce(max(hint_level) filter (where event_type = 'hint_opened'), 0) as highest_hint
  from authenticated_events
  group by user_id, challenge_id, content_version
),
classified as (
  select *,
    case
      when challenge_passed and not walkthrough_opened and highest_hint = 0 then 'strict_independent'
      when challenge_passed and not walkthrough_opened and highest_hint in (1, 2) then 'assisted'
      when challenge_passed then 'guided'
      else 'not_passed'
    end as outcome
  from per_learner_challenge
)
select
  challenge_id,
  content_version,
  count(*) filter (where started) as learners_started,
  count(*) filter (where scaffold_passed) as learners_scaffold_passed,
  count(*) filter (where submitted) as learners_submitted,
  count(*) filter (where challenge_passed) as learners_passed,
  count(*) filter (where outcome in ('strict_independent', 'assisted')) as learners_independent_before_hint_3,
  count(*) filter (where outcome = 'strict_independent') as learners_strict_independent,
  count(*) filter (where outcome = 'assisted') as learners_assisted,
  count(*) filter (where outcome = 'guided') as learners_guided,
  count(*) filter (where transfer_passed) as learners_transfer_passed,
  round(
    100.0 * count(*) filter (where outcome in ('strict_independent', 'assisted')) /
    nullif(count(*) filter (where submitted), 0),
    1
  ) as independent_challenge_pass_rate_pct
from classified
group by challenge_id, content_version
order by challenge_id, content_version;
