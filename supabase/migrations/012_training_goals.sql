-- Ziele aus der Matchanalyse (Formular 2), gespiegelt als abhakbare
-- Liste in der Terminplanung. Bewusst eine eigene Tabelle statt direkt
-- auf matches.form2 zuzugreifen: ein Häkchen in der Terminplanung löscht
-- nur diesen abgeleiteten Eintrag, nicht die ursprüngliche Matchanalyse.
create table if not exists public.training_goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  category text not null check (category in ('match', 'training')),
  content text not null,
  created_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, category)
);

create index if not exists training_goals_org_id_idx on public.training_goals (org_id);

alter table public.training_goals enable row level security;

create policy "Org members can view training goals" on public.training_goals
  for select using (public.is_org_member(org_id));

create policy "Org members can insert training goals" on public.training_goals
  for insert with check (public.is_org_member(org_id));

create policy "Org members can update training goals" on public.training_goals
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy "Org members can delete training goals" on public.training_goals
  for delete using (public.is_org_member(org_id));
