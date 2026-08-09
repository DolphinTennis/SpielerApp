-- Beispiele: geteilte Links (YouTube/Instagram/TikTok/sonstige) mit
-- serverseitig geholter Vorschau (Titel/Vorschaubild). Kein Status-Workflow
-- wie bei year_plan_days/training_sessions — hier gibt es nichts, das aus
-- der Rolle des Erstellers abzuleiten wäre, daher genügt ein einfacher
-- Spalten-Default statt eines Triggers für created_by.
create table if not exists public.media_examples (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  platform text not null check (platform in ('youtube', 'instagram', 'tiktok', 'other')),
  title text,
  thumbnail_url text,
  embed_html text,
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_by_label text,
  created_at timestamptz not null default now()
);

create index if not exists media_examples_org_id_idx on public.media_examples (org_id);

alter table public.media_examples enable row level security;

create policy "Org members can view media examples" on public.media_examples
  for select using (public.is_org_member(org_id));

create policy "Org members can insert media examples" on public.media_examples
  for insert with check (public.is_org_member(org_id));

create policy "Org members can delete media examples" on public.media_examples
  for delete using (public.is_org_member(org_id));
