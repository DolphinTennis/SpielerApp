-- Self-service registrations (Register.jsx -> provisionPendingTeam in
-- OrgContext.jsx) now require manual approval before the team becomes
-- usable — pricing/self-service isn't ready to go fully live yet. Invited
-- members (activateInvitedMembership) are a separate path and unaffected.
alter table public.organizations
  add column if not exists approved boolean not null default false,
  add column if not exists approval_token uuid not null default gen_random_uuid();

-- Backfill: every team that already exists today (the real, already-in-use
-- teams) stays fully usable — the approval requirement only applies to
-- teams created from this point forward.
update public.organizations set approved = true where approved = false;
