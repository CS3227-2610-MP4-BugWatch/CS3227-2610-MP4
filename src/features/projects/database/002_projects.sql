-- Apply after src/features/auth/database/001_profiles.sql, to the test project first.
begin;

-- Match ECMAScript String.trim whitespace, including NBSP and BOM.
create function public.project_trim(value text) returns text
language sql immutable strict set search_path = '' as $$
  select btrim(value, chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)
    ||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)
    ||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279));
$$;

-- RFC 5892 Appendix A.1/A.2 ContextJ. Static regex classes are generated from
-- Python unicodedata 15.1.0 (canonical combining class 9 / Virama) and
-- Unicode joining-type data 16.0.0 (T/L/R/D). No Python dependency at runtime.
-- Data versions must be revisited when the browser's Unicode version changes.
create function public.project_contextj_valid(host text) returns boolean
language plpgsql immutable strict set search_path = '' as $$
declare
  virama_pattern constant text := U&'[\094D\09CD\0A4D\0ACD\0B4D\0BCD\0C4D\0CCD\0D3B-\0D3C\0D4D\0DCA\0E3A\0EBA\0F84\1039-\103A\1714-\1715\1734\17D2\1A60\1B44\1BAA-\1BAB\1BF2-\1BF3\2D7F\A806\A82C\A8C4\A953\A9C0\AAF6\ABED\+010A3F\+011046\+011070\+01107F\+0110B9\+011133-\+011134\+0111C0\+011235\+0112EA\+01134D\+011442\+0114C2\+0115BF\+01163F\+0116B6\+01172B\+011839\+01193D-\+01193E\+0119E0\+011A34\+011A47\+011A99\+011C3F\+011D44-\+011D45\+011D97\+011F41-\+011F42]';
  transparent_pattern constant text := U&'[\00AD\0300-\036F\0483-\0489\0591-\05BD\05BF\05C1-\05C2\05C4-\05C5\05C7\0610-\061A\061C\064B-\065F\0670\06D6-\06DC\06DF-\06E4\06E7-\06E8\06EA-\06ED\070F\0711\0730-\074A\07A6-\07B0\07EB-\07F3\07FD\0816-\0819\081B-\0823\0825-\0827\0829-\082D\0859-\085B\0897-\089F\08CA-\08E1\08E3-\0902\093A\093C\0941-\0948\094D\0951-\0957\0962-\0963\0981\09BC\09C1-\09C4\09CD\09E2-\09E3\09FE\0A01-\0A02\0A3C\0A41-\0A42\0A47-\0A48\0A4B-\0A4D\0A51\0A70-\0A71\0A75\0A81-\0A82\0ABC\0AC1-\0AC5\0AC7-\0AC8\0ACD\0AE2-\0AE3\0AFA-\0AFF\0B01\0B3C\0B3F\0B41-\0B44\0B4D\0B55-\0B56\0B62-\0B63\0B82\0BC0\0BCD\0C00\0C04\0C3C\0C3E-\0C40\0C46-\0C48\0C4A-\0C4D\0C55-\0C56\0C62-\0C63\0C81\0CBC\0CBF\0CC6\0CCC-\0CCD\0CE2-\0CE3\0D00-\0D01\0D3B-\0D3C\0D41-\0D44\0D4D\0D62-\0D63\0D81\0DCA\0DD2-\0DD4\0DD6\0E31\0E34-\0E3A\0E47-\0E4E\0EB1\0EB4-\0EBC\0EC8-\0ECE\0F18-\0F19\0F35\0F37\0F39\0F71-\0F7E\0F80-\0F84\0F86-\0F87\0F8D-\0F97\0F99-\0FBC\0FC6\102D-\1030\1032-\1037\1039-\103A\103D-\103E\1058-\1059\105E-\1060\1071-\1074\1082\1085-\1086\108D\109D\135D-\135F\1712-\1714\1732-\1733\1752-\1753\1772-\1773\17B4-\17B5\17B7-\17BD\17C6\17C9-\17D3\17DD\180B-\180D\180F\1885-\1886\18A9\1920-\1922\1927-\1928\1932\1939-\193B\1A17-\1A18\1A1B\1A56\1A58-\1A5E\1A60\1A62\1A65-\1A6C\1A73-\1A7C\1A7F\1AB0-\1ACE\1B00-\1B03\1B34\1B36-\1B3A\1B3C\1B42\1B6B-\1B73\1B80-\1B81\1BA2-\1BA5\1BA8-\1BA9\1BAB-\1BAD\1BE6\1BE8-\1BE9\1BED\1BEF-\1BF1\1C2C-\1C33\1C36-\1C37\1CD0-\1CD2\1CD4-\1CE0\1CE2-\1CE8\1CED\1CF4\1CF8-\1CF9\1DC0-\1DFF\200B\200E-\200F\202A-\202E\2060-\2064\206A-\206F\20D0-\20F0\2CEF-\2CF1\2D7F\2DE0-\2DFF\302A-\302D\3099-\309A\A66F-\A672\A674-\A67D\A69E-\A69F\A6F0-\A6F1\A802\A806\A80B\A825-\A826\A82C\A8C4-\A8C5\A8E0-\A8F1\A8FF\A926-\A92D\A947-\A951\A980-\A982\A9B3\A9B6-\A9B9\A9BC-\A9BD\A9E5\AA29-\AA2E\AA31-\AA32\AA35-\AA36\AA43\AA4C\AA7C\AAB0\AAB2-\AAB4\AAB7-\AAB8\AABE-\AABF\AAC1\AAEC-\AAED\AAF6\ABE5\ABE8\ABED\FB1E\FE00-\FE0F\FE20-\FE2F\FEFF\FFF9-\FFFB\+0101FD\+0102E0\+010376-\+01037A\+010A01-\+010A03\+010A05-\+010A06\+010A0C-\+010A0F\+010A38-\+010A3A\+010A3F\+010AE5-\+010AE6\+010D24-\+010D27\+010D69-\+010D6D\+010EAB-\+010EAC\+010EFC-\+010EFF\+010F46-\+010F50\+010F82-\+010F85\+011001\+011038-\+011046\+011070\+011073-\+011074\+01107F-\+011081\+0110B3-\+0110B6\+0110B9-\+0110BA\+0110C2\+011100-\+011102\+011127-\+01112B\+01112D-\+011134\+011173\+011180-\+011181\+0111B6-\+0111BE\+0111C9-\+0111CC\+0111CF\+01122F-\+011231\+011234\+011236-\+011237\+01123E\+011241\+0112DF\+0112E3-\+0112EA\+011300-\+011301\+01133B-\+01133C\+011340\+011366-\+01136C\+011370-\+011374\+0113BB-\+0113C0\+0113CE\+0113D0\+0113D2\+0113E1-\+0113E2\+011438-\+01143F\+011442-\+011444\+011446\+01145E\+0114B3-\+0114B8\+0114BA\+0114BF-\+0114C0\+0114C2-\+0114C3\+0115B2-\+0115B5\+0115BC-\+0115BD\+0115BF-\+0115C0\+0115DC-\+0115DD\+011633-\+01163A\+01163D\+01163F-\+011640\+0116AB\+0116AD\+0116B0-\+0116B5\+0116B7\+01171D\+01171F\+011722-\+011725\+011727-\+01172B\+01182F-\+011837\+011839-\+01183A\+01193B-\+01193C\+01193E\+011943\+0119D4-\+0119D7\+0119DA-\+0119DB\+0119E0\+011A01-\+011A0A\+011A33-\+011A38\+011A3B-\+011A3E\+011A47\+011A51-\+011A56\+011A59-\+011A5B\+011A8A-\+011A96\+011A98-\+011A99\+011C30-\+011C36\+011C38-\+011C3D\+011C3F\+011C92-\+011CA7\+011CAA-\+011CB0\+011CB2-\+011CB3\+011CB5-\+011CB6\+011D31-\+011D36\+011D3A\+011D3C-\+011D3D\+011D3F-\+011D45\+011D47\+011D90-\+011D91\+011D95\+011D97\+011EF3-\+011EF4\+011F00-\+011F01\+011F36-\+011F3A\+011F40\+011F42\+011F5A\+013430-\+013440\+013447-\+013455\+01611E-\+016129\+01612D-\+01612F\+016AF0-\+016AF4\+016B30-\+016B36\+016F4F\+016F8F-\+016F92\+016FE4\+01BC9D-\+01BC9E\+01BCA0-\+01BCA3\+01CF00-\+01CF2D\+01CF30-\+01CF46\+01D167-\+01D169\+01D173-\+01D182\+01D185-\+01D18B\+01D1AA-\+01D1AD\+01D242-\+01D244\+01DA00-\+01DA36\+01DA3B-\+01DA6C\+01DA75\+01DA84\+01DA9B-\+01DA9F\+01DAA1-\+01DAAF\+01E000-\+01E006\+01E008-\+01E018\+01E01B-\+01E021\+01E023-\+01E024\+01E026-\+01E02A\+01E08F\+01E130-\+01E136\+01E2AE\+01E2EC-\+01E2EF\+01E4EC-\+01E4EF\+01E5EE-\+01E5EF\+01E8D0-\+01E8D6\+01E944-\+01E94B\+0E0001\+0E0020-\+0E007F\+0E0100-\+0E01EF]';
  left_pattern constant text := U&'[\0620\0626\0628\062A-\062E\0633-\063F\0641-\0647\0649-\064A\066E-\066F\0678-\0687\069A-\06BF\06C1-\06C2\06CC\06CE\06D0-\06D1\06FA-\06FC\06FF\0712-\0714\071A-\071D\071F-\0727\0729\072B\072D-\072E\074E-\0758\075C-\076A\076D-\0770\0772\0775-\0777\077A-\077F\07CA-\07EA\0841-\0845\0848\084A-\0853\0855\0860\0862-\0865\0868\0886\0889-\088D\08A0-\08A9\08AF-\08B0\08B3-\08B8\08BA-\08C8\1807\1820-\1878\1887-\18A8\18AA\A840-\A872\+010AC0-\+010AC4\+010ACD\+010AD3-\+010ADC\+010ADE-\+010AE0\+010AEB-\+010AEE\+010B80\+010B82\+010B86-\+010B88\+010B8A-\+010B8B\+010B8D\+010B90\+010BAD-\+010BAE\+010D00-\+010D21\+010D23\+010EC3-\+010EC4\+010F30-\+010F32\+010F34-\+010F44\+010F51-\+010F53\+010F70-\+010F73\+010F76-\+010F81\+010FB0\+010FB2-\+010FB3\+010FB8\+010FBB-\+010FBC\+010FBE-\+010FBF\+010FC1\+010FC4\+010FCA-\+010FCB\+01E900-\+01E943]';
  right_pattern constant text := U&'[\0620\0622-\063F\0641-\064A\066E-\066F\0671-\0673\0675-\06D3\06D5\06EE-\06EF\06FA-\06FC\06FF\0710\0712-\072F\074D-\077F\07CA-\07EA\0840-\0858\0860\0862-\0865\0867-\086A\0870-\0882\0886\0889-\088E\08A0-\08AC\08AE-\08C8\1807\1820-\1878\1887-\18A8\18AA\A840-\A871\+010AC0-\+010AC5\+010AC7\+010AC9-\+010ACA\+010ACE-\+010AD6\+010AD8-\+010AE1\+010AE4\+010AEB-\+010AEF\+010B80-\+010B91\+010BA9-\+010BAE\+010D01-\+010D23\+010EC2-\+010EC4\+010F30-\+010F44\+010F51-\+010F54\+010F70-\+010F81\+010FB0\+010FB2-\+010FB6\+010FB8-\+010FBF\+010FC1-\+010FC4\+010FC9-\+010FCA\+01E900-\+01E943]';
  character_index integer;
  neighbour integer;
  joiner_character text;
  left_valid boolean;
  right_valid boolean;
