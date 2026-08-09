-- email-inbound is now triggered from the client when the Beispiele page
-- opens (see src/pages/Beispiele.jsx / mediaExamplesApi.js) instead of
-- running on a fixed schedule, so the pg_cron job from 010 is no longer
-- needed.
select cron.unschedule('email-inbound-poll');
