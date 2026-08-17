# Umzug in ein neues Supabase-Konto

**Vorbereitet am 17.08.2026.** Noch nichts ausgeführt — dieses Dokument und die
beiden Skripte in `scripts/` sind der vorbereitete Ablauf.

## Der Grundgedanke

Ein Supabase-Projekt lässt sich nicht als Ganzes zwischen Konten verschieben.
Es wird neu aufgebaut und befüllt. Das teilt sich sauber:

| Teil | Woher |
|---|---|
| Schema, Regeln, Funktionen, Trigger, Storage-Bucket | `supabase db push` — die 21 Migrationen in `supabase/migrations/` |
| Daten aus 12 Tabellen **und** `auth.users` | `scripts/migrate-data.mjs` |
| Dateien im Bucket `files` | `scripts/migrate-storage.mjs` |
| Edge Functions | `supabase functions deploy` |
| Secrets der Functions | `supabase secrets set` — Werte hat nur du |
| Anmelde-Einstellungen, SMTP, E-Mail-Vorlagen | `supabase config push` |

Das Schema muss also **nicht** abgezogen werden. Es steht vollständig im Repo,
und ein frisches Projekt bekommt es fehlerfrei durch die Migrationen.

## Zwei Dinge, die den Umzug entscheiden

**Die Benutzerkennungen müssen erhalten bleiben.** `memberships.user_id`,
`matches.user_id`, `created_by` in mehreren Tabellen — alles zeigt auf
`auth.users.id`. Deshalb werden die Zeilen aus `auth.users` mitsamt ihrer UUID
kopiert, statt die Nutzer neu anzulegen. Das trägt auch die Passwörter mit
(`encrypted_password`), sodass sich niemand neu anmelden muss.

**Die Ablagepfade müssen erhalten bleiben.** Objekte im Bucket liegen unter
`${org_id}/…`; darauf stützen sich sowohl die Zeilen in `public.files` als
auch die Storage-Regeln aus Migration 004. Das Storage-Skript lädt jedes
Objekt unter exakt demselben Pfad wieder hoch.

## Werkzeuge

Auf diesem Rechner fehlen **Docker, psql und pg_dump** (und Homebrew, um sie
zu installieren). Der Ablauf unten ist genau deshalb so gebaut, dass keins
davon gebraucht wird:

- `supabase db push`, `functions deploy`, `secrets set` und `config push`
  sprechen direkt mit dem Projekt — kein Docker.
- Die beiden Skripte laufen auf Node mit `pg` und `@supabase/supabase-js`,
  beides bereits installiert.

`supabase db dump` wäre der übliche Weg, **funktioniert hier aber nicht** — es
startet pg_dump in einem Docker-Container und bricht mit
`LegacyDockerRunError` ab. Falls du später doch einen vollständigen Abzug
willst (etwa als Sicherung), führt daran nur eine Docker-Desktop-Installation
vorbei.

## Ablauf

### 1. Neues Projekt anlegen *(dein Schritt)*

Im neuen Konto ein Projekt anlegen. Region möglichst wie bisher
(`eu-central-1`), Datenbank-Passwort sicher notieren. Projekt-Ref merken — die
Zeichenfolge aus der Projekt-URL.

### 2. Zugangsdaten eintragen *(dein Schritt)*

`.env.migrate.example` nach `.env.migrate` kopieren und ausfüllen. Die Datei
ist gitignored. Trag die Werte selbst ein — schick sie mir nicht im Chat.

### 3. Schema aufbauen

```bash
npx supabase link --project-ref NEUE_PROJEKT_REF
npx supabase db push
```

Danach stehen alle 12 Tabellen, die Zugriffsregeln, `is_org_member()`,
`role_has_permission()`, die Trigger und der Bucket `files`.

**Zu erwarten:** Migration 010 legt einen pg_cron-Job an, dessen URL noch auf
das alte Projekt zeigt. Migration 011 entfernt denselben Job unmittelbar
danach wieder — unterm Strich bleibt kein Job übrig, die veraltete URL ist
also folgenlos. Ein Aufräumen der beiden Migrationen wäre Kosmetik.

### 4. Daten kopieren

Erst der Probelauf. Er schreibt nichts, sondern zeigt beide Verbindungen und
je Tabelle die Zeilenzahl in Quelle und Ziel:

```bash
node --env-file=.env.migrate scripts/migrate-data.mjs
```

Sehen die Zahlen plausibel aus und sind alle Zieltabellen leer:

```bash
node --env-file=.env.migrate scripts/migrate-data.mjs --execute
```

