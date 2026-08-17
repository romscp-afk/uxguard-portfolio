-- UXGuard Studio mobile foundation
-- Additive Postgres schema for the native app. Does not modify the existing
-- Vercel Blob / JWT website. Apply in a NEW Supabase project only.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Settings (feature flags; push sending and point expiry start OFF)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('point_expiry_enabled', 'false'::jsonb),
  ('push_sending_enabled', 'false'::jsonb),
  ('allowed_sponsor_topics', '["design","ux","product_management","technology","education","careers"]'::jsonb);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users). legacy_user_id links a future web merge.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  legacy_user_id bigint unique,
  username citext unique not null,
  display_name text not null,
  title text,
  bio text,
  avatar_url text,
  experience_level text check (
    experience_level is null
    or experience_level in ('entry', 'mid', 'senior', 'lead', 'executive', 'career_change')
  ),
  onboarding_completed_at timestamptz,
  points_balance_cached integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  interest_ids uuid[] not null default '{}',
  experience_level text check (
    experience_level is null
    or experience_level in ('entry', 'mid', 'senior', 'lead', 'executive', 'career_change')
  ),
  onboarding_step text,
  marketing_opt_in boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.content_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null check (kind in ('topic', 'format')),
  parent_id uuid references public.content_categories (id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Synced published content (website remains CMS source of truth)
-- ---------------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  legacy_id bigint unique,
  slug text unique not null,
  title text not null,
  subtitle text,
  excerpt text,
  body_html text,
  body_blocks jsonb,
  cover_image_url text,
  author_name text,
  author_title text,
  author_avatar_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  reading_time_min integer not null default 1,
  category_id uuid references public.content_categories (id) on delete set null,
  tags text[] not null default '{}',
  is_sponsored boolean not null default false,
  campaign_id uuid,
  published_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_studies (
  id uuid primary key default gen_random_uuid(),
  legacy_id bigint unique,
  slug text unique not null,
  title text not null,
  subtitle text,
  summary text,
  challenge text,
  methodology text,
  impact text,
  reflections text,
  cover_image_url text,
  author_name text,
  author_username text,
  author_title text,
  author_avatar_url text,
  methods text[] not null default '{}',
  metrics jsonb not null default '[]'::jsonb,
  content_blocks jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  is_sponsored boolean not null default false,
  campaign_id uuid,
  published_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_category_map (
  content_type text not null check (content_type in ('article', 'case_study')),
  content_id uuid not null,
  category_id uuid not null references public.content_categories (id) on delete cascade,
  primary key (content_type, content_id, category_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (content_type in ('article', 'case_study')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

create table public.reading_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (content_type in ('article', 'case_study')),
  content_id uuid not null,
  percent integer not null default 0 check (percent between 0 and 100),
  last_position jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);

-- ---------------------------------------------------------------------------
-- Learning challenges
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text,
  instructions text,
  completion_criteria text,
  points_award integer not null check (points_award >= 0),
  allow_reveal_answers boolean not null default false,
  max_attempts integer,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  category_id uuid references public.content_categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenge_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  sort_order integer not null default 0,
  prompt text not null,
  choices jsonb not null,
  correct_choice_ids text[] not null,
  created_at timestamptz not null default now()
);

create table public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5, 2),
  passed boolean not null default false,
  points_awarded integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index challenge_attempts_one_award
  on public.challenge_attempts (challenge_id, user_id)
  where points_awarded > 0;

-- ---------------------------------------------------------------------------
-- Points ledger (source of truth). Cached balance on profiles is display-only.
-- ---------------------------------------------------------------------------
create table public.point_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  balance_after integer not null,
  reason text not null check (
    reason in ('challenge_complete', 'reward_redeem', 'reversal', 'expiry', 'adjustment')
  ),
  reference_type text,
  reference_id uuid,
  expires_at timestamptz,
  reversed_at timestamptz,
  reversed_by_transaction_id uuid references public.point_transactions (id),
  created_at timestamptz not null default now(),
  created_by text not null default 'system' check (created_by in ('system', 'admin'))
);

create index point_transactions_user_created_idx
  on public.point_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rewards (points are not cash; no withdraw / transfer columns)
-- ---------------------------------------------------------------------------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  kind text not null check (
    kind in ('premium_template', 'ai_credits', 'portfolio_review', 'partner_discount')
  ),
  points_cost integer not null check (points_cost > 0),
  inventory integer,
  eligibility jsonb not null default '{"one_per_user": true}'::jsonb,
  fulfilment text not null check (fulfilment in ('instant', 'pending_admin')),
  fulfilment_payload jsonb,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points_spent integer not null,
  status text not null default 'pending' check (
    status in ('pending', 'fulfilled', 'rejected', 'cancelled')
  ),
  fulfilment_payload jsonb,
  admin_note text,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Sponsored content
-- ---------------------------------------------------------------------------
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sponsor_private_profiles (
  sponsor_id uuid primary key references public.sponsors (id) on delete cascade,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.sponsored_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  title text not null,
  summary text,
  placement text not null check (placement in ('feed_card', 'article', 'case_study')),
  content_id uuid,
  cta_label text default 'Learn more',
  cta_url text,
  cover_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  relevance_topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.articles
  add constraint articles_campaign_fk
  foreign key (campaign_id) references public.sponsored_campaigns (id) on delete set null;

alter table public.case_studies
  add constraint case_studies_campaign_fk
  foreign key (campaign_id) references public.sponsored_campaigns (id) on delete set null;

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sponsored_campaigns (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('impression', 'open', 'external_click')),
  created_at timestamptz not null default now(),
  metadata jsonb
);

create unique index campaign_events_hourly_dedup
  on public.campaign_events (
    campaign_id,
    user_id,
    event_type,
    (date_trunc('hour', created_at))
  )
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- Notifications (records only; sending gated by app_settings)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  channel text not null default 'in_app' check (channel in ('in_app', 'push')),
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  challenges boolean not null default true,
  articles boolean not null default true,
  rewards boolean not null default true,
  marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text unique not null,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now()
);

