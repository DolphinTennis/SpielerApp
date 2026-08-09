-- Trainingsplan: eine training_sessions-Zeile ist entweder eine
-- wöchentliche Regel (weekdays nicht leer) oder ein einmaliger Termin
-- (weekdays leer, start_date = der eine Termin). Einzelne Vorkommen einer
-- Serie werden nie als eigene Zeilen materialisiert — Absagen/
-- Verschiebungen landen sparsam in training_session_exceptions.
--
-- status wird wie bei year_plan_days (006) per Trigger serverseitig aus der
-- Rolle des Aufrufers abgeleitet, ABER mit einer bewussten Abweichung:
-- hier zählen sowohl spieler ALS AUCH management als Admin (auto-confirmed
-- + dürfen bestätigen) — nicht nur spieler wie bei der Jahresplanung.
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('tennis', 'kondi', 'physio', 'mental')),
  location text,
  with_whom text,
  note text,
  start_time time not null,
  end_time time not null,
  weekdays smallint[] not null default '{}',  -- 0=So..6=Sa (JS Date#getDay()); leer = Einmaltermin
  start_date date not null,
  end_date date,
  status text not null default 'proposed' check (status in ('confirmed', 'proposed')),
  created_by uuid references auth.users(id),
  created_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_sessions_time_range check (end_time > start_time),
  constraint training_sessions_weekdays_valid check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  constraint training_sessions_shape check (
    (cardinality(weekdays) = 0 and end_date is null)
    or (cardinality(weekdays) > 0 and (end_date is null or end_date >= start_date))
  )
);

create index if not exists training_sessions_org_id_idx on public.training_sessions (org_id);
create index if not exists training_sessions_org_start_date_idx on public.training_sessions (org_id, start_date);

-- Sparse Ausnahmen einzelner Vorkommen einer Serie (Absage oder
-- Verschiebung). Einmaltermine haben keine Serie und werden direkt auf
-- ihrer training_sessions-Zeile bearbeitet/gelöscht.
create table if not exists public.training_session_exceptions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,  -- per Trigger immer aus session_id abgeleitet
  occurrence_date date not null,   -- das ursprünglich geplante Datum laut Regel (Lookup-Key)
  cancelled boolean not null default false,
  override_date date,              -- gesetzt = Verschiebung auf dieses Datum
  override_start_time time,
  override_end_time time,
  override_location text,
  override_with_whom text,
  override_note text,
  status text not null default 'proposed' check (status in ('confirmed', 'proposed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, occurrence_date)
);

create index if not exists training_session_exceptions_org_id_idx on public.training_session_exceptions (org_id);
create index if not exists training_session_exceptions_session_id_idx on public.training_session_exceptions (session_id);

alter table public.training_sessions enable row level security;
alter table public.training_session_exceptions enable row level security;

create policy "Org members can view training sessions" on public.training_sessions
  for select using (public.is_org_member(org_id));
create policy "Org members can insert training sessions" on public.training_sessions
  for insert with check (public.is_org_member(org_id));
create policy "Org members can update training sessions" on public.training_sessions
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete training sessions" on public.training_sessions
  for delete using (public.is_org_member(org_id));

create policy "Org members can view training session exceptions" on public.training_session_exceptions
  for select using (public.is_org_member(org_id));
create policy "Org members can insert training session exceptions" on public.training_session_exceptions
  for insert with check (public.is_org_member(org_id));
create policy "Org members can update training session exceptions" on public.training_session_exceptions
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete training session exceptions" on public.training_session_exceptions
  for delete using (public.is_org_member(org_id));

create or replace function public.set_training_session_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role
    from public.memberships
    where org_id = new.org_id and user_id = auth.uid() and status = 'active';

  new.status := case when caller_role in ('spieler', 'management') then 'confirmed' else 'proposed' end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists training_sessions_set_status on public.training_sessions;
create trigger training_sessions_set_status
  before insert or update on public.training_sessions
  for each row execute function public.set_training_session_status();

create or replace function public.set_training_session_exception_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select org_id into new.org_id from public.training_sessions where id = new.session_id;

  select role into caller_role
    from public.memberships
    where org_id = new.org_id and user_id = auth.uid() and status = 'active';

  new.status := case when caller_role in ('spieler', 'management') then 'confirmed' else 'proposed' end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists training_session_exceptions_set_status on public.training_session_exceptions;
create trigger training_session_exceptions_set_status
  before insert or update on public.training_session_exceptions
  for each row execute function public.set_training_session_exception_status();
