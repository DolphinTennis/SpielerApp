-- Add the 'sonstiges' category to training_sessions.
alter table public.training_sessions drop constraint training_sessions_category_check;
alter table public.training_sessions add constraint training_sessions_category_check
  check (category in ('tennis', 'kondi', 'physio', 'mental', 'sonstiges'));
