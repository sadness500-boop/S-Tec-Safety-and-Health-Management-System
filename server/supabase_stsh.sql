-- =====================================================================
--  S-Tec Safety & Health Management System(에스텍 안전보건 관리 시스템) — 통합 로그인 서버 작업
--  Designed & Developed by Rat Rae Choi
--
--  ● 어디에 실행하나요?  통합 로그인 Supabase 프로젝트(mnsuebexlzhvomxhrear) → SQL Editor → 이 파일 전체 붙여넣기 → Run
--  ● 무엇을 하나요?
--    1) 통합관리 시스템 「프로그램 등록부」(program_registry)에 안전보건 관리(stsh)를 근태관리(ams, sort 20) 다음 카드(sort 25)로 등록
--    2) 프로그램별 권한(app_access)에서 stsh 지정 가능하게 함
--    3) 공유 안전보건 기록 sh_records + sh_put · sh_list · sh_delete
--       - 현장(사용자)은 자기 기록을 올리고 고침 · 제작자·관리자는 전체 · 담당 지사를 받은 사용자는 그 지사 기록
--       - 사고·아차사고(kind = 'ev') 원본은 처음 올린 내용(data → first_data)을 따로 보존 — 이후 고쳐도 원본은 남음
--    4) 월간 안전 지표 sh_kpi + sh_kpi_put · sh_kpi_list  → 성과관리 · 고객사 포털[14]이 읽음
--    5) 프로그램 간 연계함 sh_links + sh_link_push · sh_link_list · sh_link_done → 법률 대응 시스템(증빙 묶음) 등
--    6) sh_adhoc_ra(사업장키, 제목, 참조) → 사건·사고 즉시 보고 시스템[16]이 수시 위험성평가를 열 때 씀
--  ● 기존 자료는 지우지 않습니다. 다시 실행해도 안전합니다.
-- =====================================================================
do $$
declare c record;
begin
  if to_regclass('public.program_registry') is not null then
    insert into public.program_registry (code, name, full_name, url, icon, color, sort, uses_access, version, note)
    values ('stsh', '안전보건 관리 시스템', 'S-Tec Safety & Health Management System',
            'https://sadness500-boop.github.io/S-Tec-Safety-and-Health-Management-System/',
            'assets/apps/stsh.png', '#C2410C', 25, true, '1.0.0',
            '중대재해처벌법 대응 · 위험성평가 · TBM · 안전점검 · 아차사고 · 교육·보호구 · 도급인 협의')
    on conflict (code) do update set name = excluded.name, url = excluded.url, icon = excluded.icon, full_name = excluded.full_name,
      color = excluded.color, sort = excluded.sort, note = excluded.note, uses_access = excluded.uses_access, version = excluded.version;
  end if;
  if to_regclass('public.app_access') is not null then
    for c in select conname from pg_constraint
             where conrelid = 'public.app_access'::regclass and contype = 'c'
               and pg_get_constraintdef(oid) ilike '%(app = ANY%'
    loop
      execute format('alter table public.app_access drop constraint %I', c.conname);
    end loop;
  end if;
end $$;

-- 공유 안전보건 기록 -----------------------------------------------------------
create table if not exists public.sh_records (
  id          text primary key,                 -- kind_고유값 (tbm은 tbm_사업장키_일자_업종)
  owner       uuid not null default auth.uid(),
  site_key    text not null default '',
  site_name   text not null default '',
  org         text not null default '',
  br          text not null default '',
  kind        text not null,                    -- ra · tbm · chk · ev · op · edu · ppe · co · wk
  d           date not null,
  data        jsonb not null,
  first_data  jsonb,                            -- 사고·아차사고 원본(처음 올린 내용) — 고치지 않음
  updated_at  timestamptz not null default now()
);
create index if not exists sh_records_d_idx on public.sh_records (d);
create index if not exists sh_records_site_idx on public.sh_records (site_key, kind, d);
alter table public.sh_records enable row level security;
-- 표에 직접 접근하는 정책은 두지 않고 아래 함수로만 읽고 씁니다(고객사 계정 · 다른 프로그램도 함수로만).

create or replace function public._sh_scope() returns json
language plpgsql stable security definer set search_path = public as $$
declare pr public.profiles; br text[] := '{}';
begin
  select * into pr from public.profiles where id = auth.uid();
  if not found or pr.status <> 'active' then return json_build_object('ok', false); end if;
  if pr.role in ('owner','admin') then return json_build_object('ok', true, 'all', true); end if;
  if to_regclass('public.app_access') is not null then
    execute 'select coalesce(branches, ''{}'') from public.app_access where user_id = $1 and app = ''stsh'' and perm = ''use''' into br using pr.id;
  end if;
  return json_build_object('ok', true, 'all', false, 'branches', coalesce(br, '{}'));
