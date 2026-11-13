-- Private draft storage, applied after 006_project_report_listing.sql.
begin;
create table public.report_drafts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id),
 project_id uuid not null references public.projects(id),
 title text not null check (title = public.project_trim(title) and char_length(title) <= 200),
 description text not null check (description = public.project_trim(description) and char_length(description) <= 5000),
 version text not null check (version = public.project_trim(version) and char_length(version) <= 100),
 reproduction_steps text not null check (reproduction_steps = public.project_trim(reproduction_steps) and char_length(reproduction_steps) <= 5000),
 expected_results text not null check (expected_results = public.project_trim(expected_results) and char_length(expected_results) <= 5000),
 actual_results text not null check (actual_results = public.project_trim(actual_results) and char_length(actual_results) <= 5000),
 test_environment text not null check (test_environment = public.project_trim(test_environment) and char_length(test_environment) <= 1000),
 severity text not null check (severity in ('', 'very_low', 'low', 'medium', 'high')),
 updated_at timestamptz not null default now()
);
create table public.report_draft_receipts (
 draft_id uuid primary key, author_id uuid not null references public.profiles(id),
 report_id uuid not null references public.reports(id)
);
create index report_drafts_author_updated_id_idx on public.report_drafts(author_id, updated_at desc, id desc);
alter table public.report_drafts enable row level security;
alter table public.report_draft_receipts enable row level security;
revoke all on public.report_drafts, public.report_draft_receipts from public, anon, authenticated;
grant all on public.report_drafts, public.report_draft_receipts to service_role;

create function public.draft_actor() returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
 if actor is null then raise exception using errcode = 'P2001', message = 'Authentication required'; end if;
 if not exists (select 1 from public.profiles where id = actor and role = 'tester') then
  raise exception using errcode = 'P2002', message = 'Tester role required';
 end if;
 return actor;
end; $$;
revoke all on function public.draft_actor() from public, anon, authenticated, service_role;

