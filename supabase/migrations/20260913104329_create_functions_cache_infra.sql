-- ============================================================================
-- create_functions_cache_infra
-- Functions for caches, materialised-view refresh, audit and housekeeping.
-- ============================================================================





CREATE OR REPLACE FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_cache_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_refresh_scheduled_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiration and refresh times
    v_expires_at := NOW() + (p_ttl_hours || ' hours')::INTERVAL;
    -- Schedule refresh 1 hour before expiry
    v_refresh_scheduled_at := v_expires_at - INTERVAL '1 hour';

    -- Insert cache entry
    INSERT INTO cache_refresh_queue (
        org_id,
        agent_type,
        cache_name,
        context_data,
        ttl_type,
        created_at,
        expires_at,
        refresh_scheduled_at,
        status
    ) VALUES (
        p_org_id,
        p_agent_type,
        p_cache_name,
        p_context_data,
        p_ttl_type,
        NOW(),
        v_expires_at,
        v_refresh_scheduled_at,
        'active'
    )
    RETURNING id INTO v_cache_id;

    RETURN v_cache_id;
END;
$$;


ALTER FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) IS 'Add new cache entry to refresh queue with automatic scheduling';



CREATE OR REPLACE FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    CASE p_resource_type
        WHEN 'campaign' THEN
            RETURN '/campaigns/' || p_resource_id::text;
        WHEN 'output' THEN
            RETURN '/outputs?id=' || p_resource_id::text;
        WHEN 'task' THEN
            RETURN '/tasks';
        WHEN 'approval' THEN
            RETURN '/dashboard';
        ELSE
            RETURN '/dashboard';
    END CASE;
END;
$$;


ALTER FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_client_slug TEXT;
  v_base_path TEXT;
BEGIN
  -- If client_id is provided, look up the client slug for Agency URL format
  IF p_client_id IS NOT NULL THEN
    SELECT slug INTO v_client_slug FROM public.clients WHERE id = p_client_id;
    IF v_client_slug IS NOT NULL THEN
      v_base_path := '/clients/' || v_client_slug;
    ELSE
      v_base_path := '';  -- Fallback if client not found
    END IF;
  ELSE
    v_base_path := '';  -- SME users have no client prefix
  END IF;

  -- Build URL based on resource type
  CASE p_resource_type
    WHEN 'output' THEN
      RETURN v_base_path || '/outputs/' || p_resource_id;
    WHEN 'campaign' THEN
      RETURN v_base_path || '/campaigns/' || p_resource_id;
    WHEN 'persona' THEN
      RETURN v_base_path || '/outputs/' || p_resource_id;  -- Personas shown as outputs
    WHEN 'strategy' THEN
      RETURN v_base_path || '/outputs/' || p_resource_id;  -- Strategies shown as outputs
    WHEN 'content' THEN
      RETURN v_base_path || '/outputs/' || p_resource_id;  -- Content items shown as outputs
    ELSE
      -- Default fallback to outputs page with the resource ID
      RETURN v_base_path || '/outputs/' || p_resource_id;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_caches"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Mark caches as expired if past expiration time
    UPDATE cache_refresh_queue
    SET status = 'expired'
    WHERE status IN ('active', 'refreshing')
      AND expires_at < NOW();

    -- Delete expired entries older than 7 days
    DELETE FROM cache_refresh_queue
    WHERE status = 'expired'
      AND expires_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_caches"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_caches"() IS 'Remove old expired cache entries (run daily via pg_cron)';


CREATE OR REPLACE FUNCTION "public"."execute_cache_warming"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Log start of warming cycle
    RAISE NOTICE 'Starting cache warming cycle at %', NOW();

    -- In production, this would call a webhook to trigger the Python CacheWarmer
    -- For now, we'll use database functions to handle warming logic

    -- Get caches due for refresh and process them
    -- This is a placeholder - actual warming happens via external service
    RAISE NOTICE 'Cache warming cycle completed at %', NOW();
END;
$$;


ALTER FUNCTION "public"."execute_cache_warming"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_cache_warming"() IS 'Execute one cache warming cycle (called by pg_cron every 15 minutes)';



