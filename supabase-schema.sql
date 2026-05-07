-- Run this in the Supabase SQL Editor to set up your project
-- Dashboard → SQL Editor → New Query → paste and run

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  video_url   text not null,
  status      text not null default 'in_review' check (status in ('in_review', 'approved')),
  created_at  timestamptz not null default now()
);

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  time        float8 not null default 0,
  text        text not null,
  username    text not null default 'Anonymous',
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists comments_review_id_idx on comments (review_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- The app uses the anon key, so we allow public read/write.
-- Tighten these policies if you add authentication later.

alter table reviews enable row level security;
alter table comments enable row level security;

create policy "Public read reviews"
  on reviews for select using (true);

create policy "Public insert reviews"
  on reviews for insert with check (true);

create policy "Public update reviews"
  on reviews for update using (true) with check (true);

create policy "Public read comments"
  on comments for select using (true);

create policy "Public insert comments"
  on comments for insert with check (true);

create policy "Public update comments"
  on comments for update using (true) with check (true);

create policy "Public delete comments"
  on comments for delete using (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enable realtime for both tables so subscriptions work.

alter publication supabase_realtime add table reviews;
alter publication supabase_realtime add table comments;
