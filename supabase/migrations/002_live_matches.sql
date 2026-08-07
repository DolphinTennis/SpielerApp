-- One active live-tracking session per user. The entire ticker state (sets,
-- games, tiebreak/match-tiebreak progress, undo snapshots) is kept as a
-- single jsonb blob since it's an opaque, fast-changing client-side state
-- machine rather than data we need to query into.
create table if not exists public.live_matches (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  updated_at timestamptz not null default now()
);

alter table public.live_matches enable row level security;

create policy "Users can view own live match"
  on public.live_matches for select
  using (auth.uid() = user_id);

create policy "Users can insert own live match"
  on public.live_matches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own live match"
  on public.live_matches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own live match"
  on public.live_matches for delete
  using (auth.uid() = user_id);

drop trigger if exists live_matches_set_updated_at on public.live_matches;
create trigger live_matches_set_updated_at
  before update on public.live_matches
  for each row execute function public.set_updated_at();
