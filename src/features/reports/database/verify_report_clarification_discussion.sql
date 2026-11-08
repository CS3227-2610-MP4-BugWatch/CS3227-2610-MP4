-- ISOLATED TEST PROJECT ONLY. Apply 001-011 first. All fixtures and trigger roll back.
begin;

create function public.report_clarification_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event in ('tester_information_requested', 'investigation_resumed') then
    raise exception using errcode = 'P2999', message = 'Intentional clarification history failure';
  end if;
  return new;
end;
$$;

do $$
declare
  tester uuid;
  developer uuid;
  project uuid;
  report uuid;
  saved jsonb;
  first_comment jsonb;
  before_row jsonb;
  before_count bigint;
begin
  select id into tester from public.profiles where role = 'tester' order by id limit 1;
  select id into developer from public.profiles where role = 'developer' order by id limit 1;
  if tester is null or developer is null then
    raise exception 'Provision Tester and Developer profiles in this isolated project first';
  end if;
  insert into public.projects(name, description, repository_url, created_by)
  values ('Clarification rollback ' || gen_random_uuid()::text, 'Rollback fixture', 'https://example.com/repo', developer)
  returning id into project;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', tester, 'role', 'authenticated')::text, true);
  saved := public.create_report(project, 'Clarification rollback report', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  report := (saved->>'id')::uuid;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', developer, 'role', 'authenticated')::text, true);
  perform public.accept_report(report);
  perform public.start_report_investigation(report);

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_clarification_test_reject_history before insert on public.report_history
    for each row execute function public.report_clarification_test_reject_history();
  begin
    perform public.await_tester_information(report);
    raise exception 'Waiting unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed waiting changed report fields, assignment, timestamps, or event count';
  end if;
  drop trigger report_clarification_test_reject_history on public.report_history;

  saved := public.await_tester_information(report);
  if saved->>'state' <> 'Awaiting tester information'
    or saved->>'assigned_developer_id' is distinct from before_row->>'assigned_developer_id'
    or saved->>'assigned_at' is distinct from before_row->>'assigned_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1
    or (select count(*) from public.report_comments where report_id = report) <> 0 then
    raise exception 'Waiting without a comment did not preserve assignment and create exactly one event';
  end if;

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_clarification_test_reject_history before insert on public.report_history
    for each row execute function public.report_clarification_test_reject_history();
  begin
    perform public.resume_report_investigation(report);
    raise exception 'Resume unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed resume changed report fields, assignment, timestamps, or event count';
  end if;
  drop trigger report_clarification_test_reject_history on public.report_history;
  saved := public.resume_report_investigation(report);
  if saved->>'state' <> 'In progress'
    or saved->>'assigned_developer_id' is distinct from before_row->>'assigned_developer_id'
    or saved->>'assigned_at' is distinct from before_row->>'assigned_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1 then
    raise exception 'Resume without a reply did not preserve assignment and create exactly one event';
  end if;

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  first_comment := public.post_report_comment(report, to_jsonb('  Which browser?  '::text));
  if first_comment->>'body' <> 'Which browser?' or (first_comment->>'author_id')::uuid <> developer then
    raise exception 'Posting did not normalize text and derive the author';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', tester, 'role', 'authenticated')::text, true);
  perform public.post_report_comment(report, to_jsonb('Browser 1'::text), (first_comment->>'id')::uuid);
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count
    or jsonb_array_length(public.list_report_comments(report)) <> 2 then
    raise exception 'Discussion changed report fields or history, or failed readback';
  end if;
  begin
    perform public.post_report_comment(report, '42'::jsonb);
    raise exception 'Non-text JSON unexpectedly accepted';
  exception when sqlstate 'P2003' then null;
  end;
  if (select count(*) from public.report_comments where report_id = report) <> 2 then
    raise exception 'Rejected input persisted a comment';
  end if;
  raise notice 'Clarification rollback and comment independence checks passed; fixtures will be rolled back';
end;
$$;

rollback;
