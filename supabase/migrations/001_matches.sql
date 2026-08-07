-- Matchanalyse: one row per match, holding both the "Spielreflexion" (form1)
-- and "Triple-A-Analyse" (form2) answers as jsonb so the schema mirrors the
-- reference app's record shape without a wide, sparse column list.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spieler text not null default 'Naila Wieland',
  datum date,
  gegner text,
  ergebnis text,
  turnier text,
  verlauf text,
  filed boolean not null default false,
  form1 jsonb not null default '{}'::jsonb,
  form2 jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_user_id_idx on public.matches (user_id);
create index if not exists matches_datum_idx on public.matches (datum);

alter table public.matches enable row level security;

create policy "Users can view own matches"
  on public.matches for select
  using (auth.uid() = user_id);

create policy "Users can insert own matches"
  on public.matches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own matches"
  on public.matches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own matches"
  on public.matches for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();