create function public.list_report_drafts(p_before_updated_at timestamptz default null, p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := public.draft_actor();
begin
 if (p_before_updated_at is null) <> (p_before_id is null) then
  raise exception using errcode = 'P2003', message = 'Incomplete draft cursor';
 end if;
 return (
  select coalesce(jsonb_agg(to_jsonb(page) order by page.updated_at desc, page.id desc), '[]'::jsonb)
  from (
   select d.id, d.project_id, p.name as project_name, p.archived_at as project_archived_at, d.title, d.updated_at
   from public.report_drafts d join public.projects p on p.id = d.project_id
   where d.author_id = actor
    and (p_before_updated_at is null or (d.updated_at, d.id) < (p_before_updated_at, p_before_id))
   order by d.updated_at desc, d.id desc limit 100
  ) page
 );
end; $$;

create function public.get_report_draft(p_draft_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.draft_actor(); result jsonb;
begin
 select to_jsonb(d) - 'author_id' || jsonb_build_object('project_name', p.name, 'project_archived_at', p.archived_at)
 into result from public.report_drafts d join public.projects p on p.id = d.project_id
 where d.id = p_draft_id and d.author_id = actor;
 return result;
end; $$;

create function public.save_report_draft(p_draft_id uuid, p_project_id uuid, p_title text, p_description text, p_version text, p_reproduction_steps text, p_expected_results text, p_actual_results text, p_severity text, p_test_environment text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.draft_actor(); selected_project public.projects%rowtype; saved public.report_drafts%rowtype; invalid_field text;
begin
 p_title := public.project_trim(p_title);
 p_description := public.project_trim(p_description);
 p_version := public.project_trim(p_version);
 p_reproduction_steps := public.project_trim(p_reproduction_steps);
 p_expected_results := public.project_trim(p_expected_results);
 p_actual_results := public.project_trim(p_actual_results);
 p_test_environment := coalesce(public.project_trim(p_test_environment), '');
 invalid_field := case when p_project_id is null then 'project_id'
 when p_title is null or char_length(p_title) > 200 then 'title'
 when p_description is null or char_length(p_description) > 5000 then 'description'
 when p_version is null or char_length(p_version) > 100 then 'version'
 when p_reproduction_steps is null or char_length(p_reproduction_steps) > 5000 then 'reproduction_steps'
 when p_expected_results is null or char_length(p_expected_results) > 5000 then 'expected_results'
 when p_actual_results is null or char_length(p_actual_results) > 5000 then 'actual_results'
 when p_test_environment is null or char_length(p_test_environment) > 1000 then 'test_environment'
 when p_severity is null or p_severity not in ('', 'very_low', 'low', 'medium', 'high') then 'severity' end;
 if invalid_field is not null then raise exception using errcode = 'P2003', message = 'Invalid draft field', detail = invalid_field; end if;
 if p_draft_id is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::text, 0));
  perform 1 from public.report_drafts where id = p_draft_id and author_id = actor for update;
  if not found then raise exception using errcode = 'P2005', message = 'Draft not found'; end if;
 end if;
 select * into selected_project from public.projects where id = p_project_id for share;
 if not found then raise exception using errcode = 'P2005', message = 'Project not found'; end if;
 if selected_project.archived_at is not null then raise exception using errcode = 'P2004', message = 'Project is archived'; end if;
 if p_draft_id is null then
  insert into public.report_drafts (author_id, project_id, title, description, version, reproduction_steps, expected_results, actual_results, test_environment, severity)
  values (actor, p_project_id, p_title, p_description, p_version, p_reproduction_steps, p_expected_results, p_actual_results, p_test_environment, p_severity) returning * into saved;
 else
  update public.report_drafts set project_id = p_project_id, title = p_title, description = p_description, version = p_version, reproduction_steps = p_reproduction_steps, expected_results = p_expected_results, actual_results = p_actual_results, test_environment = p_test_environment, severity = p_severity, updated_at = now()
  where id = p_draft_id and author_id = actor returning * into saved;
 end if;
 return to_jsonb(saved) - 'author_id' || jsonb_build_object('project_name', selected_project.name, 'project_archived_at', selected_project.archived_at);
end; $$;

create function public.delete_report_draft(p_draft_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.draft_actor();
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::text, 0));
 delete from public.report_drafts where id = p_draft_id and author_id = actor;
 if not found then raise exception using errcode = 'P2005', message = 'Draft not found'; end if;
end; $$;

create function public.submit_report_draft(p_draft_id uuid, p_project_id uuid, p_title text, p_description text, p_version text, p_reproduction_steps text, p_expected_results text, p_actual_results text, p_severity text, p_test_environment text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.draft_actor(); existing uuid; result jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::text, 0));
 select report_id into existing from public.report_draft_receipts where draft_id = p_draft_id and author_id = actor;
 if found then return public.get_report(existing); end if;
 perform 1 from public.report_drafts where id = p_draft_id and author_id = actor for update;
 if not found then raise exception using errcode = 'P2005', message = 'Draft not found'; end if;
 result := public.create_report(p_project_id, p_title, p_description, p_version, p_reproduction_steps, p_expected_results, p_actual_results, p_severity, p_test_environment);
 insert into public.report_draft_receipts(draft_id, author_id, report_id) values (p_draft_id, actor, (result->>'id')::uuid);
 delete from public.report_drafts where id = p_draft_id and author_id = actor;
 return result;
end; $$;

revoke all on function public.list_report_drafts(timestamptz,uuid), public.get_report_draft(uuid), public.save_report_draft(uuid,uuid,text,text,text,text,text,text,text,text), public.delete_report_draft(uuid), public.submit_report_draft(uuid,uuid,text,text,text,text,text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.list_report_drafts(timestamptz,uuid), public.get_report_draft(uuid), public.save_report_draft(uuid,uuid,text,text,text,text,text,text,text,text), public.delete_report_draft(uuid), public.submit_report_draft(uuid,uuid,text,text,text,text,text,text,text,text) to authenticated;
commit;
