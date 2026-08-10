-- Cache for machine-translated Matchanalyse content, keyed by target
-- language: { "en": { "form1": {...same keys as form1, translated values...}, "form2": {...} } }.
-- Cleared (reset to '{}') whenever form1/form2 changes on save (see
-- MatchEditor.jsx persist()), so a stale translation never lingers after
-- an edit — the next "Übersetzen" click regenerates it via the
-- translate-match Edge Function.
alter table public.matches
  add column if not exists translations jsonb not null default '{}'::jsonb;
