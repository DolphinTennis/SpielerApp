-- Punktprotokoll: Punkt-für-Punkt-Erfassung eines Matches (neben Matchticker
-- und Matchanalyse, ersetzt keines von beiden).
--
-- Der Spielverlauf (Spiele, Punkte, Aufschlag, Doppel-/Returnfehler, Winner,
-- Beobachtungen je Spiel) liegt als jsonb in `state`, denn er ist ein
-- schnell wechselndes Ganzes, das nur der Client interpretiert — wie schon
-- bei live_matches. Was man in Listen filtern will (Gegner, Datum, Ort,
-- Verknüpfung mit einer Matchanalyse), sind eigene Spalten.
--
-- Direkt für das Schema `spielerapp` geschrieben (siehe Migration 024).
-- Sichtbar und bearbeitbar für alle Mitglieder des Teams, also auch Trainer.

create table if not exists spielerapp.point_protocols (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references spielerapp.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  opponent text not null default '',
  match_date date,
  place text not null default '',
  first_server text not null default 'k' check (first_server in ('k', 'g')),
  mode text not null default 'ct' check (mode in ('ct', 'full')),
  state jsonb not null default '{"games": []}'::jsonb,
  -- Verknüpfte Matchanalyse; höchstens ein Protokoll je Matchanalyse.
  match_id uuid references spielerapp.matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists point_protocols_match_id_key
  on spielerapp.point_protocols (match_id) where match_id is not null;
create index if not exists point_protocols_org_date_idx
  on spielerapp.point_protocols (org_id, match_date desc nulls last, created_at desc);

drop trigger if exists point_protocols_set_updated_at on spielerapp.point_protocols;
create trigger point_protocols_set_updated_at
  before update on spielerapp.point_protocols
  for each row execute function spielerapp.set_updated_at();

alter table spielerapp.point_protocols enable row level security;

drop policy if exists "Org members can view point protocols" on spielerapp.point_protocols;
create policy "Org members can view point protocols"
  on spielerapp.point_protocols for select
  using (spielerapp.is_org_member(org_id));

drop policy if exists "Org members can insert point protocols" on spielerapp.point_protocols;
create policy "Org members can insert point protocols"
  on spielerapp.point_protocols for insert
  with check (spielerapp.is_org_member(org_id));

drop policy if exists "Org members can update point protocols" on spielerapp.point_protocols;
create policy "Org members can update point protocols"
  on spielerapp.point_protocols for update
  using (spielerapp.is_org_member(org_id))
  with check (spielerapp.is_org_member(org_id));

drop policy if exists "Org members can delete point protocols" on spielerapp.point_protocols;
create policy "Org members can delete point protocols"
  on spielerapp.point_protocols for delete
  using (spielerapp.is_org_member(org_id));

-- Im Schema `spielerapp` gibt es keine automatischen Rechte (die greifen nur
-- in `public`), deshalb ausdrücklich. Anonym bekommt nichts.
grant select, insert, update, delete on spielerapp.point_protocols to authenticated;
grant all on spielerapp.point_protocols to service_role;
