-- Polls the shared team mailbox every 10 minutes via the email-inbound
-- Edge Function, so a link shared by "Teilen -> Mail" shows up in
-- Beispiele without anyone needing to open the app. The bearer token used
-- to authenticate the call is stored in Supabase Vault (set separately via
-- `select vault.create_secret(...)`, NOT in this file) rather than hard-
-- coded here, so this migration is safe to commit.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'email-inbound-poll',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://lguvrhdvlqipbjkesuon.supabase.co/functions/v1/email-inbound',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'email_inbound_cron_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
