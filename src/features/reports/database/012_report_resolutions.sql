-- Apply after 011_report_clarification_discussion.sql. Release compatible readers first;
-- enable these mutation grants/UI only after isolated verification and the schema rollout.
begin;

alter table public.reports
  add column canonical_report_id uuid,
  add column resolution_kind text,
  add column fix_summary text,
  add column affected_version text,
  add column commit_url text,
  add column pull_request_url text,
  add column resolution_explanation text,
  add column resolution_canonical_report_id uuid,
  add column resolution_author_id uuid references public.profiles(id),
  add column resolved_at timestamptz,
  add constraint reports_project_id_id_key unique (project_id, id),
  add constraint reports_canonical_same_project foreign key (project_id, canonical_report_id) references public.reports(project_id, id),
  add constraint reports_resolution_canonical_same_project foreign key (project_id, resolution_canonical_report_id) references public.reports(project_id, id),
  add constraint reports_canonical_not_self check (canonical_report_id <> id and resolution_canonical_report_id <> id);

alter table public.reports drop constraint reports_workflow_check;
alter table public.reports add constraint reports_workflow_check check (
  (state = 'Open' and assigned_developer_id is null and assigned_at is null)
  or (state in ('Accepted', 'In progress', 'Awaiting tester information', 'Resolved', 'Closed')
    and assigned_developer_id is not null and assigned_at is not null)
);
alter table public.reports add constraint reports_resolution_check check (
  (state not in ('Resolved', 'Closed') and resolution_kind is null and fix_summary is null
    and affected_version is null and commit_url is null and pull_request_url is null
    and resolution_explanation is null and resolution_canonical_report_id is null
    and resolution_author_id is null and resolved_at is null)
  or (state in ('Resolved', 'Closed') and resolution_kind is not null
    and resolution_author_id is not null and resolution_author_id = assigned_developer_id and resolved_at is not null
    and (
      (resolution_kind = 'fixed' and fix_summary is not null and affected_version is not null
        and commit_url is not null and pull_request_url is not null
        and fix_summary = public.project_trim(fix_summary) and char_length(fix_summary) between 1 and 5000
        and affected_version = public.project_trim(affected_version) and char_length(affected_version) between 1 and 100
        and commit_url = public.project_trim(commit_url) and public.project_repository_url_valid(commit_url)
        and pull_request_url = public.project_trim(pull_request_url) and public.project_repository_url_valid(pull_request_url)
        and resolution_explanation is null and resolution_canonical_report_id is null)
      or (resolution_kind in ('duplicate', 'invalid', 'cannot_reproduce', 'will_not_fix')
        and resolution_explanation is not null and resolution_explanation = public.project_trim(resolution_explanation)
        and char_length(resolution_explanation) between 1 and 5000
        and fix_summary is null and affected_version is null and commit_url is null and pull_request_url is null
        and ((resolution_kind = 'duplicate' and resolution_canonical_report_id is not null and canonical_report_id is not null)
          or (resolution_kind <> 'duplicate' and resolution_canonical_report_id is null)))
    ))
);

alter table public.report_history drop constraint report_history_event_check;
alter table public.report_history add constraint report_history_event_check check (
  event in ('created', 'accepted', 'investigation_started', 'tester_information_requested', 'investigation_resumed', 'resolved', 'duplicate_linked')
);

create or replace function public.get_report(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = actor and role in ('tester', 'developer')) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  select to_jsonb(r) || jsonb_build_object(
    'project_name', p.name, 'project_archived_at', p.archived_at,
    'reporter_username', reporter.username, 'reporter_display_name', reporter.display_name,
    'assigned_developer_username', assignee.username, 'assigned_developer_display_name', assignee.display_name,
    'canonical_report', case when canonical.id is null then null else jsonb_build_object('id', canonical.id, 'title', canonical.title) end,
    'resolution', case when r.resolution_kind is null then null else
      jsonb_build_object('kind', r.resolution_kind, 'author_id', r.resolution_author_id,
        'author_username', author.username, 'author_display_name', author.display_name, 'resolved_at', r.resolved_at)
      || case when r.resolution_kind = 'fixed' then jsonb_build_object('fix_summary', r.fix_summary,
        'affected_version', r.affected_version, 'commit_url', r.commit_url, 'pull_request_url', r.pull_request_url)
        else jsonb_build_object('explanation', r.resolution_explanation)
          || case when r.resolution_kind = 'duplicate' then jsonb_build_object('canonical_report_id', r.resolution_canonical_report_id)
            else '{}'::jsonb end end end)
  into result
  from public.reports r
  join public.projects p on p.id = r.project_id
  join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles assignee on assignee.id = r.assigned_developer_id
  left join public.profiles author on author.id = r.resolution_author_id
  left join public.reports canonical on canonical.project_id = r.project_id and canonical.id = r.canonical_report_id
  where r.id = p_report_id;
  return result;
end;
$$;

