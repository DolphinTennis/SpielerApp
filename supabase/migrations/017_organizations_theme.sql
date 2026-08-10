alter table public.organizations
  add column if not exists theme text not null default 'hardcourt' check (theme in ('hardcourt', 'gras', 'sand'));
