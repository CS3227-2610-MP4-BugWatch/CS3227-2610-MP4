-- Apply after 013_developer_question_quota.sql. Enable UI only with compatible readers.
begin;

alter table public.reports add column severity_revision bigint not null default 0 check (severity_revision >= 0);
alter table public.reports add column severity_actor_role text check (severity_actor_role in ('tester', 'developer'));
create function public.track_report_severity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.severity is distinct from old.severity then
    new.severity_revision := old.severity_revision + 1;
    select p.role into new.severity_actor_role from public.profiles p where p.id = auth.uid();
  else
    new.severity_revision := old.severity_revision;
    new.severity_actor_role := old.severity_actor_role;
  end if;
  return new;
end;
$$;
create trigger reports_severity_revision before update on public.reports
for each row execute function public.track_report_severity();
revoke all on function public.track_report_severity() from public, anon, authenticated, service_role;

alter table public.report_history drop constraint report_history_event_check;
alter table public.report_history add constraint report_history_event_check check
(event in ('created', 'accepted', 'investigation_started', 'tester_information_requested', 'investigation_resumed', 'resolved', 'duplicate_linked', 'report_edited'));
alter table public.report_history add column project_names jsonb;

create table public.mailbox_items (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  report_id uuid not null references public.reports(id),
  actor_id uuid not null references public.profiles(id),
  report_title text not null,
  changed_fields jsonb not null check (jsonb_typeof(changed_fields) = 'array' and jsonb_array_length(changed_fields) > 0),
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz
);
create index mailbox_recipient_time_idx on public.mailbox_items(recipient_id, created_at desc, id desc);
create table public.report_edit_receipts (
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  report_id uuid not null references public.reports(id),
  payload jsonb not null,
  result jsonb not null,
  primary key(actor_id, request_id)
);
alter table public.mailbox_items enable row level security;
alter table public.report_edit_receipts enable row level security;
revoke all on public.mailbox_items, public.report_edit_receipts from public, anon, authenticated;
grant all on public.mailbox_items, public.report_edit_receipts to service_role;

