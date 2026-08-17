# Ausgegliedert: Landingpage, Preise und Bezahlung

**Stand: 17.08.2026.** Die Arbeit an Vermarktung und Bezahlung ist aus der
Spielerapp herausgenommen — nicht gelöscht, sondern geparkt, bis sie in ein
anderes Projekt einfließt. Dieses Dokument ist die Anleitung dafür.

## Wo der Code liegt

**Nicht in diesem Repo.** Dieses Projekt ist die ausgegliederte Spielerapp;
Tag und Branch der Vermarktungsarbeit sind hier absichtlich nicht vorhanden.
Sie liegen im Ursprungsrepo:

| | |
|---|---|
| Repo | `sdwieland-ops/dolphin`, Arbeitskopie `/Volumes/Software/dolphin` |
| Git-Tag | `archiv/landing-booking-2026-08-17` |
| Branch | `feature/landing-booking` (11 Commits über dessen `main`) |
| Ursprünglicher Plan | `~/.claude/plans/staged-wibbling-stearns.md` |

Der Tag ist der verlässliche Anker. Der Branch darf verschoben oder gelöscht
werden, ohne dass der Stand verloren geht.

Zum Ansehen, im **alten** Ordner:

```bash
git diff main...archiv/landing-booking-2026-08-17
```

Auch die alte, nie geroutete `src/pages/Landing.jsx` samt ihrer
`.pricing-*`-Stile in `src/styles/layout.css` ist hier entfernt — sie war
toter Code mit einer fest eingebauten Preistabelle und gehörte demselben
Thema. Im alten Repo ist beides erhalten.

## Was zum Paket gehört

### Oberfläche

| Datei | Zweck |
|---|---|
| `src/pages/Landing.jsx` | Verkaufsseite (Hero, sieben Funktionsbereiche, Fußzeile). Im Archiv geroutet auf `/`, in der App bewusst nicht. |
| `src/pages/Preise.jsx` | Öffentliche Preisseite `/preise`, liest Beträge aus `billing_prices`. |
| `src/pages/Impressum.jsx`, `src/pages/Datenschutz.jsx` | Rechtstexte, aus der Landing-Fußzeile verlinkt. |
| `src/pages/Intern.jsx`, `src/lib/adminApi.js` | Interner Adminbereich `/intern`: Kennzahlen über alle Teams, Preispflege, Gutscheine. |
| `src/lib/billingApi.js` | Client-Aufrufe für Preisliste, Checkout und Kundenportal. |
| `src/pages/TeamManage.jsx` | Abo-Abschnitt (nur dieser Teil — die Datei existiert in der App weiter). |
| `src/styles/landing.css` | Gestaltung für alle oben genannten Seiten, inklusive Mobilanpassung. |
| `public/images/landing/` | Zwei lizenzfreie Stockfotos, Nachweis in `CREDITS.txt`. |

### Datenbank

| Migration | Inhalt |
|---|---|
| `022_billing_foundation.sql` | `org_subscriptions` (eine Zeile pro Team, nur per `service_role` beschreibbar), `billing_prices` (Preiskatalog, öffentlich lesbar), `org_is_entitled()`, Auto-Anlage per Trigger, Bestandsteams als `exempt` markiert. |
| `023_platform_admins.sql` | `platform_admins` (nach E-Mail), `is_platform_admin()`, Schreibrecht für Preise. Vorbelegt mit `info@dolphintennis.com`. |

`021_organizations_column_permissions.sql` gehört **nicht** dazu — der
Sicherheitsfix ist in der App geblieben. Siehe aber den Vorbehalt unten.

### Edge Functions

| Funktion | Rolle |
|---|---|
| `create-checkout-session` | Startet Stripe Checkout. Sucht die Preis-ID serverseitig, nimmt nie eine vom Client. Nur `spieler`/`management` dürfen. |
| `create-portal-session` | Öffnet Stripes Kundenportal (Planwechsel, Kündigung, Zahlungsmittel). |
| `stripe-webhook` | Einziger Schreiber von `org_subscriptions`. Prüft die Stripe-Signatur, kein JWT. |
| `admin-dashboard-data` | Liefert `/intern` seine Zahlen. |
| `admin-create-coupon` | Legt Gutscheincodes in Stripe an. |

Alle fünf brauchen `verify_jwt = false` in `supabase/config.toml` (die
Prüfung passiert in der Funktion selbst) — die entsprechenden Abschnitte
stehen im Archiv-Branch.

Benötigte Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### Infrastruktur für die Vorschau

- Subdomain `dev.dolphintennis.com` bei all-inkl, mit KAS-Verzeichnisschutz.
- `.env.dev-preview` setzt dort `VITE_APP_URL`.
- `vite.config.js` fügt im Modus `dev-preview` ein `noindex`-Meta ein.
- `npm run deploy:dev` lädt nach `/dev.dolphintennis.com` statt in den
  Produktivordner; `scripts/deploy-allinkl.mjs` nimmt dafür ein Zielverzeichnis
  als Argument.
