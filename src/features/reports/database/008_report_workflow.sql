-- Apply after 007_report_drafts.sql. Deploy extended readers before enabling workflow actions.
begin;

alter table public.reports add column assigned_at timestamptz;
alter table public.reports drop constraint reports_state_check;
alter table public.reports drop constraint reports_assigned_developer_id_check;
alter table public.reports add constraint reports_workflow_check check (
  (state = 'Open' and assigned_developer_id is null and assigned_at is null)
  or (state in ('Accepted', 'In progress') and assigned_developer_id is not null and assigned_at is not null)
);
alter table public.report_history drop constraint report_history_event_check;
alter table public.report_history add constraint report_history_event_check
  check (event in ('created', 'accepted', 'investigation_started'));

create or replace function public.get_report(p_report_id uuid) returns jsonb
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
    'reporter_username', profile.username, 'reporter_display_name', profile.display_name,
    'assigned_developer_username', assignee.username, 'assigned_developer_display_name', assignee.display_name)
  into result
  from public.reports r
  join public.projects p on p.id = r.project_id
  join public.profiles profile on profile.id = r.reporter_id
  left join public.profiles assignee on assignee.id = r.assigned_developer_id
  where r.id = p_report_id;
  return result;
end;
$$;


-- Return type gains scoped identity labels; recreate because OUT columns change.
drop function public.get_report_history(uuid);
create function public.get_report_history(p_report_id uuid)
returns table (
  id uuid, report_id uuid, actor_id uuid, actor_display_name text, actor_username text,
  occurred_at timestamptz, event text, changes jsonb,
  assigned_developer_username text, assigned_developer_display_name text
)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = actor) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  if not exists (select 1 from public.reports r where r.id = p_report_id) then
    raise exception using errcode = 'P2005', message = 'Report not found';
  end if;
  return query
  select h.id, h.report_id, h.actor_id, p.display_name, p.username, h.occurred_at, h.event, h.changes,
    assignee.username, assignee.display_name
  from public.report_history h
  left join public.profiles p on p.id = h.actor_id
  left join public.profiles assignee on h.event = 'accepted'
    and assignee.id = (h.changes->'assigned_developer_id'->>'after')::uuid
  where h.report_id = p_report_id
  order by h.occurred_at, h.id;
end;
$$;

create or replace function public.create_report(
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

  return public.get_report(saved.id);
end;
$$;


create or replace function public.list_project_reports(
  p_project_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  selected_name text;
begin
  if actor is null then
    raise exception using errcode = 'P2001', message = 'Authentication required';
  end if;
  if not exists (select 1 from public.profiles p where p.id = actor) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception using errcode = 'P2003', message = 'Incomplete report cursor';
  end if;

  select p.name into selected_name from public.projects p where p.id = p_project_id;
  if not found then
    raise exception using errcode = 'P2005', message = 'Project not found';
  end if;

  -- Return one bounded JSON value so API row limits cannot truncate the page.
  return (
    select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
    from (
      select r.id, r.project_id, r.title, selected_name as project_name, r.severity, r.state,
        r.assigned_developer_id, assignee.username as assigned_developer_username,
        assignee.display_name as assigned_developer_display_name, p.display_name as reporter_display_name, r.created_at
      from public.reports r
      join public.profiles p on p.id = r.reporter_id
      left join public.profiles assignee on assignee.id = r.assigned_developer_id
      where r.project_id = p_project_id
        and (p_before_created_at is null or (r.created_at, r.id) < (p_before_created_at, p_before_id))
      order by r.created_at desc, r.id desc
      limit 100
    ) page
  );
end;
$$;


create function public.accept_report(p_report_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  project uuid;
  archived timestamptz;
  saved public.reports%rowtype;
  action_at timestamptz;
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = actor and role = 'developer') then
    raise exception using errcode = 'P2002', message = 'Developer role required';
  end if;
  select project_id into project from public.reports where id = p_report_id;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  -- Both actions lock project first, then report. Project lock serializes archival and workflow.
  select archived_at into archived from public.projects where id = project for update;
  if not found then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
  if archived is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
  select * into saved from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  if saved.assigned_developer_id is not null then
    raise exception using errcode = 'P2006', message = 'Report is already assigned';
  end if;
  if saved.state <> 'Open' then raise exception using errcode = 'P2007', message = 'Report state has changed'; end if;
  action_at := clock_timestamp();
  update public.reports set state = 'Accepted', assigned_developer_id = actor,
    assigned_at = action_at, updated_at = action_at where id = p_report_id;
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'accepted', jsonb_build_object(
    'state', jsonb_build_object('before', 'Open', 'after', 'Accepted'),
    'assigned_developer_id', jsonb_build_object('before', null, 'after', actor),
    'assigned_at', jsonb_build_object('before', null, 'after', action_at)));
  return public.get_report(p_report_id);
end;
$$;

create function public.start_report_investigation(p_report_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  project uuid;
  archived timestamptz;
  saved public.reports%rowtype;
  action_at timestamptz;
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = actor and role = 'developer') then
    raise exception using errcode = 'P2002', message = 'Developer role required';
  end if;
  select project_id into project from public.reports where id = p_report_id;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  select archived_at into archived from public.projects where id = project for update;
  if not found then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
  if archived is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
  select * into saved from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  if saved.state <> 'Accepted' then raise exception using errcode = 'P2007', message = 'Report state has changed'; end if;
  if saved.assigned_developer_id <> actor then
    raise exception using errcode = 'P2002', message = 'Assigned Developer required';
  end if;
  action_at := clock_timestamp();
  update public.reports set state = 'In progress', updated_at = action_at where id = p_report_id;
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'investigation_started', jsonb_build_object(
    'state', jsonb_build_object('before', 'Accepted', 'after', 'In progress')));
  return public.get_report(p_report_id);
end;
$$;

-- Retain the existing direct-write boundary and authenticated-only RPC grants.
revoke insert, update, delete on public.reports, public.report_history from public, anon, authenticated;
revoke all on function public.accept_report(uuid), public.start_report_investigation(uuid),
  public.get_report_history(uuid) from public, anon, authenticated, service_role;
grant execute on function public.accept_report(uuid), public.start_report_investigation(uuid),
  public.get_report_history(uuid) to authenticated;

commit;