create table public.rpc_rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action, window_start)
);

create index articles_published_idx on public.articles (published_at desc) where status = 'published';
create index case_studies_published_idx on public.case_studies (published_at desc) where status = 'published';
create index challenges_published_idx on public.challenges (created_at desc) where status = 'published';
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_preferences_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();
create trigger case_studies_updated before update on public.case_studies
  for each row execute function public.set_updated_at();

create or replace function public.assert_rate_limit(p_action text, p_max integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  win timestamptz := date_trunc('hour', now());
  current_count integer;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.rpc_rate_limits (user_id, action, window_start, count)
  values (uid, p_action, win, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rpc_rate_limits.count + 1
  returning count into current_count;

  if current_count > p_max then
    raise exception 'Too many attempts. Try again later.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.unique_username(base text)
returns text
language plpgsql
as $$
declare
  candidate text;
  suffix integer := 0;
begin
  candidate := left(regexp_replace(lower(coalesce(nullif(base, ''), 'member')), '[^a-z0-9]+', '-', 'g'), 24);
  candidate := trim(both '-' from candidate);
  if candidate = '' then
    candidate := 'member';
  end if;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(candidate, 20) || '-' || suffix::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  dname text;
begin
  dname := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(new.email, '@', 1),
    'Member'
  );
  uname := public.unique_username(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));

  insert into public.profiles (id, username, display_name)
  values (new.id, uname, dname);

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.point_accounts (user_id, balance) values (new.id, 0);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.apply_point_delta(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text,
  p_reference_id uuid
)
returns public.point_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance integer;
  txn public.point_transactions;
