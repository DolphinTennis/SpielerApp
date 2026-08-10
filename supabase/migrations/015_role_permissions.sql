-- Konfigurierbare Rechte pro Rolle. `spieler` ist immer und nicht editierbar
-- Vollzugriff (nicht gespeichert, siehe role_has_permission unten) — nur
-- `management` und `trainer` haben editierbare Einträge. `visible_tiles`
-- ist entweder null (= alle Kacheln sichtbar) oder ein Array von
-- overviewItems-Keys.
alter table public.organizations
  add column if not exists role_permissions jsonb not null default '{
    "management": {
      "manage_permissions": true,
      "invite_members": true,
      "year_plan_entries": true,
      "year_plan_auto_confirm": true,
      "calendar_entries": true,
      "calendar_auto_confirm": true,
      "confirm_termine": true,
      "visible_tiles": null
    },
    "trainer": {
      "manage_permissions": false,
      "invite_members": false,
      "year_plan_entries": false,
      "year_plan_auto_confirm": false,
      "calendar_entries": false,
      "calendar_auto_confirm": false,
      "confirm_termine": false,
      "visible_tiles": ["matchanalyse"]
    }
  }'::jsonb;

-- Security-definer Helfer, damit sowohl die Status-Trigger unten als auch
-- spätere Checks (z. B. in Edge Functions über eine RPC) dieselbe Regel
-- verwenden: spieler ist immer erlaubt, sonst zählt der gespeicherte Wert
-- unter role_permissions -> Rolle -> perm_key (fehlt der Key/die Rolle,
-- gilt das als false).
create or replace function public.role_has_permission(target_org_id uuid, target_role text, perm_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when target_role = 'spieler' then true
    else coalesce(
      (select (role_permissions -> target_role ->> perm_key)::boolean
       from public.organizations where id = target_org_id),
      false
    )
  end;
$$;

-- year_plan_days: bisher hart "nur spieler auto-bestätigt". Jetzt: spieler
-- weiterhin immer, alle anderen Rollen laut role_permissions
-- (year_plan_auto_confirm ODER confirm_termine — wer bestätigen darf, dessen
-- eigene Einträge sind ohnehin nie ein Vormerk-Fall).
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

  new.status := case
    when public.role_has_permission(new.org_id, caller_role, 'year_plan_auto_confirm')
      or public.role_has_permission(new.org_id, caller_role, 'confirm_termine')
    then 'confirmed' else 'proposed'
  end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

-- training_sessions / training_session_exceptions: bisher hart "spieler
-- und management auto-bestätigt". Jetzt: spieler weiterhin immer, alle
-- anderen Rollen laut role_permissions (calendar_auto_confirm ODER
-- confirm_termine).
create or replace function public.set_training_session_status()
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

  new.status := case
    when public.role_has_permission(new.org_id, caller_role, 'calendar_auto_confirm')
      or public.role_has_permission(new.org_id, caller_role, 'confirm_termine')
    then 'confirmed' else 'proposed'
  end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_training_session_exception_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select org_id into new.org_id from public.training_sessions where id = new.session_id;

  select role into caller_role
    from public.memberships
    where org_id = new.org_id and user_id = auth.uid() and status = 'active';

  new.status := case
    when public.role_has_permission(new.org_id, caller_role, 'calendar_auto_confirm')
      or public.role_has_permission(new.org_id, caller_role, 'confirm_termine')
    then 'confirmed' else 'proposed'
  end;
  new.created_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
