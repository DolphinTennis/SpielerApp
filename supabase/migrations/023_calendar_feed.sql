-- Kalenderabonnement: eine öffentlich abrufbare Adresse pro Person, die den
-- aktuellen Terminstand als iCalendar ausliefert. Kalender-Apps können sich
-- nicht anmelden — sie rufen stur eine URL ab. Das Geheimnis steckt deshalb im
-- Token in der Adresse.
--
-- Eigene Tabelle statt einer Spalte auf memberships: Teammitglieder dürfen
-- einander in memberships sehen (004_organizations.sql), und der Abo-Link
-- eines anderen darf für niemanden lesbar sein.
create table if not exists public.calendar_feed_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  -- 24 Zufallsbytes = 48 Hexzeichen. Wer den Wert hat, sieht diesen Kalender,
  -- also muss er lang genug sein, dass Raten aussichtslos ist.
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index if not exists calendar_feed_tokens_token_idx on public.calendar_feed_tokens (token);

alter table public.calendar_feed_tokens enable row level security;

-- Ausdrücklich nur die eigene Zeile, nicht "alle im Team" wie sonst überall:
-- der Link ist persönlich und einzeln zurücknehmbar.
create policy "Members can view their own calendar token" on public.calendar_feed_tokens
  for select using (user_id = auth.uid() and public.is_org_member(org_id));

create policy "Members can create their own calendar token" on public.calendar_feed_tokens
  for insert with check (user_id = auth.uid() and public.is_org_member(org_id));

create policy "Members can renew their own calendar token" on public.calendar_feed_tokens
  for update using (user_id = auth.uid() and public.is_org_member(org_id))
  with check (user_id = auth.uid() and public.is_org_member(org_id));

create policy "Members can delete their own calendar token" on public.calendar_feed_tokens
  for delete using (user_id = auth.uid() and public.is_org_member(org_id));

drop trigger if exists calendar_feed_tokens_set_updated_at on public.calendar_feed_tokens;
create trigger calendar_feed_tokens_set_updated_at
  before update on public.calendar_feed_tokens
  for each row execute function public.set_updated_at();

-- Zwei neue Rechte, additiv auf bestehende Teams: calendar_subscribe steuert,
-- wer überhaupt einen Link sehen und verschicken darf; calendar_feed_yearplan
-- steuert, ob im Abonnement zusätzlich zur Terminplanung die Jahresplanung
-- steckt. `spieler` läuft ohnehin an role_has_permission() vorbei.
--
-- jsonb-Verschmelzung statt Neuzuweisung, damit heute gesetzte Rechte
-- unverändert bleiben; coalesce fängt Teams ohne Eintrag für eine Rolle ab.
--
-- Der Trigger aus Migration 021 muss dafür kurz weichen: er verweigert jede
-- Änderung an role_permissions, deren Aufrufer kein manage_permissions hat —
-- und bei einer Migration gibt es keinen angemeldeten Nutzer, auth.uid() ist
-- leer, also greift die Sperre auch hier. Gezielt für diese eine Anweisung
-- abschalten ist ehrlicher, als die Sicherheitsprüfung aufzuweichen.
alter table public.organizations disable trigger check_organizations_column_permissions;

update public.organizations
set role_permissions = jsonb_set(
      jsonb_set(
        role_permissions,
        '{management}',
        coalesce(role_permissions -> 'management', '{}'::jsonb)
          || jsonb_build_object('calendar_subscribe', true, 'calendar_feed_yearplan', true)
      ),
      '{trainer}',
      coalesce(role_permissions -> 'trainer', '{}'::jsonb)
        || jsonb_build_object('calendar_subscribe', false, 'calendar_feed_yearplan', false)
    )
where not (role_permissions -> 'management' ? 'calendar_subscribe')
   or not (role_permissions -> 'trainer' ? 'calendar_subscribe');

alter table public.organizations enable trigger check_organizations_column_permissions;

-- Gleiche Vorgabe für künftig angelegte Teams.
alter table public.organizations
  alter column role_permissions set default '{
    "management": {
      "manage_permissions": true,
      "invite_members": true,
      "year_plan_entries": true,
      "year_plan_auto_confirm": true,
      "calendar_entries": true,
      "calendar_auto_confirm": true,
      "confirm_termine": true,
      "calendar_subscribe": true,
      "calendar_feed_yearplan": true,
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
      "calendar_subscribe": false,
      "calendar_feed_yearplan": false,
      "visible_tiles": ["matchanalyse"]
    }
  }'::jsonb;
