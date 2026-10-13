-- Corper Life: campmates table. Paste this into Supabase > SQL Editor and click Run.
create table if not exists public.players (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 40),
  state text not null,
  camp text not null,
  lga text,
  phase text,
  last_seen timestamptz not null default now()
);

create index if not exists players_state_seen on public.players (state, last_seen desc);

alter table public.players enable row level security;

-- The game has no logins, so anyone with the game's public key can list players and add or refresh their own row.
drop policy if exists "players are public" on public.players;
create policy "players are public" on public.players for select to anon using (true);
drop policy if exists "players can join" on public.players;
create policy "players can join" on public.players for insert to anon with check (true);
drop policy if exists "players can check in" on public.players;
create policy "players can check in" on public.players for update to anon using (true) with check (true);