begin
  for character_index in 1..char_length(host) loop
    joiner_character := substring(host from character_index for 1);
    if joiner_character <> chr(8204) and joiner_character <> chr(8205) then continue; end if;
    if character_index > 1 and substring(host from character_index - 1 for 1) ~ virama_pattern then continue; end if;
    if joiner_character = chr(8205) then return false; end if;
    left_valid := false;
    neighbour := character_index - 1;
    while neighbour >= 1 loop
      joiner_character := substring(host from neighbour for 1);
      if joiner_character ~ transparent_pattern then neighbour := neighbour - 1; continue; end if;
      left_valid := joiner_character ~ left_pattern;
      exit;
    end loop;
    if not left_valid then return false; end if;
    right_valid := false;
    neighbour := character_index + 1;
    while neighbour <= char_length(host) loop
      joiner_character := substring(host from neighbour for 1);
      if joiner_character ~ transparent_pattern then neighbour := neighbour + 1; continue; end if;
      right_valid := joiner_character ~ right_pattern;
      exit;
    end loop;
    if not right_valid then return false; end if;
  end loop;
  return true;
end;
$$;

create function public.project_repository_url_valid(value text) returns boolean
language plpgsql immutable strict set search_path = '' as $$
declare
  authority text;
  host text;
  port_text text;
  address inet;
  parts text[];
  part text;
  digit text;
  radix integer;
  part_value numeric;
  part_index integer;
  digit_index integer;
  host_index integer;
  host_bytes bytea;
