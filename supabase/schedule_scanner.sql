-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Schedule the scanner to run every minute
-- REPLACE 'YOUR_PROJECT_REF' and 'YOUR_SERVICE_ROLE_KEY' below!
select cron.schedule(
        'market-scanner-cron',
        '* * * * *',
        -- Every minute
        $$
        select net.http_post(
                url := 'https://bhigvgfkttvjibvlyqpl.supabase.co/functions/v1/market-scanner',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
                body := '{}'::jsonb
            ) as request_id;
$$
);
-- To check status: select * from cron.job_run_details order by start_time desc;
-- To unschedule: select cron.unschedule('market-scanner-cron');