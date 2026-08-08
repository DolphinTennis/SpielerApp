-- Jahresplanung: one row per marked day. A DB trigger (not just client
-- logic) decides confirmed vs. proposed, so the "only the Spieler's own
-- writes are auto-confirmed" rule holds even if the client ever gets it
-- wrong — every insert/update re-derives status from the acting user's
-- current role in that org.
create table if not exists public.year_plan_days (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  category text not null check (category in ('turnier_national', 'turnier_international', 'training', 'ferien', 'sonstiges')),
  note text,
  status text not null default 'proposed' check (status in ('confirmed', 'proposed')),
  created_by uuid references auth.users(id),
  created_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, date)
);

create index if not exists year_plan_days_org_id_idx on public.year_plan_days (org_id);
create index if not exists year_plan_days_date_idx on public.year_plan_days (date);

alter table public.year_plan_days enable row level security;

create policy "Org members can view year plan days"
  on public.year_plan_days for select
  using (public.is_org_member(org_id));

create policy "Org members can insert year plan days"
  on public.year_plan_days for insert
  with check (public.is_org_member(org_id));

create policy "Org members can update year plan days"
  on public.year_plan_days for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "Org members can delete year plan days"
  on public.year_plan_days for delete
  using (public.is_org_member(org_id));

create or replace function public.set_year_plan_day_status()
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

  new.status := case when caller_role = 'spieler' then 'confirmed' else 'proposed' end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists year_plan_days_set_status on public.year_plan_days;
create trigger year_plan_days_set_status
  before insert or update on public.year_plan_days
  for each row execute function public.set_year_plan_day_status();
