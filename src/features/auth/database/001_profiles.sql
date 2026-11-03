-- Apply before any project migration that references public.profiles.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '[^[:space:]]'),
  display_name text not null check (display_name ~ '[^[:space:]]'),
  role text not null check (role in ('tester', 'developer'))
);

create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create policy profiles_read_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- No ordinary insert/update/delete grant or policy: dashboard administrators
-- provision identities manually. Never derive roles from user_metadata.
commit;