begin
  if char_length(value) > 2048 or value !~* '^https?://[^/\\?#]'
    or value ~ '[[:space:][:cntrl:]\\]' or value ~ ('['||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)
      ||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)
      ||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||']') then
    return false;
  end if;
  authority := split_part(regexp_replace(value, '^https?://', '', 'i'), '/', 1);
  authority := split_part(split_part(authority, '?', 1), '#', 1);
  -- Userinfo is permitted by URL parsing but never used as credentials by BugWatch.
  host := regexp_replace(authority, '^.*@', '');
  if host = '' then return false; end if;
  if left(host, 1) = '[' then
    if host !~ '^\[[0-9A-Fa-f:.]+\](:[0-9]*)?$' then return false; end if;
    begin
      address := substring(host from '^\[([^]]+)\]')::inet;
      if family(address) <> 6 then return false; end if;
    exception when invalid_text_representation then return false;
    end;
    port_text := substring(host from '\]:([0-9]*)$');
  else
    if host ~ '[<>\[\]^|]' or host ~ '%(00|09|0[aAdD]|20|23|2[fF]|3[aAcCeEfF]|40|5[bBcCdD]|7[cC])'
      or strpos(regexp_replace(host, '%[0-9A-Fa-f]{2}', '', 'g'), '%') > 0
      or host !~ '^[^:]+(:[0-9]*)?$' then return false; end if;
    port_text := substring(host from ':([0-9]*)$');
    host := split_part(host, ':', 1);
    if host = '' then return false; end if;
    -- WHATWG percent-decodes a domain before classifying numeric IPv4 hosts.
    -- Build bytes first so percent-encoded UTF-8 is decoded as one sequence.
    host_bytes := ''::bytea;
    host_index := 1;
    while host_index <= char_length(host) loop
      if substring(host from host_index for 1) = '%' then
        host_bytes := host_bytes || decode(substring(host from host_index + 1 for 2), 'hex');
        host_index := host_index + 3;
      else
        host_bytes := host_bytes || convert_to(substring(host from host_index for 1), 'UTF8');
        host_index := host_index + 1;
      end if;
    end loop;
    begin
      host := convert_from(host_bytes, 'UTF8');
    exception when character_not_in_repertoire or untranslatable_character then return false;
    end;
    -- Decoding must not introduce forbidden host delimiters or controls.
    if host ~ '[[:space:][:cntrl:]<>\[\]^|%:/?#@\\]'
      or not public.project_contextj_valid(host) then return false; end if;
    -- WHATWG treats hosts ending in a numeric label as IPv4, including
    -- shortened, hexadecimal and octal forms; do not accept invalid numeric hosts.
    parts := string_to_array(rtrim(lower(host), '.'), '.');
    if parts[array_length(parts, 1)] ~ '^(0x[0-9a-f]*|[0-9]+)$' then
      if array_length(parts, 1) > 4 then return false; end if;
      for part_index in 1..array_length(parts, 1) loop
        part := parts[part_index];
        radix := 10;
        if left(part, 2) = '0x' then radix := 16; part := substring(part from 3);
        elsif length(part) > 1 and left(part, 1) = '0' then radix := 8; part := substring(part from 2);
        end if;
        if (radix = 10 and part !~ '^[0-9]+$')
          or (radix = 8 and part !~ '^[0-7]*$')
          or (radix = 16 and part !~ '^[0-9a-f]*$') then return false; end if;
        part_value := 0;
        for digit_index in 1..length(part) loop
          digit := substring(part from digit_index for 1);
          part_value := part_value * radix + strpos('0123456789abcdef', digit) - 1;
          if part_value > 4294967295 then return false; end if;
        end loop;
        if part_index < array_length(parts, 1) and part_value > 255 then return false; end if;
        if part_index = array_length(parts, 1)
          and part_value >= power(256::numeric, 5 - array_length(parts, 1)) then return false; end if;
      end loop;
    end if;
  end if;
  if port_text is not null and port_text <> '' then
    port_text := ltrim(port_text, '0');
    if port_text = '' then port_text := '0'; end if;
    if length(port_text) > 5 or port_text::integer > 65535 then return false; end if;
  end if;
  return true;
