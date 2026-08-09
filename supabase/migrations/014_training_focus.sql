-- Trainingsfokus: Vorbereitung/Nacharbeit zum Training, ein Eintrag pro
-- Trainingseinheit. Gleiches Muster wie matches (001_matches.sql) — eigener
-- Datensatz pro Eintrag, org-gebunden von Anfang an (anders als matches,
-- das erst nachträglich um org_id erweitert wurde), filed-Flag für
-- "Ablegen", set_updated_at-Trigger (Funktion existiert bereits aus
-- 001_matches.sql).
create table if not exists public.training_focus_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  spieler text,
  datum date not null default current_date,
  energie_mental smallint check (energie_mental between 1 and 10),
  energie_physisch smallint check (energie_physisch between 1 and 10),
  trainingsziel text,
  geuebt text,
  gut text,
  verbessern text,
  einsatz_prozent smallint check (einsatz_prozent between 0 and 100),
  filed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_focus_entries_org_id_idx on public.training_focus_entries (org_id);
create index if not exists training_focus_entries_datum_idx on public.training_focus_entries (datum);

alter table public.training_focus_entries enable row level security;

create policy "Org members can view training focus entries" on public.training_focus_entries
  for select using (public.is_org_member(org_id));

create policy "Org members can insert training focus entries" on public.training_focus_entries
  for insert with check (public.is_org_member(org_id));

create policy "Org members can update training focus entries" on public.training_focus_entries
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy "Org members can delete training focus entries" on public.training_focus_entries
  for delete using (public.is_org_member(org_id));

drop trigger if exists training_focus_entries_set_updated_at on public.training_focus_entries;
create trigger training_focus_entries_set_updated_at
  before update on public.training_focus_entries
  for each row execute function public.set_updated_at();