Das Skript bricht ab, wenn eine Zieltabelle nicht leer ist — das ist Absicht
und lässt sich mit `--force` übergehen. Es kopiert nur Spalten, die es auf
**beiden** Seiten gibt, damit ein Versionsunterschied bei `auth.users` nicht
mitten im Lauf zum Fehler wird. Ein abgebrochener Lauf kann wiederholt
werden (`on conflict do nothing`).

### 5. Dateien kopieren

```bash
node --env-file=.env.migrate scripts/migrate-storage.mjs
node --env-file=.env.migrate scripts/migrate-storage.mjs --execute
```

Der Probelauf nennt Anzahl und Gesamtgröße und listet die ersten 20 Pfade.

### 6. Edge Functions ausrollen

```bash
npx supabase functions deploy activate-membership approve-registration email-inbound invite-member link-preview notify-registration resend-invite translate-match
```

Die `verify_jwt`-Einstellungen kommen aus `supabase/config.toml` mit.

### 7. Secrets setzen *(deine Werte)*

Die Functions brauchen sieben Werte. `SUPABASE_URL`, `SUPABASE_ANON_KEY` und
`SUPABASE_SERVICE_ROLE_KEY` setzt die Plattform selbst — die übrigen nicht:

| Secret | wofür |
|---|---|
| `AZURE_TRANSLATOR_KEY` | `translate-match` |
| `AZURE_TRANSLATOR_REGION` | `translate-match` |
| `MAILBOX_HOST` | `email-inbound` |
| `MAILBOX_USER` | `email-inbound` |
| `MAILBOX_PASSWORD` | `email-inbound` |
| `MAILBOX_IMAP_PORT` | `email-inbound` |
| `MAILBOX_SMTP_PORT` | `email-inbound` |

```bash
npx supabase secrets set --env-file .env.functions
```

Die alten Werte stehen im Dashboard des bisherigen Projekts unter Edge
Functions → Secrets. Sie sind dort **nicht mehr im Klartext einsehbar** —
falls du sie nicht anderweitig hast, müssen der Azure-Schlüssel und das
Postfach-Passwort neu erzeugt werden.

### 8. Anmeldung und E-Mail einstellen

```bash
npx supabase config push
```

Überträgt `site_url`, die Weiterleitungsadressen, die SMTP-Verbindung zu
all-inkl und die fünf E-Mail-Vorlagen aus `supabase/templates/`. Braucht
`SMTP_PASSWORD` in der Umgebung (`config.toml` verweist mit `env(SMTP_PASSWORD)`
darauf).

**Achtung:** `config push` beendet alle laufenden Sitzungen. Danach ist eine
Neuanmeldung nötig, und Edge Functions antworten kurzzeitig mit „Nicht
authentifiziert.", während einfache Abfragen weiterlaufen.

### 9. App umstellen

In `.env.local` `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` auf das neue
Projekt setzen, dann `npm run dev` und anmelden — mit einem **bestehenden**
Konto und dessen altem Passwort. Klappt das, ist der Umzug der Nutzer
gelungen. Danach `npm run deploy:allinkl`.

### 10. Erst dann aufräumen

Das alte Projekt stehen lassen, bis der neue Stand ein paar Tage getragen hat.
`.env.migrate` löschen — dort steht ein service_role-Schlüssel im Klartext.

## Was der Umzug nicht mitnimmt

- **Realtime-Publikationen.** Der Liveticker hängt an Postgres Changes. Ob die
  Publikation `supabase_realtime` die betroffenen Tabellen im neuen Projekt
  einschließt, ist nach Schritt 3 zu prüfen (Dashboard → Database →
  Replication) — keine der Migrationen setzt das.
- **Vault-Geheimnisse.** `email_inbound_cron_secret` aus Migration 010 liegt in
  Supabase Vault, nicht im Repo. Da der Cron-Job durch Migration 011 ohnehin
  entfällt, wird es voraussichtlich nicht mehr gebraucht.
- **Verlauf und Protokolle.** Logs, Nutzungsstatistiken und die
  Migrationshistorie des alten Projekts bleiben zurück.
- **Benutzerdefinierte Domains, Netzwerksperren, Sicherungspläne**, falls im
  alten Projekt eingerichtet.

## Offen, bevor es losgeht

1. **Wohin?** Das Akademie-Projekt liegt bereits in einem zweiten Konto
   (`seplxondmkfyijlrcubt`). Soll die Spielerapp **dorthin** als zweites
   Projekt, oder in ein drittes, eigenes Konto?
2. **Umzug oder Kopie?** Ein reiner Probelauf zum Üben ist harmlos. Ein echter
   Umzug braucht ein Zeitfenster, in dem niemand die App benutzt — sonst gehen
   Änderungen verloren, die nach dem Kopieren im alten Projekt entstehen.
3. **Sind die Function-Secrets noch vorhanden?** Siehe Schritt 7. Wenn nicht,
   vor dem Umzug neu beschaffen.