end;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = public.project_trim(name) and char_length(name) between 1 and 100),
  description text not null check (description = public.project_trim(description) and char_length(description) between 1 and 5000),
  repository_url text not null check (repository_url = public.project_trim(repository_url) and public.project_repository_url_valid(repository_url)),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0),
  archived_at timestamptz
);
create unique index projects_normalized_name_key on public.projects(lower(public.project_trim(name)));

create table public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  actor_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  event text not null check (event in ('created', 'edited')),
  changes jsonb not null check (jsonb_typeof(changes) = 'object')
);
create index project_history_project_time_key on public.project_history(project_id, occurred_at, id);

alter table public.projects enable row level security;
alter table public.project_history enable row level security;
revoke all on public.projects, public.project_history from public, anon, authenticated;
grant select on public.projects, public.project_history to authenticated;
-- Reuse the own-profile policy; do not expose other users' profile rows.
create policy projects_read on public.projects for select to authenticated
  using (exists(select 1 from public.profiles where id = (select auth.uid())));
create policy project_history_read on public.project_history for select to authenticated
  using (exists(select 1 from public.profiles where id = (select auth.uid())));

create function public.create_project(p_name text, p_description text, p_repository_url text)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  saved public.projects;
begin
  if actor is null then raise exception using errcode = 'P1001', message = 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id = actor and role = 'developer') then
    raise exception using errcode = 'P1002', message = 'Developer role required';
  end if;
  p_name := public.project_trim(p_name);
  p_description := public.project_trim(p_description);
  p_repository_url := public.project_trim(p_repository_url);
  if p_name is null or char_length(p_name) not between 1 and 100
    or p_description is null or char_length(p_description) not between 1 and 5000
    or p_repository_url is null or not public.project_repository_url_valid(p_repository_url) then
    raise exception using errcode = 'P1003', message = 'Invalid project fields';
  end if;
  insert into public.projects(name, description, repository_url, created_by)
    values(p_name, p_description, p_repository_url, actor) returning * into saved;
  insert into public.project_history(project_id, actor_id, occurred_at, event, changes)
    values(saved.id, actor, saved.created_at, 'created', jsonb_build_object(
      'name', jsonb_build_object('before', null, 'after', saved.name),
      'description', jsonb_build_object('before', null, 'after', saved.description),
      'repository_url', jsonb_build_object('before', null, 'after', saved.repository_url)));
  return saved;
