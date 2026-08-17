# Umzug in ein neues Supabase-Konto

**Vorbereitet am 17.08.2026.** Noch nichts ausgeführt — dieses Dokument und die
beiden Skripte in `scripts/` sind der vorbereitete Ablauf.

| | |
|---|---|
| Quelle | `lguvrhdvlqipbjkesuon` („Dolphin", Organisation `gnahmpcaiagqkpfzmmij`, eu-central-1) |
| Ziel | `ayfiezwtgazcvkepefwv` — drittes, eigenes Konto |
| Zuerst | **Übungskopie**, kein echter Umzug |

Das Akademie-Projekt (`seplxondmkfyijlrcubt`) bleibt unbeteiligt.

## Der Grundgedanke

Ein Supabase-Projekt lässt sich nicht als Ganzes zwischen Konten verschieben.
Es wird neu aufgebaut und befüllt. Das teilt sich sauber:

| Teil | Woher |
|---|---|
| Schema, Regeln, Funktionen, Trigger, Storage-Bucket | `supabase db push` — die 21 Migrationen in `supabase/migrations/` |
| Daten aus 12 Tabellen **und** `auth.users` | `scripts/migrate-data.mjs` |
| Dateien im Bucket `files` | `scripts/migrate-storage.mjs` |
| Edge Functions | `supabase functions deploy` |
| Secrets der Functions | `supabase secrets set` |
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

- `supabase db push --db-url …` spricht direkt mit dem Projekt. Geprüft: es
  scheitert an der Verbindung, nicht an Docker.
- Die beiden Skripte laufen auf Node mit `pg` und `@supabase/supabase-js`,
  beides bereits installiert.

`supabase db dump` wäre der übliche Weg, **funktioniert hier aber nicht** — es
startet pg_dump in einem Docker-Container und bricht mit
`LegacyDockerRunError` ab. Falls du später doch einen vollständigen Abzug
willst (etwa als Sicherung), führt daran nur eine Docker-Desktop-Installation
vorbei.

**Kein `supabase link`, keine Neuanmeldung.** Über `--db-url` bleibt die CLI
unangetastet. Das ist hier wichtig: die Anmeldung der CLI ist global und hängt
am Akademie-Konto, und ein `link` würde außerdem die Verknüpfung in
`supabase/.temp/` auf das neue Projekt umschreiben.

---

# Teil A — Übungskopie

Ziel: den ganzen Ablauf einmal gefahrlos durchspielen. Das alte Projekt wird
dabei **nur gelesen**, die App bleibt unverändert am alten Projekt. Die
Edge Functions und die E-Mail-Einstellungen bleiben außen vor — sie sind für
die Übung nicht nötig und brauchen Werte, die derzeit fehlen (siehe Teil B).

### A1. Zugangsdaten *(dein Schritt)*

`.env.migrate.example` nach `.env.migrate` kopieren und ausfüllen — die Datei
ist gitignored. Trag die Werte selbst ein, schick sie mir nicht im Chat.

Gebraucht werden vier Dinge:

| Wert | Woher |
|---|---|
| Datenbank-Passwort **alt** | Dashboard des alten Projekts → Settings → Database → *Reset database password*. Das Passwort ist nirgends einsehbar, nur neu setzbar. Ein Zurücksetzen stört den laufenden Betrieb nicht — die App verbindet sich über den anon-Schlüssel, nicht über Postgres. |
| service_role-Schlüssel **alt** | Dashboard des alten Projekts → Settings → API. Der ist im Klartext einsehbar. |
| Datenbank-Passwort **neu** | beim Anlegen des Projekts vergeben |
| service_role-Schlüssel **neu** | Dashboard des neuen Projekts → Settings → API |

Beide Verbindungszeichenfolgen über den **Session-Pooler** (Port 5432), nicht
den Transaction-Pooler (6543). Sonderzeichen im Passwort prozentkodieren
(`@` → `%40`).

> Das setzt voraus, dass du dich beim **alten** Konto noch anmelden kannst.
> Ohne Zugriff auf dessen Dashboard gibt es keinen Weg an die Daten — dann
> wäre vor allem anderen die Kontowiederherstellung zu klären.

### A2. Schema aufbauen

```bash
npx supabase db push --db-url "$TARGET_DB_URL" --dry-run
```

Zeigt, welche Migrationen laufen würden. Sieht es richtig aus, ohne
`--dry-run` wiederholen. Danach stehen im neuen Projekt alle 12 Tabellen, die
Zugriffsregeln, `is_org_member()`, `role_has_permission()`, die Trigger und
der Bucket `files`.

**Zu erwarten:** Migration 010 legt einen pg_cron-Job an, dessen URL noch auf
das alte Projekt zeigt. Migration 011 entfernt denselben Job unmittelbar
danach wieder — unterm Strich bleibt kein Job übrig, die veraltete URL ist
also folgenlos.

### A3. Daten kopieren

Erst der Probelauf. Er schreibt nichts, sondern zeigt beide Verbindungen und
je Tabelle die Zeilenzahl in Quelle und Ziel:

```bash
node --env-file=.env.migrate scripts/migrate-data.mjs
```

Sieht das plausibel aus:

```bash
node --env-file=.env.migrate scripts/migrate-data.mjs --execute
```

### A4. Kontrolle

Denselben Aufruf **ohne** `--execute` wiederholen. Jede Zeile muss mit `=`
beginnen, am Ende steht „Alle Tabellen stimmen überein." Weicht etwas ab,
endet das Skript mit Fehlercode und nennt die betroffenen Tabellen.

### A5. Dateien kopieren

```bash
node --env-file=.env.migrate scripts/migrate-storage.mjs
node --env-file=.env.migrate scripts/migrate-storage.mjs --execute
```

Der Probelauf nennt Anzahl und Gesamtgröße und listet die ersten 20 Pfade.

### A6. Anmeldung prüfen — die eigentliche Probe

Das ist der Punkt, an dem sich zeigt, ob der Umzug taugt. In einer Kopie von
`.env.local` (**nicht** die echte überschreiben) `VITE_SUPABASE_URL` und
`VITE_SUPABASE_ANON_KEY` auf das neue Projekt setzen, dann:

```bash
npm run dev
```

Mit einem **bestehenden** Konto und dessen **altem** Passwort anmelden. Klappt
das, sind Nutzer und Passwörter heil übergekommen. Anschließend prüfen: Team
sichtbar, Matches da, eine Datei aus „Meine Dateien" lässt sich öffnen.

Danach `.env.local` zurücksetzen.

### A7. Aufräumen

Nach der Übung `.env.migrate` löschen — dort steht ein service_role-Schlüssel
im Klartext. Das Übungsprojekt kann stehen bleiben oder zurückgesetzt werden
(Dashboard → Settings → General → *Reset project*), bevor der echte Umzug
läuft.

---

# Teil B — Was der echte Umzug zusätzlich braucht

Erst relevant, wenn die Übung sitzt.

### B1. Ein Zeitfenster ohne Nutzung

Alles, was nach dem Kopieren noch im alten Projekt passiert, geht verloren.
Der echte Umzug braucht deshalb eine Zeit, in der niemand die App benutzt.

### B2. Secrets der Edge Functions — hier fehlt etwas

Die Werte des alten Projekts sind **nicht mehr vorhanden** und im Dashboard
auch nicht mehr im Klartext einsehbar. Sie müssen neu beschafft werden:

| Secret | wofür | Beschaffung |
|---|---|---|
| `AZURE_TRANSLATOR_KEY` | `translate-match` | im Azure-Portal neu erzeugen (Key rotieren) |
| `AZURE_TRANSLATOR_REGION` | `translate-match` | steht im Azure-Portal, kein Geheimnis |
| `MAILBOX_HOST` | `email-inbound` | all-inkl, kein Geheimnis |
| `MAILBOX_USER` | `email-inbound` | all-inkl, kein Geheimnis |
| `MAILBOX_PASSWORD` | `email-inbound` | im all-inkl-KAS neu setzen |
| `MAILBOX_IMAP_PORT` | `email-inbound` | kein Geheimnis |
| `MAILBOX_SMTP_PORT` | `email-inbound` | kein Geheimnis |

Dazu `SMTP_PASSWORD` für `config push` — dasselbe all-inkl-Postfach.

Ohne diese Werte laufen die Übersetzung von Matches und der Mail-Eingang für
„Beispiele" im neuen Projekt nicht. Alles andere funktioniert.

### B3. Functions ausrollen und Einstellungen übertragen

```bash
npx supabase functions deploy activate-membership approve-registration \
  email-inbound invite-member link-preview notify-registration \
  resend-invite translate-match

npx supabase secrets set --env-file .env.functions
npx supabase config push
```

Diese drei brauchen — anders als `db push` — eine CLI-Anmeldung im neuen Konto
und ein `link` darauf. Danach zeigt `supabase/.temp/` auf das neue Projekt;
das ist ab diesem Zeitpunkt richtig so.

`config push` überträgt `site_url`, die Weiterleitungsadressen, die
SMTP-Verbindung zu all-inkl und die fünf E-Mail-Vorlagen aus
`supabase/templates/`. **Achtung:** es beendet alle laufenden Sitzungen; danach
antworten Edge Functions kurzzeitig mit „Nicht authentifiziert.", während
einfache Abfragen weiterlaufen.

### B4. App umstellen

`.env.local` dauerhaft auf das neue Projekt setzen, dann
`npm run deploy:allinkl`. Das alte Projekt stehen lassen, bis der neue Stand
ein paar Tage getragen hat.

---

## Was der Umzug nicht mitnimmt

- **Realtime-Publikationen.** Der Liveticker hängt an Postgres Changes. Ob die
  Publikation `supabase_realtime` die betroffenen Tabellen im neuen Projekt
  einschließt, ist nach Schritt A2 zu prüfen (Dashboard → Database →
  Replication) — keine der Migrationen setzt das.
- **Vault-Geheimnisse.** `email_inbound_cron_secret` aus Migration 010 liegt in
  Supabase Vault, nicht im Repo. Da der Cron-Job durch Migration 011 ohnehin
  entfällt, wird es voraussichtlich nicht mehr gebraucht.
- **Verlauf und Protokolle.** Logs, Nutzungsstatistiken und die
  Migrationshistorie des alten Projekts bleiben zurück.
- **Benutzerdefinierte Domains, Netzwerksperren, Sicherungspläne**, falls im
  alten Projekt eingerichtet.
