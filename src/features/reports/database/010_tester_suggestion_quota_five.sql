-- Apply after 009_tester_suggestion_quota.sql. Preserve existing admitted attempts.
begin;

alter table public.tester_suggestion_quotas
  drop constraint tester_suggestion_quotas_attempts_check;
alter table public.tester_suggestion_quotas
  add constraint tester_suggestion_quotas_attempts_check check (cardinality(attempts) <= 5);

create or replace function public.reserve_tester_suggestion_attempt(p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  window_length constant interval := interval '5 minutes';
  attempt_limit constant integer := 5;
  checked_at timestamptz;
  recent_attempts timestamptz[];
  retry_after_ms bigint;
begin
  perform 1 from public.profiles where id = p_actor_id and role = 'tester' for share;
  if not found then
    raise exception using errcode = 'P2002', message = 'Tester role required';
  end if;

  insert into public.tester_suggestion_quotas (actor_id)
    values (p_actor_id) on conflict (actor_id) do nothing;

  -- Hold the actor's row lock across the read and reservation. Read the clock
  -- after acquiring the lock so time spent waiting does not extend the window.
  select attempts into strict recent_attempts from public.tester_suggestion_quotas
    where actor_id = p_actor_id for update;
  checked_at := pg_catalog.clock_timestamp();

  select array(select attempt from pg_catalog.unnest(recent_attempts) as attempt
    where attempt > checked_at - window_length order by attempt)
    into recent_attempts;

  if cardinality(recent_attempts) >= attempt_limit then
    retry_after_ms := ceil(extract(epoch from recent_attempts[1] + window_length - checked_at) * 1000);
    return jsonb_build_object('allowed', false, 'retryAfterMs', retry_after_ms);
  end if;

  update public.tester_suggestion_quotas
    set attempts = array_append(recent_attempts, checked_at)
    where actor_id = p_actor_id;
  return jsonb_build_object('allowed', true, 'retryAfterMs', 0);
end;
$$;

revoke all on function public.reserve_tester_suggestion_attempt(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_tester_suggestion_attempt(uuid) to service_role;

commit;
