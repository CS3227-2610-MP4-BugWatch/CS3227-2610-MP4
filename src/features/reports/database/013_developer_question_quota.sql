-- Apply after the existing report migrations. 012 is reserved by another feature.
begin;

create table public.developer_question_quotas (
  actor_id uuid primary key references public.profiles(id) on delete cascade,
  attempts timestamptz[] not null default '{}',
  check (cardinality(attempts) <= 5)
);

alter table public.developer_question_quotas enable row level security;
revoke all on public.developer_question_quotas from public, anon, authenticated, service_role;

create function public.reserve_developer_question_attempt(p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  window_length constant interval := interval '5 minutes';
  attempt_limit constant integer := 5;
  checked_at timestamptz;
  recent_attempts timestamptz[];
  retry_after_ms bigint;
begin
  perform 1 from public.profiles where id = p_actor_id and role = 'developer' for share;
  if not found then
    raise exception using errcode = 'P2002', message = 'Developer role required';
  end if;

  insert into public.developer_question_quotas (actor_id)
    values (p_actor_id) on conflict (actor_id) do nothing;
  -- Serialize reservations for this actor; server time is read after acquiring the lock.
  select attempts into strict recent_attempts from public.developer_question_quotas
    where actor_id = p_actor_id for update;
  checked_at := pg_catalog.clock_timestamp();

  select array(select attempt from pg_catalog.unnest(recent_attempts) as attempt
    where attempt > checked_at - window_length order by attempt)
    into recent_attempts;

  if cardinality(recent_attempts) >= attempt_limit then
    retry_after_ms := ceil(extract(epoch from recent_attempts[1] + window_length - checked_at) * 1000);
    return jsonb_build_object('allowed', false, 'retryAfterMs', retry_after_ms);
  end if;
  update public.developer_question_quotas
    set attempts = array_append(recent_attempts, checked_at) where actor_id = p_actor_id;
  return jsonb_build_object('allowed', true, 'retryAfterMs', 0);
end;
$$;

revoke all on function public.reserve_developer_question_attempt(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_developer_question_attempt(uuid) to service_role;

commit;
