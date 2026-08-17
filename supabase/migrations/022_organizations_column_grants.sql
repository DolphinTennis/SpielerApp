-- Migration 021 did not close the hole it describes. It used:
--
--   revoke update (approved, approval_token) on public.organizations from authenticated;
--
-- and that is a no-op here. Postgres keeps table-level privileges (relacl) and
-- column-level privileges (attacl) separately, and an UPDATE permission check
-- passes if *either* grants it. Supabase's default setup gives `authenticated`
-- table-level ALL on every table in public, so revoking at column level had
-- nothing to revoke and left the table-level grant untouched.
--
-- Verified on a fresh project after replaying migrations 001-021:
-- information_schema.table_privileges still listed UPDATE for `authenticated`
-- on organizations, and column_privileges listed every column including
-- approved and approval_token. So the original gap was still open: an active
-- member — a trainer included — could call
-- supabase.from('organizations').update({ approved: true }) and let themselves
-- through the registration gate, exactly what 021 set out to prevent.
--
-- The fix has to go the other way round: take UPDATE away at table level,
-- then hand it back for precisely the columns the client is allowed to write.
-- Doing it in this order matters — granting columns while the table-level
-- grant still stands would change nothing again.

revoke update on public.organizations from authenticated;

-- The team's own descriptive data. role_permissions and theme additionally go
-- through check_organizations_column_permissions() from migration 021, which
-- enforces *who* may change them; this grant only decides *what* is writable
-- at all. `name` has no UI today (only the removed self-registration path ever
-- set it, on insert) but belongs to the same harmless group.
grant update (name, player_name, role_permissions, theme) on public.organizations to authenticated;

-- approved and approval_token stay server-only, i.e. writable exclusively
-- through service_role, which bypasses grants entirely. approve-registration
-- already works that way, and notify-registration only reads approval_token.