- `supabase/config.toml` führt `https://dev.dolphintennis.com/**` in
  `additional_redirect_urls`.

## Was offen geblieben ist

1. **Keine echten Stripe-Preise.** `billing_prices.stripe_price_id` ist in
   allen sechs Zeilen `null`, deshalb hat `/preise` keine Kaufen-Schaltflächen,
   sondern nur den Hinweis „Online-Buchung folgt in Kürze". Ohne angelegtes
   Stripe-Konto war das nicht weiterzubringen.
2. **Trennung Test/Produktiv fehlt** (Stufe 2.4 des Plans). Geplant war eine
   `is_test`-Markierung pro Team plus ein Datenbank-Trigger, der eine
   Testzahlung physisch daran hindert, einem echten Team Zugriff zu geben.
   Der verlässliche Anhaltspunkt dafür ist `event.livemode` aus dem
   Stripe-Ereignis — an den IDs (`cus_…`, `sub_…`, `price_…`) lässt sich Test-
   von Live-Modus **nicht** unterscheiden. Dazu gehört auch, dass
   `billing_prices` eine zweite Spalte für die Test-Preis-ID braucht: Stripe
   vergibt in beiden Modi verschiedene IDs, eine Spalte kann nicht beides
   halten.
3. **Die Bezahlschranke greift nirgends.** `org_is_entitled()` ist definiert,
   aber in keine einzige Schreibregel eingebaut — bewusst, siehe Kommentar in
   `022_billing_foundation.sql`. Solange das so bleibt, ändert ein abgelaufenes
   Abo praktisch nichts.
4. **TWINT ungeklärt.** Ob Stripe TWINT für eine deutsche GbR freischaltet, war
   nicht abschließend zu klären (Firmensitz Lörrach, Verkauf in die Schweiz).
5. **Impressum unvollständig.** Eine GbR muss alle vertretungsberechtigten
   Gesellschafter namentlich nennen; bisher steht nur Sophie Wieland dort. Die
   USt-IdNr. fehlt ebenfalls.
6. **Datenschutzerklärung ist ein Entwurf.** Branchenüblich aufgebaut, aber bei
   Verkauf nach Deutschland *und* in die Schweiz (DSGVO und Schweizer DSG)
   ausdrücklich kein Ersatz für eine juristische Prüfung.

## Für die spätere Integration

Der Code setzt das Datenmodell der Spielerapp voraus. Wer ihn in ein anderes
Projekt übernimmt, muss vor allem drei Annahmen ersetzen:

- **Mandant ist `organizations`.** `org_subscriptions.org_id` zeigt darauf,
  `is_org_member()` entscheidet über das Leserecht.
- **Rollen sind `spieler` / `management` / `trainer`** aus `memberships`.
  Checkout und Kundenportal lassen nur die ersten beiden zu.
- **Genau ein Spieler pro Team.** Die Planstufen (Basis / Fortgeschritten /
  Pro) und die Zusatzposten (weitere Nutzer, mehr Speicher) sind darauf
  zugeschnitten.

Unabhängig davon und ohne Anpassung übernehmbar sind der Stripe-Ablauf als
Muster (Checkout serverseitig, Preis-IDs nie im Frontend, Webhook als einziger
Schreiber des Abo-Status) sowie die Rechtstexte.

## Vorbehalt zu Migration 021

Der Sicherheitsfix ist in der App geblieben, hat aber einen ungeprüften Punkt.
Er entzieht das Schreibrecht spaltenweise:

```sql
revoke update (approved, approval_token) on public.organizations from authenticated;
```

In PostgreSQL wirkt das **nur**, wenn die Rolle kein Schreibrecht auf
Tabellenebene hält — Rechte auf Tabelle und Spalte werden getrennt geführt,
und die Prüfung genügt sich an einem von beiden. Supabase vergibt
standardmäßig `grant all on all tables in schema public to authenticated`.
Trifft das hier zu, läuft das `revoke` ins Leere und ein Trainer kann sich
weiterhin selbst freischalten. Der Trigger aus derselben Migration greift
davon unabhängig, prüft aber nur `role_permissions` und `theme`, nicht
`approved`.

Nachzusehen mit:

```sql
select grantee, privilege_type from information_schema.table_privileges
where table_name = 'organizations' and grantee = 'authenticated';
```

Steht dort `UPDATE`, ist der richtige Weg: Schreibrecht auf Tabellenebene
entziehen und nur für die erlaubten Spalten wieder erteilen
(`name`, `player_name`, `role_permissions`, `theme`).
