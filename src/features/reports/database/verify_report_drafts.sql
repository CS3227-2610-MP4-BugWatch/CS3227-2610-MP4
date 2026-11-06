-- ISOLATED TEST PROJECT ONLY. Run after 007_report_drafts.sql. Rolls back all fixtures.
begin;

create function public.report_draft_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P2999', message = 'Intentional test-only history failure';
end;
$$;

do $$
declare
  testers uuid[];
  developer uuid;
  original_project uuid;
  active_project uuid;
  draft uuid;
  submitted uuid;
  title text := 'Draft verification ' || gen_random_uuid()::text;
begin
  select array(select id from public.profiles where role = 'tester' order by id limit 2) into testers;
  select id into developer from public.profiles where role = 'developer' order by id limit 1;
  if cardinality(testers) <> 2 or developer is null then
    raise exception 'Provision two Tester profiles and a Developer profile first';
  end if;
  if has_table_privilege('authenticated', 'public.report_drafts', 'SELECT')
     or has_table_privilege('authenticated', 'public.report_draft_receipts', 'SELECT')
     or has_function_privilege('anon', 'public.get_report_draft(uuid)', 'EXECUTE') then
    raise exception 'Draft storage or private lookup is directly accessible';
  end if;

  insert into public.projects(name, description, repository_url, created_by)
  values (title, 'Draft fixture', 'https://example.com/repo', developer)
  returning id into original_project;
  insert into public.projects(name, description, repository_url, created_by)
  values (title || ' active', 'Draft fixture', 'https://example.com/repo', developer)
  returning id into active_project;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', testers[1], 'role', 'authenticated')::text, true);
  draft := (public.save_report_draft(null, original_project, '', '', '', 'Steps', '', '', '', '')->>'id')::uuid;
  if draft is null or public.get_report_draft(draft)->>'reproduction_steps' is distinct from 'Steps' then
    raise exception 'Incomplete draft was not saved';
  end if;
  if exists (select 1 from public.reports where project_id = original_project) then
    raise exception 'A private draft entered the shared reports table';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', testers[2], 'role', 'authenticated')::text, true);
  if public.get_report_draft(draft) is not null then
    raise exception 'Another Tester can read the draft';
  end if;
  begin
    perform public.delete_report_draft(draft);
    raise exception 'Another Tester can delete the draft';
  exception when sqlstate 'P2005' then null;
  end;
  begin
    perform public.save_report_draft(draft, original_project, 'Unauthorized', '', '', '', '', '', '', '');
    raise exception 'Another Tester can update the draft';
  exception when sqlstate 'P2005' then null;
  end;
  begin
    perform public.submit_report_draft(draft, original_project, title, 'Description', '1', 'Steps', 'Expected', 'Actual', 'low', '');
    raise exception 'Another Tester can submit the draft';
  exception when sqlstate 'P2005' then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', developer, 'role', 'authenticated')::text, true);
  begin
    perform public.get_report_draft(draft);
    raise exception 'A Developer can access a private draft';
  exception when sqlstate 'P2002' then null;
  end;
  update public.projects set archived_at = now() where id = original_project;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', testers[1], 'role', 'authenticated')::text, true);
  begin
    perform public.save_report_draft(draft, original_project, title, '', '', '', '', '', '', '');
    raise exception 'Archived project accepted a draft update';
  exception when sqlstate 'P2004' then null;
  end;
  if public.get_report_draft(draft)->>'reproduction_steps' is distinct from 'Steps' then
    raise exception 'Rejected save changed the last saved draft';
  end if;
  perform public.save_report_draft(draft, active_project, '', '', '', 'Steps', '', '', '', '');
  if (public.get_report_draft(draft)->>'project_id')::uuid is distinct from active_project then
    raise exception 'Draft did not move to the active project';
  end if;

  create trigger report_draft_test_reject_history before insert on public.report_history
    for each row execute function public.report_draft_test_reject_history();
  begin
    perform public.submit_report_draft(draft, active_project, title, 'Description', '1', 'Steps', 'Expected', 'Actual', 'low', '');
    raise exception 'Draft submission unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  drop trigger report_draft_test_reject_history on public.report_history;
  if public.get_report_draft(draft) is null
     or exists (select 1 from public.reports where project_id = active_project)
     or exists (select 1 from public.report_draft_receipts where draft_id = draft) then
    raise exception 'Failed submission left a partial write or consumed the draft';
  end if;

  submitted := (public.submit_report_draft(draft, active_project, title, 'Description', '1', 'Steps', 'Expected', 'Actual', 'low', '')->>'id')::uuid;
  if submitted is null or public.get_report_draft(draft) is not null
     or (public.submit_report_draft(draft, active_project, title, 'Description', '1', 'Steps', 'Expected', 'Actual', 'low', '')->>'id')::uuid is distinct from submitted
     or (select count(*) from public.reports where project_id = active_project) <> 1
     or (select count(*) from public.report_history where report_id = submitted) <> 1 then
    raise exception 'Submission and retry did not produce exactly one report and history entry';
  end if;
  raise notice 'Draft ownership, archive, rollback and submission retry checks passed';
end;
$$;

rollback;