end;
$$;

create function public.update_project(p_project_id uuid, p_expected_revision integer,
  p_name text, p_description text, p_repository_url text)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  previous public.projects;
  saved public.projects;
  changes jsonb := '{}'::jsonb;
begin
  if actor is null then raise exception using errcode = 'P1001', message = 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id = actor and role = 'developer') then
    raise exception using errcode = 'P1002', message = 'Developer role required';
  end if;
  select * into previous from public.projects where id = p_project_id for update;
  if not found then raise exception using errcode = 'P1005', message = 'Project not found'; end if;
  if previous.archived_at is not null then raise exception using errcode = 'P1004', message = 'Project is archived'; end if;
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = 'P1003', message = 'Invalid revision';
  end if;
  if previous.revision <> p_expected_revision then raise exception using errcode = 'P1006', message = 'Project revision conflict'; end if;
  p_name := public.project_trim(p_name);
  p_description := public.project_trim(p_description);
  p_repository_url := public.project_trim(p_repository_url);
  if p_name is null or char_length(p_name) not between 1 and 100
    or p_description is null or char_length(p_description) not between 1 and 5000
    or p_repository_url is null or not public.project_repository_url_valid(p_repository_url) then
    raise exception using errcode = 'P1003', message = 'Invalid project fields';
  end if;
  if previous.name <> p_name then changes := changes || jsonb_build_object('name', jsonb_build_object('before', previous.name, 'after', p_name)); end if;
  if previous.description <> p_description then changes := changes || jsonb_build_object('description', jsonb_build_object('before', previous.description, 'after', p_description)); end if;
  if previous.repository_url <> p_repository_url then changes := changes || jsonb_build_object('repository_url', jsonb_build_object('before', previous.repository_url, 'after', p_repository_url)); end if;
  if changes = '{}'::jsonb then return previous; end if;
  update public.projects set name = p_name, description = p_description, repository_url = p_repository_url,
    updated_at = clock_timestamp(), revision = previous.revision + 1
    where id = p_project_id returning * into saved;
  insert into public.project_history(project_id, actor_id, occurred_at, event, changes)
    values(saved.id, actor, saved.updated_at, 'edited', changes);
  return saved;
end;
$$;

revoke all on function public.project_trim(text), public.project_contextj_valid(text), public.project_repository_url_valid(text),
  public.create_project(text,text,text), public.update_project(uuid,integer,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_project(text,text,text),
  public.update_project(uuid,integer,text,text,text) to authenticated;
-- Service-role access is reserved for isolated test fixture setup, never the browser.
grant all on public.projects, public.project_history to service_role;
grant execute on function public.project_trim(text), public.project_contextj_valid(text), public.project_repository_url_valid(text) to service_role;

commit;
