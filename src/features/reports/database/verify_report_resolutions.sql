-- ISOLATED TEST PROJECT ONLY. Apply migrations 001-012 first.
-- Run as the isolated database administrator; ordinary-client permission assertions
-- belong to report-resolution-database.test.ts. All fixtures and trigger roll back.
begin;

create function public.report_resolution_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event in ('resolved', 'duplicate_linked') then
    raise exception using errcode = 'P2999', message = 'Intentional resolution/link history failure';
  end if;
  return new;
end;
$$;

do $$
declare
  tester uuid; developer uuid; project uuid; report uuid; target uuid; other_target uuid;
  saved jsonb; before_row jsonb; before_target jsonb; before_count bigint; fixed jsonb; duplicate jsonb;
begin
  select id into tester from public.profiles where role = 'tester' order by id limit 1;
  select id into developer from public.profiles where role = 'developer' order by id limit 1;
  if tester is null or developer is null then raise exception 'Provision Tester and Developer profiles in this isolated project first'; end if;
  insert into public.projects(name, description, repository_url, created_by)
  values ('Resolution rollback ' || gen_random_uuid()::text, 'Rollback fixture', 'https://example.com/repo', developer)
  returning id into project;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', tester, 'role', 'authenticated')::text, true);
  saved := public.create_report(project, 'Resolution rollback source', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  report := (saved->>'id')::uuid;
  saved := public.create_report(project, 'Canonical target', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  target := (saved->>'id')::uuid;
  saved := public.create_report(project, 'Replacement target', 'Description', '1', 'Steps', 'Expected', 'Actual', 'low');
  other_target := (saved->>'id')::uuid;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', developer, 'role', 'authenticated')::text, true);
  perform public.accept_report(report);
  perform public.start_report_investigation(report);
  fixed := jsonb_build_object('kind', 'fixed', 'fix_summary', '  Fix summary  ', 'affected_version', '  2  ',
    'commit_url', '  https://example.com/commit/1  ', 'pull_request_url', 'https://different.example/pr/1');

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select to_jsonb(r) into before_target from public.reports r where id = target;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_resolution_test_reject_history before insert on public.report_history
    for each row execute function public.report_resolution_test_reject_history();
  begin
    perform public.resolve_report(report, fixed);
    raise exception 'Resolution unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed fixed resolution changed fields, state, assignment, link, timestamps, or history';
  end if;
  begin
    perform public.link_duplicate_report(report, target, null);
    raise exception 'Link unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select to_jsonb(r) from public.reports r where id = target) is distinct from before_target
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed initial link changed source, target, or history';
  end if;
  drop trigger report_resolution_test_reject_history on public.report_history;
  saved := public.link_duplicate_report(report, target, null);
  if saved->>'state' <> 'In progress' or saved->'resolution' <> 'null'::jsonb
    or saved->'canonical_report'->>'id' <> target::text
    or saved->>'assigned_at' is distinct from before_row->>'assigned_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1 then
    raise exception 'Standalone link changed workflow or did not create exactly one link event';
  end if;

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_resolution_test_reject_history before insert on public.report_history
    for each row execute function public.report_resolution_test_reject_history();
  -- No insertion occurs, so an unchanged link succeeds even with the rejecting trigger.
  perform public.link_duplicate_report(report, target, null);
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Unchanged link changed timestamps or history';
  end if;
  duplicate := jsonb_build_object('kind', 'duplicate', 'explanation', 'Same underlying bug', 'canonical_report_id', target);
  begin
    perform public.resolve_report(report, duplicate);
    raise exception 'Duplicate resolution unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed duplicate resolution changed source fields, link, timestamps, or history';
  end if;
  drop trigger report_resolution_test_reject_history on public.report_history;
  saved := public.resolve_report(report, duplicate);
  if saved->>'state' <> 'Resolved' or saved->'resolution'->>'canonical_report_id' <> target::text
    or saved->'resolution'->>'author_id' <> developer::text
    or saved->>'version' <> '1' or saved->>'assigned_at' is distinct from before_row->>'assigned_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1 then
    raise exception 'Duplicate resolution did not preserve original fields or create exactly one event';
  end if;

  select to_jsonb(r) into before_row from public.reports r where id = report;
  select count(*) into before_count from public.report_history where report_id = report;
  create trigger report_resolution_test_reject_history before insert on public.report_history
    for each row execute function public.report_resolution_test_reject_history();
  begin
    perform public.link_duplicate_report(report, other_target, target);
    raise exception 'Replacement link unexpectedly succeeded despite failing history';
  exception when sqlstate 'P2999' then null;
  end;
  if (select to_jsonb(r) from public.reports r where id = report) is distinct from before_row
    or (select count(*) from public.report_history where report_id = report) <> before_count then
    raise exception 'Failed replacement changed resolution snapshot, state, link, timestamps, or history';
  end if;
  drop trigger report_resolution_test_reject_history on public.report_history;
  saved := public.link_duplicate_report(report, other_target, target);
  if saved->>'state' <> 'Resolved' or saved->'resolution'->>'canonical_report_id' <> target::text
    or saved->'canonical_report'->>'id' <> other_target::text
    or saved->'resolution'->>'resolved_at' is distinct from before_row->>'resolved_at'
    or (select count(*) from public.report_history where report_id = report) <> before_count + 1
    or (select to_jsonb(r) from public.reports r where id = target) is distinct from before_target then
    raise exception 'Replacement link rewrote the resolution snapshot or target';
  end if;
end;
$$;

rollback;
