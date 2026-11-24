-- Kalima (بوت كلمة) — schema
-- All access happens from Edge Functions using the service role key.
-- RLS is enabled on every table with NO public policies on purpose:
-- anon/authenticated clients get nothing; the service role bypasses RLS.

create extension if not exists pgcrypto;

create table if not exists public.telegram_users (
  telegram_id bigint primary key,
  username text,
  first_name text,
  is_pro boolean not null default false,
  pro_until timestamptz,
  daily_new_limit int not null default 10,
  last_study_date date,
  streak_days int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text not null,
  is_free boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs (id) on delete cascade,
  word text not null,
  meaning_ar text not null,
  example_en text not null,
  example_ar text not null,
  sort_order int not null default 0,
  unique (pack_id, word)
);

create table if not exists public.user_word_progress (
  telegram_id bigint not null references public.telegram_users (telegram_id) on delete cascade,
  word_id uuid not null references public.words (id) on delete cascade,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_result text,
  created_at timestamptz not null default now(),
  primary key (telegram_id, word_id)
);
create index if not exists idx_uwp_due on public.user_word_progress (telegram_id, next_review_at);

create table if not exists public.quiz_events (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.telegram_users (telegram_id) on delete cascade,
  word_id uuid not null references public.words (id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_quiz_events_user_day on public.quiz_events (telegram_id, created_at);

alter table public.telegram_users enable row level security;
alter table public.packs enable row level security;
alter table public.words enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.quiz_events enable row level security;
-- Intentionally no policies: service role only.
