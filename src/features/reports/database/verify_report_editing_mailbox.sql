-- ISOLATED DATABASE ONLY. Apply 001-014 and provision Tester/Developer profiles first.
-- Requires migration-owner privileges for transactional failure injection. Never use production.
begin;
create function public.report_edit_test_reject_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P2999', message = 'Intentional edit persistence failure';
end;
$$;
do $$
declare
  tester uuid;
  developer uuid;
  project uuid;
  destination uuid;
  report uuid;
  saved jsonb;
  input jsonb;
  baseline jsonb;
  before_count bigint;
  request uuid;
  replay jsonb;
  action text;
  duplicate_report uuid;
  captured_target uuid;
  current_target uuid;
  linked_target uuid;
  move_input jsonb;
begin
  select id into tester from public.profiles where role='tester' order by id limit 1;
  select id into developer from public.profiles where role='developer' order by id limit 1;
  if tester is null or developer is null then raise exception 'Provision Tester and Developer profiles first'; end if;
  insert into public.projects(name,description,repository_url,created_by)
  values('Edit rollback '||gen_random_uuid()::text,'Fixture','https://example.com/repo',developer) returning id into project;
  insert into public.projects(name,description,repository_url,created_by)
  values('Edit destination '||gen_random_uuid()::text,'Fixture','https://example.com/repo',developer) returning id into destination;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',tester,'role','authenticated')::text,true);
  saved := public.create_report(project,'Original','Description','1','Steps','Expected','Actual','low');
  report := (saved->>'id')::uuid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',developer,'role','authenticated')::text,true);
  perform public.accept_report(report);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',tester,'role','authenticated')::text,true);
  input := jsonb_build_object('projectId',destination,'title','Edited','description','Description','version','1',
    'reproductionSteps','Steps','expectedResults','Expected','actualResults','Actual','severity','high','testEnvironment','');
  select to_jsonb(r) into baseline from public.reports r where id=report;
  select count(*) into before_count from public.report_history where report_id=report;
  -- Each failed required write must roll back report movement, timestamp, revision, history and receipts.
  create trigger report_edit_test_fail before insert on public.report_history
  for each row when (new.event='report_edited') execute function public.report_edit_test_reject_write();
  begin
    perform public.edit_report(report,input,0,gen_random_uuid());
    raise exception 'History failure unexpectedly committed';
  exception when sqlstate 'P2999' then null; end;
  drop trigger report_edit_test_fail on public.report_history;
  if (select to_jsonb(r) from public.reports r where id=report) is distinct from baseline
    or (select count(*) from public.report_history where report_id=report) <> before_count
    or exists(select 1 from public.mailbox_items where report_id=report)
    or exists(select 1 from public.report_edit_receipts where report_id=report) then raise exception 'History failure was not atomic'; end if;
  create trigger report_edit_test_fail before insert on public.mailbox_items
  for each row execute function public.report_edit_test_reject_write();
  begin
    perform public.edit_report(report,input,0,gen_random_uuid());
    raise exception 'Mailbox failure unexpectedly committed';
  exception when sqlstate 'P2999' then null; end;
  drop trigger report_edit_test_fail on public.mailbox_items;
  if (select to_jsonb(r) from public.reports r where id=report) is distinct from baseline
    or (select count(*) from public.report_history where report_id=report) <> before_count
    or exists(select 1 from public.mailbox_items where report_id=report)
    or exists(select 1 from public.report_edit_receipts where report_id=report) then raise exception 'Mailbox failure was not atomic'; end if;
  request := gen_random_uuid();
  saved := public.edit_report(report,input,0,request);
  replay := public.edit_report(report,input,0,request);
  if saved <> replay or saved->>'outcome' <> 'saved'
    or (select count(*) from public.report_history where report_id=report) <> before_count+1
    or (select count(*) from public.mailbox_items where report_id=report) <> 1 then raise exception 'Replay duplicated effects'; end if;
  begin
    perform public.edit_report(report,input||jsonb_build_object('title','Different'),0,request);
    raise exception 'Mismatched replay accepted';
  exception when sqlstate 'P2003' then null; end;
  select to_jsonb(r) into baseline from public.reports r where id=report;
  saved := public.edit_report(report,input,1,gen_random_uuid());
  if saved->>'outcome' <> 'unchanged' or (select to_jsonb(r) from public.reports r where id=report) <> baseline
    or (select count(*) from public.report_history where report_id=report) <> before_count+1
    or (select count(*) from public.mailbox_items where report_id=report) <> 1 then raise exception 'No-op mutated report'; end if;
  -- Simulate a future trusted severity writer and verify change-and-change-back remains detectable.
  update public.reports set severity='low' where id=report;
  update public.reports set severity='high' where id=report;
  begin
    perform public.edit_report(report,input,1,gen_random_uuid());
    raise exception 'ABA conflict not detected';
  exception when sqlstate 'P2010' then null; end;
  if (select severity_revision from public.reports where id=report) <> 3 then raise exception 'Revision discipline failed'; end if;
  -- Preserve current and captured references independently after relinking a resolved duplicate.
  saved := public.create_report(destination,'Captured target','Description','1','Steps','Expected','Actual','low');
  captured_target := (saved->>'id')::uuid;
  saved := public.create_report(destination,'Current target','Description','1','Steps','Expected','Actual','low');
  current_target := (saved->>'id')::uuid;
  saved := public.create_report(destination,'Duplicate fixture','Description','1','Steps','Expected','Actual','low');
  duplicate_report := (saved->>'id')::uuid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',developer,'role','authenticated')::text,true);
  perform public.accept_report(duplicate_report);
  perform public.start_report_investigation(duplicate_report);
  perform public.link_duplicate_report(duplicate_report,captured_target,null);
  perform public.resolve_report(duplicate_report,jsonb_build_object('kind','duplicate','explanation','Same problem','canonical_report_id',captured_target));
  perform public.link_duplicate_report(duplicate_report,current_target,captured_target);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',tester,'role','authenticated')::text,true);
  foreach linked_target in array array[captured_target,current_target] loop
    move_input := jsonb_build_object('projectId',project,'title','Target edit','description','Description','version','1',
      'reproductionSteps','Steps','expectedResults','Expected','actualResults','Actual','severity','low','testEnvironment','');
    select to_jsonb(r) into baseline from public.reports r where id=linked_target;
    begin
      perform public.edit_report(linked_target,move_input,0,gen_random_uuid());
      raise exception 'Incoming duplicate reference allowed a project move';
    exception when sqlstate 'P2011' then null; end;
    if (select to_jsonb(r) from public.reports r where id=linked_target) is distinct from baseline
      or exists(select 1 from public.report_edit_receipts where report_id=linked_target) then
      raise exception 'Rejected duplicate-linked move wrote data';
    end if;
    saved := public.edit_report(linked_target,move_input||jsonb_build_object('projectId',destination),0,gen_random_uuid());
    if saved->>'outcome' <> 'saved' or saved->'report'->>'title' <> 'Target edit' then
      raise exception 'Same-project duplicate-linked edit was rejected';
    end if;
  end loop;
  -- These structural checks supplement, and do not replace, multi-session interleavings.
  foreach action in array array['accept_report(uuid)','start_report_investigation(uuid)',
    'await_tester_information(uuid)','resume_report_investigation(uuid)','post_report_comment(uuid,jsonb,uuid)',
    'resolve_report(uuid,jsonb)','link_duplicate_report(uuid,uuid,uuid)'] loop
    if position('Report project changed; retry' in pg_get_functiondef(('public.'||action)::regprocedure))=0 then
      raise exception 'Missing locked project recheck in %',action;
    end if;
  end loop;
  raise notice 'Edit rollback, replay, no-op, ABA and legacy guard structure passed; fixtures roll back';
end;
$$;
rollback;
