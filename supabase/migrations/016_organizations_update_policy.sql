-- organizations had no UPDATE policy at all — nothing previously wrote to it
-- from the client. Needed now for role_permissions/player_name/theme edits
-- on the Mein-Team / Einstellungen pages. Field-level gating (who may change
-- what) happens in the UI (permissions.manage_permissions, role === 'spieler'
-- for theme) — this policy just allows any org member to update their own org.
create policy "Org members can update their organization"
  on public.organizations for update
  using (public.is_org_member(id))
  with check (public.is_org_member(id));
