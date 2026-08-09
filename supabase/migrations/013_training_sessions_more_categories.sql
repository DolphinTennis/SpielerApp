-- Add 'spiel', 'turnier_national', 'turnier_international' categories.
alter table public.training_sessions drop constraint training_sessions_category_check;
alter table public.training_sessions add constraint training_sessions_category_check
  check (category in ('tennis', 'kondi', 'physio', 'mental', 'spiel', 'turnier_national', 'turnier_international', 'sonstiges'));
