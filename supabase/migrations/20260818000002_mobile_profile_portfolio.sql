alter table public.profiles
  add column if not exists cover_image_url text,
  add column if not exists location text,
  add column if not exists contact_email text,
  add column if not exists cv_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

grant update (
  username,
  display_name,
  title,
  bio,
  avatar_url,
  cover_image_url,
  location,
  contact_email,
  cv_url,
  social_links,
  experience_level,
  onboarding_completed_at,
  updated_at
) on public.profiles to authenticated;

create or replace function public.profiles_sync_case_studies()
returns trigger
language plpgsql
as $$
begin
  update public.case_studies
  set
    author_name = new.display_name,
    author_username = new.username,
    author_title = new.title,
    author_avatar_url = new.avatar_url
  where author_id = new.id and legacy_id is null;
  return new;
end;
$$;

drop trigger if exists profiles_sync_case_studies on public.profiles;
create trigger profiles_sync_case_studies
  after update of display_name, username, title, avatar_url on public.profiles
  for each row execute function public.profiles_sync_case_studies();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists profile_media_public_read on storage.objects;
drop policy if exists profile_media_insert_own on storage.objects;
drop policy if exists profile_media_update_own on storage.objects;
drop policy if exists profile_media_delete_own on storage.objects;

create policy profile_media_public_read on storage.objects
  for select using (bucket_id = 'profile-media');

create policy profile_media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy profile_media_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy profile_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-media'
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
  where bucket_id in ('case-study-media', 'profile-media')
    and split_part(name, '/', 1) = uid::text;
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
    cover_image_url = null,
    location = null,
    contact_email = null,
    cv_url = null,
    social_links = '{}'::jsonb,
    points_balance_cached = 0
  where id = uid;
end;
$$;