CREATE OR REPLACE FUNCTION "public"."get_cache_cron_jobs"() RETURNS TABLE("job_id" bigint, "job_name" "text", "schedule" "text", "active" boolean, "last_run" timestamp with time zone, "next_run" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        NULL::TIMESTAMP WITH TIME ZONE as last_run,  -- pg_cron doesn't track this in basic version
        NULL::TIMESTAMP WITH TIME ZONE as next_run   -- Would need to calculate based on schedule
    FROM cron.job j
    WHERE j.jobname IN ('cache_warmer_15min', 'cache_cleanup_daily')
    ORDER BY j.jobname;
END;
$$;


ALTER FUNCTION "public"."get_cache_cron_jobs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cache_cron_jobs"() IS 'Get status of scheduled cache-related cron jobs';



CREATE OR REPLACE FUNCTION "public"."get_cache_refresh_stats"("p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_caches', COUNT(*),
        'active_caches', COUNT(*) FILTER (WHERE status = 'active'),
        'refreshing_caches', COUNT(*) FILTER (WHERE status = 'refreshing'),
        'failed_caches', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_refreshes', SUM(refresh_count),
        'avg_refresh_count', ROUND(AVG(refresh_count), 2),
        'caches_due_soon', COUNT(*) FILTER (WHERE status = 'active' AND refresh_scheduled_at <= NOW() + INTERVAL '1 hour'),
        'by_agent_type', (
            SELECT json_object_agg(
                agent_type,
                json_build_object(
                    'count', COUNT(*),
                    'avg_refreshes', ROUND(AVG(refresh_count), 2)
                )
            )
            FROM cache_refresh_queue
            WHERE (p_org_id IS NULL OR org_id = p_org_id)
              AND status = 'active'
            GROUP BY agent_type
        )
    )
    INTO v_result
    FROM cache_refresh_queue
    WHERE p_org_id IS NULL OR org_id = p_org_id;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_cache_refresh_stats"("p_org_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer DEFAULT 100) RETURNS TABLE("id" "uuid", "org_id" "uuid", "agent_type" "text", "cache_name" "text", "context_data" "jsonb", "ttl_type" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        crq.id,
        crq.org_id,
        crq.agent_type,
        crq.cache_name,
        crq.context_data,
        crq.ttl_type,
        crq.expires_at
    FROM cache_refresh_queue crq
    WHERE crq.status = 'active'
      AND crq.refresh_scheduled_at <= NOW()
    ORDER BY crq.refresh_scheduled_at ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer) IS 'Get caches that need refresh (used by cache warmer service)';



