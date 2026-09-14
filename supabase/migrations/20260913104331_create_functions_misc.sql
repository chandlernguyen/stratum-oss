-- ============================================================================
-- create_functions_misc
-- Functions that did not classify into a domain above; kept together for review.
-- ============================================================================




CREATE OR REPLACE FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text" DEFAULT 'admin'::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Validate email format
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', p_email;
    END IF;

    -- Insert or update invite
    INSERT INTO alpha_invites (email, invited_by, notes)
    VALUES (LOWER(p_email), p_invited_by, p_notes)
    ON CONFLICT (email)
    DO UPDATE SET
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        notes = EXCLUDED.notes,
        invited_at = NOW()
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$_$;


ALTER FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text", "p_notes" "text") IS 'Add or reactivate an alpha invite. Returns invite ID.';



CREATE OR REPLACE FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Archive in agency schema
    UPDATE agency.brand_guidelines
    SET
      archived_at = NOW(),
      archived_by = v_user_id,
      archive_reason = p_reason,
      updated_at = NOW()
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND client_id = p_client_id
      AND archived_at IS NULL
    RETURNING jsonb_build_object(
      'id', id,
      'name', name,
      'archived_at', archived_at
    ) INTO v_result;

  ELSIF v_org_type = 'SME' THEN
    -- Archive in public schema
    UPDATE public.brand_guidelines
    SET
      archived_at = NOW(),
      archived_by = v_user_id,
      archive_reason = p_reason,
      updated_at = NOW()
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND archived_at IS NULL
    RETURNING jsonb_build_object(
      'id', id,
      'name', name,
      'archived_at', archived_at
    ) INTO v_result;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Brand guideline not found, already archived, or access denied';
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text") IS 'Router function for archiving brand guidelines. Detects org type and archives in correct schema.';



CREATE OR REPLACE FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_query TEXT;
    v_success BOOLEAN;
BEGIN
    -- Build dynamic query to archive record
    v_query := format(
        'UPDATE %I SET 
            archived_at = now(),
            archived_by = $1,
            archive_reason = $2,
            updated_at = now(),
            updated_by = $1
         WHERE id = $3 AND archived_at IS NULL',
        p_table_name
    );
    
    -- Execute the query
    EXECUTE v_query USING p_user_id, p_reason, p_record_id;
    
    -- Check if any row was updated
    GET DIAGNOSTICS v_success = ROW_COUNT;

    RETURN v_success;
END;
$_$;


ALTER FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text") IS 'Generic function to archive any record with audit trail';


CREATE OR REPLACE FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_query TEXT;
    v_count INTEGER;
BEGIN
    -- Build dynamic query to archive multiple records
    v_query := format(
        'UPDATE %I SET 
            archived_at = now(),
            archived_by = $1,
            archive_reason = $2,
            updated_at = now(),
            updated_by = $1
         WHERE id = ANY($3) AND archived_at IS NULL',
        p_table_name
    );
    
    -- Execute the query
    EXECUTE v_query USING p_user_id, p_reason, p_record_ids;
    
    -- Get count of updated rows
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$_$;


ALTER FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text") IS 'Archive multiple records at once';


CREATE OR REPLACE FUNCTION "public"."calculate_data_completeness"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    total_fields INTEGER := 14; -- Number of fields to check
    filled_fields INTEGER := 0;
