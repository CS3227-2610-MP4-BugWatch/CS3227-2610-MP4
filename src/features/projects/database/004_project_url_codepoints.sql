-- Apply after 003_project_history_names.sql. Correct existing invalid URLs before validating the new constraint.
begin;

create or replace function public.project_repository_url_valid(value text) returns boolean
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
  character_index integer;
  code_point integer;
begin
  if char_length(value) > 2048 or value !~* '^https?://[^/\\?#]'
    or value ~ '[[:space:][:cntrl:]\\]' or value ~ ('['||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)
      ||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)
      ||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||']') then
    return false;
  end if;
  -- URL code points plus percent escapes, fragments and IPv6 brackets.
  -- The URL/host checks below still decide whether those characters are valid in context.
  for character_index in 1..char_length(value) loop
    code_point := ascii(substring(value from character_index for 1));
    if code_point < 128 then
      if not (code_point between 48 and 57 or code_point between 65 and 90
        or code_point between 97 and 122
        or strpos('!$&''()*+,-./:;=?@_~%#[]', substring(value from character_index for 1)) > 0) then
        return false;
      end if;
    elsif code_point < 160 or code_point > 1114109
      or code_point between 55296 and 57343
      or code_point between 64976 and 65007
      or mod(code_point, 65536) in (65534, 65535) then
      return false;
    end if;
  end loop;
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
    -- An ACE label cannot contain a raw non-ASCII character.
    foreach part in array parts loop
      if left(part, 4) = 'xn--' and char_length(part) <> octet_length(part) then return false; end if;
    end loop;
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

alter table public.projects add constraint projects_repository_url_codepoints_check
  check (public.project_repository_url_valid(repository_url)) not valid;

commit;