create function public.edit_report(p_report_id uuid, p_input jsonb, p_expected_severity_revision bigint, p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  source_project uuid;
  destination uuid;
  saved public.reports%rowtype;
  receipt public.report_edit_receipts%rowtype;
  normalized jsonb := '{}'::jsonb;
  payload jsonb;
  changed jsonb := '{}'::jsonb;
  changed_keys jsonb := '[]'::jsonb;
  field text;
  db_field text;
  value text;
  field_limit integer;
  old_value text;
  project_row public.projects%rowtype;
  source_name text;
  destination_name text;
  result jsonb;
  action_at timestamptz;
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = actor and role = 'tester') then
    raise exception using errcode = 'P2002', message = 'Tester required';
  end if;
  if p_request_id is null or p_expected_severity_revision is null or p_expected_severity_revision < 0
    or p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = 'P2003', message = 'Invalid edit request';
  end if;
  if exists (select 1 from jsonb_object_keys(p_input) k where k not in
    ('projectId','title','description','version','reproductionSteps','expectedResults','actualResults','severity','testEnvironment')) then
    raise exception using errcode = 'P2003', message = 'Protected or unknown field';
  end if;
  foreach field in array array['projectId','title','description','version','reproductionSteps','expectedResults','actualResults','severity','testEnvironment'] loop
    db_field := case field when 'projectId' then 'project_id' when 'reproductionSteps' then 'reproduction_steps'
      when 'expectedResults' then 'expected_results' when 'actualResults' then 'actual_results' when 'testEnvironment' then 'test_environment' else field end;
    if field = 'testEnvironment' and not (p_input ? field) then value := '';
    elsif jsonb_typeof(p_input->field) is distinct from 'string' then
      raise exception using errcode = 'P2003', message = 'Invalid report field', detail = db_field;
    else value := p_input->>field; end if;
    if field not in ('projectId', 'severity') then value := public.project_trim(value); end if;
    field_limit := case field when 'title' then 200 when 'version' then 100 when 'testEnvironment' then 1000 else 5000 end;
    if field = 'projectId' then
      if value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception using errcode = 'P2003', message = 'Invalid project', detail = db_field;
      end if;
      destination := value::uuid;
      value := destination::text;
    elsif field = 'severity' then
      if value not in ('very_low','low','medium','high') then raise exception using errcode = 'P2003', message = 'Invalid severity', detail = db_field; end if;
    elsif char_length(value) > field_limit or (field <> 'testEnvironment' and char_length(value) = 0) then
      raise exception using errcode = 'P2003', message = 'Invalid report field', detail = db_field;
    end if;
    normalized := normalized || jsonb_build_object(db_field, value);
  end loop;
  payload := jsonb_build_object('input', normalized, 'expectedSeverityRevision', p_expected_severity_revision);
  -- Serialize request IDs before report/project locks, including concurrent matching retries.
  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_request_id::text, 0));
  select * into receipt from public.report_edit_receipts where actor_id = actor and request_id = p_request_id;
  if found then
    if receipt.report_id <> p_report_id or receipt.payload <> payload then raise exception using errcode = 'P2003', message = 'Request ID already used'; end if;
  end if;
  select project_id into source_project from public.reports where id = p_report_id;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  -- Match all workflow mutations: projects first, report second; inverse moves lock in UUID order.
  for project_row in select * from public.projects where id in (source_project, destination) order by id for update loop
    if project_row.archived_at is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
    if project_row.id = source_project then source_name := project_row.name; end if;
    if project_row.id = destination then destination_name := project_row.name; end if;
  end loop;
  if source_name is null or destination_name is null then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
  select * into saved from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  if saved.project_id <> source_project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
  if saved.reporter_id <> actor then raise exception using errcode = 'P2002', message = 'Original Tester required'; end if;
  if saved.state not in ('Open','Accepted','In progress','Awaiting tester information') then raise exception using errcode = 'P2007', message = 'Report is read only'; end if;
  -- A receipt preserves the original result, but never bypasses current locked authorization.
  -- Its original severity revision may be older precisely because that save already committed.
  if receipt.request_id is not null then return receipt.result; end if;
  -- Project locks serialize link/resolution writers with moves, including incoming references.
  -- Captured resolution references remain immutable even when the current link changes.
  if destination <> source_project and (
    saved.canonical_report_id is not null or saved.resolution_canonical_report_id is not null
    or exists (select 1 from public.reports r where r.canonical_report_id = p_report_id
      or r.resolution_canonical_report_id = p_report_id)
  ) then raise exception using errcode = 'P2011', message = 'Duplicate-linked reports must stay in their current project'; end if;
  if saved.severity_revision <> p_expected_severity_revision then
    raise exception using errcode = 'P2010', message = 'Severity changed', detail = jsonb_build_object(
      'latestSeverity', saved.severity, 'latestSeverityRevision', saved.severity_revision, 'actorRole', saved.severity_actor_role)::text;
  end if;
  for db_field, value in select key, val from jsonb_each_text(normalized) as fields(key,val) loop
    old_value := to_jsonb(saved)->>db_field;
    if old_value is distinct from value then
      changed := changed || jsonb_build_object(db_field, jsonb_build_object('before', old_value, 'after', value));
      field := case db_field when 'project_id' then 'projectId' when 'reproduction_steps' then 'reproductionSteps'
        when 'expected_results' then 'expectedResults' when 'actual_results' then 'actualResults' when 'test_environment' then 'testEnvironment' else db_field end;
      changed_keys := changed_keys || jsonb_build_array(field);
    end if;
  end loop;
  if changed = '{}'::jsonb then result := jsonb_build_object('outcome','unchanged','report',public.get_report(p_report_id));
  else
    action_at := clock_timestamp();
    update public.reports set project_id = destination, title = normalized->>'title', description = normalized->>'description',
      version = normalized->>'version', reproduction_steps = normalized->>'reproduction_steps', expected_results = normalized->>'expected_results',
      actual_results = normalized->>'actual_results', severity = normalized->>'severity', test_environment = normalized->>'test_environment', updated_at = action_at
    where id = p_report_id;
    insert into public.report_history(report_id,actor_id,occurred_at,event,changes,project_names)
    values(p_report_id,actor,action_at,'report_edited',changed,
      case when changed ? 'project_id' then jsonb_build_object('before',source_name,'after',destination_name) else null end);
    if saved.assigned_developer_id is not null then
      insert into public.mailbox_items(recipient_id,report_id,actor_id,report_title,changed_fields,created_at)
      values(saved.assigned_developer_id,p_report_id,actor,normalized->>'title',changed_keys,action_at);
    end if;
    result := jsonb_build_object('outcome','saved','report',public.get_report(p_report_id));
  end if;
  insert into public.report_edit_receipts(actor_id,request_id,report_id,payload,result) values(actor,p_request_id,p_report_id,payload,result);
  return result;
