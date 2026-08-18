-- Mobile users can author their own case studies (drafts + publish).
-- Synced website studio content stays read-only (legacy_id is set).

alter table public.case_studies
  add column if not exists author_id uuid references public.profiles (id) on delete set null,
  add column if not exists client text,
  add column if not exists role text,
  add column if not exists duration text,
  add column if not exists prototype_url text;

create index if not exists case_studies_author_idx on public.case_studies (author_id, updated_at desc);

drop policy if exists case_studies_public_read on public.case_studies;

create policy case_studies_select on public.case_studies
  for select using (status = 'published' or author_id = auth.uid());

create policy case_studies_insert_own on public.case_studies
  for insert to authenticated
  with check (author_id = auth.uid() and legacy_id is null);

create policy case_studies_update_own on public.case_studies
  for update to authenticated
  using (author_id = auth.uid() and legacy_id is null)
  with check (author_id = auth.uid() and legacy_id is null);

create policy case_studies_delete_own on public.case_studies
  for delete to authenticated
  using (author_id = auth.uid() and legacy_id is null);

grant select, insert, update, delete on public.case_studies to authenticated;

create or replace function public.case_studies_author_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from auth.uid() then
      raise exception 'Cannot create a case study for another user';
    end if;
    if (
      select count(*) from public.case_studies
      where author_id = auth.uid() and status <> 'archived'
    ) >= 8 then
      raise exception 'Case study limit reached';
    end if;
    new.featured := false;
    new.is_sponsored := false;
    new.campaign_id := null;
    new.legacy_id := null;
  elsif tg_op = 'UPDATE' then
    if old.legacy_id is not null then
      raise exception 'Synced studio case studies cannot be edited in the app';
    end if;
    new.author_id := old.author_id;
    new.legacy_id := old.legacy_id;
    new.featured := old.featured;
    new.is_sponsored := old.is_sponsored;
    new.campaign_id := old.campaign_id;
  end if;

  return new;
end;
$$;

drop trigger if exists case_studies_author_guard on public.case_studies;
create trigger case_studies_author_guard
  before insert or update on public.case_studies
  for each row execute function public.case_studies_author_guard();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-study-media',
  'case-study-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists case_study_media_public_read on storage.objects;
drop policy if exists case_study_media_insert_own on storage.objects;
drop policy if exists case_study_media_update_own on storage.objects;
drop policy if exists case_study_media_delete_own on storage.objects;

create policy case_study_media_public_read on storage.objects
  for select using (bucket_id = 'case-study-media');

create policy case_study_media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-study-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy case_study_media_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'case-study-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'case-study-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy case_study_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-study-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform public.assert_rate_limit('delete_own_account', 3);

  delete from storage.objects
  where bucket_id = 'case-study-media' and split_part(name, '/', 1) = uid::text;
  delete from public.case_studies where author_id = uid;
  delete from public.push_devices where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.notification_preferences where user_id = uid;
  delete from public.bookmarks where user_id = uid;
  delete from public.reading_progress where user_id = uid;
  delete from public.challenge_attempts where user_id = uid;
  delete from public.reward_redemptions where user_id = uid;
  delete from public.point_transactions where user_id = uid;
  delete from public.point_accounts where user_id = uid;
  delete from public.user_preferences where user_id = uid;
  delete from public.campaign_events where user_id = uid;

  update public.profiles
  set
    deleted_at = now(),
    display_name = 'Deleted user',
    username = 'deleted-' || substr(uid::text, 1, 8),
    title = null,
    bio = null,
    avatar_url = null,
    points_balance_cached = 0
  where id = uid;
end;
$$;
