-- Pilot conversation logging. Written only by the Worker with the service
-- key; RLS is enabled with no policies so the anon/public role sees nothing.

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  anon_id      text not null,
  scenario_id  text not null,
  mode         text not null check (mode in ('social', 'business')),
  user_agent   text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table if not exists public.turns (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  source      text not null check (source in ('voice', 'text', 'tutor', 'opening')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists turns_session_idx on public.turns (session_id, created_at);
create index if not exists sessions_started_idx on public.sessions (started_at desc);

alter table public.sessions enable row level security;
alter table public.turns enable row level security;
