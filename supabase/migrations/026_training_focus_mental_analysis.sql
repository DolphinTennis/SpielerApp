-- Trainingsfokus: zusätzliches Textfeld "Mentale Analyse" (zwischen "Was war gut"
-- und "Was kann ich verbessern"). Es speist zusammen mit Datum und
-- "Energie mental" auch die Ablage "Mentaler Trainingsfokus", die direkt aus
-- den Trainingsfokus-Einträgen gelesen wird (keine zweite Kopie der Daten).
--
-- Direkt für das Schema `spielerapp` geschrieben (siehe Migration 024).
-- Bestehende Einträge bleiben unverändert gültig (Feld leer).
alter table spielerapp.training_focus_entries
  add column if not exists mental_analyse text;
