-- "Org members can update their organization" (016) grants UPDATE on the
-- whole organizations row to any active member — the UI only decides which
-- buttons to show (RolePermissionsEditor behind permissions.manage_permissions,
-- theme behind "only spieler"), nothing server-side stops a member from
-- calling supabase.from('organizations').update({...}) directly with any
-- column. That was a latent gap even before payments; it becomes a real
-- problem now that `approved` is about to gate paid subscriptions (Stage 2)
-- and role_permissions controls the whole permission model — a trainer
-- granting themselves manage_permissions is a privilege escalation, not
-- just a cosmetic bypass.
--
-- approved/approval_token: server-only, full stop. approve-registration
-- already writes these via service_role, which bypasses table/column grants
-- entirely, so that flow is unaffected. notify-registration only SELECTs
-- approval_token, never writes it, so it's unaffected too.
revoke update (approved, approval_token) on public.organizations from authenticated;

-- role_permissions and theme stay client-writable (existing Mein-Team /
-- Einstellungen flows need this) but are now actually checked server-side —
-- previously the same rule existed only as a client-side courtesy.
create or replace function public.check_organizations_column_permissions()
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
    where org_id = new.id and user_id = auth.uid() and status = 'active';

  if new.role_permissions is distinct from old.role_permissions
     and not public.role_has_permission(new.id, caller_role, 'manage_permissions') then
    raise exception 'Keine Berechtigung, Rechte zu ändern.';
  end if;

  if new.theme is distinct from old.theme and caller_role is distinct from 'spieler' then
    raise exception 'Nur der Spieler kann das Farbschema ändern.';
  end if;

  return new;
end;
$$;

drop trigger if exists check_organizations_column_permissions on public.organizations;
create trigger check_organizations_column_permissions
  before update on public.organizations
  for each row execute function public.check_organizations_column_permissions();
