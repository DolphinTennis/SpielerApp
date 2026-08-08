-- The client can't read other users' emails from auth.users directly (not
-- exposed via the anon key), so we keep a denormalized copy here — set at
-- registration/invite time — purely for displaying team member lists.
alter table public.memberships add column if not exists email text;
update public.memberships m set email = u.email from auth.users u where m.user_id = u.id and m.email is null;

-- Lets an invited user activate their own membership after they set a
-- password. This is deliberately narrow — it only allows flipping your own
-- row from 'invited' to 'active', nothing else — because the existing
-- "Members can update memberships in their org" policy can't apply here:
-- is_org_member() requires an *active* membership, which is exactly what
-- doesn't exist yet at this point (the same chicken-and-egg RLS issue the
-- org-creation insert had).
create policy "Invited users can activate their own membership"
  on public.memberships for update
  using (user_id = auth.uid() and status = 'invited')
  with check (user_id = auth.uid() and status = 'active');