CREATE OR REPLACE FUNCTION "public"."get_materialized_view_stats"() RETURNS TABLE("view_name" "text", "row_count" bigint, "size_bytes" bigint, "last_refresh" timestamp with time zone, "index_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    'user_roles_cache'::TEXT as view_name,
    (SELECT count(*) FROM user_roles_cache)::BIGINT as row_count,
    pg_total_relation_size('user_roles_cache')::BIGINT as size_bytes,
    (SELECT cached_at FROM user_roles_cache LIMIT 1) as last_refresh,
    (SELECT count(*) FROM pg_indexes WHERE tablename = 'user_roles_cache')::INT as index_count

  UNION ALL

  SELECT
    'org_metrics_cache'::TEXT as view_name,
    (SELECT count(*) FROM org_metrics_cache)::BIGINT as row_count,
    pg_total_relation_size('org_metrics_cache')::BIGINT as size_bytes,
    (SELECT cached_at FROM org_metrics_cache LIMIT 1) as last_refresh,
    (SELECT count(*) FROM pg_indexes WHERE tablename = 'org_metrics_cache')::INT as index_count;
END;
$$;


ALTER FUNCTION "public"."get_materialized_view_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_materialized_view_stats"() IS 'Returns statistics about materialized views including size and refresh times.
Useful for performance monitoring and optimization.';


CREATE OR REPLACE FUNCTION "public"."increment_field"("p_table_name" "text", "p_field_name" "text", "p_increment_by" numeric, "p_row_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
    -- Use dynamic SQL with proper escaping
    EXECUTE format(
        'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
        p_table_name, p_field_name, p_field_name
    ) USING p_increment_by, p_row_id;
END;
$_$;


ALTER FUNCTION "public"."increment_field"("p_table_name" "text", "p_field_name" "text", "p_increment_by" numeric, "p_row_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_resource_type" "text", "p_resource_id" "uuid", "p_action" "text", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = v_user_id;

    INSERT INTO resource_activity (
        org_id, resource_type, resource_id, user_id, action, details
    ) VALUES (
        v_org_id, p_resource_type, p_resource_id, v_user_id, p_action, p_details
    );
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_resource_type" "text", "p_resource_id" "uuid", "p_action" "text", "p_details" "jsonb") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."log_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_resource_title" "text", "p_activity_type" "text", "p_comment" "text" DEFAULT NULL::"text", "p_details" "jsonb" DEFAULT '{}'::"jsonb", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_activity_id UUID;
  v_user_id UUID;
  v_org_id UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User authentication required';
  END IF;

  -- Get org and user details
  SELECT
    u.org_id,
    COALESCE(u.full_name, u.email),
    r.name
  INTO v_org_id, v_actor_name, v_actor_role
  FROM users u
  LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
  LEFT JOIN roles r ON r.id = ura.role_id
  WHERE u.id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User organization not found';
  END IF;

  -- Format role name for display (remove prefix, humanize)
  IF v_actor_role IS NOT NULL THEN
    v_actor_role := REPLACE(REPLACE(v_actor_role, 'sme_', ''), 'agency_', '');
    v_actor_role := REPLACE(v_actor_role, '_', ' ');
    v_actor_role := INITCAP(v_actor_role);
  END IF;

  -- Insert activity record
  INSERT INTO resource_activity (
    org_id,
    client_id,
    resource_type,
    resource_id,
    resource_title,
    activity_type,
    actor_id,
    actor_name,
    actor_role,
    comment,
    details
  ) VALUES (
    v_org_id,
    p_client_id,
    p_resource_type,
    p_resource_id,
    p_resource_title,
    p_activity_type,
    v_user_id,
    v_actor_name,
    v_actor_role,
    p_comment,
    p_details
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;


ALTER FUNCTION "public"."log_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_resource_title" "text", "p_activity_type" "text", "p_comment" "text", "p_details" "jsonb", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_cache_refresh_complete"("p_cache_id" "uuid", "p_new_cache_name" "text", "p_new_ttl_hours" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_new_expires_at TIMESTAMP WITH TIME ZONE;
    v_new_refresh_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate new expiration and refresh times
    v_new_expires_at := NOW() + (p_new_ttl_hours || ' hours')::INTERVAL;
    v_new_refresh_at := v_new_expires_at - INTERVAL '1 hour';

    -- Update cache entry with new schedule
    UPDATE cache_refresh_queue
    SET status = 'active',
        cache_name = p_new_cache_name,
        expires_at = v_new_expires_at,
        refresh_scheduled_at = v_new_refresh_at,
        last_refreshed_at = NOW(),
        refresh_count = refresh_count + 1,
        error_message = NULL,
        updated_at = NOW()
    WHERE id = p_cache_id;
END;
$$;


ALTER FUNCTION "public"."mark_cache_refresh_complete"("p_cache_id" "uuid", "p_new_cache_name" "text", "p_new_ttl_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_cache_refresh_failed"("p_cache_id" "uuid", "p_error_message" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE cache_refresh_queue
    SET status = 'failed',
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_cache_id;
END;
$$;


ALTER FUNCTION "public"."mark_cache_refresh_failed"("p_cache_id" "uuid", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_cache_refreshing"("p_cache_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE cache_refresh_queue
    SET status = 'refreshing',
        updated_at = NOW()
    WHERE id = p_cache_id;
END;
$$;


ALTER FUNCTION "public"."mark_cache_refreshing"("p_cache_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_all_materialized_views"() RETURNS TABLE("view_name" "text", "refresh_status" "text", "refresh_duration" interval, "row_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  view_row_count BIGINT;
BEGIN
  -- Refresh user_roles_cache
  start_time := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_cache;
    SELECT count(*) INTO view_row_count FROM user_roles_cache;
    end_time := clock_timestamp();

    RETURN QUERY SELECT
      'user_roles_cache'::TEXT,
      'SUCCESS'::TEXT,
      end_time - start_time,
      view_row_count;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    RETURN QUERY SELECT
      'user_roles_cache'::TEXT,
      'ERROR: ' || SQLERRM,
      end_time - start_time,
      0::BIGINT;
  END;

  -- Refresh org_metrics_cache
  start_time := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY org_metrics_cache;
    SELECT count(*) INTO view_row_count FROM org_metrics_cache;
    end_time := clock_timestamp();

    RETURN QUERY SELECT
      'org_metrics_cache'::TEXT,
      'SUCCESS'::TEXT,
      end_time - start_time,
      view_row_count;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    RETURN QUERY SELECT
      'org_metrics_cache'::TEXT,
      'ERROR: ' || SQLERRM,
      end_time - start_time,
      0::BIGINT;
  END;

  -- Notify completion
  PERFORM pg_notify('materialized_views_refreshed', json_build_object(
    'timestamp', extract(epoch from now()),
    'refreshed_views', array['user_roles_cache', 'org_metrics_cache']
  )::text);
END;
$$;


ALTER FUNCTION "public"."refresh_all_materialized_views"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_all_materialized_views"() IS 'Manually refresh all materialized views with performance monitoring.
Useful for scheduled maintenance and debugging.';



CREATE OR REPLACE FUNCTION "public"."schedule_cache_cleanup_job"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_job_id BIGINT;
    v_cron_available BOOLEAN;
BEGIN
    -- Check if cron.schedule function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'schedule'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'cron')
    ) INTO v_cron_available;

    IF NOT v_cron_available THEN
        RAISE NOTICE 'pg_cron not available - skipping job scheduling';
        RETURN 'pg_cron not available (expected in local dev)';
    END IF;

    -- Check if job already exists
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'cache_cleanup_daily';

    IF v_job_id IS NOT NULL THEN
        -- Unschedule existing job
        PERFORM cron.unschedule(v_job_id);
        RAISE NOTICE 'Unscheduled existing cache_cleanup_daily job';
    END IF;

    -- Schedule new job to run daily at 2 AM
    v_job_id := cron.schedule(
        'cache_cleanup_daily',
        '0 2 * * *',  -- Every day at 2 AM
        'SELECT cleanup_expired_caches()'
    );

    RAISE NOTICE 'Scheduled cache_cleanup_daily job with ID: %', v_job_id;

    RETURN 'Scheduled cache cleanup job: ' || v_job_id::TEXT;
END;
$$;


ALTER FUNCTION "public"."schedule_cache_cleanup_job"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."schedule_cache_cleanup_job"() IS 'Schedule daily cleanup job to remove expired cache entries';



CREATE OR REPLACE FUNCTION "public"."schedule_cache_warming_job"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_job_id BIGINT;
    v_cron_available BOOLEAN;
BEGIN
    -- Check if cron.schedule function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'schedule'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'cron')
    ) INTO v_cron_available;

    IF NOT v_cron_available THEN
        RAISE NOTICE 'pg_cron not available - skipping job scheduling';
        RETURN 'pg_cron not available (expected in local dev)';
    END IF;

    -- Check if job already exists
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'cache_warmer_15min';

    IF v_job_id IS NOT NULL THEN
        -- Unschedule existing job
        PERFORM cron.unschedule(v_job_id);
        RAISE NOTICE 'Unscheduled existing cache_warmer_15min job';
    END IF;

    -- Schedule new job to run every 15 minutes
    v_job_id := cron.schedule(
        'cache_warmer_15min',
        '*/15 * * * *',  -- Every 15 minutes
        'SELECT execute_cache_warming()'
    );

    RAISE NOTICE 'Scheduled cache_warmer_15min job with ID: %', v_job_id;

    RETURN 'Scheduled cache warming job: ' || v_job_id::TEXT;
END;
$$;


ALTER FUNCTION "public"."schedule_cache_warming_job"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."schedule_cache_warming_job"() IS 'Schedule cache warming job to run every 15 minutes';



CREATE OR REPLACE FUNCTION "public"."update_brand_guidelines_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_brand_guidelines_updated_at"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."update_cache_refresh_queue_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cache_refresh_queue_updated_at"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";