begin
  insert into public.point_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.point_accounts
  set balance = balance + p_amount,
      updated_at = now()
  where user_id = p_user_id
    and balance + p_amount >= 0
  returning balance into next_balance;

  if next_balance is null then
    raise exception 'Insufficient points' using errcode = 'P0001';
  end if;

  insert into public.point_transactions (
    user_id, amount, balance_after, reason, reference_type, reference_id
  ) values (
    p_user_id, p_amount, next_balance, p_reason, p_reference_type, p_reference_id
  ) returning * into txn;

  update public.profiles
  set points_balance_cached = next_balance
  where id = p_user_id;

  return txn;
end;
$$;

-- Quiz completion: server-side grading + one award per user/challenge
create or replace function public.complete_challenge_attempt(
  p_challenge_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  chal public.challenges;
  question record;
  total integer := 0;
  correct integer := 0;
  given text[];
  passed boolean := false;
  award integer := 0;
  attempt public.challenge_attempts;
  existing public.challenge_attempts;
  reveal jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform public.assert_rate_limit('complete_challenge_attempt', 30);

  select * into chal from public.challenges where id = p_challenge_id;
  if chal.id is null or chal.status <> 'published' then
    raise exception 'Challenge is not available' using errcode = 'P0001';
  end if;
  if chal.starts_at is not null and chal.starts_at > now() then
    raise exception 'Challenge has not started' using errcode = 'P0001';
  end if;
  if chal.ends_at is not null and chal.ends_at < now() then
    raise exception 'Challenge has ended' using errcode = 'P0001';
  end if;

  select * into existing
  from public.challenge_attempts
  where challenge_id = p_challenge_id and user_id = uid and points_awarded > 0
  limit 1;

  for question in
    select * from public.challenge_questions
    where challenge_id = p_challenge_id
    order by sort_order, id
  loop
    total := total + 1;
    given := coalesce(
      array(select jsonb_array_elements_text(coalesce(p_answers -> question.id::text, '[]'::jsonb))),
      '{}'::text[]
    );
    if given @> question.correct_choice_ids and question.correct_choice_ids @> given then
      correct := correct + 1;
    end if;
    if chal.allow_reveal_answers then
      reveal := reveal || jsonb_build_object(
        'question_id', question.id,
        'correct_choice_ids', to_jsonb(question.correct_choice_ids)
      );
    end if;
  end loop;

  if total = 0 then
    raise exception 'Challenge has no questions' using errcode = 'P0001';
  end if;

  passed := correct = total;

  if existing.id is not null then
    return jsonb_build_object(
      'attempt_id', existing.id,
      'passed', existing.passed,
      'score', existing.score,
      'points_awarded', 0,
      'already_awarded', true,
      'reveal', case when chal.allow_reveal_answers then reveal else '[]'::jsonb end
    );
  end if;

  if chal.max_attempts is not null then
    if (
      select count(*) from public.challenge_attempts
      where challenge_id = p_challenge_id and user_id = uid
    ) >= chal.max_attempts then
      raise exception 'No attempts remaining' using errcode = 'P0001';
    end if;
  end if;

  if passed then
    award := chal.points_award;
  end if;

  insert into public.challenge_attempts (
    challenge_id, user_id, answers, score, passed, points_awarded, completed_at
  ) values (
    p_challenge_id,
    uid,
    p_answers,
    round((correct::numeric / total::numeric) * 100, 2),
    passed,
    award,
    now()
  ) returning * into attempt;

  if award > 0 then
    perform public.apply_point_delta(uid, award, 'challenge_complete', 'challenge', p_challenge_id);
  end if;

  return jsonb_build_object(
    'attempt_id', attempt.id,
    'passed', attempt.passed,
    'score', attempt.score,
    'points_awarded', award,
    'already_awarded', false,
    'reveal', case when chal.allow_reveal_answers then reveal else '[]'::jsonb end
  );
end;
$$;

create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rew public.rewards;
  redemption public.reward_redemptions;
  next_status text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform public.assert_rate_limit('redeem_reward', 20);

  select * into rew from public.rewards where id = p_reward_id for update;
  if rew.id is null or not rew.is_active then
    raise exception 'Reward is not available' using errcode = 'P0001';
  end if;
  if rew.starts_at is not null and rew.starts_at > now() then
    raise exception 'Reward is not available yet' using errcode = 'P0001';
  end if;
  if rew.ends_at is not null and rew.ends_at < now() then
    raise exception 'Reward has expired' using errcode = 'P0001';
  end if;
  if rew.inventory is not null and rew.inventory <= 0 then
    raise exception 'Reward is out of stock' using errcode = 'P0001';
  end if;
  if coalesce((rew.eligibility->>'one_per_user')::boolean, true) then
    if exists (
      select 1 from public.reward_redemptions
      where reward_id = p_reward_id and user_id = uid and status in ('pending', 'fulfilled')
    ) then
      raise exception 'You have already redeemed this reward' using errcode = 'P0001';
    end if;
  end if;

  perform public.apply_point_delta(uid, -rew.points_cost, 'reward_redeem', 'reward', rew.id);

  if rew.inventory is not null then
    update public.rewards set inventory = inventory - 1 where id = rew.id;
  end if;

  next_status := case when rew.fulfilment = 'instant' then 'fulfilled' else 'pending' end;

  insert into public.reward_redemptions (
    reward_id, user_id, points_spent, status, fulfilment_payload, fulfilled_at
  ) values (
    rew.id,
    uid,
    rew.points_cost,
    next_status,
    rew.fulfilment_payload,
    case when next_status = 'fulfilled' then now() else null end
  ) returning * into redemption;

  return redemption;
end;
$$;

-- Impressions / opens / outbound clicks. NEVER awards points.
create or replace function public.record_campaign_event(
  p_campaign_id uuid,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  camp public.sponsored_campaigns;
  event_id uuid;
begin
  if p_event_type not in ('impression', 'open', 'external_click') then
    raise exception 'Invalid event' using errcode = 'P0001';
  end if;

  select * into camp from public.sponsored_campaigns
  where id = p_campaign_id
    and status = 'active'
    and starts_at <= now()
    and ends_at >= now();

  if camp.id is null then
    return null;
  end if;

  begin
    insert into public.campaign_events (campaign_id, user_id, event_type, metadata)
    values (p_campaign_id, uid, p_event_type, p_metadata)
    returning id into event_id;
  exception
    when unique_violation then
      return null;
  end;

  return event_id;
end;
$$;

create or replace function public.reverse_point_transaction(p_transaction_id uuid)
returns public.point_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.point_transactions;
  txn public.point_transactions;
begin
  -- Callable only with service role (no authenticated grant below).
  select * into src from public.point_transactions where id = p_transaction_id;
  if src.id is null then
    raise exception 'Transaction not found';
  end if;
  if src.reversed_at is not null then
    raise exception 'Already reversed';
  end if;

  txn := public.apply_point_delta(
    src.user_id,
    -src.amount,
    'reversal',
    'point_transaction',
    src.id
  );

  update public.point_transactions
  set reversed_at = now(), reversed_by_transaction_id = txn.id
  where id = src.id;

  return txn;
end;
$$;

create or replace function public.apply_point_expiry()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled boolean;
  n integer := 0;
  src public.point_transactions;
begin
  select coalesce((value #>> '{}')::boolean, false) into enabled
  from public.app_settings where key = 'point_expiry_enabled';
  if not enabled then
    return 0;
  end if;

  for src in
    select * from public.point_transactions
    where expires_at is not null
      and expires_at < now()
      and reversed_at is null
      and amount > 0
      and reason = 'challenge_complete'
  loop
    perform public.reverse_point_transaction(src.id);
    update public.point_transactions set reason = 'expiry' where id = (
      select reversed_by_transaction_id from public.point_transactions where id = src.id
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.content_categories enable row level security;
alter table public.articles enable row level security;
alter table public.case_studies enable row level security;
alter table public.content_category_map enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reading_progress enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_questions enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.point_accounts enable row level security;
alter table public.point_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_private_profiles enable row level security;
alter table public.sponsored_campaigns enable row level security;
alter table public.campaign_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.rpc_rate_limits enable row level security;

create policy app_settings_read on public.app_settings
  for select using (true);

create policy profiles_select on public.profiles
  for select using (deleted_at is null and (id = auth.uid() or onboarding_completed_at is not null));
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy user_preferences_own on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy categories_public_read on public.content_categories
  for select using (is_active = true);

create policy articles_public_read on public.articles
  for select using (status = 'published');

create policy case_studies_public_read on public.case_studies
  for select using (status = 'published');

create policy category_map_read on public.content_category_map
  for select using (true);

create policy bookmarks_own on public.bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reading_progress_own on public.reading_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy challenges_public_read on public.challenges
  for select using (status = 'published');

create policy challenge_questions_read on public.challenge_questions
  for select using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.status = 'published'
    )
  );

create policy challenge_attempts_own_select on public.challenge_attempts
  for select using (user_id = auth.uid());

create policy point_accounts_own_select on public.point_accounts
  for select using (user_id = auth.uid());

create policy point_transactions_own_select on public.point_transactions
  for select using (user_id = auth.uid());

create policy rewards_public_read on public.rewards
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy redemptions_own_select on public.reward_redemptions
  for select using (user_id = auth.uid());

create policy sponsors_public_read on public.sponsors
  for select using (is_active = true);

-- No policies on sponsor_private_profiles => only service role
-- No policies on rpc_rate_limits => only service role / definer

create policy campaigns_public_read on public.sponsored_campaigns
  for select using (
    status = 'active'
    and starts_at <= now()
    and ends_at >= now()
  );

create policy notifications_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_own_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_prefs_own on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_devices_own on public.push_devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;

grant select on
  public.app_settings,
  public.profiles,
  public.content_categories,
  public.articles,
  public.case_studies,
  public.content_category_map,
  public.challenges,
  public.rewards,
  public.sponsors,
  public.sponsored_campaigns
to anon, authenticated;

grant select, insert, update, delete on
  public.user_preferences,
  public.bookmarks,
  public.reading_progress,
  public.notification_preferences,
  public.push_devices
to authenticated;

grant select on
  public.challenge_attempts,
  public.point_accounts,
  public.point_transactions,
  public.reward_redemptions,
  public.notifications
to authenticated;

grant update on public.notifications to authenticated;
grant update on public.profiles to authenticated;

-- Column privilege: hide quiz answers from clients
revoke select on public.challenge_questions from anon, authenticated;
grant select (id, challenge_id, sort_order, prompt, choices, created_at)
  on public.challenge_questions to anon, authenticated;

revoke select (admin_note) on public.reward_redemptions from authenticated;

revoke all on public.rpc_rate_limits from anon, authenticated;
revoke all on public.sponsor_private_profiles from anon, authenticated;

grant execute on function public.complete_challenge_attempt(uuid, jsonb) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.record_campaign_event(uuid, text, jsonb) to authenticated, anon;
grant execute on function public.delete_own_account() to authenticated;

revoke execute on function public.apply_point_delta(uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.reverse_point_transaction(uuid) from public, anon, authenticated;
revoke execute on function public.apply_point_expiry() from public, anon, authenticated;
revoke execute on function public.assert_rate_limit(text, integer) from public, anon, authenticated;

-- Prevent client updates to cached balances
revoke update (points_balance_cached) on public.profiles from authenticated;
grant update (
  username, display_name, title, bio, avatar_url, experience_level, onboarding_completed_at, updated_at
) on public.profiles to authenticated;