-- Existing get_report_history returns scoped envelopes and arbitrary known-event changes;
-- no OUT columns or identity-directory grants need changing for the two additive events.
create function public.resolve_report(p_report_id uuid, p_resolution jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  project uuid; archived timestamptz; saved public.reports%rowtype;
  action_at timestamptz; kind text; field text; value text; normalized jsonb := '{}'::jsonb;
  allowed text[]; target uuid; result jsonb;
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
  if saved.assigned_developer_id is distinct from actor then raise exception using errcode = 'P2002', message = 'Assigned Developer required'; end if;
  if saved.state <> 'In progress' then raise exception using errcode = 'P2007', message = 'Report state has changed'; end if;
  if p_resolution is null or jsonb_typeof(p_resolution) <> 'object' or jsonb_typeof(p_resolution->'kind') is distinct from 'string' then
    raise exception using errcode = 'P2003', message = 'Invalid resolution outcome', detail = 'kind';
  end if;
  kind := p_resolution->>'kind';
  if kind not in ('fixed', 'duplicate', 'invalid', 'cannot_reproduce', 'will_not_fix') then
    raise exception using errcode = 'P2003', message = 'Invalid resolution outcome', detail = 'kind';
  end if;
  allowed := case when kind = 'fixed' then array['kind', 'fix_summary', 'affected_version', 'commit_url', 'pull_request_url']
    when kind = 'duplicate' then array['kind', 'explanation', 'canonical_report_id'] else array['kind', 'explanation'] end;
  if exists (select 1 from jsonb_object_keys(p_resolution) k where not (k = any(allowed))) then
    raise exception using errcode = 'P2003', message = 'Inapplicable resolution field', detail = 'kind';
  end if;
  foreach field in array allowed loop
    if jsonb_typeof(p_resolution->field) is distinct from 'string' then
      raise exception using errcode = 'P2003', message = 'Resolution field must be text', detail = field;
    end if;
    value := public.project_trim(p_resolution->>field);
    if value = '' or (field in ('fix_summary', 'explanation') and char_length(value) > 5000)
      or (field = 'affected_version' and char_length(value) > 100)
      or (field in ('commit_url', 'pull_request_url') and not public.project_repository_url_valid(value)) then
      raise exception using errcode = 'P2003', message = 'Invalid resolution field', detail = field;
    end if;
    normalized := normalized || jsonb_build_object(field, value);
  end loop;
  if kind = 'duplicate' then
    if normalized->>'canonical_report_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode = 'P2003', message = 'Invalid canonical report', detail = 'canonical_report_id';
    end if;
    target := (normalized->>'canonical_report_id')::uuid;
    if saved.canonical_report_id is null or target = p_report_id or not exists (
      select 1 from public.reports where id = target and project_id = project
    ) then raise exception using errcode = 'P2003', message = 'Save a valid canonical link first', detail = 'canonical_report_id'; end if;
    if saved.canonical_report_id <> target then raise exception using errcode = 'P2007', message = 'Canonical link has changed'; end if;
  end if;
  action_at := clock_timestamp();
  update public.reports set state = 'Resolved', resolution_kind = kind,
    fix_summary = normalized->>'fix_summary', affected_version = normalized->>'affected_version',
    commit_url = normalized->>'commit_url', pull_request_url = normalized->>'pull_request_url',
    resolution_explanation = normalized->>'explanation', resolution_canonical_report_id = target,
    resolution_author_id = actor, resolved_at = action_at, updated_at = action_at where id = p_report_id;
  result := public.get_report(p_report_id);
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'resolved', jsonb_build_object(
    'state', jsonb_build_object('before', 'In progress', 'after', 'Resolved'),
    'resolution', jsonb_build_object('before', null, 'after', result->'resolution')));
  return result;
end;
$$;

create function public.link_duplicate_report(p_report_id uuid, p_canonical_report_id uuid, p_expected_canonical_report_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); project uuid; archived timestamptz; saved public.reports%rowtype; action_at timestamptz;
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
  if saved.assigned_developer_id is distinct from actor then raise exception using errcode = 'P2002', message = 'Assigned Developer required'; end if;
  if p_canonical_report_id is null or p_canonical_report_id = p_report_id or not exists (
    select 1 from public.reports where id = p_canonical_report_id and project_id = project
  ) then raise exception using errcode = 'P2003', message = 'Invalid canonical report', detail = 'canonical_report_id'; end if;
  -- Repeating a persisted link is a true no-op, even from a stale initial view.
  if saved.canonical_report_id = p_canonical_report_id then return public.get_report(p_report_id); end if;
  if saved.canonical_report_id is distinct from p_expected_canonical_report_id then
    raise exception using errcode = 'P2007', message = 'Canonical link has changed';
  end if;
  action_at := clock_timestamp();
  update public.reports set canonical_report_id = p_canonical_report_id, updated_at = action_at where id = p_report_id;
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'duplicate_linked', jsonb_build_object('canonical_report_id',
    jsonb_build_object('before', saved.canonical_report_id, 'after', p_canonical_report_id)));
  return public.get_report(p_report_id);
end;
$$;

revoke insert, update, delete on public.reports, public.report_history from public, anon, authenticated;
revoke all on function public.resolve_report(uuid,jsonb), public.link_duplicate_report(uuid,uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_report(uuid,jsonb), public.link_duplicate_report(uuid,uuid,uuid) to authenticated;

commit;
