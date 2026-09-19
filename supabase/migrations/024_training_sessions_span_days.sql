-- Mehrtägige Termine (z. B. ein Turnier von Samstag bis Sonntag) und mehrtägige
-- Serien (jede Woche Freitag bis Sonntag).
--
-- Bisher hatte ein Termin nur eine Start- und Endzeit am selben Tag; end_date
-- bedeutet ausschließlich das Ende einer Serie. span_days ist die Dauer in
-- Tagen ab dem Beginn: 0 = endet am selben Tag, 2 = endet zwei Tage später.
--
-- Diese Migration ist direkt für das Schema `spielerapp` auf dem eigenen Server
-- geschrieben (nicht mehr für `public` wie die Umzugs-Migrationen 001-023).
-- Sie legt nur Spalten an und lockert eine Regel; bestehende Zeilen bleiben
-- unverändert gültig (span_days = 0 entspricht dem bisherigen Verhalten).

alter table spielerapp.training_sessions
  add column if not exists span_days smallint not null default 0;

alter table spielerapp.training_sessions
  drop constraint if exists training_sessions_span_days_range;
alter table spielerapp.training_sessions
  add constraint training_sessions_span_days_range check (span_days between 0 and 30);

-- "Ende nach Beginn" gilt nur noch am selben Tag. Geht ein Termin über Nacht
-- (20:00 bis 10:00 am nächsten Tag), ist die Endzeit rechnerisch früher.
alter table spielerapp.training_sessions
  drop constraint if exists training_sessions_time_range;
alter table spielerapp.training_sessions
  add constraint training_sessions_time_range check (span_days > 0 or end_time > start_time);

-- Einzelne Termine einer Serie können eine abweichende Dauer haben.
-- null = wie die Serie.
alter table spielerapp.training_session_exceptions
  add column if not exists override_span_days smallint;

alter table spielerapp.training_session_exceptions
  drop constraint if exists training_session_exceptions_span_days_range;
alter table spielerapp.training_session_exceptions
  add constraint training_session_exceptions_span_days_range
  check (override_span_days is null or override_span_days between 0 and 30);
