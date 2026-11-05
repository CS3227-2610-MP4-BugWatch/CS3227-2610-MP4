-- TEST PROJECT ONLY: run in the SQL editor after 001_profiles.sql and 002_projects.sql.
-- This entire verification runs in a transaction and rolls back all fixtures/functions.
begin;

-- Run parser smoke cases before any fixtures so ordinary URL failures are clear.
do $$
declare
  candidate text;
begin
  foreach candidate in array array[
    'https://example.com/repo',
    'http://example.com/repo',
    'HTTPS://example.com/CasePreserved',
    'https://%31%32%37.0.0.1/repo',
    'https://example.com:000080/repo',
    'https://[::1]/repo',
    'https://' || U&'\0928\093E\092E\094D\200D\0937' || '.com/repo',
    'https://' || U&'\0646\0627\0645\0647\200C\0627\06CC' || '.com/repo',
    'https://example.com/' || repeat('a', 2048 - length('https://example.com/'))
  ] loop
    if public.project_repository_url_valid(candidate) is distinct from true then
      raise exception 'URL helper rejected an approved valid smoke case: %', candidate;
    end if;
  end loop;
  foreach candidate in array array[
    'https://', 'https:///no-host', '/repo', 'ftp://example.com/repo',
    'https://example.com/a b', 'https://example.com:65536/repo',
    'https://%2Fexample.com/repo', 'https://%00example.com/repo',
    'https://%FFexample.com/repo', 'https://%E2%80%8D.com/repo',
    'https://' || chr(8205) || '.com/repo',
    'https://a%E2%80%8Db.com/repo', 'https://a%E2%80%8Cb.com/repo',
    'https://example.com/' || repeat('a', 2049 - length('https://example.com/'))
  ] loop
    if public.project_repository_url_valid(candidate) is distinct from false then
      raise exception 'URL helper accepted an invalid smoke case: %', candidate;
    end if;
  end loop;
  raise notice 'URL validation smoke cases passed';
end;
$$;

create function public.project_test_reject_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P1999', message = 'Intentional test-only history failure';
end;
$$;

do $$
declare
  actor uuid;
  saved public.projects;
  original public.projects;
  candidate text := 'transaction-test-' || gen_random_uuid()::text;
  original_history bigint;
begin
  select id into actor from public.profiles where role = 'developer' order by id limit 1;
  if actor is null then raise exception 'Create a developer profile in this isolated test project first'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);
  saved := public.create_project(candidate, 'Original description', 'https://example.com/test');
  original := saved;
  select count(*) into original_history from public.project_history where project_id = saved.id;
  if original_history <> 1 then raise exception 'Creation did not add exactly one history entry'; end if;

  create trigger project_test_reject_history before insert on public.project_history
    for each row execute function public.project_test_reject_history();

  begin
    perform public.update_project(saved.id, saved.revision, saved.name, 'Must roll back', saved.repository_url);
    raise exception 'Update unexpectedly succeeded despite failing history';
  exception when sqlstate 'P1999' then null;
  end;
  select * into saved from public.projects where id = original.id;
  if saved is distinct from original then raise exception 'Failed history left a partial project update'; end if;
  if (select count(*) from public.project_history where project_id = original.id) <> original_history then
    raise exception 'Failed update changed history';
  end if;

  begin
    perform public.create_project(candidate || '-failed', 'Must roll back', 'https://example.com/test');
    raise exception 'Creation unexpectedly succeeded despite failing history';
  exception when sqlstate 'P1999' then null;
  end;
  if exists(select 1 from public.projects where name = candidate || '-failed') then
    raise exception 'Failed history left a partial project creation';
  end if;
  raise notice 'Project creation/update history rollback checks passed; all test artifacts will be rolled back';
end;
$$;

rollback;