end;
$$;

create function public.get_mailbox_items(p_filter text default 'all', p_cursor_created_at timestamptz default null, p_cursor_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id = actor) then raise exception using errcode = 'P2002', message = 'Profile required'; end if;
  if p_filter is null or p_filter not in ('all','unread') or (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception using errcode = 'P2003', message = 'Invalid mailbox filter or cursor';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc),'[]'::jsonb) from (
    select m.id,m.report_id,m.actor_id,a.username as actor_username,a.display_name as actor_display_name,
      m.report_title,r.project_id,p.name as project_name,m.changed_fields,m.created_at,m.read_at
    from public.mailbox_items m join public.reports r on r.id=m.report_id join public.projects p on p.id=r.project_id
    left join public.profiles a on a.id=m.actor_id
    where m.recipient_id=actor and (p_filter='all' or m.read_at is null)
      and (p_cursor_created_at is null or (m.created_at,m.id)<(p_cursor_created_at,p_cursor_id))
    order by m.created_at desc,m.id desc limit 100
  ) page);
end;
$$;
create function public.mark_mailbox_item_read(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=actor) then raise exception using errcode='P2002',message='Profile required'; end if;
  update public.mailbox_items set read_at=coalesce(read_at,clock_timestamp()) where id=p_item_id and recipient_id=actor;
  if not found then raise exception using errcode='P2005',message='Mailbox item not found'; end if;
end;
$$;
create function public.delete_mailbox_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode='P2001',message='Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=actor) then raise exception using errcode='P2002',message='Profile required'; end if;
  delete from public.mailbox_items where id=p_item_id and recipient_id=actor;
end;
$$;

revoke all on function public.edit_report(uuid,jsonb,bigint,uuid),public.get_mailbox_items(text,timestamptz,uuid),
  public.mark_mailbox_item_read(uuid),public.delete_mailbox_item(uuid) from public,anon,authenticated,service_role;
grant execute on function public.edit_report(uuid,jsonb,bigint,uuid),public.get_mailbox_items(text,timestamptz,uuid),
  public.mark_mailbox_item_read(uuid),public.delete_mailbox_item(uuid) to authenticated;

-- Preserve legacy contracts and reject stale project authorization.
create or replace function public.accept_report(p_report_id uuid) returns jsonb
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
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
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

-- Preserve legacy contracts and reject stale project authorization.
create or replace function public.start_report_investigation(p_report_id uuid) returns jsonb
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
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
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

-- Preserve legacy contracts and reject stale project authorization.
create or replace function public.await_tester_information(p_report_id uuid) returns jsonb
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
  -- Match acceptance/start lock ordering and serialize with project archival.
  select archived_at into archived from public.projects where id = project for update;
  if not found then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
  if archived is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
  select * into saved from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
  if saved.assigned_developer_id is distinct from actor then
    raise exception using errcode = 'P2002', message = 'Assigned Developer required';
  end if;
  if saved.state <> 'In progress' then raise exception using errcode = 'P2007', message = 'Report state has changed'; end if;
  action_at := clock_timestamp();
  update public.reports set state = 'Awaiting tester information', updated_at = action_at where id = p_report_id;
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'tester_information_requested', jsonb_build_object(
    'state', jsonb_build_object('before', 'In progress', 'after', 'Awaiting tester information')));
  return public.get_report(p_report_id);