end $$;

create or replace function public.sh_put(p_rows jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0; sc json := public._sh_scope(); cur public.sh_records;
begin
  if not (sc->>'ok')::boolean then raise exception '승인된 계정만 저장할 수 있습니다'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception '목록 형식이 아닙니다'; end if;
  if octet_length(p_rows::text) > 8000000 then raise exception '한 번에 올리는 자료가 너무 큽니다(8MB 초과)'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    select * into cur from public.sh_records where id = r->>'id';
    if found and cur.owner <> auth.uid() and not coalesce((sc->>'all')::boolean, false) then continue; end if;
    insert into public.sh_records (id, owner, site_key, site_name, org, br, kind, d, data, first_data, updated_at)
    values (r->>'id', coalesce(cur.owner, auth.uid()), coalesce(r->>'site_key',''), coalesce(r->>'site_name',''), coalesce(r->>'org',''), coalesce(r->>'br',''),
            r->>'kind', (r->>'d')::date, r->'data', case when r->>'kind' = 'ev' then r->'data' else null end, now())
    on conflict (id) do update set site_name = excluded.site_name, org = excluded.org, br = excluded.br, d = excluded.d, data = excluded.data,
      first_data = coalesce(public.sh_records.first_data, excluded.first_data), updated_at = now();
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'count', n);
end $$;

create or replace function public.sh_list(p_from date, p_to date) returns setof public.sh_records
language plpgsql stable security definer set search_path = public as $$
declare sc json := public._sh_scope(); brs text[];
begin
  if not (sc->>'ok')::boolean then return; end if;
  if (sc->>'all')::boolean then
    return query select * from public.sh_records where (d between p_from and p_to) or kind in ('ra','wk') order by d limit 50000;
  end if;
  select coalesce(array_agg(x), '{}') into brs from json_array_elements_text(sc->'branches') x;
  return query select * from public.sh_records
    where ((d between p_from and p_to) or kind in ('ra','wk')) and (owner = auth.uid() or (array_length(brs,1) > 0 and org = 'best' and br = any(brs)))
    order by d limit 50000;
end $$;

create or replace function public.sh_delete(p_ids text[]) returns json
language plpgsql security definer set search_path = public as $$
declare sc json := public._sh_scope(); n int;
begin
  if not (sc->>'ok')::boolean then raise exception '승인된 계정만 지울 수 있습니다'; end if;
  -- 사고·아차사고 보고는 지우지 않습니다(법률 대응 중일 수 있음) — 제작자·관리자도 보존
  delete from public.sh_records where id = any(p_ids) and kind <> 'ev' and (owner = auth.uid() or coalesce((sc->>'all')::boolean, false));
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'count', n);
end $$;

-- 월간 안전 지표(성과관리 · 고객사 포털[14]이 읽음) -----------------------------------
create table if not exists public.sh_kpi (
  site_key   text not null,
  ym         text not null,                    -- 2026-11
  site_name  text not null default '',
  org        text not null default '',
  br         text not null default '',
  data       jsonb not null,                   -- tbm_rate · check_rate · ra_score · action_rate · edu_rate · ppe_rate · shi · open_actions · overdue · near_miss · accidents
  updated_at timestamptz not null default now(),
  primary key (site_key, ym)
);
alter table public.sh_kpi enable row level security;
create or replace function public.sh_kpi_put(p_rows jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0; sc json := public._sh_scope();
begin
  if not (sc->>'ok')::boolean then raise exception '승인된 계정만 저장할 수 있습니다'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.sh_kpi (site_key, ym, site_name, org, br, data, updated_at)
    values (r->>'site_key', r->>'ym', coalesce(r->>'site_name',''), coalesce(r->>'org',''), coalesce(r->>'br',''), r->'data', now())
    on conflict (site_key, ym) do update set site_name = excluded.site_name, data = excluded.data, updated_at = now();
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'count', n);
end $$;
create or replace function public.sh_kpi_list(p_ym text) returns setof public.sh_kpi
language sql stable security definer set search_path = public as $$
  select k.* from public.sh_kpi k where k.ym = p_ym and (public._sh_scope()->>'ok')::boolean
$$;

