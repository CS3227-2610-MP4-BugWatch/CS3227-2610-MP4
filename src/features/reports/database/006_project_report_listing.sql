-- Apply after 005_reports.sql.
begin;

create index reports_project_created_id_idx
  on public.reports(project_id, created_at desc, id desc);

create function public.list_project_reports(
  p_project_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  selected_name text;
begin
  if actor is null then
    raise exception using errcode = 'P2001', message = 'Authentication required';
  end if;
  if not exists (select 1 from public.profiles p where p.id = actor) then
    raise exception using errcode = 'P2002', message = 'Profile required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception using errcode = 'P2003', message = 'Incomplete report cursor';
  end if;

  select p.name into selected_name from public.projects p where p.id = p_project_id;
  if not found then
    raise exception using errcode = 'P2005', message = 'Project not found';
  end if;

  -- Return one bounded JSON value so API row limits cannot truncate the page.
  return (
    select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
    from (
      select r.id, r.project_id, r.title, selected_name as project_name, r.severity, r.state,
        r.assigned_developer_id, p.display_name as reporter_display_name, r.created_at
      from public.reports r
      join public.profiles p on p.id = r.reporter_id
      where r.project_id = p_project_id
        and (p_before_created_at is null or (r.created_at, r.id) < (p_before_created_at, p_before_id))
      order by r.created_at desc, r.id desc
      limit 100
    ) page
  );
end;
$$;

revoke all on function public.list_project_reports(uuid, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.list_project_reports(uuid, timestamptz, uuid) to authenticated;

commit;