end;
$$;

-- Preserve legacy contracts and reject stale project authorization.
create or replace function public.resume_report_investigation(p_report_id uuid) returns jsonb
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
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
  if saved.assigned_developer_id is distinct from actor then
    raise exception using errcode = 'P2002', message = 'Assigned Developer required';
  end if;
  if saved.state <> 'Awaiting tester information' then raise exception using errcode = 'P2007', message = 'Report state has changed'; end if;
  action_at := clock_timestamp();
  update public.reports set state = 'In progress', updated_at = action_at where id = p_report_id;
  insert into public.report_history(report_id, actor_id, occurred_at, event, changes)
  values (p_report_id, actor, action_at, 'investigation_resumed', jsonb_build_object(
    'state', jsonb_build_object('before', 'Awaiting tester information', 'after', 'In progress')));
  return public.get_report(p_report_id);
end;
$$;

-- Preserve legacy contracts and reject stale project authorization.
create or replace function public.post_report_comment(p_report_id uuid, p_body jsonb, p_reply_to_comment_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  project uuid;
  archived timestamptz;
  current_project uuid;
  saved public.report_comments%rowtype;
  author public.profiles%rowtype;
  normalized_body text;
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  select * into author from public.profiles where id = actor and role in ('tester', 'developer');
  if not found then raise exception using errcode = 'P2002', message = 'Profile required'; end if;
  if p_body is null or jsonb_typeof(p_body) <> 'string' then
    raise exception using errcode = 'P2003', message = 'Invalid comment text';
  end if;
  normalized_body := public.project_trim(p_body #>> '{}');
  if char_length(normalized_body) not between 1 and 5000 then
    raise exception using errcode = 'P2003', message = 'Invalid comment text';
  end if;
  select project_id into project from public.reports where id = p_report_id;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  select archived_at into archived from public.projects where id = project for update;
  if not found then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
  if archived is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
  select project_id into current_project from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
  if current_project <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
  if p_reply_to_comment_id is not null and not exists (
    select 1 from public.report_comments where report_id = p_report_id and id = p_reply_to_comment_id
  ) then
    raise exception using errcode = 'P2003', message = 'Invalid reply reference';
  end if;
  -- Discussion is independent: do not change the report or append a workflow event.
  insert into public.report_comments(report_id, author_id, body, reply_to_comment_id)
  values (p_report_id, actor, normalized_body, p_reply_to_comment_id) returning * into saved;
  return to_jsonb(saved) || jsonb_build_object('author_username', author.username, 'author_display_name', author.display_name);
end;
$$;

-- Preserve PR9 resolution/link behavior while rejecting stale source-project locks.
create or replace function public.resolve_report(p_report_id uuid, p_resolution jsonb) returns jsonb
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
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
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

create or replace function public.link_duplicate_report(p_report_id uuid, p_canonical_report_id uuid, p_expected_canonical_report_id uuid) returns jsonb
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
  if saved.project_id <> project then raise exception using errcode = 'P2007', message = 'Report project changed; retry'; end if;
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


-- PR9 get_report uses to_jsonb(r), retaining resolution/canonical projections and new severity columns.
drop function public.get_report_history(uuid);
create function public.get_report_history(p_report_id uuid)
returns table (
  id uuid, report_id uuid, actor_id uuid, actor_display_name text, actor_username text,
  occurred_at timestamptz, event text, changes jsonb,
  assigned_developer_username text, assigned_developer_display_name text, project_names jsonb
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
    assignee.username, assignee.display_name, h.project_names
  from public.report_history h
  left join public.profiles p on p.id = h.actor_id
  left join public.profiles assignee on h.event = 'accepted'
    and assignee.id = (h.changes->'assigned_developer_id'->>'after')::uuid
  where h.report_id = p_report_id
  order by h.occurred_at, h.id;
end;
$$;
revoke all on function public.get_report_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_report_history(uuid) to authenticated;
commit;