-- 프로그램 간 연계함(법률 대응 · 포털 등) ------------------------------------------
create table if not exists public.sh_links (
  id         bigserial primary key,
  from_app   text not null default 'stsh',
  to_app     text not null,                    -- stlr(법률 대응) · stpm · portal …
  kind       text not null,                    -- evidence(사업주 의무 이행 증빙 묶음) …
  site_key   text not null default '',
  ref        text not null default '',         -- 사건 기록 id
  payload    jsonb not null,
  hash       text not null default '',
  status     text not null default 'sent',     -- sent · received · done
  summary    text not null default '',         -- 법률 검토 완료 요약(상세 검토는 법률 대응 시스템에만)
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  done_at    timestamptz
);
alter table public.sh_links enable row level security;
create or replace function public.sh_link_push(p_to text, p_kind text, p_site text, p_ref text, p_payload jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare sc json := public._sh_scope(); nid bigint;
begin
  if not (sc->>'ok')::boolean then raise exception '승인된 계정만 보낼 수 있습니다'; end if;
  insert into public.sh_links (to_app, kind, site_key, ref, payload, hash)
  values (p_to, p_kind, coalesce(p_site,''), coalesce(p_ref,''), p_payload, encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex')) returning id into nid;
  return json_build_object('ok', true, 'id', nid);
end $$;
create or replace function public.sh_link_list(p_to text) returns setof public.sh_links
language sql stable security definer set search_path = public as $$
  select l.* from public.sh_links l where l.to_app = p_to and coalesce((public._sh_scope()->>'all')::boolean, false) order by l.id desc limit 500
$$;
create or replace function public.sh_link_done(p_id bigint, p_summary text) returns json
language plpgsql security definer set search_path = public as $$
declare sc json := public._sh_scope();
begin
  if not coalesce((sc->>'all')::boolean, false) then raise exception '제작자·관리자만 처리할 수 있습니다'; end if;
  update public.sh_links set status = 'done', summary = coalesce(p_summary,''), done_at = now() where id = p_id;
  return json_build_object('ok', true);
end $$;

-- 사건·사고 즉시 보고 시스템[16] → 수시 위험성평가 열기 ---------------------------------
create or replace function public.sh_adhoc_ra(p_site text, p_site_name text, p_title text, p_ref text, p_d date default current_date) returns json
language plpgsql security definer set search_path = public as $$
declare sc json := public._sh_scope(); rid text := 'ra_adhoc_' || coalesce(nullif(p_ref,''), md5(random()::text));
begin
  if not (sc->>'ok')::boolean then raise exception '승인된 계정만 만들 수 있습니다'; end if;
  insert into public.sh_records (id, site_key, site_name, kind, d, data)
  values (rid, p_site, coalesce(p_site_name,''), 'ra', p_d, jsonb_build_object('id', rid, 'kind', 'ra', 'site', p_site, 'job', 'sec', 'type', 'adhoc', 'd', p_d,
          'title', '수시 위험성평가 — ' || coalesce(p_title,''), 'ref', p_ref, 'st', 'draft', 'part', '[]'::jsonb, 'items', '[]'::jsonb, 'at', now()))
  on conflict (id) do nothing;
  return json_build_object('ok', true, 'id', rid);
end $$;

revoke all on function public._sh_scope() from public, anon;
revoke all on function public.sh_put(jsonb) from public, anon;
revoke all on function public.sh_list(date, date) from public, anon;
revoke all on function public.sh_delete(text[]) from public, anon;
revoke all on function public.sh_kpi_put(jsonb) from public, anon;
revoke all on function public.sh_kpi_list(text) from public, anon;
revoke all on function public.sh_link_push(text, text, text, text, jsonb) from public, anon;
revoke all on function public.sh_link_list(text) from public, anon;
revoke all on function public.sh_link_done(bigint, text) from public, anon;
revoke all on function public.sh_adhoc_ra(text, text, text, text, date) from public, anon;
grant execute on function public.sh_put(jsonb), public.sh_list(date, date), public.sh_delete(text[]), public.sh_kpi_put(jsonb), public.sh_kpi_list(text),
  public.sh_link_push(text, text, text, text, jsonb), public.sh_link_list(text), public.sh_link_done(bigint, text), public.sh_adhoc_ra(text, text, text, text, date) to authenticated;

-- 확인: stsh 한 줄 + 표 3개 0건 이상이 보이면 완료
select code, name, sort from public.program_registry where code = 'stsh';
select (select count(*) from public.sh_records) as sh_records, (select count(*) from public.sh_kpi) as sh_kpi, (select count(*) from public.sh_links) as sh_links;
