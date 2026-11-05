-- ISOLATED TEST PROJECT ONLY. Run after 005_reports.sql. Rolls back all fixtures.
begin;

create function public.report_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P2999', message = 'Intentional test-only history failure';
end;
$$;

do $$
declare
  tester uuid;
  developer uuid;
  project uuid;
  saved jsonb;
  failed_title text := 'Rollback test ' || gen_random_uuid()::text;
begin
  select id into tester from public.profiles where role = 'tester' order by id limit 1;
  select id into developer from public.profiles where role = 'developer' order by id limit 1;
  if tester is null or developer is null then
    raise exception 'Provision tester and developer profiles in this isolated test project first';
  end if;

  insert into public.projects(name, description, repository_url, created_by)
  values ('Report rollback test ' || gen_random_uuid()::text, 'Rollback fixture', 'https://example.com/repo', developer)
  returning id into project;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', tester, 'role', 'authenticated')::text, true);
  saved := public.create_report(project, 'Successful report', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  if (select count(*) from public.report_history where report_id = (saved->>'id')::uuid) <> 1 then
    raise exception 'Report creation did not write exactly one history entry';
  end if;

  create trigger report_test_reject_history before insert on public.report_history
    for each row execute function public.report_test_reject_history();
  begin
    perform public.create_report(project, failed_title, 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
    raise exception 'Report creation unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;

  if exists (select 1 from public.reports where project_id = project and title = failed_title) then
    raise exception 'Failed history left a partial report creation';
  end if;
  if (select count(*) from public.report_history where report_id = (saved->>'id')::uuid) <> 1 then
    raise exception 'Failed creation changed the successful report history';
  end if;
  raise notice 'Report creation and history rollback checks passed';
end;
$$;

rollback;
