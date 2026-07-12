-- Correct the execution mode of RPCs introduced in 202607110001.
-- The original migration was already applied while these functions were
-- security invoker, which prevents their intended writes under RLS.

alter function public.apply_progress_item_mutations(bigint, jsonb) security definer;
alter function public.append_practice_events(bigint, jsonb) security definer;
alter function public.reset_learning_progress(bigint) security definer;

alter function public.apply_progress_item_mutations(bigint, jsonb)
  set search_path = public, pg_temp;
alter function public.append_practice_events(bigint, jsonb)
  set search_path = public, pg_temp;
alter function public.reset_learning_progress(bigint)
  set search_path = public, pg_temp;
