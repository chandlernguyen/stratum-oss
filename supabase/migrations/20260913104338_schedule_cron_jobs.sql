-- ============================================================================
-- schedule_cron_jobs
-- Scheduled jobs (pg_cron).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 4. pg_cron jobs
--    cron.job rows are data, so pg_dump omits them. Guarded by an existence
--    check because pg_cron is unavailable on some managed Postgres offerings.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'schedule'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'cron')
    ) THEN
        PERFORM cron.schedule('cache_warmer_15min',  '*/15 * * * *', 'SELECT execute_cache_warming()');
        PERFORM cron.schedule('cache_cleanup_daily', '0 2 * * *',    'SELECT cleanup_expired_caches()');
    END IF;
END $$;