-- Apply after 010_tester_suggestion_quota_five.sql. Deploy compatible readers before enabling clarification actions.
begin;

alter table public.reports drop constraint reports_workflow_check;
alter table public.reports add constraint reports_workflow_check check (
  (state = 'Open' and assigned_developer_id is null and assigned_at is null)
  or (state in ('Accepted', 'In progress', 'Awaiting tester information')
    and assigned_developer_id is not null and assigned_at is not null)
);
alter table public.report_history drop constraint report_history_event_check;
alter table public.report_history add constraint report_history_event_check
  check (event in ('created', 'accepted', 'investigation_started', 'tester_information_requested', 'investigation_resumed'));

create table public.report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  author_id uuid not null references public.profiles(id),
  body text not null check (body = public.project_trim(body) and char_length(body) between 1 and 5000),
  reply_to_comment_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  unique (report_id, id),
  foreign key (report_id, reply_to_comment_id) references public.report_comments(report_id, id),
  check (reply_to_comment_id is null or reply_to_comment_id <> id)
);
create index report_comments_report_time_idx on public.report_comments(report_id, created_at, id);
alter table public.report_comments enable row level security;
revoke all on public.report_comments from public, anon, authenticated;

create function public.await_tester_information(p_report_id uuid) returns jsonb
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

create function public.resume_report_investigation(p_report_id uuid) returns jsonb
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

create function public.list_report_comments(
  p_report_id uuid,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = actor and role in ('tester', 'developer')) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  if not exists (select 1 from public.reports where id = p_report_id) then
    raise exception using errcode = 'P2005', message = 'Report not found';
  end if;
  if (p_after_created_at is null) <> (p_after_id is null) then
    raise exception using errcode = 'P2003', message = 'Incomplete comment cursor';
  end if;
  -- One JSON array avoids silent truncation by API row limits below the page size.
  return (
    select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at, page.id), '[]'::jsonb)
    from (
      select c.id, c.report_id, c.author_id, p.username as author_username,
        p.display_name as author_display_name, c.body, c.reply_to_comment_id, c.created_at
      from public.report_comments c
      left join public.profiles p on p.id = c.author_id
      where c.report_id = p_report_id
        and (p_after_created_at is null or (c.created_at, c.id) > (p_after_created_at, p_after_id))
      order by c.created_at, c.id
      limit 100
    ) page
  );
end;
$$;

create function public.post_report_comment(p_report_id uuid, p_body jsonb, p_reply_to_comment_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  project uuid;
  archived timestamptz;
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
  perform 1 from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = 'P2005', message = 'Report not found'; end if;
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

revoke insert, update, delete on public.reports, public.report_history from public, anon, authenticated;
revoke all on function public.await_tester_information(uuid), public.resume_report_investigation(uuid),
  public.list_report_comments(uuid,timestamptz,uuid), public.post_report_comment(uuid,jsonb,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.await_tester_information(uuid), public.resume_report_investigation(uuid),
  public.list_report_comments(uuid,timestamptz,uuid), public.post_report_comment(uuid,jsonb,uuid) to authenticated;

commit;
