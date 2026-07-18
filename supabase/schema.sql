-- Settlers — Supabase schema (RLS enabled).
-- Run once in the Supabase SQL editor (or `psql`) before using the API routes.
-- Column names are snake_case to match lib/store.ts's PostgREST payloads.

create table if not exists purchases (
  id             text primary key,
  user_id        text not null,
  merchant       text not null default '',
  item           text not null default '',
  amount         numeric not null default 0,
  date           text not null default '',
  source         text not null default 'gmail',
  evidence_label text not null default '',
  brand          text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists purchases_user_idx on purchases (user_id);

create table if not exists class_action_matches (
  id            text primary key,
  user_id       text not null,
  brand         text not null default '',
  item          text not null default '',
  source        text not null default 'courtlistener',  -- 'courtlistener' | 'web'
  title         text not null default '',
  url           text not null default '',
  court         text not null default '',
  active        boolean not null default true,
  confidence    numeric not null default 0,
  claim_url     text,
  summary       text not null default '',
  payout_low    numeric not null default 0,
  payout_high   numeric not null default 0,
  deadline      text,
  purchase_ids  jsonb not null default '[]',
  why_qualified jsonb not null default '[]',
  uncertainties jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
create index if not exists matches_user_idx on class_action_matches (user_id);

-- RLS enabled. The backend authenticates with better-auth (not Supabase Auth)
-- and calls PostgREST with the anon/publishable key, so there's no auth.uid()
-- to scope by — the policies below grant the anon + authenticated roles full
-- access. NOTE: the publishable key ships to the browser, so these tables are
-- effectively world-readable/writable. For real isolation, use a
-- SUPABASE_SERVICE_ROLE_KEY on the server (it bypasses RLS) and tighten/remove
-- these anon policies.
alter table purchases enable row level security;
alter table class_action_matches enable row level security;

drop policy if exists purchases_anon_all on purchases;
create policy purchases_anon_all on purchases
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists matches_anon_all on class_action_matches;
create policy matches_anon_all on class_action_matches
  for all to anon, authenticated
  using (true) with check (true);