BEGIN
    -- Count filled fields
    IF NEW.company_name IS NOT NULL AND NEW.company_name != '' THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.website IS NOT NULL AND NEW.website != '' THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.industry IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.company_size IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.geography IS NOT NULL AND array_length(NEW.geography, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.business_model IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.company_stage IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.funding_status IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.target_market IS NOT NULL AND array_length(NEW.target_market, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.main_products IS NOT NULL AND array_length(NEW.main_products, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.key_competitors IS NOT NULL AND array_length(NEW.key_competitors, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.tech_stack IS NOT NULL AND array_length(NEW.tech_stack, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.annual_revenue IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.marketing_budget IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    
    -- Calculate percentage
    NEW.data_completeness_score := (filled_fields * 100) / total_fields;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_data_completeness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_extraction_quality"("p_org_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_days_back" integer DEFAULT 30) RETURNS TABLE("parse_success_rate" numeric, "approval_rate" numeric, "empty_response_rate" numeric, "avg_confidence_score" numeric, "total_cost" numeric, "model_recommendation" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT
            SUM(total_extractions) as total,
            SUM(successful_parses) as parsed,
            SUM(approved_insights) as approved,
            SUM(rejected_insights) as rejected,
            SUM(empty_responses) as empty,
            AVG(avg_confidence) as avg_conf,
            SUM(total_cost) as cost
        FROM insight_extraction_metrics
        WHERE org_id = p_org_id
        AND (p_agent_type IS NULL OR agent_type = p_agent_type)
        AND extraction_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    )
    SELECT
        CASE WHEN total > 0 THEN ROUND((parsed::DECIMAL / total) * 100, 2) ELSE 0 END,
        CASE WHEN (approved + rejected) > 0
            THEN ROUND((approved::DECIMAL / (approved + rejected)) * 100, 2)
            ELSE 0 END,
        CASE WHEN total > 0 THEN ROUND((empty::DECIMAL / total) * 100, 2) ELSE 0 END,
        ROUND(COALESCE(avg_conf, 0), 2),
        ROUND(COALESCE(cost, 0), 2),
        CASE
            WHEN total IS NULL OR total = 0 THEN 'No data yet'
            WHEN (parsed::DECIMAL / NULLIF(total, 0)) >= 0.99
                AND (approved::DECIMAL / NULLIF(approved + rejected, 0)) >= 0.70
            THEN 'Continue with Flash-Lite'
            ELSE 'Consider upgrading to Flash'
        END
    FROM metrics;
END;
$$;


ALTER FUNCTION "public"."calculate_extraction_quality"("p_org_id" "uuid", "p_agent_type" "text", "p_days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_deleted_name TEXT;
BEGIN
  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Get name before delete
    SELECT name INTO v_deleted_name
    FROM agency.brand_guidelines
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND client_id = p_client_id;

    IF v_deleted_name IS NULL THEN
      RAISE EXCEPTION 'Brand guideline not found or access denied';
    END IF;

    -- Delete from agency schema
    DELETE FROM agency.brand_guidelines
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND client_id = p_client_id;

  ELSIF v_org_type = 'SME' THEN
    -- Get name before delete
    SELECT name INTO v_deleted_name
    FROM public.brand_guidelines
    WHERE id = p_guideline_id AND org_id = p_org_id;

    IF v_deleted_name IS NULL THEN
      RAISE EXCEPTION 'Brand guideline not found or access denied';
    END IF;

    -- Delete from public schema
    DELETE FROM public.brand_guidelines
    WHERE id = p_guideline_id AND org_id = p_org_id;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN jsonb_build_object(
    'id', p_guideline_id,
    'name', v_deleted_name,
    'deleted', true
  );
END;
$$;


ALTER FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") IS 'Router function for permanently deleting brand guidelines. Detects org type and deletes from correct schema.';


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If setting this as default, unset other defaults for this client
  IF NEW.is_default = true AND NEW.campaign_id IS NULL THEN
    UPDATE agency.brand_guidelines
    SET is_default = false
    WHERE org_id = NEW.org_id
      AND client_id = NEW.client_id
      AND campaign_id IS NULL
      AND id != NEW.id
      AND archived_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() IS 'Ensures only one default brand guideline per client. Now includes SECURITY DEFINER and SET search_path for security. Migration 180.';



CREATE OR REPLACE FUNCTION "public"."ensure_single_default_brand_guidelines"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE brand_guidelines
        SET is_default = false
        WHERE org_id = NEW.org_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_brand_guidelines"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_brand_guidelines"("p_org_id" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "brand_voice" "jsonb", "writing_style" "jsonb", "messaging_guidelines" "jsonb", "content_dos_and_donts" "jsonb", "terminology" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bg.id,
        bg.brand_voice,
        bg.writing_style,
        bg.messaging_guidelines,
        bg.content_dos_and_donts,
        bg.terminology
    FROM brand_guidelines bg
    WHERE bg.org_id = p_org_id
    AND bg.is_active = true
    AND (
        (p_campaign_id IS NOT NULL AND bg.campaign_id = p_campaign_id)
        OR (p_campaign_id IS NULL AND bg.is_default = true)
        OR (p_campaign_id IS NOT NULL AND bg.campaign_id IS NULL AND bg.is_default = true)
    )
    ORDER BY
        CASE WHEN bg.campaign_id = p_campaign_id THEN 0 ELSE 1 END,
        bg.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_active_brand_guidelines"("p_org_id" "uuid", "p_campaign_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "campaign_id" "uuid", "name" "text", "description" "text", "is_default" boolean, "version" integer, "parent_id" "uuid", "guidelines" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid", "updated_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
BEGIN
  -- Get organization type (fully qualify column to avoid ambiguity)
  SELECT type INTO v_org_type FROM organizations WHERE organizations.id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Agency: Query agency.brand_guidelines (client-scoped)
    RETURN QUERY
    SELECT
      bg.id,
      bg.org_id,
      bg.client_id,
      bg.campaign_id,
      bg.name,  -- TEXT type in agency schema
      bg.description,
      bg.is_default,
      bg.version,
      bg.parent_id,
      bg.guidelines,
      bg.created_at,
      bg.updated_at,
      bg.created_by,
      bg.updated_by
    FROM agency.brand_guidelines bg
    WHERE bg.org_id = p_org_id
      AND bg.client_id = p_client_id
      AND bg.archived_at IS NULL
    ORDER BY bg.is_default DESC, bg.created_at DESC;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Query public.brand_guidelines (org-scoped)
    RETURN QUERY
    SELECT
      bg.id,
      bg.org_id,
      NULL::UUID,  -- No client_id for SME
      bg.campaign_id,
      bg.name::TEXT,  -- Cast varchar to text for consistency
      bg.description,
      bg.is_default,
      bg.version,
      bg.parent_id,
      bg.guidelines,
      bg.created_at,
      bg.updated_at,
      bg.created_by,
      bg.updated_by
    FROM public.brand_guidelines bg
    WHERE bg.org_id = p_org_id
      AND bg.archived_at IS NULL
    ORDER BY bg.is_default DESC, bg.created_at DESC;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid") IS 'Router function for reading brand guidelines. Detects org type and queries correct schema. Fixed type mismatch for name column.';



CREATE OR REPLACE FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("channel" "text", "total_spend" numeric, "total_revenue" numeric, "total_conversions" integer, "total_impressions" bigint, "total_clicks" integer, "avg_roi" numeric, "avg_cpc" numeric, "avg_ctr" numeric, "campaign_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cm.source, 'manual')::TEXT as channel,
    SUM(cm.spend)::DECIMAL as total_spend,
    SUM(COALESCE(cm.revenue, 0))::DECIMAL as total_revenue,
    SUM(COALESCE(cm.conversions, 0))::INTEGER as total_conversions,
    SUM(COALESCE(cm.impressions, 0))::BIGINT as total_impressions,
    SUM(COALESCE(cm.clicks, 0))::INTEGER as total_clicks,
    -- Average ROI weighted by spend
    CASE
      WHEN SUM(cm.spend) > 0 THEN
        (SUM(COALESCE(cm.revenue, 0)) - SUM(cm.spend)) / SUM(cm.spend) * 100
      ELSE 0
    END::DECIMAL as avg_roi,
    -- Average CPC
    CASE
      WHEN SUM(COALESCE(cm.clicks, 0)) > 0 THEN
        SUM(cm.spend) / SUM(COALESCE(cm.clicks, 0))
      ELSE 0
    END::DECIMAL as avg_cpc,
    -- Average CTR
    CASE
      WHEN SUM(COALESCE(cm.impressions, 0)) > 0 THEN
        (SUM(COALESCE(cm.clicks, 0))::DECIMAL / SUM(COALESCE(cm.impressions, 0))::DECIMAL) * 100
      ELSE 0
    END::DECIMAL as avg_ctr,
    COUNT(DISTINCT cm.campaign_name)::INTEGER as campaign_count
  FROM campaign_metrics cm
  WHERE cm.org_id = p_org_id
    AND (p_start_date IS NULL OR cm.metric_date >= p_start_date)
    AND (p_end_date IS NULL OR cm.metric_date <= p_end_date)
  GROUP BY COALESCE(cm.source, 'manual')
  ORDER BY total_spend DESC;
END;
$$;


ALTER FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Aggregates campaign metrics by channel for budget optimization. Returns spend, revenue, conversions, and calculated metrics (ROI, CPC, CTR) grouped by source. Used by Budget Optimizer tool for allocation recommendations.';



CREATE OR REPLACE FUNCTION "public"."get_entity_relationships"("p_entity_type" "text", "p_entity_id" "uuid", "p_direction" "text" DEFAULT 'both'::"text") RETURNS TABLE("relationship_id" "uuid", "source_type" "text", "source_id" "uuid", "target_type" "text", "target_id" "uuid", "relationship_type" "text", "metadata" "jsonb", "strength" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.id,
        er.source_type,
        er.source_id,
        er.target_type,
        er.target_id,
        er.relationship_type,
        er.metadata,
        er.strength,
        er.created_at
    FROM enterprise_relationships er
    WHERE 
        (p_direction IN ('source', 'both') AND er.source_type = p_entity_type AND er.source_id = p_entity_id)
        OR
        (p_direction IN ('target', 'both') AND er.target_type = p_entity_type AND er.target_id = p_entity_id)
    ORDER BY er.strength DESC, er.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_entity_relationships"("p_entity_type" "text", "p_entity_id" "uuid", "p_direction" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSON;
    v_avg_daily_requests DECIMAL;
    v_avg_daily_cost DECIMAL;
    v_avg_daily_savings DECIMAL;
    v_days_tracked INTEGER;
BEGIN
    -- Calculate average daily metrics from actual data
    SELECT
        COUNT(DISTINCT DATE(timestamp)) as days_tracked,
        COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT DATE(timestamp)), 0) as avg_daily_requests,
        SUM(total_cost_usd)::DECIMAL / NULLIF(COUNT(DISTINCT DATE(timestamp)), 0) as avg_daily_cost,
        SUM(cache_savings_usd)::DECIMAL / NULLIF(COUNT(DISTINCT DATE(timestamp)), 0) as avg_daily_savings
    INTO v_days_tracked, v_avg_daily_requests, v_avg_daily_cost, v_avg_daily_savings
    FROM gemini_cost_tracking
    WHERE org_id = p_org_id
      AND timestamp >= NOW() - INTERVAL '30 days';

    -- Project to monthly estimates
    SELECT json_build_object(
        'org_id', p_org_id,
        'based_on_days', COALESCE(v_days_tracked, 0),
        'avg_daily_requests', ROUND(COALESCE(v_avg_daily_requests, 0)),
        'estimated_monthly_requests', ROUND(COALESCE(v_avg_daily_requests * 30, 0)),
        'estimated_monthly_cost_usd', ROUND(COALESCE(v_avg_daily_cost * 30, 0), 2),
        'estimated_monthly_savings_usd', ROUND(COALESCE(v_avg_daily_savings * 30, 0), 2),
        'has_actual_data', v_days_tracked > 0,
        'data_quality', CASE
            WHEN v_days_tracked >= 30 THEN 'excellent'
            WHEN v_days_tracked >= 14 THEN 'good'
            WHEN v_days_tracked >= 7 THEN 'fair'
            WHEN v_days_tracked > 0 THEN 'limited'
            ELSE 'no_data'
        END
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") IS 'Calculate estimated monthly savings based on actual usage patterns';



CREATE OR REPLACE FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_business_data JSONB;
  v_strategy_data JSONB;
  v_persona_data JSONB;
  v_key_messages JSONB;
BEGIN
  -- Get business context
  SELECT jsonb_build_object(
    'company_name', company_name,
    'industry', industry::text,
    'main_products', main_products,
    'target_market', target_market,
    'website_url', website
  ) INTO v_business_data
  FROM core_business_data
  WHERE org_id = p_org_id
    AND archived_at IS NULL
  LIMIT 1;

  -- Get latest marketing strategy
  SELECT content INTO v_strategy_data
  FROM agent_outputs
  WHERE org_id = p_org_id
    AND agent_type = 'marketing_strategy'
    AND archived_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get primary persona (FIXED: removed is_active, using archived_at IS NULL only)
  SELECT jsonb_build_object(
    'name', name,
    'title', title,
    'pain_points', pain_points,
    'goals', goals,
    'demographics', demographics
  ) INTO v_persona_data
  FROM synthetic_personas
  WHERE org_id = p_org_id
    AND archived_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Extract key messages from strategy
  v_key_messages := v_strategy_data->'messaging_framework'->'key_messages';

  -- Build standardized output
  v_result := jsonb_build_object(
    -- Common fields for all content tools
    'company_name', v_business_data->>'company_name',
    'industry', v_business_data->>'industry',
    'primary_product', v_business_data->'main_products'->0,
    'target_market', v_business_data->'target_market'->0,
    'website_url', v_business_data->>'website_url',

    -- Messaging fields
    'primary_usp', COALESCE(
      v_key_messages->>'decision',
      v_key_messages->>'consideration',
      v_key_messages->>'awareness',
      ''
    ),
    'value_proposition', v_strategy_data->'messaging_framework'->>'value_proposition',
    'brand_voice', v_strategy_data->'messaging_framework'->>'tone_of_voice',

    -- Persona fields
    'target_persona_name', v_persona_data->>'name',
    'target_persona_title', v_persona_data->>'title',
    'primary_pain_point', v_persona_data->'pain_points'->0,
    'persona_goals', v_persona_data->'goals',

    -- Content strategy fields
    'content_pillars', v_strategy_data->'content_pillars',
    'recommended_channels', v_strategy_data->'recommended_channels',
    'keywords', v_strategy_data->'seo_keywords'
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") IS 'Returns standardized pre-fill data for content tool forms.
Aggregates business context, strategy, and persona data into consistent JSONB structure.
Version: 1.1 (Fixed: removed deprecated is_active column reference)
Dependencies: core_business_data, agent_outputs, synthetic_personas tables
Performance: < 50ms (single aggregated query vs 3-5 separate queries)';



CREATE OR REPLACE FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "campaign_name" "text", "title" "text", "strategy_type" "text", "status" "text", "value_propositions" "jsonb", "key_messages" "jsonb", "differentiation_points" "text"[], "elevator_pitches" "jsonb", "tone_of_voice" "jsonb", "brand_personality" "jsonb", "positioning_statement" "text", "channel_mix" "jsonb", "budget_allocation" "jsonb", "content_pillars" "text"[], "estimated_reach" integer, "estimated_cost" numeric, "priority_score" integer, "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid", "creator_email" "text", "linked_personas_count" integer, "outputs_count" integer, "brand_guidelines_count" integer, "completion_percentage" numeric, "strategies_generated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_org_id UUID;
BEGIN
  -- Security: Verify user has access to this organization
  SELECT get_user_org_id() INTO v_user_org_id;
  IF v_user_org_id != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized access to organization data';
  END IF;

  RETURN QUERY
  SELECT
    ms.id,
    ms.org_id,
    ms.campaign_id,
    c.name as campaign_name,
    ms.title::TEXT,
    ms.strategy_type::TEXT,
    ms.status::TEXT,
    ms.value_propositions,
    ms.key_messages,
    ms.differentiation_points,
    ms.elevator_pitches,
    ms.tone_of_voice,
    ms.brand_personality,
    ms.positioning_statement,
    ms.channel_mix,
    ms.budget_allocation,
    ms.content_pillars,
    ms.estimated_reach,
    ms.estimated_cost,
    ms.priority_score,
    ms.metadata,
    ms.created_at,
    ms.updated_at,
    ms.created_by,
    u.email as creator_email,
    COALESCE(persona_count.count, 0)::INTEGER as linked_personas_count,
    COALESCE(output_count.count, 0)::INTEGER as outputs_count,
    COALESCE(brand_count.count, 0)::INTEGER as brand_guidelines_count,
    ROUND(COALESCE(
      CASE WHEN ms.title IS NOT NULL AND ms.title != '' THEN 20 ELSE 0 END +
      CASE WHEN ms.positioning_statement IS NOT NULL AND ms.positioning_statement != '' THEN 20 ELSE 0 END +
      CASE WHEN ms.value_propositions IS NOT NULL AND ms.value_propositions != '{}'::JSONB THEN 20 ELSE 0 END +
      CASE WHEN ms.key_messages IS NOT NULL AND ms.key_messages != '{}'::JSONB THEN 20 ELSE 0 END +
      CASE WHEN ms.channel_mix IS NOT NULL AND ms.channel_mix != '{}'::JSONB THEN 20 ELSE 0 END
    , 0), 1) as completion_percentage,
    ms.created_at as strategies_generated_at
  FROM marketing_strategies ms
  LEFT JOIN campaigns c ON ms.campaign_id = c.id
  LEFT JOIN users u ON ms.created_by = u.id
  LEFT JOIN (
    SELECT strategy_id, count(*)
    FROM marketing_strategy_personas msp
    GROUP BY strategy_id
  ) persona_count ON ms.id = persona_count.strategy_id
  LEFT JOIN (
    SELECT
      (ao.metadata->>'strategy_id')::UUID as strategy_id,
      count(*)
    FROM agent_outputs ao
    WHERE ao.archived_at IS NULL
      AND ao.agent_type = 'marketing_strategy'
      AND ao.metadata ? 'strategy_id'
    GROUP BY (ao.metadata->>'strategy_id')::UUID
  ) output_count ON ms.id = output_count.strategy_id
  LEFT JOIN (
    SELECT strategy_id, count(*)
    FROM marketing_strategy_brand_guidelines bg
    GROUP BY strategy_id
  ) brand_count ON ms.id = brand_count.strategy_id
  WHERE ms.org_id = p_org_id
    AND (p_include_archived OR ms.archived_at IS NULL)
    AND (p_campaign_id IS NULL OR ms.campaign_id = p_campaign_id)
    AND (p_status IS NULL OR ms.status = p_status)
  ORDER BY ms.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) IS 'Updated function to use unified agent_outputs table instead of marketing_strategy_outputs';



CREATE OR REPLACE FUNCTION "public"."get_plan_readiness_score"("p_org_id" "uuid", "p_plan_id" "text", "p_base_score" integer DEFAULT 35, "p_total_prerequisites" integer DEFAULT 4) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_completed_count INTEGER;
  v_completion_rate NUMERIC;
  v_readiness_score INTEGER;
BEGIN
  -- Count completed prerequisites
  SELECT COUNT(*)
  INTO v_completed_count
  FROM campaign_plan_prerequisites
  WHERE org_id = p_org_id
    AND plan_id = p_plan_id
    AND completed = TRUE;

  -- Calculate completion rate (0.0 to 1.0)
  IF p_total_prerequisites > 0 THEN
    v_completion_rate := v_completed_count::NUMERIC / p_total_prerequisites::NUMERIC;
  ELSE
    v_completion_rate := 1.0; -- No prerequisites = 100% complete
  END IF;

  -- Calculate readiness score (base + completion bonus)
  v_readiness_score := p_base_score + (v_completion_rate * 45)::INTEGER;

  -- Cap at 100%
  RETURN LEAST(v_readiness_score, 100);
END;
$$;


ALTER FUNCTION "public"."get_plan_readiness_score"("p_org_id" "uuid", "p_plan_id" "text", "p_base_score" integer, "p_total_prerequisites" integer) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "activity_type" "text", "actor_name" "text", "actor_role" "text", "comment" "text", "details" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_org_id UUID;
BEGIN
  -- Security: Get user's org (use alias to avoid ambiguity with return column)
  SELECT u.org_id INTO v_user_org_id FROM users u WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT
    ra.id,
    ra.activity_type,
    ra.actor_name,
    ra.actor_role,
    ra.comment,
    ra.details,
    ra.created_at
  FROM resource_activity ra
  WHERE ra.resource_type = p_resource_type
    AND ra.resource_id = p_resource_id
    AND ra.org_id = v_user_org_id
  ORDER BY ra.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_email_invited"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM alpha_invites
        WHERE LOWER(email) = LOWER(p_email)
        AND status = 'active'
        AND used_at IS NULL  -- Only unused invites (optional: remove for multi-use)
    );
$$;


ALTER FUNCTION "public"."is_email_invited"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_email_invited"("p_email" "text") IS 'Check if email is on active invite list. Returns true if invited and unused.';



CREATE OR REPLACE FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE alpha_invites
    SET
        used_at = NOW(),
        used_by = p_user_id
    WHERE LOWER(email) = LOWER(p_email)
    AND status = 'active'
    AND used_at IS NULL;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") IS 'Mark invite as used after successful signup. Returns true if invite was found and marked.';



CREATE OR REPLACE FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Restore in agency schema
    UPDATE agency.brand_guidelines
    SET
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      updated_at = NOW()
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND client_id = p_client_id
      AND archived_at IS NOT NULL
    RETURNING jsonb_build_object(
      'id', id,
      'name', name
    ) INTO v_result;

  ELSIF v_org_type = 'SME' THEN
    -- Restore in public schema
    UPDATE public.brand_guidelines
    SET
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      updated_at = NOW()
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND archived_at IS NOT NULL
    RETURNING jsonb_build_object(
      'id', id,
      'name', name
    ) INTO v_result;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Brand guideline not found, not archived, or access denied';
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") IS 'Router function for restoring archived brand guidelines. Detects org type and restores in correct schema.';



CREATE OR REPLACE FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_query TEXT;
    v_success BOOLEAN;
BEGIN
    -- Build dynamic query to restore record
    v_query := format(
        'UPDATE %I SET 
            archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL,
            updated_at = now(),
            updated_by = $1
         WHERE id = $2 AND archived_at IS NOT NULL',
        p_table_name
    );
    
    -- Execute the query
    EXECUTE v_query USING p_user_id, p_record_id;
    
    -- Check if any row was updated
    GET DIAGNOSTICS v_success = ROW_COUNT;

    RETURN v_success;
END;
$_$;


ALTER FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") IS 'Generic function to restore an archived record';


CREATE OR REPLACE FUNCTION "public"."revoke_alpha_invite"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE alpha_invites
    SET status = 'revoked'
    WHERE LOWER(email) = LOWER(p_email);

    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."revoke_alpha_invite"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_alpha_invite"("p_email" "text") IS 'Revoke an alpha invite by email. Returns true if invite was found.';



CREATE OR REPLACE FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Write to agency schema
    INSERT INTO agency.brand_guidelines (
      org_id, client_id, campaign_id, name, description,
      guidelines, is_default, created_by, updated_by
    ) VALUES (
      p_org_id, p_client_id, p_campaign_id, p_name, p_description,
      p_guidelines, COALESCE(p_is_default, false), v_user_id, v_user_id
    )
    RETURNING jsonb_build_object(
      'id', id,
      'org_id', org_id,
      'client_id', client_id,
      'campaign_id', campaign_id,
      'name', name,
      'description', description,
      'guidelines', guidelines,
      'is_default', is_default,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO v_result;

  ELSIF v_org_type = 'SME' THEN
    -- Write to public schema
    INSERT INTO public.brand_guidelines (
      org_id, campaign_id, name, description,
      guidelines, is_default, created_by, updated_by
    ) VALUES (
      p_org_id, p_campaign_id, p_name, p_description,
      p_guidelines, COALESCE(p_is_default, false), v_user_id, v_user_id
    )
    RETURNING jsonb_build_object(
      'id', id,
      'org_id', org_id,
      'campaign_id', campaign_id,
      'name', name,
      'description', description,
      'guidelines', guidelines,
      'is_default', is_default,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO v_result;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") IS 'Router function for creating brand guidelines. Detects org type and writes to correct schema.';



CREATE OR REPLACE FUNCTION "public"."set_draft_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'draft' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_draft_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Update in agency schema
    UPDATE agency.brand_guidelines
    SET
      name = p_name,
      description = p_description,
      guidelines = p_guidelines,
      is_default = COALESCE(p_is_default, false),
      campaign_id = p_campaign_id,
      updated_at = NOW(),
      updated_by = v_user_id
    WHERE id = p_guideline_id
      AND org_id = p_org_id
      AND client_id = p_client_id
    RETURNING jsonb_build_object(
      'id', id,
      'org_id', org_id,
      'client_id', client_id,
      'campaign_id', campaign_id,
      'name', name,
      'description', description,
      'guidelines', guidelines,
      'is_default', is_default,
      'updated_at', updated_at
    ) INTO v_result;

  ELSIF v_org_type = 'SME' THEN
    -- Update in public schema
    UPDATE public.brand_guidelines
    SET
      name = p_name,
      description = p_description,
      guidelines = p_guidelines,
      is_default = COALESCE(p_is_default, false),
      campaign_id = p_campaign_id,
      updated_at = NOW(),
      updated_by = v_user_id
    WHERE id = p_guideline_id AND org_id = p_org_id
    RETURNING jsonb_build_object(
      'id', id,
      'org_id', org_id,
      'campaign_id', campaign_id,
      'name', name,
      'description', description,
      'guidelines', guidelines,
      'is_default', is_default,
      'updated_at', updated_at
    ) INTO v_result;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Brand guideline not found or access denied';
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") IS 'Router function for updating brand guidelines. Detects org type and updates in correct schema.';



CREATE OR REPLACE FUNCTION "public"."upsert_enterprise_relationship"("p_source_type" "text", "p_source_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_relationship_type" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_strength" numeric DEFAULT 1.0, "p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_relationship_id UUID;
    v_org_id UUID;
BEGIN
    -- Determine org_id if not provided
    IF p_org_id IS NULL THEN
        -- Try to get org_id from source entity
        EXECUTE format('SELECT org_id FROM %I WHERE id = $1', 
            CASE p_source_type 
                WHEN 'marketing_strategy' THEN 'marketing_strategies'
                WHEN 'persona' THEN 'synthetic_personas'
                WHEN 'campaign' THEN 'campaigns'
                ELSE p_source_type || 's'
            END
        ) INTO v_org_id USING p_source_id;
    ELSE
        v_org_id := p_org_id;
    END IF;
    
    -- Upsert the relationship
    INSERT INTO enterprise_relationships (
        source_type, source_id, target_type, target_id,
        relationship_type, metadata, strength, org_id, created_by
    ) VALUES (
        p_source_type, p_source_id, p_target_type, p_target_id,
        p_relationship_type, p_metadata, p_strength, v_org_id, auth.uid()
    )
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type)
    DO UPDATE SET
        metadata = enterprise_relationships.metadata || p_metadata,
        strength = p_strength,
        updated_at = NOW()
    RETURNING id INTO v_relationship_id;
    
    RETURN v_relationship_id;
END;
$_$;


ALTER FUNCTION "public"."upsert_enterprise_relationship"("p_source_type" "text", "p_source_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_relationship_type" "text", "p_metadata" "jsonb", "p_strength" numeric, "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_brand_guidelines"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Ensure guidelines is not empty
    IF NEW.guidelines = '{}'::jsonb THEN
        RAISE EXCEPTION 'Brand guidelines must contain at least one guideline';
    END IF;

    -- Auto-increment version if this is derived from another guideline
    IF NEW.parent_id IS NOT NULL THEN
        NEW.version = COALESCE(
            (SELECT MAX(version) + 1 FROM brand_guidelines WHERE parent_id = NEW.parent_id OR id = NEW.parent_id),
            2
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_brand_guidelines"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_structured_brand_guidelines"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If guidelines is empty, that's fine (allows for gradual migration)
    IF NEW.guidelines = '{}'::jsonb THEN
        RETURN NEW;
    END IF;

    -- Validate that guidelines has at least one of the main sections
    IF NOT (
        NEW.guidelines ? 'brand_voice' OR
        NEW.guidelines ? 'messaging' OR
        NEW.guidelines ? 'brand_strategy' OR
        NEW.guidelines ? 'visual_identity' OR
        -- Allow legacy unstructured guidelines for backward compatibility
        (jsonb_typeof(NEW.guidelines) = 'object' AND NEW.guidelines != '{}'::jsonb)
    ) THEN
        RAISE EXCEPTION 'Brand guidelines must contain at least one section (brand_voice, messaging, brand_strategy, or visual_identity)';
    END IF;

    -- Validate brand_voice structure if present
    IF NEW.guidelines ? 'brand_voice' THEN
        -- Ensure brand_voice is an object
        IF jsonb_typeof(NEW.guidelines->'brand_voice') != 'object' THEN
            RAISE EXCEPTION 'brand_voice must be an object';
        END IF;

        -- Validate tone_of_voice if present
        IF (NEW.guidelines->'brand_voice') ? 'tone_of_voice' THEN
            IF jsonb_typeof(NEW.guidelines->'brand_voice'->'tone_of_voice') != 'object' THEN
                RAISE EXCEPTION 'brand_voice.tone_of_voice must be an object';
            END IF;
        END IF;

        -- Validate personality_traits if present
        IF (NEW.guidelines->'brand_voice') ? 'personality_traits' THEN
            IF jsonb_typeof(NEW.guidelines->'brand_voice'->'personality_traits') != 'object' THEN
                RAISE EXCEPTION 'brand_voice.personality_traits must be an object';
            END IF;
        END IF;

        -- Validate writing_style if present
        IF (NEW.guidelines->'brand_voice') ? 'writing_style' THEN
            IF jsonb_typeof(NEW.guidelines->'brand_voice'->'writing_style') != 'object' THEN
                RAISE EXCEPTION 'brand_voice.writing_style must be an object';
            END IF;
        END IF;
    END IF;

    -- Validate messaging structure if present
    IF NEW.guidelines ? 'messaging' THEN
        -- Ensure messaging is an object
        IF jsonb_typeof(NEW.guidelines->'messaging') != 'object' THEN
            RAISE EXCEPTION 'messaging must be an object';
        END IF;

        -- Validate key_messages if present
        IF (NEW.guidelines->'messaging') ? 'key_messages' THEN
            IF jsonb_typeof(NEW.guidelines->'messaging'->'key_messages') != 'object' THEN
                RAISE EXCEPTION 'messaging.key_messages must be an object';
            END IF;
        END IF;

        -- Validate value_propositions if present
        IF (NEW.guidelines->'messaging') ? 'value_propositions' THEN
            IF jsonb_typeof(NEW.guidelines->'messaging'->'value_propositions') != 'object' THEN
                RAISE EXCEPTION 'messaging.value_propositions must be an object';
            END IF;
        END IF;

        -- Validate content_rules if present
        IF (NEW.guidelines->'messaging') ? 'content_rules' THEN
            IF jsonb_typeof(NEW.guidelines->'messaging'->'content_rules') != 'object' THEN
                RAISE EXCEPTION 'messaging.content_rules must be an object';
            END IF;
        END IF;
    END IF;

    -- Validate brand_strategy structure if present
    IF NEW.guidelines ? 'brand_strategy' THEN
        IF jsonb_typeof(NEW.guidelines->'brand_strategy') != 'object' THEN
            RAISE EXCEPTION 'brand_strategy must be an object';
        END IF;
    END IF;

    -- Validate visual_identity structure if present
    IF NEW.guidelines ? 'visual_identity' THEN
        IF jsonb_typeof(NEW.guidelines->'visual_identity') != 'object' THEN
            RAISE EXCEPTION 'visual_identity must be an object';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_structured_brand_guidelines"() OWNER TO "postgres";