-- =====================================================================
--  에스텍 안전보건 관리 시스템 — 회사 양식팩 보관함 (stsh-forms) · v1.2.0
--  · 안전보건관리대장 회사 양식 · 원본(이수증 · 수료증 · 교안 등)을 공개 저장소가 아닌 비공개 보관함에 둡니다.
--  · 읽기: 승인된(활성) 로그인 사용자 · 쓰기: 제작자(owner)만
--  Designed & Developed by Rat Rae Choi
-- =====================================================================
create or replace function public._is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;
revoke all on function public._is_active_user() from public;
grant execute on function public._is_active_user() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('stsh-forms', 'stsh-forms', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "stsh_forms_select" on storage.objects;
drop policy if exists "stsh_forms_insert" on storage.objects;
drop policy if exists "stsh_forms_update" on storage.objects;
drop policy if exists "stsh_forms_delete" on storage.objects;
create policy "stsh_forms_select" on storage.objects for select to authenticated
  using (bucket_id = 'stsh-forms' and public._is_active_user());
create policy "stsh_forms_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'stsh-forms' and public._is_owner());
create policy "stsh_forms_update" on storage.objects for update to authenticated
  using (bucket_id = 'stsh-forms' and public._is_owner()) with check (bucket_id = 'stsh-forms' and public._is_owner());
create policy "stsh_forms_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'stsh-forms' and public._is_owner());
