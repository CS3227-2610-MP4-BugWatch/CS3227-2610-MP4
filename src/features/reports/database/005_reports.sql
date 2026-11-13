-- Apply after profiles and project migrations 001–004.
begin;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  title text not null check (title = public.project_trim(title) and char_length(title) between 1 and 200),
  description text not null check (description = public.project_trim(description) and char_length(description) between 1 and 5000),
  version text not null check (version = public.project_trim(version) and char_length(version) between 1 and 100),
  reproduction_steps text not null check (reproduction_steps = public.project_trim(reproduction_steps) and char_length(reproduction_steps) between 1 and 5000),
  expected_results text not null check (expected_results = public.project_trim(expected_results) and char_length(expected_results) between 1 and 5000),
  actual_results text not null check (actual_results = public.project_trim(actual_results) and char_length(actual_results) between 1 and 5000),
  test_environment text not null default '' check (test_environment = public.project_trim(test_environment) and char_length(test_environment) between 0 and 1000),
  severity text not null check (severity in ('very_low', 'low', 'medium', 'high')),
  reporter_id uuid not null references public.profiles(id),
  state text not null default 'Open' check (state = 'Open'),
  assigned_developer_id uuid references public.profiles(id) check (assigned_developer_id is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  actor_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null,
  event text not null check (event = 'created'),
  changes jsonb not null check (jsonb_typeof(changes) = 'object')
);

create index report_history_report_time_idx on public.report_history(report_id, occurred_at, id);

alter table public.reports enable row level security;
alter table public.report_history enable row level security;
revoke all on public.reports, public.report_history from public, anon, authenticated;
grant select on public.reports, public.report_history to authenticated;
grant all on public.reports, public.report_history to service_role;

create policy reports_read_with_profile on public.reports for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid())));
create policy report_history_read_with_profile on public.report_history for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid())));

create function public.get_report(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result jsonb;
begin
  if actor is null then
    raise exception using errcode = 'P2001', message = 'Authentication required';
  end if;
  if not exists (select 1 from public.profiles where id = actor) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;

  select to_jsonb(r) || jsonb_build_object(
    'project_name', p.name, 'project_archived_at', p.archived_at,
    'reporter_username', profile.username, 'reporter_display_name', profile.display_name)
  into result
  from public.reports r
  join public.projects p on p.id = r.project_id
  join public.profiles profile on profile.id = r.reporter_id
  where r.id = p_report_id;
  return result;
end;
$$;

create function public.get_report_history(p_report_id uuid)
returns table (
  id uuid, report_id uuid, actor_id uuid, actor_display_name text,
  occurred_at timestamptz, event text, changes jsonb
)
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception using errcode = 'P2001', message = 'Authentication required';
  end if;
  if not exists (select 1 from public.profiles p where p.id = actor) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  if not exists (select 1 from public.reports r where r.id = p_report_id) then
    raise exception using errcode = 'P2005', message = 'Report not found';
  end if;

  return query
  select h.id, h.report_id, h.actor_id, p.display_name, h.occurred_at, h.event, h.changes
  from public.report_history h
  join public.profiles p on p.id = h.actor_id
  where h.report_id = p_report_id
  order by h.occurred_at, h.id;
end;
$$;

create function public.create_report(
  p_project_id uuid, p_title text, p_description text, p_version text, p_reproduction_steps text, p_expected_results text, p_actual_results text, p_severity text, p_test_environment text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reporter public.profiles%rowtype;
  selected_project public.projects%rowtype;
  saved public.reports%rowtype;
  submitted_at timestamptz := now();
  initial_values jsonb;
  invalid_field text;
begin
  if actor is null then
    raise exception using errcode = 'P2001', message = 'Authentication required';
  end if;
  select * into reporter from public.profiles where id = actor and role = 'tester';
  if not found then
    raise exception using errcode = 'P2002', message = 'Tester role required';
  end if;

  p_title := public.project_trim(p_title);
  p_description := public.project_trim(p_description);
  p_version := public.project_trim(p_version);
  p_reproduction_steps := public.project_trim(p_reproduction_steps);
  p_expected_results := public.project_trim(p_expected_results);
  p_actual_results := public.project_trim(p_actual_results);
  p_test_environment := coalesce(public.project_trim(p_test_environment), '');
  invalid_field := case
    when p_project_id is null then 'project_id'
    when p_title is null or char_length(p_title) not between 1 and 200 then 'title'
    when p_description is null or char_length(p_description) not between 1 and 5000 then 'description'
    when p_version is null or char_length(p_version) not between 1 and 100 then 'version'
    when p_reproduction_steps is null or char_length(p_reproduction_steps) not between 1 and 5000 then 'reproduction_steps'
    when p_expected_results is null or char_length(p_expected_results) not between 1 and 5000 then 'expected_results'
    when p_actual_results is null or char_length(p_actual_results) not between 1 and 5000 then 'actual_results'
    when char_length(p_test_environment) > 1000 then 'test_environment'
    when p_severity is null or p_severity not in ('very_low', 'low', 'medium', 'high') then 'severity'
  end;
  if invalid_field is not null then
    raise exception using errcode = 'P2003', message = 'Invalid report field', detail = invalid_field;
  end if;

  -- Serialize with changes that archive this project.
  select * into selected_project from public.projects where id = p_project_id for share;
  if not found then
    raise exception using errcode = 'P2005', message = 'Project not found';
  end if;
  if selected_project.archived_at is not null then
    raise exception using errcode = 'P2004', message = 'Project is archived';
  end if;

  insert into public.reports (project_id, title, description, version, reproduction_steps, expected_results, actual_results, severity, test_environment, reporter_id, created_at, updated_at)
  values (p_project_id, p_title, p_description, p_version, p_reproduction_steps, p_expected_results, p_actual_results, p_severity, p_test_environment, actor, submitted_at, submitted_at)
  returning * into saved;

  select jsonb_object_agg(field, jsonb_build_object('before', null, 'after', value))
  into initial_values
  from jsonb_each(to_jsonb(saved)) as input(field, value)
  where field in ('project_id', 'title', 'description', 'version', 'reproduction_steps', 'expected_results', 'actual_results', 'severity', 'test_environment');
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (saved.id, actor, submitted_at, 'created', initial_values);

  return to_jsonb(saved) || jsonb_build_object(
    'project_name', selected_project.name, 'project_archived_at', selected_project.archived_at,
    'reporter_username', reporter.username, 'reporter_display_name', reporter.display_name);
end;
$$;

revoke all on function public.create_report(uuid,text,text,text,text,text,text,text,text), public.get_report(uuid),
  public.get_report_history(uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_report(uuid,text,text,text,text,text,text,text,text), public.get_report(uuid),
  public.get_report_history(uuid) to authenticated;

commit;
