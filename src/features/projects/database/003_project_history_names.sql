-- Apply after 002_projects.sql, to the test project first.
begin;

-- Expose names only for actors in the requested project's history, without
-- broadening the own-profile SELECT policy or storing name snapshots.
create function public.get_project_history(p_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  actor_id uuid,
  occurred_at timestamptz,
  event text,
  changes jsonb,
  actor_display_name text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode = 'P1001', message = 'Authentication required'; end if;
  if not exists(select 1 from public.profiles as profile where profile.id = actor) then
    raise exception using errcode = 'P1002', message = 'Profile required';
  end if;
  if not exists(select 1 from public.projects as project where project.id = p_project_id) then
    raise exception using errcode = 'P1005', message = 'Project not found';
  end if;

  return query
    select history.id, history.project_id, history.actor_id, history.occurred_at,
      history.event, history.changes, nullif(public.project_trim(profile.display_name), '')
    from public.project_history as history
    left join public.profiles as profile on profile.id = history.actor_id
    where history.project_id = p_project_id
    order by history.occurred_at, history.id;
end;
$$;

revoke all on function public.get_project_history(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_project_history(uuid) to authenticated;

commit;
