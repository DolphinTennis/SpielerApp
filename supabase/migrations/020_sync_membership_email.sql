-- memberships.email is a denormalized copy of auth.users.email, originally
-- set only at invite/registration time (see 005_invites.sql). When a member
-- later changes their login email via Supabase Auth's secure email-change
-- flow, only auth.users.email updates — the copy here goes stale and the
-- team member list keeps showing the old address. This migration fixes both
-- the existing drift and the root cause.

-- 1) One-off backfill: resync every membership to its user's current email.
update public.memberships m
set email = u.email
from auth.users u
where m.user_id = u.id
  and m.email is distinct from u.email;

-- 2) Keep them in sync going forward. auth.users.email is only updated after
-- the change is confirmed, so an AFTER UPDATE trigger reliably reflects the
-- verified new address. security definer so it can write public.memberships
-- regardless of the auth-internal role performing the email update.
create or replace function public.sync_membership_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.memberships set email = new.email where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_membership_email on auth.users;
create trigger sync_membership_email
  after update of email on auth.users
  for each row execute function public.sync_membership_email();
