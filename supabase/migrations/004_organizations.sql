-- Teams (organizations) & role-based memberships. A team always has exactly
-- one "spieler" (the player everything revolves around) plus any number of
-- "management" (Eltern) and "trainer" members. Admin rights are tied
-- directly to the role: spieler and management are admins, trainer is not
-- (trainer access gets scoped down further in a later migration once the
-- exact allowed sections are decided).
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Display name of the team's one player — a team is centered on a single
  -- player, so this lives on the org rather than needing a separate profile
  -- table. Shown throughout the app (topbar, editor headers, etc.).
  player_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('spieler', 'management', 'trainer')),
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Exactly one active "spieler" per team.
create unique index if not exists memberships_one_active_spieler_per_org
  on public.memberships (org_id)
  where role = 'spieler' and status = 'active';

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_org_id_idx on public.memberships (org_id);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- security definer so it can be used inside RLS policies on other tables
-- without triggering recursive RLS evaluation on `memberships` itself.
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_org_member(id));

-- Anyone signed in can create a new org (self-service team creation).
create policy "Authenticated users can create an organization"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "Members can view memberships in their org"
  on public.memberships for select
  using (public.is_org_member(org_id));

-- A user may only insert themselves, and only as the founding member of a
-- brand-new org (no members yet). Joining an existing org happens via the
-- invite Edge Function (Phase D), which uses the service_role key and so
-- bypasses RLS entirely — this policy is deliberately not the path for that.
create policy "Users can found a new org as its first member"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.memberships m2 where m2.org_id = memberships.org_id)
  );

create policy "Members can update memberships in their org"
  on public.memberships for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "Members can delete memberships in their org"
  on public.memberships for delete
  using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------
-- Extend existing tables with org_id and move their RLS to org membership
-- instead of a single owning user.
-- ---------------------------------------------------------------------
alter table public.matches add column if not exists org_id uuid references public.organizations(id);
alter table public.folders add column if not exists org_id uuid references public.organizations(id);
alter table public.files add column if not exists org_id uuid references public.organizations(id);
alter table public.live_matches add column if not exists org_id uuid references public.organizations(id);

-- Backfill: every existing auth user becomes the "spieler" founder of their
-- own team, and their existing rows are tagged with that team's org_id.
-- Guarded by "not exists a membership yet" so this is safe to re-run.
do $$
declare
  u record;
  new_org_id uuid;
begin
  for u in select id, email from auth.users loop
    if not exists (select 1 from public.memberships m where m.user_id = u.id) then
      -- Known real player name for the existing single-user data being
      -- migrated here; new teams created via registration (Phase C) will
      -- collect this properly instead of a hardcoded value.
      insert into public.organizations (name, player_name)
      values (coalesce(nullif(split_part(u.email, '@', 1), ''), 'Team') || 's Team', 'Naila Wieland')
      returning id into new_org_id;

      insert into public.memberships (org_id, user_id, role, status)
      values (new_org_id, u.id, 'spieler', 'active');

      update public.matches set org_id = new_org_id where user_id = u.id and org_id is null;
      update public.folders set org_id = new_org_id where user_id = u.id and org_id is null;
      update public.files set org_id = new_org_id where user_id = u.id and org_id is null;
      update public.live_matches set org_id = new_org_id where user_id = u.id and org_id is null;
    end if;
  end loop;
end $$;

alter table public.matches alter column org_id set not null;
alter table public.folders alter column org_id set not null;
alter table public.files alter column org_id set not null;
alter table public.live_matches alter column org_id set not null;

create index if not exists matches_org_id_idx on public.matches (org_id);
create index if not exists folders_org_id_idx on public.folders (org_id);
create index if not exists files_org_id_idx on public.files (org_id);
create index if not exists live_matches_org_id_idx on public.live_matches (org_id);

-- matches
drop policy if exists "Users can view own matches" on public.matches;
drop policy if exists "Users can insert own matches" on public.matches;
drop policy if exists "Users can update own matches" on public.matches;
drop policy if exists "Users can delete own matches" on public.matches;
create policy "Org members can view matches" on public.matches for select using (public.is_org_member(org_id));
create policy "Org members can insert matches" on public.matches for insert with check (public.is_org_member(org_id));
create policy "Org members can update matches" on public.matches for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete matches" on public.matches for delete using (public.is_org_member(org_id));

-- folders
drop policy if exists "Users can view own folders" on public.folders;
drop policy if exists "Users can insert own folders" on public.folders;
drop policy if exists "Users can update own folders" on public.folders;
drop policy if exists "Users can delete own folders" on public.folders;
create policy "Org members can view folders" on public.folders for select using (public.is_org_member(org_id));
create policy "Org members can insert folders" on public.folders for insert with check (public.is_org_member(org_id));
create policy "Org members can update folders" on public.folders for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete folders" on public.folders for delete using (public.is_org_member(org_id));

-- files
drop policy if exists "Users can view own files" on public.files;
drop policy if exists "Users can insert own files" on public.files;
drop policy if exists "Users can update own files" on public.files;
drop policy if exists "Users can delete own files" on public.files;
create policy "Org members can view files" on public.files for select using (public.is_org_member(org_id));
create policy "Org members can insert files" on public.files for insert with check (public.is_org_member(org_id));
create policy "Org members can update files" on public.files for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete files" on public.files for delete using (public.is_org_member(org_id));

-- live_matches
drop policy if exists "Users can view own live match" on public.live_matches;
drop policy if exists "Users can insert own live match" on public.live_matches;
drop policy if exists "Users can update own live match" on public.live_matches;
drop policy if exists "Users can delete own live match" on public.live_matches;
create policy "Org members can view live match" on public.live_matches for select using (public.is_org_member(org_id));
create policy "Org members can insert live match" on public.live_matches for insert with check (public.is_org_member(org_id));
create policy "Org members can update live match" on public.live_matches for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "Org members can delete live match" on public.live_matches for delete using (public.is_org_member(org_id));

-- Storage objects move from a per-user folder prefix to a per-org one
-- (`${orgId}/...`), so the whole team can access uploaded files, not just
-- the uploader.
drop policy if exists "Users can view own storage objects" on storage.objects;
drop policy if exists "Users can upload own storage objects" on storage.objects;
drop policy if exists "Users can update own storage objects" on storage.objects;
drop policy if exists "Users can delete own storage objects" on storage.objects;

create policy "Org members can view storage objects"
  on storage.objects for select
  using (bucket_id = 'files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "Org members can upload storage objects"
  on storage.objects for insert
  with check (bucket_id = 'files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "Org members can update storage objects"
  on storage.objects for update
  using (bucket_id = 'files' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "Org members can delete storage objects"
  on storage.objects for delete
  using (bucket_id = 'files' and public.is_org_member(((storage.foldername(name))[1])::uuid));
