-- "Meine Dateien": user-defined folders + file metadata, with the actual
-- bytes living in a private Storage bucket. Deleting a folder unassigns its
-- files (mirrors the reference app) rather than deleting them.
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);
create index if not exists files_user_id_idx on public.files (user_id);
create index if not exists files_folder_id_idx on public.files (folder_id);

alter table public.folders enable row level security;
alter table public.files enable row level security;

create policy "Users can view own folders" on public.folders for select using (auth.uid() = user_id);
create policy "Users can insert own folders" on public.folders for insert with check (auth.uid() = user_id);
create policy "Users can update own folders" on public.folders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own folders" on public.folders for delete using (auth.uid() = user_id);

create policy "Users can view own files" on public.files for select using (auth.uid() = user_id);
create policy "Users can insert own files" on public.files for insert with check (auth.uid() = user_id);
create policy "Users can update own files" on public.files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own files" on public.files for delete using (auth.uid() = user_id);

-- Private bucket; objects are stored at `${auth.uid()}/...` so the storage
-- policies below can scope access to each user's own folder prefix.
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

create policy "Users can view own storage objects"
  on storage.objects for select
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own storage objects"
  on storage.objects for insert
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own storage objects"
  on storage.objects for update
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own storage objects"
  on storage.objects for delete
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
