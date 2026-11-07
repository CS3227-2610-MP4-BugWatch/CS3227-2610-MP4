-- ISOLATED TEST PROJECT ONLY. Apply 001-008 first. All fixtures and trigger roll back.
begin;

create function public.report_workflow_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event in ('accepted', 'investigation_started') then
    raise exception using errcode = 'P2999', message = 'Intentional workflow history failure';
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
  before_row jsonb;
  before_count bigint;
begin
  select id into tester from public.profiles where role = 'tester' order by id limit 1;
  select id into developer from public.profiles where role = 'developer' order by id limit 1;
  if tester is null or developer is null then
    raise exception 'Provision Tester and Developer profiles in this isolated project first';
  end if;
  insert into public.projects(name, description, repository_url, created_by)
  values ('Workflow rollback ' || gen_random_uuid()::text, 'Rollback fixture', 'https://example.com/repo', developer)
  returning id into project;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', tester, 'role', 'authenticated')::text, true);
  saved := public.create_report(project, 'Workflow rollback report', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  report := (saved->>'id')::uuid;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', developer, 'role', 'authenticated')::text, true);

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_workflow_test_reject_history before insert on public.report_history
    for each row execute function public.report_workflow_test_reject_history();
  begin
    perform public.accept_report(report);
    raise exception 'Acceptance unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed acceptance changed report fields, assignment, timestamps, or event count';
  end if;
  drop trigger report_workflow_test_reject_history on public.report_history;

  saved := public.accept_report(report);
  if saved->>'state' <> 'Accepted' or (saved->>'assigned_developer_id')::uuid <> developer
    or saved->>'assigned_at' is null then
    raise exception 'Acceptance fixture did not persist expected ownership';
  end if;
  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_workflow_test_reject_history before insert on public.report_history
    for each row execute function public.report_workflow_test_reject_history();
  begin
    perform public.start_report_investigation(report);
    raise exception 'Investigation unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed investigation changed report fields, assignment, timestamps, or event count';
  end if;
  drop trigger report_workflow_test_reject_history on public.report_history;
  saved := public.start_report_investigation(report);
  if saved->>'state' <> 'In progress'
    or saved->>'assigned_developer_id' is distinct from before_row->>'assigned_developer_id'
    or saved->>'assigned_at' is distinct from before_row->>'assigned_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1 then
    raise exception 'Investigation did not preserve assignment and create exactly one event';
  end if;
  raise notice 'Acceptance and investigation history rollback checks passed; fixtures will be rolled back';
end;
$$;

rollback;
