-- ============================================================================
-- create_functions_outputs_insights
-- Functions for outputs, approvals, recommendations and intelligence.
-- ============================================================================





CREATE OR REPLACE FUNCTION "public"."apply_approved_insight_to_business_data"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_update_data JSONB := '{}';
    v_content JSONB;
    v_employees INT;
    v_company_size TEXT;
    v_industry TEXT;
    v_business_model TEXT;
BEGIN
    -- Only proceed if the insight was just approved (status changed to approved or auto_approved)
    IF (NEW.validation_status IN ('approved', 'auto_approved') AND 
        (OLD.validation_status IS NULL OR OLD.validation_status = 'pending')) THEN
        
        v_content := NEW.content;
        
        -- Handle company_name
        IF v_content ? 'company_name' AND v_content->>'company_name' IS NOT NULL THEN
            v_update_data := v_update_data || jsonb_build_object('company_name', v_content->>'company_name');
        END IF;
        
        -- Handle number_of_employees -> company_size mapping
        IF v_content ? 'number_of_employees' THEN
            BEGIN
                v_employees := (v_content->>'number_of_employees')::INT;
                IF v_employees <= 10 THEN
                    v_company_size := '1-10 employees';
                ELSIF v_employees <= 50 THEN
                    v_company_size := '11-50 employees';
                ELSIF v_employees <= 200 THEN
                    v_company_size := '51-200 employees';
                ELSIF v_employees <= 500 THEN
                    v_company_size := '201-500 employees';
                ELSIF v_employees <= 1000 THEN
                    v_company_size := '501-1000 employees';
                ELSE
                    v_company_size := '1000+ employees';
                END IF;
                v_update_data := v_update_data || jsonb_build_object('company_size', v_company_size);
            EXCEPTION WHEN OTHERS THEN
                -- Skip if can't parse as integer
                NULL;
            END;
        END IF;
        
        -- Handle annual_revenue
        IF v_content ? 'annual_revenue' AND v_content->>'annual_revenue' IS NOT NULL THEN
            v_update_data := v_update_data || jsonb_build_object('annual_revenue', v_content->>'annual_revenue');
        END IF;
        
        -- Handle competitors
        IF v_content ? 'competitors_mentioned' AND jsonb_typeof(v_content->'competitors_mentioned') = 'array' THEN
            v_update_data := v_update_data || jsonb_build_object('key_competitors', v_content->'competitors_mentioned');
        END IF;
        
        -- Handle customer segments
        IF v_content ? 'customer_segments' THEN
            IF jsonb_typeof(v_content->'customer_segments') = 'array' THEN
                v_update_data := v_update_data || jsonb_build_object('target_market', v_content->'customer_segments');
            END IF;
        END IF;
        
        -- Handle products/services
        IF v_content ? 'key_products_services' THEN
            IF jsonb_typeof(v_content->'key_products_services') = 'array' THEN
                v_update_data := v_update_data || jsonb_build_object('main_products', v_content->'key_products_services');
            ELSIF jsonb_typeof(v_content->'key_products_services') = 'string' THEN
                v_update_data := v_update_data || jsonb_build_object('main_products', 
                    to_jsonb(string_to_array(v_content->>'key_products_services', ',')));
            END IF;
        END IF;
        
        -- Handle business_model
        IF v_content ? 'business_model' AND v_content->>'business_model' IS NOT NULL THEN
            v_business_model := lower(v_content->>'business_model');
            IF v_business_model LIKE '%saas%' OR v_business_model LIKE '%subscription%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'Subscription');
            ELSIF v_business_model LIKE '%b2b%' AND v_business_model LIKE '%b2c%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'B2B2C');
            ELSIF v_business_model LIKE '%b2b%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'B2B');
            ELSIF v_business_model LIKE '%b2c%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'B2C');
            ELSIF v_business_model LIKE '%marketplace%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'Marketplace');
            ELSIF v_business_model LIKE '%freemium%' THEN
                v_update_data := v_update_data || jsonb_build_object('business_model', 'Freemium');
            END IF;
        END IF;
        
        -- Handle industry
        IF v_content ? 'industry_sector' THEN
            IF jsonb_typeof(v_content->'industry_sector') = 'array' AND jsonb_array_length(v_content->'industry_sector') > 0 THEN
                v_industry := lower(v_content->'industry_sector'->>0);
            ELSIF jsonb_typeof(v_content->'industry_sector') = 'string' THEN
                v_industry := lower(v_content->>'industry_sector');
            END IF;
            
            IF v_industry IS NOT NULL THEN
                IF v_industry LIKE '%saas%' OR v_industry LIKE '%software%' OR v_industry LIKE '%project management%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'SaaS/Software');
                ELSIF v_industry LIKE '%construction%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'Construction/Real Estate');
                ELSIF v_industry LIKE '%manufacturing%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'Manufacturing/Industrial');
                ELSIF v_industry LIKE '%healthcare%' OR v_industry LIKE '%medical%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'Healthcare/Medical');
                ELSIF v_industry LIKE '%finance%' OR v_industry LIKE '%banking%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'Finance/Banking');
                ELSIF v_industry LIKE '%retail%' OR v_industry LIKE '%ecommerce%' OR v_industry LIKE '%e-commerce%' THEN
                    v_update_data := v_update_data || jsonb_build_object('industry', 'Retail/E-commerce');
                END IF;
            END IF;
        END IF;
        
        -- Handle geography
        IF v_content ? 'geography_location' THEN
            IF jsonb_typeof(v_content->'geography_location') = 'array' THEN
                v_update_data := v_update_data || jsonb_build_object('geography', v_content->'geography_location');
            ELSIF jsonb_typeof(v_content->'geography_location') = 'string' THEN
                v_update_data := v_update_data || jsonb_build_object('geography', 
                    to_jsonb(ARRAY[v_content->>'geography_location']));
            END IF;
        END IF;
        
        -- Apply the update if we have data
        IF v_update_data != '{}' THEN
            -- Check if core_business_data exists for this org
            IF EXISTS (SELECT 1 FROM core_business_data WHERE org_id = NEW.org_id) THEN
                -- Update existing record
                UPDATE core_business_data 
                SET 
                    company_name = COALESCE((v_update_data->>'company_name'), company_name),
                    company_size = COALESCE((v_update_data->>'company_size')::company_size_enum, company_size),
                    annual_revenue = COALESCE((v_update_data->>'annual_revenue'), annual_revenue),
                    key_competitors = COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_update_data->'key_competitors')), key_competitors),
                    target_market = COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_update_data->'target_market')), target_market),
                    main_products = COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_update_data->'main_products')), main_products),
                    business_model = COALESCE((v_update_data->>'business_model')::business_model_enum, business_model),
                    industry = COALESCE((v_update_data->>'industry')::industry_enum, industry),
                    geography = COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_update_data->'geography')), geography),
                    last_ai_update = NOW()
                WHERE org_id = NEW.org_id;
                
                RAISE NOTICE 'Applied approved insight % to core_business_data for org %', NEW.id, NEW.org_id;
            ELSE
                RAISE NOTICE 'No core_business_data record found for org %, skipping auto-apply', NEW.org_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_approved_insight_to_business_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_approved_insight_to_business_data"() IS 'Automatically applies approved or auto-approved insights to the core_business_data table, updating company information based on extracted insights.';



CREATE OR REPLACE FUNCTION "public"."auto_approve_high_confidence_insights"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Auto-approve insights with very high confidence and no PII
    IF NEW.confidence_score >= 0.9 
       AND NEW.contains_pii = false 
       AND NEW.validation_status = 'pending' THEN
        NEW.validation_status = 'auto_approved';
        NEW.validated_at = NOW();
    END IF;
    
    -- Auto-approve observations with high confidence
    IF NEW.insight_type = 'observation' 
       AND NEW.confidence_score >= 0.8 
       AND NEW.contains_pii = false
       AND NEW.validation_status = 'pending' THEN
        NEW.validation_status = 'auto_approved';
        NEW.validated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_approve_high_confidence_insights"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."bulk_finalize_outputs"("output_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE agent_outputs
  SET
    status = 'final',
    finalized_at = NOW(),
    expires_at = NULL
  WHERE id = ANY(output_ids) AND status = 'draft';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."bulk_finalize_outputs"("output_ids" "uuid"[]) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."can_edit_output"("p_output_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_output RECORD;
    v_user_org_id UUID;
    v_user_permissions TEXT[];
BEGIN
    SELECT org_id INTO v_user_org_id FROM users WHERE id = p_user_id;

    SELECT ao.*, ao.created_by AS creator_id
    INTO v_output
    FROM agent_outputs ao
    WHERE ao.id = p_output_id AND ao.org_id = v_user_org_id;

    IF v_output IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT ARRAY_AGG(p.name) INTO v_user_permissions
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = p_user_id;

    IF v_output.approval_status = 'approved' THEN
        RETURN 'outputs.approved.edit' = ANY(v_user_permissions);
    END IF;

    IF v_output.creator_id = p_user_id THEN
        RETURN 'outputs.own.edit' = ANY(v_user_permissions);
    END IF;

    RETURN 'outputs.others.edit' = ANY(v_user_permissions);
END;
$$;


ALTER FUNCTION "public"."can_edit_output"("p_output_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_resubmit_for_approval"("p_resource_type" "text", "p_resource_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_can_resubmit BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    SELECT EXISTS (
        SELECT 1 FROM approval_requests ar
        WHERE ar.resource_type = p_resource_type
        AND ar.resource_id = p_resource_id
        AND ar.org_id = v_org_id
        AND ar.requested_by = v_user_id
        AND ar.status IN ('changes_requested', 'rejected')
    ) INTO v_can_resubmit;

    RETURN v_can_resubmit;
END;
$$;


ALTER FUNCTION "public"."can_resubmit_for_approval"("p_resource_type" "text", "p_resource_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."clean_expired_recommendations_cache"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM recommendations_cache
  WHERE cache_expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."clean_expired_recommendations_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clean_expired_recommendations_cache"() IS 'Remove expired cache entries across all recommendation types. Migration 093.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_dashboard_recommendation_cache"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM dashboard_recommendation_cache
    WHERE cache_expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_dashboard_recommendation_cache"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."create_approval_request"("p_resource_type" "text", "p_resource_id" "uuid", "p_assigned_to" "uuid", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_priority" "text" DEFAULT 'normal'::"text", "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result approval_requests;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT org_id INTO v_org_id FROM users WHERE id = v_user_id;

    INSERT INTO approval_requests (
        org_id, client_id, resource_type, resource_id,
        requested_by, assigned_to, title, description, priority, due_date, status
    ) VALUES (
        v_org_id, p_client_id, p_resource_type, p_resource_id,
        v_user_id, p_assigned_to, p_title, p_description, p_priority, p_due_date, 'pending'
    )
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."create_approval_request"("p_resource_type" "text", "p_resource_id" "uuid", "p_assigned_to" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_approval_history"("p_resource_type" "text", "p_resource_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_history JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    -- Use ROW_NUMBER to compute round_number based on creation order
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.round_number ASC), '[]'::jsonb)
    INTO v_history
    FROM (
        SELECT
            ar.id,
            ar.status,
            ar.title,
            ar.resolution_note,
            ar.created_at,
            ar.resolved_at,
            req.full_name AS requester_name,
            asg.full_name AS assignee_name,
            res.full_name AS resolver_name,
            -- Compute round_number using ROW_NUMBER ordered by creation time
            ROW_NUMBER() OVER (ORDER BY ar.created_at ASC) AS round_number
        FROM approval_requests ar
        LEFT JOIN users req ON ar.requested_by = req.id
        LEFT JOIN users asg ON ar.assigned_to = asg.id
        LEFT JOIN users res ON ar.resolved_by = res.id
        WHERE ar.resource_type = p_resource_type
        AND ar.resource_id = p_resource_id
        AND ar.org_id = v_org_id
    ) t;

    RETURN jsonb_build_object('history', v_history);
END;
$$;


ALTER FUNCTION "public"."get_approval_history"("p_resource_type" "text", "p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_approval_request"("p_approval_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    SELECT row_to_json(t)::jsonb INTO v_result
    FROM (
        SELECT
            ar.id, ar.org_id, ar.client_id, ar.resource_type, ar.resource_id,
            ar.status, ar.requested_by, ar.assigned_to, ar.title, ar.description,
            ar.priority, ar.due_date, ar.created_at, ar.updated_at, ar.resolved_at,
            ar.resolved_by, ar.resolution_note,
            req.full_name AS requester_name,
            asg.full_name AS assignee_name,
            res.full_name AS resolver_name
        FROM approval_requests ar
        LEFT JOIN users req ON ar.requested_by = req.id
        LEFT JOIN users asg ON ar.assigned_to = asg.id
        LEFT JOIN users res ON ar.resolved_by = res.id
        WHERE ar.id = p_approval_id AND ar.org_id = v_org_id
    ) t;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Approval request not found';
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_approval_request"("p_approval_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "insight_type" "text", "confidence_score" double precision, "impact_score" integer, "business_value_score" numeric, "campaign_name" "text", "source_agent" "text", "usage_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.title::TEXT,
    ai.insight_type::TEXT,
    ai.confidence_score::DOUBLE PRECISION,
    ai.impact_score::INT,
    -- Business value score
    ROUND((ai.confidence_score * 40 + ai.impact_score * 0.4 + LEAST(ai.usage_count * 5, 20))::NUMERIC, 1) as business_value_score,
    c.name::TEXT as campaign_name,
    ai.source_agent::TEXT,
    ai.usage_count::INT,
    ai.created_at
  FROM ai_insights ai
  LEFT JOIN campaigns c ON ai.campaign_id = c.id
  WHERE ai.org_id = p_org_id
    AND ai.validation_status IN ('approved', 'auto_approved')
    AND ai.archived_at IS NULL
    AND (ai.expires_at IS NULL OR ai.expires_at > now())
  ORDER BY
    business_value_score DESC,
    ai.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") IS 'Returns approved insights with business value scoring.
Optimized for dashboard and actionable insights views. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_approved_outputs"("p_client_id" "uuid" DEFAULT NULL::"uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_outputs JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM public.users WHERE users.id = v_user_id;

    -- Query both schemas with UNION ALL, then aggregate
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.approved_at DESC NULLS LAST), '[]'::jsonb)
    INTO v_outputs
    FROM (
        -- Query public.agent_outputs
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.agent_type,
            ao.output_type,
            ao.title,
            ao.summary,
            ao.content,
            ao.approval_status,
            ao.approved_at,
            ao.approved_by,
            u.full_name as approver_name,
            COALESCE(
                (SELECT MAX(ah.round_number)
                 FROM public.approval_history ah
                 WHERE ah.resource_id = ao.id
                 AND ah.resource_type = 'output'),
                1
            ) as approval_round,
            ao.created_at,
            ao.updated_at
        FROM public.agent_outputs ao
        LEFT JOIN public.users u ON ao.approved_by = u.id
        WHERE ao.org_id = v_org_id
        AND ao.approval_status = 'approved'
        AND ao.archived_at IS NULL
        AND (p_client_id IS NULL OR ao.client_id = p_client_id)
        AND (p_agent_type IS NULL OR ao.agent_type = p_agent_type)

        UNION ALL

        -- Query agency.agent_outputs
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.agent_type,
            ao.output_type,
            ao.title,
            ao.summary,
            ao.content,
            ao.approval_status,
            ao.approved_at,
            ao.approved_by,
            u.full_name as approver_name,
            COALESCE(
                (SELECT MAX(ah.round_number)
                 FROM public.approval_history ah
                 WHERE ah.resource_id = ao.id
                 AND ah.resource_type = 'output'),
                1
            ) as approval_round,
            ao.created_at,
            ao.updated_at
        FROM agency.agent_outputs ao
        LEFT JOIN public.users u ON ao.approved_by = u.id
        WHERE ao.org_id = v_org_id
        AND ao.approval_status = 'approved'
        AND ao.archived_at IS NULL
        AND (p_client_id IS NULL OR ao.client_id = p_client_id)
        AND (p_agent_type IS NULL OR ao.agent_type = p_agent_type)

        ORDER BY approved_at DESC NULLS LAST
        LIMIT p_limit
        OFFSET p_offset
    ) t;

    RETURN v_outputs;
END;
$$;


ALTER FUNCTION "public"."get_approved_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("core_data" "jsonb", "market_data" "jsonb", "customer_data" "jsonb", "campaign_data" "jsonb", "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
BEGIN
  -- Agency users: Query from client_intelligence view (exposes agency.client_intelligence)
  IF p_client_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      -- Core business data from client_intelligence view
      CASE WHEN ci.id IS NOT NULL THEN
        jsonb_build_object(
          'id', ci.id,
          'org_id', ci.org_id,
          'client_id', ci.client_id,
          'company_name', ci.company_name,
          'website', ci.website,
          'industry', ci.industry,
          'company_size', ci.company_size,
          'business_model', ci.business_model,
          'company_stage', ci.company_stage,
          'funding_status', ci.funding_status,
          'annual_revenue', ci.annual_revenue,
          'marketing_budget', ci.marketing_budget,
          'target_market', ci.target_market,
          'main_products', ci.main_products,
          'key_competitors', ci.key_competitors,
          'tech_stack', ci.tech_stack,
          'geography', ci.geography,
          'data_completeness_score', ci.data_completeness_score,
          'created_at', ci.created_at,
          'updated_at', ci.updated_at
        )
      ELSE NULL END as core_data,

      -- Market intelligence (NULL for agency - not implemented yet)
      NULL::JSONB as market_data,

      -- Customer intelligence (NULL for agency - not implemented yet)
      NULL::JSONB as customer_data,

      -- Campaign intelligence (NULL for agency - not implemented yet)
      NULL::JSONB as campaign_data,

      -- Last updated timestamp
      ci.updated_at as last_updated
    FROM
      client_intelligence ci
    WHERE
      ci.org_id = p_org_id
      AND ci.client_id = p_client_id
    LIMIT 1;

  -- SME users: Query from core_business_data (original logic)
  ELSE
    RETURN QUERY
    SELECT
      -- Core business data (NULL if no record found)
      CASE WHEN cbd.id IS NOT NULL THEN to_jsonb(cbd.*) ELSE NULL END as core_data,

      -- Market intelligence (NULL if no record found)
      CASE WHEN mi.id IS NOT NULL THEN to_jsonb(mi.*) ELSE NULL END as market_data,

      -- Customer intelligence (NULL if no record found)
      CASE WHEN cust_i.id IS NOT NULL THEN to_jsonb(cust_i.*) ELSE NULL END as customer_data,

      -- Campaign intelligence (NULL if no record found)
      CASE WHEN cai.id IS NOT NULL THEN to_jsonb(cai.*) ELSE NULL END as campaign_data,

      -- Last updated timestamp (most recent across all tables)
      GREATEST(
        COALESCE(cbd.updated_at, cbd.created_at, '1970-01-01'::timestamptz),
        COALESCE(mi.updated_at, mi.created_at, '1970-01-01'::timestamptz),
        COALESCE(cust_i.updated_at, cust_i.created_at, '1970-01-01'::timestamptz),
        COALESCE(cai.updated_at, cai.created_at, '1970-01-01'::timestamptz)
      ) as last_updated
    FROM
      core_business_data cbd
    FULL OUTER JOIN
      market_intelligence mi ON (
        mi.org_id = cbd.org_id
        AND (mi.client_id IS NOT DISTINCT FROM cbd.client_id)
      )
    FULL OUTER JOIN
      customer_intelligence cust_i ON (
        cust_i.org_id = COALESCE(cbd.org_id, mi.org_id)
        AND (cust_i.client_id IS NOT DISTINCT FROM COALESCE(cbd.client_id, mi.client_id))
      )
    FULL OUTER JOIN
      campaign_intelligence cai ON (
        cai.org_id = COALESCE(cbd.org_id, mi.org_id, cust_i.org_id)
        AND (cai.client_id IS NOT DISTINCT FROM COALESCE(cbd.client_id, mi.client_id, cust_i.client_id))
      )
    WHERE
      COALESCE(cbd.org_id, mi.org_id, cust_i.org_id, cai.org_id) = p_org_id
      AND (
        COALESCE(cbd.client_id, mi.client_id, cust_i.client_id, cai.client_id) IS NULL
      )
    LIMIT 1;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid") IS 'Database-first approach: Retrieve unified business intelligence context.
Schema routing:
- SME users (p_client_id IS NULL): Queries public.core_business_data
- Agency users (p_client_id provided): Queries public.client_intelligence view
Fixed in Migration 254: Added agency schema routing support.';



CREATE OR REPLACE FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "insight_type" "text", "source_type" "text", "source_agent" "text", "session_id" "text", "campaign_id" "uuid", "campaign_info" "jsonb", "title" "text", "content" "jsonb", "category" "text"[], "contains_pii" boolean, "pii_types" "text"[], "pii_confidence" double precision, "pii_masked_content" "jsonb", "confidence_score" double precision, "validation_status" "text", "validated_by" "uuid", "validated_at" timestamp with time zone, "rejection_reason" "text", "impact_score" integer, "usage_count" integer, "last_used_at" timestamp with time zone, "used_by_agents" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "expires_at" timestamp with time zone, "version" integer, "previous_version_id" "uuid", "metadata" "jsonb", "archived_at" timestamp with time zone, "archive_reason" "text", "creator_info" "jsonb", "validator_info" "jsonb", "related_insights" "jsonb", "usage_analytics" "jsonb", "validation_history" "jsonb", "business_impact" "jsonb", "details_generated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  related_insights_json JSONB;
  usage_analytics_json JSONB;
  validation_history_json JSONB;
  business_impact_json JSONB;
  campaign_info_json JSONB;
  creator_info_json JSONB;
  validator_info_json JSONB;
BEGIN
  -- Get related insights (same type or campaign) - FIX: Fully qualify columns in subqueries
  SELECT json_agg(
    json_build_object(
      'id', ai2.id,
      'title', ai2.title,
      'insight_type', ai2.insight_type,
      'confidence_score', ai2.confidence_score,
      'created_at', ai2.created_at
    )
  ) INTO related_insights_json
  FROM ai_insights ai2
  WHERE ai2.org_id = p_org_id
    AND ai2.id != p_insight_id
    AND ai2.archived_at IS NULL
    AND (
      ai2.insight_type = (SELECT ai_insights.insight_type FROM ai_insights WHERE ai_insights.id = p_insight_id)
      OR ai2.campaign_id = (SELECT ai_insights.campaign_id FROM ai_insights WHERE ai_insights.id = p_insight_id)
    )
  ORDER BY ai2.confidence_score DESC
  LIMIT 5;

  -- Calculate usage analytics
  SELECT json_build_object(
    'total_usage', ai.usage_count,
    'last_used', ai.last_used_at,
    'used_by_agents_count', COALESCE(array_length(ai.used_by_agents, 1), 0),
    'usage_frequency', CASE
      WHEN ai.created_at < (now() - INTERVAL '7 days') AND ai.usage_count > 0
      THEN ROUND(ai.usage_count::NUMERIC / EXTRACT(days FROM (now() - ai.created_at)), 2)
      ELSE 0
    END,
    'unique_agents', ai.used_by_agents
  ) INTO usage_analytics_json
  FROM ai_insights ai
  WHERE ai.id = p_insight_id;

  -- Get validation history (simplified)
  SELECT json_build_object(
    'current_status', ai.validation_status,
    'validated_at', ai.validated_at,
    'validated_by', ai.validated_by,
    'rejection_reason', ai.rejection_reason,
    'auto_approved', ai.validation_status = 'auto_approved',
    'confidence_at_creation', ai.confidence_score
  ) INTO validation_history_json
  FROM ai_insights ai
  WHERE ai.id = p_insight_id;

  -- Calculate business impact metrics
  SELECT json_build_object(
    'impact_score', ai.impact_score,
    'confidence_score', ai.confidence_score,
    'business_value_score',
      CASE
        WHEN ai.validation_status = 'approved' THEN
          ROUND((ai.confidence_score * 40 + ai.impact_score * 0.4 + LEAST(ai.usage_count * 5, 20))::NUMERIC, 1)
        WHEN ai.validation_status = 'auto_approved' THEN
          ROUND((ai.confidence_score * 35 + ai.impact_score * 0.35 + LEAST(ai.usage_count * 5, 20))::NUMERIC, 1)
        ELSE
          ROUND((ai.confidence_score * 20 + ai.impact_score * 0.2)::NUMERIC, 1)
      END,
    'age_days', EXTRACT(days FROM (now() - ai.created_at)),
    'is_trending', ai.usage_count > 3 AND ai.created_at > (now() - INTERVAL '30 days'),
    'value_category',
      CASE
        WHEN ai.confidence_score >= 0.8 AND ai.impact_score >= 80 THEN 'high_value'
        WHEN ai.confidence_score >= 0.6 OR ai.impact_score >= 60 THEN 'medium_value'
        ELSE 'low_value'
      END
  ) INTO business_impact_json
  FROM ai_insights ai
  WHERE ai.id = p_insight_id;

  -- Get campaign info if campaign_id exists
  SELECT json_build_object(
    'campaign_id', c.id,
    'campaign_name', c.name,
    'campaign_status', c.status
  ) INTO campaign_info_json
  FROM campaigns c
  JOIN ai_insights ai ON ai.campaign_id = c.id
  WHERE ai.id = p_insight_id;

  -- Get creator info
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', u.full_name,
    'email', u.email
  ) INTO creator_info_json
  FROM users u
  JOIN ai_insights ai ON ai.user_id = u.id
  WHERE ai.id = p_insight_id;

  -- Get validator info if validated
  SELECT json_build_object(
    'user_id', u.id,
    'full_name', u.full_name,
    'email', u.email
  ) INTO validator_info_json
  FROM users u
  JOIN ai_insights ai ON ai.validated_by = u.id
  WHERE ai.id = p_insight_id;

  -- Return the complete details
  RETURN QUERY
  SELECT
    ai.id,
    ai.org_id,
    ai.user_id,
    ai.insight_type,
    ai.source_type,
    ai.source_agent,
    ai.session_id,
    ai.campaign_id,
    campaign_info_json,
    ai.title,
    ai.content,
    ai.category,
    ai.contains_pii,
    ai.pii_types,
    ai.pii_confidence,
    ai.pii_masked_content,
    ai.confidence_score,
    ai.validation_status,
    ai.validated_by,
    ai.validated_at,
    ai.rejection_reason,
    ai.impact_score,
    ai.usage_count,
    ai.last_used_at,
    ai.used_by_agents,
    ai.created_at,
    ai.updated_at,
    ai.expires_at,
    ai.version,
    ai.previous_version_id,
    ai.metadata,
    ai.archived_at,
    ai.archive_reason,
    creator_info_json,
    validator_info_json,
    related_insights_json,
    usage_analytics_json,
    validation_history_json,
    business_impact_json,
    NOW() as details_generated_at
  FROM ai_insights ai
  WHERE ai.id = p_insight_id
    AND ai.org_id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") IS 'Get comprehensive business intelligence insight details with analytics. Fixed ambiguous column references. Migration 171.';



CREATE OR REPLACE FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_validation_status" "text" DEFAULT NULL::"text", "p_insight_type" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "insight_type" "text", "source_type" "text", "source_agent" "text", "session_id" "text", "campaign_id" "uuid", "campaign_name" "text", "title" "text", "content" "jsonb", "category" "text"[], "contains_pii" boolean, "pii_types" "text"[], "pii_confidence" double precision, "confidence_score" double precision, "validation_status" "text", "validated_by" "uuid", "validated_at" timestamp with time zone, "rejection_reason" "text", "impact_score" integer, "usage_count" integer, "last_used_at" timestamp with time zone, "used_by_agents" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "expires_at" timestamp with time zone, "version" integer, "metadata" "jsonb", "created_by" "uuid", "creator_email" "text", "validator_email" "text", "is_expired" boolean, "days_since_created" integer, "business_value_score" numeric, "insights_generated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.org_id,
    ai.user_id,
    ai.insight_type::TEXT,
    ai.source_type::TEXT,
    ai.source_agent::TEXT,
    ai.session_id::TEXT,
    ai.campaign_id,
    c.name::TEXT as campaign_name,
    ai.title::TEXT,
    ai.content,
    ai.category,
    ai.contains_pii::BOOLEAN,
    ai.pii_types,
    ai.pii_confidence::DOUBLE PRECISION,
    ai.confidence_score::DOUBLE PRECISION,
    ai.validation_status::TEXT,
    ai.validated_by,
    ai.validated_at,
    ai.rejection_reason::TEXT,
    ai.impact_score::INT,
    ai.usage_count::INT,
    ai.last_used_at,
    ai.used_by_agents,
    ai.created_at,
    ai.updated_at,
    ai.expires_at,
    ai.version::INT,
    ai.metadata,
    ai.created_by,
    u.email::TEXT as creator_email,
    v.email::TEXT as validator_email,
    -- Computed fields
    (ai.expires_at IS NOT NULL AND ai.expires_at < now())::BOOLEAN as is_expired,
    EXTRACT(days FROM (now() - ai.created_at))::INT as days_since_created,
    -- Business value score combining confidence, impact, and usage
    CASE
      WHEN ai.validation_status = 'approved' THEN
        ROUND((ai.confidence_score * 40 + ai.impact_score * 0.4 + LEAST(ai.usage_count * 5, 20))::NUMERIC, 1)
      WHEN ai.validation_status = 'auto_approved' THEN
        ROUND((ai.confidence_score * 35 + ai.impact_score * 0.35 + LEAST(ai.usage_count * 5, 20))::NUMERIC, 1)
      ELSE
        ROUND((ai.confidence_score * 20 + ai.impact_score * 0.2)::NUMERIC, 1)
    END as business_value_score,
    now() as insights_generated_at
  FROM ai_insights ai
  LEFT JOIN campaigns c ON ai.campaign_id = c.id
  LEFT JOIN users u ON ai.created_by = u.id
  LEFT JOIN users v ON ai.validated_by = v.id
  WHERE ai.org_id = p_org_id
    AND (p_include_archived OR ai.archived_at IS NULL)
    AND (p_campaign_id IS NULL OR ai.campaign_id = p_campaign_id)
    AND (p_validation_status IS NULL OR ai.validation_status = p_validation_status)
    AND (p_insight_type IS NULL OR ai.insight_type = p_insight_type)
  ORDER BY
    ai.impact_score DESC,
    ai.confidence_score DESC,
    ai.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_validation_status" "text", "p_insight_type" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_validation_status" "text", "p_insight_type" "text", "p_limit" integer, "p_offset" integer) IS 'Returns filtered business insights list with user info and computed metrics.
Replaces direct table access with optimized single query. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route based on org_type
    IF v_org_type = 'AGENCY' THEN
        -- Agency: Load from agency.client_intelligence + agency.clients
        IF p_client_id IS NULL THEN
            RAISE EXCEPTION 'client_id required for AGENCY organizations';
        END IF;

        SELECT to_jsonb(intelligence_data)
        INTO v_result
        FROM (
            SELECT
                -- Map agency fields to standard names
                cl.name AS name,
                cl.industry AS industry,
                cl.website AS website,
                cl.status AS status,
                ci.company_size AS company_size,
                ci.company_stage AS company_stage,
                ci.business_model AS business_model,
                ci.target_market AS target_market,
                ci.key_competitors AS key_competitors,
                ci.unique_value_proposition AS unique_value_proposition,
                ci.marketing_budget AS marketing_budget,
                ci.current_marketing_channels AS current_marketing_channels,
                ci.marketing_goals AS marketing_goals,
                ci.ai_insights AS ai_insights,
                ci.persona_patterns AS persona_patterns,
                ci.content_themes AS content_themes,
                ci.campaign_preferences AS campaign_preferences,
                ci.data_completeness_score AS data_completeness_score,
                ci.conversation_count AS conversation_count,
                ci.last_interaction_at AS last_interaction_at,
                ci.learning_milestones AS learning_milestones,
                ci.client_id AS client_id,
                ci.org_id AS org_id,
                ci.updated_at AS last_updated
            FROM agency.client_intelligence ci
            JOIN agency.clients cl ON ci.client_id = cl.id
            WHERE ci.org_id = p_org_id
              AND ci.client_id = p_client_id
        ) intelligence_data;
    ELSE
        -- SME: Load from public.core_business_data
        SELECT to_jsonb(intelligence_data)
        INTO v_result
        FROM (
            SELECT
                -- Map SME fields to standard names
                company_name AS name,
                industry AS industry,
                website AS website,
                NULL AS status,  -- SME doesn't have status
                company_size AS company_size,
                company_stage AS company_stage,
                business_model AS business_model,
                target_market AS target_market,
                key_competitors AS key_competitors,
                NULL AS unique_value_proposition,  -- SME doesn't have this field
                marketing_budget AS marketing_budget,
                NULL::TEXT[] AS current_marketing_channels,  -- SME doesn't have this
                NULL::TEXT[] AS marketing_goals,  -- SME doesn't have this
                learning_metadata AS ai_insights,  -- Different field name in SME
                '{}'::jsonb AS persona_patterns,  -- SME doesn't have this
                '{}'::jsonb AS content_themes,  -- SME doesn't have this
                '{}'::jsonb AS campaign_preferences,  -- SME doesn't have this
                data_completeness_score AS data_completeness_score,
                0 AS conversation_count,  -- SME doesn't track this
                NULL AS last_interaction_at,  -- SME doesn't have this
                '[]'::jsonb AS learning_milestones,  -- SME doesn't have this
                NULL AS client_id,  -- SME doesn't have clients
                org_id AS org_id,
                updated_at AS last_updated
            FROM public.core_business_data
            WHERE org_id = p_org_id
              AND (client_id IS NULL OR client_id = p_org_id)  -- SME org-level data
            LIMIT 1  -- SME only has one business intelligence record per org
        ) intelligence_data;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid") IS 'Unified business intelligence loader for SME and Agency. Returns standardized JSONB object
with consistent field names regardless of source schema. Handles field name normalization and
missing field defaults automatically. Migration 186, 2025-10-29.';



CREATE OR REPLACE FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer DEFAULT 30) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSON;
    v_total_cost DECIMAL(10,6);
    v_total_savings DECIMAL(10,6);
    v_total_requests INTEGER;
    v_cached_requests INTEGER;
    v_avg_cache_hit_rate DECIMAL(5,2);
BEGIN
    -- Calculate aggregate metrics
    SELECT
        COALESCE(SUM(total_cost_usd), 0) as total_cost,
        COALESCE(SUM(cache_savings_usd), 0) as total_savings,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE cached_tokens > 0) as cached_requests
    INTO v_total_cost, v_total_savings, v_total_requests, v_cached_requests
    FROM gemini_cost_tracking
    WHERE org_id = p_org_id
      AND timestamp >= NOW() - (p_days || ' days')::INTERVAL;

    -- Calculate cache hit rate
    v_avg_cache_hit_rate := CASE
        WHEN v_total_requests > 0 THEN
            ROUND((v_cached_requests::DECIMAL / v_total_requests::DECIMAL) * 100, 2)
        ELSE 0
    END;

    -- Build result JSON
    SELECT json_build_object(
        'org_id', p_org_id,
        'period_days', p_days,
        'total_cost_usd', ROUND(v_total_cost, 2),
        'total_savings_usd', ROUND(v_total_savings, 2),
        'total_requests', v_total_requests,
        'cached_requests', v_cached_requests,
        'cache_hit_rate', v_avg_cache_hit_rate,
        'cost_by_agent', (
            SELECT json_object_agg(agent_type, agent_stats)
            FROM (
                SELECT
                    agent_type,
                    json_build_object(
                        'requests', COUNT(*),
                        'total_cost_usd', ROUND(SUM(total_cost_usd), 2),
                        'cache_savings_usd', ROUND(SUM(cache_savings_usd), 2),
                        'avg_input_tokens', ROUND(AVG(input_tokens)),
                        'avg_cached_tokens', ROUND(AVG(cached_tokens))
                    ) as agent_stats
                FROM gemini_cost_tracking
                WHERE org_id = p_org_id
                  AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
                GROUP BY agent_type
            ) agent_breakdown
        ),
        'cost_by_model', (
            SELECT json_object_agg(model_name, model_stats)
            FROM (
                SELECT
                    model_name,
                    json_build_object(
                        'requests', COUNT(*),
                        'total_cost_usd', ROUND(SUM(total_cost_usd), 2)
                    ) as model_stats
                FROM gemini_cost_tracking
                WHERE org_id = p_org_id
                  AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
                GROUP BY model_name
            ) model_breakdown
        ),
        'daily_trend', (
            SELECT json_agg(day_stats ORDER BY day)
            FROM (
                SELECT
                    DATE(timestamp) as day,
                    COUNT(*) as requests,
                    ROUND(SUM(total_cost_usd), 2) as cost_usd,
                    ROUND(SUM(cache_savings_usd), 2) as savings_usd
                FROM gemini_cost_tracking
                WHERE org_id = p_org_id
                  AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
                GROUP BY DATE(timestamp)
            ) daily_breakdown
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer) IS 'Get comprehensive cache cost metrics for an organization over specified period';



CREATE OR REPLACE FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cache_data RECORD;
  v_result JSONB;
BEGIN
  -- Fetch cache entry if exists and not expired
  SELECT
    recommendations,
    overall_assessment,
    confidence,
    generated_at,
    cache_expires_at,
    llm_tokens_used,
    generation_time_ms
  INTO v_cache_data
  FROM recommendations_cache
  WHERE org_id = p_org_id
    AND recommendation_type = p_recommendation_type
    AND data_hash = p_data_hash
    AND cache_expires_at > NOW();

  -- Return null if no valid cache found
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build response object
  v_result := jsonb_build_object(
    'recommendations', v_cache_data.recommendations,
    'overall_assessment', v_cache_data.overall_assessment,
    'confidence', v_cache_data.confidence,
    'generated_at', v_cache_data.generated_at,
    'expires_at', v_cache_data.cache_expires_at,
    'tokens_used', v_cache_data.llm_tokens_used,
    'generation_time_ms', v_cache_data.generation_time_ms,
    'cache_hit', true
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") IS 'Unified cache retrieval for all recommendation types. Returns NULL if cache miss or expired. Migration 093.';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") RETURNS TABLE("campaign_count" integer, "active_campaigns" integer, "total_budget" numeric, "total_spent" numeric, "client_count" integer, "team_member_count" integer, "last_activity" timestamp with time zone, "organization_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(DISTINCT c.id), 0)::INT as campaign_count,
    COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'), 0)::INT as active_campaigns,
    COALESCE(SUM(c.budget_cents), 0)::NUMERIC as total_budget,
    COALESCE(SUM(c.spent_cents), 0)::NUMERIC as total_spent,
    COALESCE(COUNT(DISTINCT cl.id), 0)::INT as client_count,
    COALESCE(COUNT(DISTINCT u.id), 0)::INT as team_member_count,
    GREATEST(
      MAX(c.updated_at),
      MAX(cl.updated_at),
      MAX(u.updated_at)
    ) as last_activity,
    o.type::TEXT as organization_type
  FROM organizations o
  LEFT JOIN campaigns c ON o.id = c.org_id AND c.archived_at IS NULL
  LEFT JOIN clients cl ON o.id = cl.org_id AND cl.archived_at IS NULL
  LEFT JOIN users u ON o.id = u.org_id
  WHERE o.id = p_org_id
  GROUP BY o.type;

  -- If no data found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      0::INT as campaign_count,
      0::INT as active_campaigns,
      0::NUMERIC as total_budget,
      0::NUMERIC as total_spent,
      0::INT as client_count,
      0::INT as team_member_count,
      NULL::TIMESTAMPTZ as last_activity,
      'UNKNOWN'::TEXT as organization_type;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") IS 'Returns comprehensive dashboard metrics for an organization in a single call.
Aggregates campaign, client, and user data with performance optimization.
Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") RETURNS TABLE("campaign_count" integer, "active_campaigns" integer, "total_budget" numeric, "total_spent" numeric, "client_count" integer, "team_member_count" integer, "last_activity" timestamp with time zone, "organization_type" "text", "completed_campaigns" integer, "budget_utilization_percentage" numeric, "new_members_30d" integer, "document_count" integer, "total_ai_interactions" integer, "active_clients" integer, "total_revenue" numeric, "avg_client_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_user_id UUID;
  v_has_client_restriction BOOLEAN := FALSE;
  v_assigned_client_ids UUID[];
BEGIN
  -- Get current user ID
  SELECT (get_current_user()).user_id INTO v_user_id;

  -- Check if user has client-specific role assignments
  SELECT
    COALESCE(bool_or(ura.client_id IS NOT NULL), FALSE),
    ARRAY_AGG(DISTINCT ura.client_id) FILTER (WHERE ura.client_id IS NOT NULL)
  INTO v_has_client_restriction, v_assigned_client_ids
  FROM user_role_assignments ura
  WHERE ura.user_id = v_user_id AND ura.org_id = p_org_id;

  -- Get organization type
  SELECT o.type INTO v_org_type
  FROM organizations o
  WHERE o.id = p_org_id;

  IF v_org_type = 'AGENCY' THEN
    -- Agency metrics with client filtering
    RETURN QUERY
    SELECT
      COALESCE((SELECT COUNT(*)::INT FROM agency.campaigns c
        WHERE c.org_id = p_org_id AND c.archived_at IS NULL
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))), 0),
      COALESCE((SELECT COUNT(*)::INT FROM agency.campaigns c
        WHERE c.org_id = p_org_id AND c.status = 'active' AND c.archived_at IS NULL
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))), 0),
      COALESCE((SELECT SUM(c.budget) FROM agency.campaigns c
        WHERE c.org_id = p_org_id AND c.archived_at IS NULL
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))), 0),
      COALESCE((SELECT SUM(c.spent) FROM agency.campaigns c
        WHERE c.org_id = p_org_id AND c.archived_at IS NULL
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))), 0),
      COALESCE((SELECT COUNT(*)::INT FROM agency.clients cl
        WHERE cl.org_id = p_org_id AND cl.archived_at IS NULL
        AND (NOT v_has_client_restriction OR cl.id = ANY(v_assigned_client_ids))), 0),
      COALESCE((SELECT COUNT(DISTINCT ura.user_id)::INT FROM user_role_assignments ura WHERE ura.org_id = p_org_id), 0),
      (SELECT MAX(c.updated_at) FROM agency.campaigns c
        WHERE c.org_id = p_org_id
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))),
      v_org_type,
      COALESCE((SELECT COUNT(*)::INT FROM agency.campaigns c
        WHERE c.org_id = p_org_id AND c.status = 'completed' AND c.archived_at IS NULL
        AND (NOT v_has_client_restriction OR c.client_id = ANY(v_assigned_client_ids))), 0),
      0::NUMERIC, -- budget_utilization_percentage
      0::INT, -- new_members_30d
      COALESCE((SELECT COUNT(*)::INT FROM agent_outputs ao
        WHERE ao.org_id = p_org_id
        AND (NOT v_has_client_restriction OR ao.client_id = ANY(v_assigned_client_ids))), 0),
      0::INT, -- total_ai_interactions
      COALESCE((SELECT COUNT(*)::INT FROM agency.clients cl
        WHERE cl.org_id = p_org_id AND cl.status = 'active' AND cl.archived_at IS NULL
        AND (NOT v_has_client_restriction OR cl.id = ANY(v_assigned_client_ids))), 0),
      0::NUMERIC, -- total_revenue (no monthly_retainer column exists)
      0::NUMERIC; -- avg_client_value
  ELSE
    -- SME metrics (no client filtering needed)
    RETURN QUERY
    SELECT
      COALESCE((SELECT COUNT(*)::INT FROM public.campaigns c WHERE c.org_id = p_org_id AND c.archived_at IS NULL), 0),
      COALESCE((SELECT COUNT(*)::INT FROM public.campaigns c WHERE c.org_id = p_org_id AND c.status = 'active' AND c.archived_at IS NULL), 0),
      COALESCE((SELECT SUM(c.budget) FROM public.campaigns c WHERE c.org_id = p_org_id AND c.archived_at IS NULL), 0),
      COALESCE((SELECT SUM(c.spent) FROM public.campaigns c WHERE c.org_id = p_org_id AND c.archived_at IS NULL), 0),
      0::INT, -- SME doesn't have clients
      COALESCE((SELECT COUNT(DISTINCT ura.user_id)::INT FROM user_role_assignments ura WHERE ura.org_id = p_org_id), 0),
      (SELECT MAX(c.updated_at) FROM public.campaigns c WHERE c.org_id = p_org_id),
      v_org_type,
      COALESCE((SELECT COUNT(*)::INT FROM public.campaigns c WHERE c.org_id = p_org_id AND c.status = 'completed' AND c.archived_at IS NULL), 0),
      0::NUMERIC,
      0::INT,
      COALESCE((SELECT COUNT(*)::INT FROM agent_outputs ao WHERE ao.org_id = p_org_id), 0),
      0::INT,
      0::INT,
      0::NUMERIC,
      0::NUMERIC;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") IS 'Get dashboard metrics with client assignment filtering for client-scoped roles.
Version: 1.4 (Dec 2025)
- Fixed: Removed reference to non-existent monthly_retainer column';



CREATE OR REPLACE FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") RETURNS TABLE("has_strategy" boolean, "has_persona" boolean, "has_marketing_strategy" boolean, "has_content" boolean, "total_outputs" integer, "readiness_score" integer, "is_ready" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_has_strategy BOOLEAN := FALSE;
  v_has_persona BOOLEAN := FALSE;
  v_has_marketing_strategy BOOLEAN := FALSE;
  v_has_content BOOLEAN := FALSE;
  v_total_outputs INTEGER := 0;
  v_completed_prerequisites INTEGER := 0;
  v_readiness_score INTEGER := 0;
  v_is_ready BOOLEAN := FALSE;
BEGIN
  -- Version: 1.0
  -- Check for each required agent type in agent_outputs

  -- Check for strategy outputs
  SELECT EXISTS (
    SELECT 1 FROM agent_outputs
    WHERE org_id = p_org_id
      AND agent_type = 'strategy'
      AND archived_at IS NULL
  ) INTO v_has_strategy;

  -- Check for persona outputs
  SELECT EXISTS (
    SELECT 1 FROM agent_outputs
    WHERE org_id = p_org_id
      AND agent_type = 'persona'
      AND archived_at IS NULL
  ) INTO v_has_persona;

  -- Check for marketing-strategy outputs
  SELECT EXISTS (
    SELECT 1 FROM agent_outputs
    WHERE org_id = p_org_id
      AND agent_type = 'marketing-strategy'
      AND archived_at IS NULL
  ) INTO v_has_marketing_strategy;

  -- Check for content outputs
  SELECT EXISTS (
    SELECT 1 FROM agent_outputs
    WHERE org_id = p_org_id
      AND agent_type = 'content'
      AND archived_at IS NULL
  ) INTO v_has_content;

  -- Get total outputs count
  SELECT COUNT(*) INTO v_total_outputs
  FROM agent_outputs
  WHERE org_id = p_org_id
    AND archived_at IS NULL;

  -- Calculate completed prerequisites (count of true values)
  v_completed_prerequisites :=
    (CASE WHEN v_has_strategy THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_persona THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_marketing_strategy THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_content THEN 1 ELSE 0 END);

  -- Calculate readiness score (0-100)
  v_readiness_score := (v_completed_prerequisites::NUMERIC / 4.0 * 100.0)::INTEGER;

  -- Organization is ready if at least 2 prerequisites are complete
  v_is_ready := v_completed_prerequisites >= 2;

  -- Return the readiness data
  RETURN QUERY SELECT
    v_has_strategy,
    v_has_persona,
    v_has_marketing_strategy,
    v_has_content,
    v_total_outputs,
    v_readiness_score,
    v_is_ready;
END;
$$;


ALTER FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") IS 'Returns intelligence readiness status for an organization. Checks for presence of strategy, persona, marketing-strategy, and content outputs. Returns readiness percentage and whether organization is ready to create campaigns (2+ prerequisites).';



CREATE OR REPLACE FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "agent_type" "text", "title" "text", "summary" "text", "content" "jsonb", "confidence_score" double precision, "validation_status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "source_agent" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    -- RETURN UNION of agent intelligence outputs AND business profile learning (SME + Agency)
    RETURN QUERY

    -- PART 1: Agent intelligence outputs (PersonaData, StrategyData, etc.) - SME + Agency
    SELECT
        ao.id,
        ao.org_id,
        ao.client_id,
        ao.agent_type,
        ao.title,
        ao.summary,
        ao.content,
        ao.confidence_score::FLOAT,
        ao.validation_status,
        ao.created_at,
        ao.updated_at,
        ao.agent_type as source_agent
    FROM agent_outputs ao
    WHERE ao.org_id = p_org_id
      AND ao.output_type = 'intelligence'  -- Only intelligence extractions
      AND ao.archived_at IS NULL           -- Exclude archived
      AND (p_agent_type IS NULL OR ao.agent_type = p_agent_type)  -- Optional agent filter
      AND (p_client_id IS NULL OR ao.client_id = p_client_id)  -- Agency filtering

    UNION ALL

    -- PART 2: SME Business profile/metrics learning from public.core_business_data.learning_metadata
    SELECT
        gen_random_uuid() as id,
        cbd.org_id,
        NULL::UUID as client_id,
        'business_profile' as agent_type,
        'Business Profile Learned' as title,
        CONCAT(
            'Learned ', jsonb_object_keys_count.field_count, ' fields from ',
            (SELECT DISTINCT field_metadata->>'learned_by'
             FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata)
             LIMIT 1),
            ' agent'
        ) as summary,
        jsonb_build_object(
            'fields', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'field_name', field_key,
                        'field_value', CASE
                            WHEN field_key = 'company_name' THEN to_jsonb(cbd.company_name)
                            WHEN field_key = 'industry' THEN to_jsonb(cbd.industry::TEXT)
                            WHEN field_key = 'company_size' THEN to_jsonb(cbd.company_size::TEXT)
                            WHEN field_key = 'annual_revenue' THEN to_jsonb(cbd.annual_revenue)
                            WHEN field_key = 'marketing_budget' THEN to_jsonb(cbd.marketing_budget)
                            WHEN field_key = 'business_model' THEN to_jsonb(cbd.business_model::TEXT)
                            WHEN field_key = 'company_stage' THEN to_jsonb(cbd.company_stage::TEXT)
                            WHEN field_key = 'funding_status' THEN to_jsonb(cbd.funding_status::TEXT)
                            WHEN field_key = 'key_competitors' THEN to_jsonb(cbd.key_competitors)
                            WHEN field_key = 'target_market' THEN to_jsonb(cbd.target_market)
                            WHEN field_key = 'main_products' THEN to_jsonb(cbd.main_products)
                            WHEN field_key = 'tech_stack' THEN to_jsonb(cbd.tech_stack)
                            WHEN field_key = 'geography' THEN to_jsonb(cbd.geography)
                            WHEN field_key = 'website' THEN to_jsonb(cbd.website)
                            ELSE NULL
                        END,
                        'learned_by', field_metadata->>'learned_by',
                        'learned_at', field_metadata->>'learned_at',
                        'confidence', (field_metadata->>'confidence')::FLOAT
                    )
                )
                FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata)
            ),
            'learned_by', (SELECT DISTINCT field_metadata->>'learned_by' FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata) LIMIT 1),
            'learned_at', (SELECT MIN((field_metadata->>'learned_at')::TIMESTAMPTZ) FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata)),
            'field_count', (SELECT COUNT(*) FROM jsonb_object_keys(cbd.learning_metadata))
        ) as content,
        (SELECT AVG((field_metadata->>'confidence')::FLOAT) FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata)) as confidence_score,
        'auto_approved' as validation_status,
        COALESCE(
            (SELECT MIN((field_metadata->>'learned_at')::TIMESTAMPTZ) FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata)),
            cbd.updated_at
        ) as created_at,
        cbd.updated_at,
        (SELECT DISTINCT field_metadata->>'learned_by' FROM jsonb_each(cbd.learning_metadata) AS learning_entry(field_key, field_metadata) LIMIT 1) as source_agent
    FROM public.core_business_data cbd
    CROSS JOIN LATERAL (
        SELECT COUNT(*)::INT as field_count FROM jsonb_object_keys(cbd.learning_metadata)
    ) AS jsonb_object_keys_count
    WHERE cbd.org_id = p_org_id
      AND cbd.learning_metadata IS NOT NULL
      AND cbd.learning_metadata != '{}'::jsonb
      AND p_client_id IS NULL  -- SME only

    UNION ALL

    -- PART 3: Agency business profile/metrics learning from agency.client_intelligence.ai_insights.learning_metadata
    SELECT
        gen_random_uuid() as id,
        ci.org_id,
        ci.client_id,
        'business_profile' as agent_type,
        'Business Profile Learned' as title,
        CONCAT(
            'Learned ', field_count.count, ' fields from ',
            (SELECT DISTINCT field_metadata->>'learned_by'
             FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata)
             LIMIT 1),
            ' agent'
        ) as summary,
        jsonb_build_object(
            'fields', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'field_name', field_key,
                        'field_value', field_metadata->>'value',  -- Agency stores value in metadata
                        'learned_by', field_metadata->>'learned_by',
                        'learned_at', field_metadata->>'learned_at',
                        'confidence', (field_metadata->>'confidence')::FLOAT
                    )
                )
                FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata)
            ),
            'learned_by', (SELECT DISTINCT field_metadata->>'learned_by' FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata) LIMIT 1),
            'learned_at', (SELECT MIN((field_metadata->>'learned_at')::TIMESTAMPTZ) FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata)),
            'field_count', field_count.count
        ) as content,
        (SELECT AVG((field_metadata->>'confidence')::FLOAT) FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata)) as confidence_score,
        'auto_approved' as validation_status,
        COALESCE(
            (SELECT MIN((field_metadata->>'learned_at')::TIMESTAMPTZ) FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata)),
            ci.updated_at
        ) as created_at,
        ci.updated_at,
        (SELECT DISTINCT field_metadata->>'learned_by' FROM jsonb_each(learning_meta.data) AS learning_entry(field_key, field_metadata) LIMIT 1) as source_agent
    FROM agency.client_intelligence ci
    CROSS JOIN LATERAL (
        SELECT ci.ai_insights->'learning_metadata' as data
    ) AS learning_meta
    CROSS JOIN LATERAL (
        SELECT COUNT(*)::INT as count FROM jsonb_object_keys(learning_meta.data)
    ) AS field_count
    WHERE ci.org_id = p_org_id
      AND ci.client_id = p_client_id  -- Agency client filtering (REQUIRED)
      AND learning_meta.data IS NOT NULL
      AND learning_meta.data != '{}'::jsonb

    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Queries progressive learning from THREE sources:
1. Agent intelligence outputs (agent_outputs table) - PersonaData, StrategyData, etc. (SME + Agency)
2. SME business profile/metrics learning (public.core_business_data.learning_metadata)
3. Agency business profile/metrics learning (agency.client_intelligence.ai_insights.learning_metadata)
Fixed in Migration 235: Added Agency support for Learning History display.';



CREATE OR REPLACE FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Get business_metrics for org
    SELECT business_metrics INTO v_result
    FROM core_business_data
    WHERE org_id = p_org_id;

    -- If category specified, return only that category
    IF p_category IS NOT NULL THEN
        RETURN v_result->p_category;
    END IF;

    -- Return all metrics
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text") IS 'Query business metrics by category (financial, marketing, product, operational).
If p_category is NULL, returns all categories.
Example: SELECT get_metrics_by_category(''org-uuid'', ''financial'');';



CREATE OR REPLACE FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "user_id" "uuid", "agent_type" "text", "output_type" "text", "source_type" "text", "session_id" "text", "campaign_id" "uuid", "title" "text", "summary" "text", "content" "jsonb", "category" "text"[], "confidence_score" double precision, "validation_status" "text", "impact_score" integer, "usage_count" integer, "status" "text", "published_at" timestamp with time zone, "archived_at" timestamp with time zone, "archive_reason" "text", "is_archived" boolean, "created_by" "uuid", "updated_by" "uuid", "approval_status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "table_source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_org_type TEXT;
BEGIN
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    SELECT o.type INTO v_org_type
    FROM public.organizations o
    WHERE o.id = p_org_id;

    IF v_org_type = 'AGENCY' THEN
        RETURN QUERY
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.user_id,
            ao.agent_type,
            ao.output_type,
            COALESCE(ao.source_type, 'agent_output')::TEXT,
            ao.session_id,
            ao.campaign_id,
            ao.title,
            ao.summary,
            ao.content,
            ao.category,
            ao.confidence_score,
            COALESCE(ao.validation_status, 'pending')::TEXT,
            ao.impact_score::INTEGER,
            COALESCE(ao.usage_count, 0)::INTEGER,
            COALESCE(ao.status, 'draft')::TEXT,
            ao.published_at,
            ao.archived_at,
            ao.archive_reason,
            COALESCE(ao.is_archived, FALSE),
            ao.created_by,
            ao.updated_by,
            ao.approval_status,
            ao.created_at,
            ao.updated_at,
            'agency.agent_outputs'::TEXT
        FROM agency.agent_outputs ao
        WHERE ao.id = p_output_id
          AND ao.org_id = p_org_id
        LIMIT 1;

    ELSIF v_org_type = 'SME' THEN
        RETURN QUERY
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.user_id,
            ao.agent_type,
            ao.output_type,
            COALESCE(ao.source_type, 'agent_output')::TEXT,
            ao.session_id,
            ao.campaign_id,
            ao.title,
            ao.summary,
            ao.content,
            ao.category,
            ao.confidence_score,
            COALESCE(ao.validation_status, 'pending')::TEXT,
            ao.impact_score::INTEGER,
            COALESCE(ao.usage_count, 0)::INTEGER,
            COALESCE(ao.status, 'draft')::TEXT,
            ao.published_at,
            ao.archived_at,
            ao.archive_reason,
            COALESCE(ao.is_archived, FALSE),
            ao.created_by,
            ao.updated_by,
            ao.approval_status,
            ao.created_at,
            ao.updated_at,
            'public.agent_outputs'::TEXT
        FROM public.agent_outputs ao
        WHERE ao.id = p_output_id
          AND ao.org_id = p_org_id
        LIMIT 1;

    ELSE
        RAISE EXCEPTION 'Unknown organization type: %', v_org_type;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") IS 'Schema-aware output detail read for authenticated users. Routes to agency.agent_outputs for AGENCY orgs and public.agent_outputs for SME orgs.';



CREATE OR REPLACE FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false) RETURNS TABLE("total_count" integer, "by_agent" "jsonb", "by_status" "jsonb", "by_source" "jsonb", "recent_activity" "jsonb", "performance_metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_total_count INTEGER := 0;
    v_by_agent JSONB := '{}'::jsonb;
    v_by_status JSONB := '{}'::jsonb;
    v_by_source JSONB := '{}'::jsonb;
    v_recent_activity JSONB := '[]'::jsonb;
    v_performance_metrics JSONB := '{}'::jsonb;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Calculate aggregated statistics from unified outputs
    WITH unified_stats AS (
        SELECT
            agent_type,
            status,
            table_source,
            confidence_score,
            impact_score,
            usage_count,
            created_at,
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as age_days
        FROM get_unified_outputs_hub(p_org_id, NULL, NULL, p_include_archived, 1000, 0)
    ),
    agent_counts AS (
        SELECT agent_type, COUNT(*) as count
        FROM unified_stats
        GROUP BY agent_type
    ),
    status_counts AS (
        SELECT status, COUNT(*) as count
        FROM unified_stats
        GROUP BY status
    ),
    source_counts AS (
        SELECT table_source, COUNT(*) as count
        FROM unified_stats
        GROUP BY table_source
    )
    SELECT
        (SELECT COUNT(*)::INTEGER FROM unified_stats) as total,
        (SELECT jsonb_object_agg(agent_type, count) FROM agent_counts) as by_agent,
        (SELECT jsonb_object_agg(status, count) FROM status_counts) as by_status,
        (SELECT jsonb_object_agg(table_source, count) FROM source_counts) as by_source
    INTO v_total_count, v_by_agent, v_by_status, v_by_source;

    -- Get recent activity (last 7 days)
    SELECT jsonb_agg(jsonb_build_object(
        'agent_type', agent_type,
        'title', title,
        'created_at', created_at,
        'status', status,
        'confidence_score', confidence_score
    ))
    INTO v_recent_activity
    FROM get_unified_outputs_hub(p_org_id, NULL, NULL, p_include_archived, 10, 0)
    WHERE created_at > NOW() - INTERVAL '7 days';

    -- Calculate performance metrics
    WITH perf_stats AS (
        SELECT
            AVG(confidence_score) as avg_confidence,
            AVG(impact_score) as avg_impact,
            AVG(usage_count) as avg_usage,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_outputs
        FROM get_unified_outputs_hub(p_org_id, NULL, NULL, p_include_archived, 1000, 0)
    )
    SELECT jsonb_build_object(
        'avg_confidence_score', COALESCE(avg_confidence, 0),
        'avg_impact_score', COALESCE(avg_impact, 0),
        'avg_usage_count', COALESCE(avg_usage, 0),
        'outputs_last_30_days', COALESCE(recent_outputs, 0)
    )
    INTO v_performance_metrics
    FROM perf_stats;

    RETURN QUERY SELECT
        v_total_count,
        COALESCE(v_by_agent, '{}'::jsonb),
        COALESCE(v_by_status, '{}'::jsonb),
        COALESCE(v_by_source, '{}'::jsonb),
        COALESCE(v_recent_activity, '[]'::jsonb),
        COALESCE(v_performance_metrics, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean) IS 'Database-First function to get aggregated statistics for the outputs hub dashboard';



CREATE OR REPLACE FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") RETURNS TABLE("total_count" integer, "by_agent" "jsonb", "by_status" "jsonb", "by_source" "jsonb", "performance_metrics" "jsonb", "last_refreshed" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_summary RECORD;
    v_recent_activity JSONB := '[]'::jsonb;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get cached summary from materialized view
    SELECT * INTO v_summary
    FROM mv_output_hub_summary
    WHERE org_id = p_org_id;

    IF v_summary IS NULL THEN
        -- Fallback to empty results if no data
        RETURN QUERY SELECT
            0::INTEGER as total_count,
            '{}'::jsonb as by_agent,
            '{}'::jsonb as by_status,
            '{}'::jsonb as by_source,
            '{}'::jsonb as performance_metrics,
            NOW() as last_refreshed;
        RETURN;
    END IF;

    -- Get recent activity for performance metrics
    SELECT jsonb_agg(jsonb_build_object(
        'agent_type', agent_type,
        'title', title,
        'created_at', created_at,
        'confidence_score', confidence_score
    ))
    INTO v_recent_activity
    FROM (
        SELECT agent_type, title, created_at, confidence_score
        FROM get_unified_outputs_hub(p_org_id, NULL, NULL, FALSE, 5, 0)
        WHERE created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 5
    ) recent;

    RETURN QUERY SELECT
        v_summary.total_count,
        COALESCE(v_summary.by_agent, '{}'::jsonb),
        COALESCE(v_summary.by_status, '{}'::jsonb),
        COALESCE(v_summary.by_source, '{}'::jsonb),
        jsonb_build_object(
            'avg_confidence_score', COALESCE(v_summary.overall_avg_confidence, 0),
            'avg_impact_score', COALESCE(v_summary.overall_avg_impact, 0),
            'recent_activity', COALESCE(v_recent_activity, '[]'::jsonb),
            'last_activity', v_summary.last_activity_at
        ),
        v_summary.refreshed_at;
END;
$$;


ALTER FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") IS 'Performance-optimized function using materialized view for output hub summary';



CREATE OR REPLACE FUNCTION "public"."get_pending_approvals_count"() RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM approval_requests
    WHERE assigned_to = v_user_id AND status = 'pending';

    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_pending_approvals_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_context JSONB;
    v_core_data JSONB;
    v_recent_insights JSONB;
BEGIN
    -- Get core business data (progressively learned from all agents)
    SELECT jsonb_build_object(
        'company_name', company_name,
        'website', website,
        'industry', industry,
        'company_size', company_size,
        'geography', geography,
        'business_model', business_model,
        'company_stage', company_stage,
        'funding_status', funding_status,
        'target_market', target_market,
        'main_products', main_products,
        'key_competitors', key_competitors,
        'tech_stack', tech_stack,
        'annual_revenue', annual_revenue,
        'marketing_budget', marketing_budget,
        'data_completeness_score', data_completeness_score,
        'last_updated', updated_at
    )
    INTO v_core_data
    FROM core_business_data
    WHERE org_id = p_org_id;

    -- Get recent agent insights (last 30 days for context)
    SELECT jsonb_agg(
        jsonb_build_object(
            'agent_type', agent_type,
            'title', title,
            'summary', summary,
            'created_at', created_at
        )
    )
    INTO v_recent_insights
    FROM (
        SELECT agent_type, title, summary, created_at
        FROM agent_outputs
        WHERE org_id = p_org_id
          AND archived_at IS NULL
          AND created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 50
    ) recent;

    -- Assemble complete context
    v_context := jsonb_build_object(
        'core_business', COALESCE(v_core_data, '{}'::jsonb),
        'recent_insights', COALESCE(v_recent_insights, '[]'::jsonb),
        'assembled_at', NOW()
    );

    RETURN v_context;
END;
$$;


ALTER FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") IS 'Assembles complete business context with core data and recent insights. Always returns fresh data for progressive learning (no caching).';



CREATE OR REPLACE FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text" DEFAULT NULL::"text") RETURNS TABLE("recommendation_type" "text", "total_cached" integer, "avg_generation_time_ms" numeric, "total_tokens_used" bigint, "avg_tokens_per_request" numeric, "total_storage_bytes" bigint, "oldest_cache_age_hours" numeric, "newest_cache_age_hours" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.recommendation_type,
    COUNT(*)::INTEGER AS total_cached,
    AVG(rc.generation_time_ms)::NUMERIC AS avg_generation_time_ms,
    SUM(rc.llm_tokens_used)::BIGINT AS total_tokens_used,
    AVG(rc.llm_tokens_used)::NUMERIC AS avg_tokens_per_request,
    SUM(pg_column_size(rc.recommendations))::BIGINT AS total_storage_bytes,
    EXTRACT(EPOCH FROM (NOW() - MIN(rc.generated_at))) / 3600 AS oldest_cache_age_hours,
    EXTRACT(EPOCH FROM (NOW() - MAX(rc.generated_at))) / 3600 AS newest_cache_age_hours
  FROM recommendations_cache rc
  WHERE rc.org_id = p_org_id
    AND (p_recommendation_type IS NULL OR rc.recommendation_type = p_recommendation_type)
    AND rc.cache_expires_at > NOW()
  GROUP BY rc.recommendation_type
  ORDER BY rc.recommendation_type;
END;
$$;


ALTER FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text") IS 'Performance metrics for cached recommendations by type. Migration 093.';



CREATE OR REPLACE FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_metric" "text" DEFAULT 'impact_score'::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "agent_type" "text", "title" "text", "summary" "text", "metric_value" numeric, "created_at" timestamp with time zone, "table_source" "text")
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
        uo.id,
        uo.agent_type,
        uo.title,
        uo.summary,
        CASE
            WHEN p_metric = 'impact_score' THEN uo.impact_score
            WHEN p_metric = 'confidence_score' THEN uo.confidence_score
            WHEN p_metric = 'usage_count' THEN uo.usage_count::numeric
            ELSE uo.impact_score
        END as metric_value,
        uo.created_at,
        uo.table_source
    FROM get_unified_outputs_hub(p_org_id, p_agent_type, NULL, FALSE, 1000, 0) uo
    WHERE CASE
        WHEN p_metric = 'impact_score' THEN uo.impact_score IS NOT NULL
        WHEN p_metric = 'confidence_score' THEN uo.confidence_score IS NOT NULL
        WHEN p_metric = 'usage_count' THEN uo.usage_count > 0
        ELSE uo.impact_score IS NOT NULL
    END
    ORDER BY metric_value DESC NULLS LAST
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text", "p_metric" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text", "p_metric" "text", "p_limit" integer) IS 'Database-First function to get top-performing outputs by various metrics';


CREATE OR REPLACE FUNCTION "public"."get_unified_outputs_hub"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_include_archived" boolean DEFAULT false, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "user_id" "uuid", "agent_type" "text", "output_type" "text", "source_type" "text", "session_id" "text", "campaign_id" "uuid", "title" "text", "summary" "text", "content" "jsonb", "category" "text"[], "confidence_score" double precision, "validation_status" "text", "impact_score" integer, "usage_count" integer, "last_used_at" timestamp with time zone, "status" "text", "published_at" timestamp with time zone, "metadata" "jsonb", "archived_at" timestamp with time zone, "archive_reason" "text", "is_archived" boolean, "created_by" "uuid", "updated_by" "uuid", "approval_status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "table_source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_org_type TEXT;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Detect organization type for schema routing
    SELECT o.type INTO v_org_type FROM organizations o WHERE o.id = p_org_id;

    -- Route based on organization type
    IF v_org_type = 'AGENCY' THEN
        -- Query agency schema for agency organizations
        RETURN QUERY
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.user_id,
            ao.agent_type,
            ao.output_type,
            COALESCE(ao.source_type, 'agent_output')::TEXT as source_type,
            ao.session_id,
            ao.campaign_id,
            ao.title,
            ao.summary,
            ao.content,
            ao.category,
            ao.confidence_score,
            COALESCE(ao.validation_status, 'pending')::TEXT as validation_status,
            ao.impact_score::INTEGER,
            COALESCE(ao.usage_count, 0)::INTEGER as usage_count,
            ao.last_used_at,
            COALESCE(ao.status, 'draft')::TEXT as status,
            ao.published_at,
            ao.metadata,
            ao.archived_at,
            ao.archive_reason,
            COALESCE(ao.is_archived, FALSE) as is_archived,
            ao.created_by,           -- NEW: Phase 2
            ao.updated_by,           -- NEW: Phase 2
            ao.approval_status,      -- NEW: Phase 2
            ao.created_at,
            ao.updated_at,
            'agency.agent_outputs'::TEXT as table_source
        FROM agency.agent_outputs ao
        WHERE ao.org_id = p_org_id
          AND (p_client_id IS NULL OR ao.client_id = p_client_id)
          AND (p_agent_type IS NULL OR ao.agent_type = p_agent_type)
          AND (p_campaign_id IS NULL OR ao.campaign_id = p_campaign_id)
          AND (p_include_archived OR ao.archived_at IS NULL)
        ORDER BY ao.created_at DESC
        LIMIT p_limit OFFSET p_offset;

    ELSIF v_org_type = 'SME' THEN
        -- Query public schema for SME organizations
        RETURN QUERY
        SELECT
            ao.id,
            ao.org_id,
            ao.client_id,
            ao.user_id,
            ao.agent_type,
            ao.output_type,
            COALESCE(ao.source_type, 'agent_output')::TEXT as source_type,
            ao.session_id,
            ao.campaign_id,
            ao.title,
            ao.summary,
            ao.content,
            ao.category,
            ao.confidence_score,
            COALESCE(ao.validation_status, 'pending')::TEXT as validation_status,
            ao.impact_score::INTEGER,
            COALESCE(ao.usage_count, 0)::INTEGER as usage_count,
            ao.last_used_at,
            COALESCE(ao.status, 'draft')::TEXT as status,
            ao.published_at,
            ao.metadata,
            ao.archived_at,
            ao.archive_reason,
            COALESCE(ao.is_archived, FALSE) as is_archived,
            ao.created_by,           -- NEW: Phase 2
            ao.updated_by,           -- NEW: Phase 2
            ao.approval_status,      -- NEW: Phase 2
            ao.created_at,
            ao.updated_at,
            'public.agent_outputs'::TEXT as table_source
        FROM public.agent_outputs ao
        WHERE ao.org_id = p_org_id
          AND (p_agent_type IS NULL OR ao.agent_type = p_agent_type)
          AND (p_campaign_id IS NULL OR ao.campaign_id = p_campaign_id)
          AND (p_include_archived OR ao.archived_at IS NULL)
        ORDER BY ao.created_at DESC
        LIMIT p_limit OFFSET p_offset;

    ELSE
        RAISE EXCEPTION 'Unknown organization type: %', v_org_type;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_unified_outputs_hub"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text", "p_campaign_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_insight_usage"("insight_id" "uuid", "agent_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE ai_insights 
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW(),
        used_by_agents = array_append(
            COALESCE(used_by_agents, ARRAY[]::TEXT[]), 
            agent_name
        )
    WHERE id = insight_id;
END;
$$;


ALTER FUNCTION "public"."increment_insight_usage"("insight_id" "uuid", "agent_name" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."list_approval_requests"("p_status" "text" DEFAULT NULL::"text", "p_assigned_to_me" boolean DEFAULT false, "p_requested_by_me" boolean DEFAULT false, "p_resource_type" "text" DEFAULT NULL::"text", "p_resource_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_approvals JSONB;
  v_pending_count INTEGER;
  v_cache_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

  -- Check if materialized view has data (self-healing pattern)
  SELECT EXISTS(SELECT 1 FROM approval_requests_enriched LIMIT 1) INTO v_cache_exists;

  IF v_cache_exists THEN
    -- Fast path: Use materialized view (no JOINs needed)
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC)
    INTO v_approvals
    FROM (
      SELECT
        are.id, are.org_id, are.client_id, are.resource_type, are.resource_id,
        are.status, are.requested_by, are.assigned_to, are.title, are.description,
        are.priority, are.due_date, are.created_at, are.updated_at, are.resolved_at,
        are.resolved_by, are.resolution_note,
        are.requester_name,
        are.assignee_name,
        are.resolver_name
      FROM approval_requests_enriched are
      WHERE are.org_id = v_org_id
        AND (p_status IS NULL OR are.status = p_status)
        AND (NOT p_assigned_to_me OR are.assigned_to = v_user_id)
        AND (NOT p_requested_by_me OR are.requested_by = v_user_id)
        AND (p_resource_type IS NULL OR are.resource_type = p_resource_type)
        AND (p_resource_id IS NULL OR are.resource_id = p_resource_id)
      ORDER BY are.created_at DESC
    ) t;
  ELSE
    -- Fallback: Use original query with JOINs (slower but always works)
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC)
    INTO v_approvals
    FROM (
      SELECT
        ar.id, ar.org_id, ar.client_id, ar.resource_type, ar.resource_id,
        ar.status, ar.requested_by, ar.assigned_to, ar.title, ar.description,
        ar.priority, ar.due_date, ar.created_at, ar.updated_at, ar.resolved_at,
        ar.resolved_by, ar.resolution_note,
        req.full_name AS requester_name,
        asg.full_name AS assignee_name,
        res.full_name AS resolver_name
      FROM approval_requests ar
      LEFT JOIN users req ON ar.requested_by = req.id
      LEFT JOIN users asg ON ar.assigned_to = asg.id
      LEFT JOIN users res ON ar.resolved_by = res.id
      WHERE ar.org_id = v_org_id
        AND (p_status IS NULL OR ar.status = p_status)
        AND (NOT p_assigned_to_me OR ar.assigned_to = v_user_id)
        AND (NOT p_requested_by_me OR ar.requested_by = v_user_id)
        AND (p_resource_type IS NULL OR ar.resource_type = p_resource_type)
        AND (p_resource_id IS NULL OR ar.resource_id = p_resource_id)
      ORDER BY ar.created_at DESC
    ) t;
  END IF;

  -- Get pending count (always from source table for accuracy)
  SELECT COUNT(*) INTO v_pending_count
  FROM approval_requests
  WHERE org_id = v_org_id AND status = 'pending';

  RETURN jsonb_build_object(
    'approvals', COALESCE(v_approvals, '[]'::jsonb),
    'total', COALESCE(jsonb_array_length(v_approvals), 0),
    'pending_count', v_pending_count
  );
END;
$$;


ALTER FUNCTION "public"."list_approval_requests"("p_status" "text", "p_assigned_to_me" boolean, "p_requested_by_me" boolean, "p_resource_type" "text", "p_resource_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_output_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_activity_type TEXT;
  v_details JSONB := '{}';
  v_user_id UUID;
  v_org_id UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Skip logging if no authenticated user (e.g., system operations)
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Get user details
  SELECT
    u.org_id,
    COALESCE(u.full_name, u.email),
    INITCAP(REPLACE(REPLACE(r.name, 'sme_', ''), 'agency_', ''))
  INTO v_org_id, v_actor_name, v_actor_role
  FROM users u
  LEFT JOIN user_role_assignments ura ON ura.user_id = u.id
  LEFT JOIN roles r ON r.id = ura.role_id
  WHERE u.id = v_user_id
  LIMIT 1;

  v_actor_role := REPLACE(v_actor_role, '_', ' ');

  -- Determine activity type and build details
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'created';
    v_details := jsonb_build_object('status', NEW.status);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
      v_activity_type := 'archived';
      v_details := jsonb_build_object('reason', NEW.archive_reason);
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
      v_activity_type := 'restored';
    ELSIF OLD.approval_status != NEW.approval_status THEN
      -- Approval status changed
      IF NEW.approval_status = 'pending' THEN
        v_activity_type := 'approval_requested';
      ELSIF NEW.approval_status = 'approved' THEN
        v_activity_type := 'approved';
      ELSIF NEW.approval_status = 'rejected' THEN
        v_activity_type := 'rejected';
      ELSIF NEW.approval_status = 'changes_needed' THEN
        v_activity_type := 'changes_requested';
      ELSE
        v_activity_type := 'updated';
      END IF;
      v_details := jsonb_build_object(
        'old_status', OLD.approval_status,
        'new_status', NEW.approval_status
      );
    ELSIF OLD.status != NEW.status THEN
      IF NEW.status = 'published' THEN
        v_activity_type := 'published';
      ELSIF OLD.status = 'published' AND NEW.status = 'draft' THEN
        v_activity_type := 'unpublished';
      ELSE
        v_activity_type := 'updated';
      END IF;
      v_details := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    ELSE
      v_activity_type := 'updated';
      v_details := jsonb_build_object(
        'old_title', OLD.title,
        'new_title', NEW.title
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_activity_type := 'deleted';
    v_details := jsonb_build_object('title', OLD.title);
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
    details
  ) VALUES (
    COALESCE(v_org_id, CASE WHEN TG_OP = 'DELETE' THEN OLD.org_id ELSE NEW.org_id END),
    CASE WHEN TG_OP = 'DELETE' THEN OLD.client_id ELSE NEW.client_id END,
    'output',
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END,
    v_activity_type,
    v_user_id,
    v_actor_name,
    v_actor_role,
    v_details
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."log_output_activity"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."notify_on_approval_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  requester_name TEXT;
  v_action_url TEXT;
BEGIN
  -- Get requester name
  SELECT full_name INTO requester_name FROM public.users WHERE id = NEW.requested_by;

  -- Build action_url based on resource type AND client context (for Agency users)
  v_action_url := public.build_resource_action_url(NEW.resource_type, NEW.resource_id, NEW.client_id);

  INSERT INTO public.notifications (user_id, org_id, type, title, body, resource_type, resource_id, action_url)
  VALUES (
    NEW.assigned_to,
    NEW.org_id,
    'approval_request',
    'Approval requested',
    'You have a new approval request: ' || NEW.title,
    NEW.resource_type,
    NEW.resource_id,
    v_action_url
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_approval_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_approval_resolved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  resolver_name TEXT;
  notification_type TEXT;
  notification_title TEXT;
  v_action_url TEXT;
  v_status_text TEXT;
BEGIN
  -- Only create notification when status changes from pending to something else
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'changes_requested') THEN
    -- Get resolver name
    SELECT full_name INTO resolver_name FROM public.users WHERE id = NEW.resolved_by;

    -- Determine notification type and title
    CASE NEW.status
      WHEN 'approved' THEN
        notification_type := 'approval_resolved';
        notification_title := 'Request Approved';
        v_status_text := 'approved';
      WHEN 'rejected' THEN
        notification_type := 'approval_resolved';
        notification_title := 'Request Rejected';
        v_status_text := 'rejected';
      WHEN 'changes_requested' THEN
        notification_type := 'approval_changes_requested';
        notification_title := 'Changes Requested';
        v_status_text := 'requested changes on';
    END CASE;

    -- Build action_url based on resource type AND client context (for Agency users)
    v_action_url := public.build_resource_action_url(NEW.resource_type, NEW.resource_id, NEW.client_id);

    INSERT INTO public.notifications (user_id, org_id, type, title, body, resource_type, resource_id, action_url)
    VALUES (
      NEW.requested_by,
      NEW.org_id,
      notification_type,
      notification_title,
      COALESCE(resolver_name, 'A team member') || ' ' || v_status_text || ' your request: ' || NEW.title,
      NEW.resource_type,
      NEW.resource_id,
      v_action_url
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_approval_resolved"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."refresh_approval_requests_cache"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY approval_requests_enriched;
END;
$$;


ALTER FUNCTION "public"."refresh_approval_requests_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_approved_outputs_library"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY approved_outputs_library;
END;
$$;


ALTER FUNCTION "public"."refresh_approved_outputs_library"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_cache_metrics_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Refresh materialized view (non-blocking with CONCURRENTLY)
    REFRESH MATERIALIZED VIEW CONCURRENTLY cache_metrics_summary;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."refresh_cache_metrics_summary"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."refresh_output_hub_summary"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_output_hub_summary;
END;
$$;


ALTER FUNCTION "public"."refresh_output_hub_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_output_hub_summary"() IS 'Function to refresh the output hub summary materialized view';



CREATE OR REPLACE FUNCTION "public"."resolve_approval_request"("p_approval_id" "uuid", "p_status" "text", "p_resolution_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result approval_requests;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_status NOT IN ('approved', 'rejected', 'changes_requested') THEN
        RAISE EXCEPTION 'Invalid status. Must be: approved, rejected, or changes_requested';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    UPDATE approval_requests
    SET
        status = p_status,
        resolved_by = v_user_id,
        resolved_at = NOW(),
        resolution_note = p_resolution_note,
        updated_at = NOW()
    WHERE id = p_approval_id
    AND org_id = v_org_id
    AND assigned_to = v_user_id
    AND status = 'pending'
    RETURNING * INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Approval request not found, already resolved, or not assigned to you';
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."resolve_approval_request"("p_approval_id" "uuid", "p_status" "text", "p_resolution_note" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."resubmit_for_approval"("p_approval_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_result approval_requests;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT users.org_id INTO v_org_id FROM users WHERE users.id = v_user_id;

    UPDATE approval_requests
    SET
        status = 'pending',
        resolved_by = NULL,
        resolved_at = NULL,
        resolution_note = p_note,
        updated_at = NOW()
    WHERE id = p_approval_id
    AND org_id = v_org_id
    AND requested_by = v_user_id
    AND status IN ('changes_requested', 'rejected')
    RETURNING * INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Cannot resubmit. Request not found, not owned by you, or not in a resubmittable state.';
    END IF;

    IF v_result.resource_type = 'output' THEN
        UPDATE agent_outputs
        SET approval_status = 'pending'
        WHERE id = v_result.resource_id;
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;


ALTER FUNCTION "public"."resubmit_for_approval"("p_approval_id" "uuid", "p_note" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer DEFAULT 0, "p_overall_assessment" "text" DEFAULT NULL::"text", "p_confidence" "text" DEFAULT 'medium'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cache_id UUID;
BEGIN
  -- Upsert cache entry
  INSERT INTO recommendations_cache (
    org_id,
    recommendation_type,
    data_hash,
    recommendations,
    overall_assessment,
    confidence,
    generated_at,
    cache_expires_at,
    refreshed_at,
    llm_tokens_used,
    generation_time_ms
  ) VALUES (
    p_org_id,
    p_recommendation_type,
    p_data_hash,
    p_recommendations,
    p_overall_assessment,
    p_confidence,
    NOW(),
    NOW() + (p_cache_duration_hours || ' hours')::INTERVAL,
    NOW(),
    p_llm_tokens_used,
    p_generation_time_ms
  )
  ON CONFLICT (org_id, recommendation_type, data_hash) DO UPDATE SET
    recommendations = EXCLUDED.recommendations,
    overall_assessment = EXCLUDED.overall_assessment,
    confidence = EXCLUDED.confidence,
    generated_at = NOW(),
    cache_expires_at = NOW() + (p_cache_duration_hours || ' hours')::INTERVAL,
    refreshed_at = NOW(),
    llm_tokens_used = EXCLUDED.llm_tokens_used,
    generation_time_ms = EXCLUDED.generation_time_ms,
    updated_at = NOW()
  RETURNING id INTO v_cache_id;

  RETURN v_cache_id;
END;
$$;


ALTER FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") IS 'Unified cache storage for all recommendation types. Uses upsert for idempotency. Migration 093.';


CREATE OR REPLACE FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "agent_type" "text", "title" "text", "summary" "text", "content" "jsonb", "confidence_score" numeric, "impact_score" numeric, "created_at" timestamp with time zone, "table_source" "text", "search_rank" real)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_tsquery tsquery;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Convert search query to tsquery (handle potential errors)
    BEGIN
        v_tsquery := plainto_tsquery('english', p_search_query);
    EXCEPTION WHEN OTHERS THEN
        -- If query parsing fails, use simple text matching
        v_tsquery := plainto_tsquery('english', regexp_replace(p_search_query, '[^a-zA-Z0-9\s]', '', 'g'));
    END;

    RETURN QUERY
    SELECT
        uo.id,
        uo.agent_type,
        uo.title,
        uo.summary,
        uo.content,
        uo.confidence_score,
        uo.impact_score,
        uo.created_at,
        uo.table_source,
        -- Calculate search relevance score
        GREATEST(
            ts_rank_cd(to_tsvector('english', uo.title), v_tsquery) * 4,
            ts_rank_cd(to_tsvector('english', COALESCE(uo.summary, '')), v_tsquery) * 2,
            ts_rank_cd(to_tsvector('english', uo.content::text), v_tsquery)
        ) as search_rank
    FROM get_unified_outputs_hub(p_org_id, NULL, NULL, FALSE, 1000, 0) uo
    WHERE (
        v_tsquery @@ to_tsvector('english', uo.title)
        OR v_tsquery @@ to_tsvector('english', COALESCE(uo.summary, ''))
        OR v_tsquery @@ to_tsvector('english', uo.content::text)
    )
    AND (p_agent_types IS NULL OR uo.agent_type = ANY(p_agent_types))
    ORDER BY search_rank DESC, uo.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[], "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[], "p_limit" integer, "p_offset" integer) IS 'Database-First function for full-text search across all unified output sources';


CREATE OR REPLACE FUNCTION "public"."sync_output_approval_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_output_exists_public BOOLEAN;
  v_output_exists_agency BOOLEAN;
  v_mapped_status TEXT;
BEGIN
  -- Only process for output resource types
  IF NEW.resource_type != 'output' THEN
    RETURN NEW;
  END IF;

  -- Check which schema has the output
  SELECT EXISTS(SELECT 1 FROM public.agent_outputs WHERE id = NEW.resource_id) INTO v_output_exists_public;
  SELECT EXISTS(SELECT 1 FROM agency.agent_outputs WHERE id = NEW.resource_id) INTO v_output_exists_agency;

  -- Map status: approval_requests uses 'changes_requested', agent_outputs uses 'changes_needed'
  v_mapped_status := CASE
    WHEN NEW.status = 'changes_requested' THEN 'changes_needed'
    ELSE NEW.status
  END;

  -- Update output status in the appropriate schema(s)
  IF NEW.status = 'approved' THEN
    IF v_output_exists_public THEN
      UPDATE public.agent_outputs
      SET
        approval_status = 'approved',
        approved_at = now(),
        approved_by = NEW.resolved_by
      WHERE id = NEW.resource_id;
    END IF;

    IF v_output_exists_agency THEN
      UPDATE agency.agent_outputs
      SET
        approval_status = 'approved',
        approved_at = now(),
        approved_by = NEW.resolved_by
      WHERE id = NEW.resource_id;
    END IF;

  ELSIF NEW.status = 'changes_requested' THEN
    IF v_output_exists_public THEN
      UPDATE public.agent_outputs
      SET approval_status = 'changes_needed'
      WHERE id = NEW.resource_id;
    END IF;

    IF v_output_exists_agency THEN
      UPDATE agency.agent_outputs
      SET approval_status = 'changes_needed'
      WHERE id = NEW.resource_id;
    END IF;

  ELSIF NEW.status = 'rejected' THEN
    IF v_output_exists_public THEN
      UPDATE public.agent_outputs
      SET
        approval_status = 'rejected',
        archived_at = now(),
        archived_by = NEW.resolved_by,
        archive_reason = 'Rejected during approval review'
      WHERE id = NEW.resource_id;
    END IF;

    IF v_output_exists_agency THEN
      UPDATE agency.agent_outputs
      SET
        approval_status = 'rejected',
        archived_at = now(),
        archived_by = NEW.resolved_by,
        archive_reason = 'Rejected during approval review'
      WHERE id = NEW.resource_id;
    END IF;

  ELSIF NEW.status = 'pending' THEN
    -- When a new approval request is created
    IF v_output_exists_public THEN
      UPDATE public.agent_outputs
      SET
        approval_status = 'pending',
        current_approval_id = NEW.id
      WHERE id = NEW.resource_id;
    END IF;

    IF v_output_exists_agency THEN
      UPDATE agency.agent_outputs
      SET
        approval_status = 'pending',
        current_approval_id = NEW.id
      WHERE id = NEW.resource_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_output_approval_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_approval_requests_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Refresh on any insert, update, or delete to approval_requests
  PERFORM refresh_approval_requests_cache();
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_approval_requests_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_approved_outputs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only refresh if approval_status changed to/from 'approved'
  IF (TG_OP = 'UPDATE' AND
      (OLD.approval_status = 'approved' OR NEW.approval_status = 'approved') AND
      OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    PERFORM refresh_approved_outputs_library();
  ELSIF (TG_OP = 'INSERT' AND NEW.approval_status = 'approved') THEN
    PERFORM refresh_approved_outputs_library();
  ELSIF (TG_OP = 'DELETE' AND OLD.approval_status = 'approved') THEN
    PERFORM refresh_approved_outputs_library();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_approved_outputs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_output_hub_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Use pg_notify to trigger an async refresh
    PERFORM pg_notify('refresh_output_summary',
        json_build_object(
            'org_id', COALESCE(NEW.org_id, OLD.org_id),
            'action', TG_OP,
            'table', TG_TABLE_NAME
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_output_hub_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT 'User archived'::"text") RETURNS TABLE("id" "uuid", "title" "text", "archived_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_output_exists BOOLEAN;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Check if output exists
    SELECT EXISTS(
        SELECT 1 FROM agent_outputs
        WHERE agent_outputs.id = p_output_id
          AND agent_outputs.org_id = p_org_id
          AND agent_outputs.archived_at IS NULL
    ) INTO v_output_exists;

    IF NOT v_output_exists THEN
        RAISE EXCEPTION 'Output not found or already archived';
    END IF;

    -- Archive the output (is_archived auto-updates)
    UPDATE agent_outputs SET
        archived_at = NOW(),
        archive_reason = p_archive_reason,
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agent_outputs.id = p_output_id
      AND agent_outputs.org_id = p_org_id;

    -- Return archived output info
    RETURN QUERY
    SELECT
        ao.id,
        ao.title,
        ao.archived_at
    FROM agent_outputs ao
    WHERE ao.id = p_output_id;
END;
$$;


ALTER FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archive agent outputs (is_archived auto-updates from archived_at)';



CREATE OR REPLACE FUNCTION "public"."unified_archive_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    result JSONB;
    v_user_org_id UUID;
    v_user_id UUID;
    v_schema TEXT;
    v_table TEXT;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;
    SELECT user_id INTO v_user_id FROM get_current_user();

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Parse schema and table from table_source
    IF p_table_source LIKE '%.%' THEN
        v_schema := split_part(p_table_source, '.', 1);
        v_table := split_part(p_table_source, '.', 2);
    ELSE
        v_schema := 'public';
        v_table := p_table_source;
    END IF;

    -- Route to correct schema/table for archive operations
    IF v_schema = 'agency' AND v_table = 'agent_outputs' THEN
        UPDATE agency.agent_outputs
        SET archived_at = NOW(),
            archived_by = v_user_id,
            archive_reason = p_reason
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'archived_at', archived_at,
            'table_source', 'agency.agent_outputs'
        ) INTO result;

    ELSIF v_table = 'agent_outputs' THEN
        UPDATE public.agent_outputs
        SET archived_at = NOW(),
            archived_by = v_user_id,
            archive_reason = p_reason
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'archived_at', archived_at,
            'table_source', 'public.agent_outputs'
        ) INTO result;

    ELSIF v_table = 'synthetic_personas' THEN
        UPDATE public.synthetic_personas
        SET archived_at = NOW(),
            archived_by = v_user_id,
            archive_reason = p_reason
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'archived_at', archived_at,
            'table_source', 'synthetic_personas'
        ) INTO result;

    ELSIF v_table = 'strategy_intelligence' THEN
        UPDATE public.strategy_intelligence
        SET archived_at = NOW(),
            archived_by = v_user_id,
            archive_reason = p_reason
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'archived_at', archived_at,
            'table_source', 'strategy_intelligence'
        ) INTO result;

    ELSIF v_table = 'marketing_strategies' THEN
        UPDATE public.marketing_strategies
        SET archived_at = NOW(),
            archived_by = v_user_id,
            archive_reason = p_reason
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'archived_at', archived_at,
            'table_source', 'marketing_strategies'
        ) INTO result;

    ELSE
        RAISE EXCEPTION 'Unsupported table source: %', p_table_source;
    END IF;

    IF result IS NULL THEN
        RAISE EXCEPTION 'Item not found, already archived, or access denied';
    END IF;

    -- Notify for real-time updates
    PERFORM pg_notify('unified_outputs_changed',
        jsonb_build_object('org_id', p_org_id, 'action', 'archived')::text);

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."unified_archive_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
    v_user_org_id UUID;
    record_title TEXT;
    v_normalized_table TEXT;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Normalize table source by stripping schema prefix
    -- 'public.agent_outputs' -> 'agent_outputs'
    -- 'agency.agent_outputs' -> 'agent_outputs'
    v_normalized_table := regexp_replace(p_table_source, '^(public|agency)\.', '');

    -- Get title before deletion for response
    CASE v_normalized_table
        WHEN 'synthetic_personas' THEN
            SELECT title INTO record_title FROM synthetic_personas
            WHERE id = p_id AND org_id = p_org_id;

        WHEN 'agent_outputs' THEN
            SELECT title INTO record_title FROM agent_outputs
            WHERE id = p_id AND org_id = p_org_id;

        WHEN 'strategy_intelligence' THEN
            record_title := 'Strategy Analysis';

        ELSE
            RAISE EXCEPTION 'Unsupported table source: % (normalized: %)', p_table_source, v_normalized_table;
    END CASE;

    IF record_title IS NULL THEN
        RAISE EXCEPTION 'Item not found or access denied';
    END IF;

    -- Perform deletion from correct table
    CASE v_normalized_table
        WHEN 'synthetic_personas' THEN
            DELETE FROM synthetic_personas WHERE id = p_id AND org_id = p_org_id;

        WHEN 'agent_outputs' THEN
            DELETE FROM agent_outputs WHERE id = p_id AND org_id = p_org_id;

        WHEN 'strategy_intelligence' THEN
            DELETE FROM strategy_intelligence WHERE id = p_id AND org_id = p_org_id;
    END CASE;

    result := jsonb_build_object(
        'id', p_id,
        'title', record_title,
        'table_source', p_table_source
    );

    -- Notify for real-time updates
    PERFORM pg_notify('unified_outputs_changed',
        jsonb_build_object('org_id', p_org_id, 'action', 'deleted')::text);

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") IS 'Delete outputs from any supported table with schema-prefix normalization';



CREATE OR REPLACE FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "title" "text", "restored_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_output_exists BOOLEAN;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Check if output exists and is archived
    SELECT EXISTS(
        SELECT 1 FROM agent_outputs
        WHERE agent_outputs.id = p_output_id
          AND agent_outputs.org_id = p_org_id
          AND agent_outputs.archived_at IS NOT NULL
    ) INTO v_output_exists;

    IF NOT v_output_exists THEN
        RAISE EXCEPTION 'Output not found or not archived';
    END IF;

    -- Restore the output (is_archived auto-updates)
    UPDATE agent_outputs SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agent_outputs.id = p_output_id
      AND agent_outputs.org_id = p_org_id;

    -- Return restored output info
    RETURN QUERY
    SELECT
        ao.id,
        ao.title,
        ao.updated_at AS restored_at
    FROM agent_outputs ao
    WHERE ao.id = p_output_id;
END;
$$;


ALTER FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") IS 'Restore archived outputs (is_archived auto-updates from archived_at = NULL)';



CREATE OR REPLACE FUNCTION "public"."unified_restore_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    result JSONB;
    v_user_org_id UUID;
    v_user_id UUID;
    v_schema TEXT;
    v_table TEXT;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;
    SELECT user_id INTO v_user_id FROM get_current_user();

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Parse schema and table from table_source
    IF p_table_source LIKE '%.%' THEN
        v_schema := split_part(p_table_source, '.', 1);
        v_table := split_part(p_table_source, '.', 2);
    ELSE
        v_schema := 'public';
        v_table := p_table_source;
    END IF;

    -- Route to correct schema/table for restore operations
    IF v_schema = 'agency' AND v_table = 'agent_outputs' THEN
        UPDATE agency.agent_outputs
        SET archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NOT NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'restored_at', NOW(),
            'table_source', 'agency.agent_outputs'
        ) INTO result;

    ELSIF v_table = 'agent_outputs' THEN
        UPDATE public.agent_outputs
        SET archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NOT NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'restored_at', NOW(),
            'table_source', 'public.agent_outputs'
        ) INTO result;

    ELSIF v_table = 'synthetic_personas' THEN
        UPDATE public.synthetic_personas
        SET archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NOT NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'restored_at', NOW(),
            'table_source', 'synthetic_personas'
        ) INTO result;

    ELSIF v_table = 'strategy_intelligence' THEN
        UPDATE public.strategy_intelligence
        SET archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NOT NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'restored_at', NOW(),
            'table_source', 'strategy_intelligence'
        ) INTO result;

    ELSIF v_table = 'marketing_strategies' THEN
        UPDATE public.marketing_strategies
        SET archived_at = NULL,
            archived_by = NULL,
            archive_reason = NULL
        WHERE id = p_id AND org_id = p_org_id AND archived_at IS NOT NULL
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'restored_at', NOW(),
            'table_source', 'marketing_strategies'
        ) INTO result;

    ELSE
        RAISE EXCEPTION 'Unsupported table source: %', p_table_source;
    END IF;

    IF result IS NULL THEN
        RAISE EXCEPTION 'Item not found, not archived, or access denied';
    END IF;

    -- Notify for real-time updates
    PERFORM pg_notify('unified_outputs_changed',
        jsonb_build_object('org_id', p_org_id, 'action', 'restored')::text);

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."unified_restore_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    result JSONB;
    v_user_org_id UUID;
    v_user_id UUID;
    v_schema TEXT;
    v_table TEXT;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;
    SELECT user_id INTO v_user_id FROM get_current_user();

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Parse schema and table from table_source
    -- 'public.agent_outputs' -> schema='public', table='agent_outputs'
    -- 'agency.agent_outputs' -> schema='agency', table='agent_outputs'
    -- 'agent_outputs' -> schema='public', table='agent_outputs' (default)
    IF p_table_source LIKE '%.%' THEN
        v_schema := split_part(p_table_source, '.', 1);
        v_table := split_part(p_table_source, '.', 2);
    ELSE
        v_schema := 'public';
        v_table := p_table_source;
    END IF;

    -- Route to correct schema/table for update operations
    IF v_schema = 'agency' AND v_table = 'agent_outputs' THEN
        -- Update agency.agent_outputs
        UPDATE agency.agent_outputs
        SET title = COALESCE((p_data->>'title')::TEXT, title),
            content = COALESCE(p_data->'content', content),
            metadata = COALESCE(p_data->'metadata', metadata),
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = p_id AND org_id = p_org_id
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'table_source', 'agency.agent_outputs',
            'updated_at', updated_at
        ) INTO result;

    ELSIF v_table = 'agent_outputs' THEN
        -- Update public.agent_outputs
        UPDATE public.agent_outputs
        SET title = COALESCE((p_data->>'title')::TEXT, title),
            content = COALESCE(p_data->'content', content),
            metadata = COALESCE(p_data->'metadata', metadata),
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = p_id AND org_id = p_org_id
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'table_source', 'public.agent_outputs',
            'updated_at', updated_at
        ) INTO result;

    ELSIF v_table = 'synthetic_personas' THEN
        UPDATE public.synthetic_personas
        SET title = COALESCE((p_data->>'title')::TEXT, title),
            content = COALESCE(p_data->'content', content),
            metadata = COALESCE(p_data->'metadata', metadata),
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = p_id AND org_id = p_org_id
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'table_source', 'synthetic_personas',
            'updated_at', updated_at
        ) INTO result;

    ELSIF v_table = 'strategy_intelligence' THEN
        UPDATE public.strategy_intelligence
        SET title = COALESCE((p_data->>'title')::TEXT, 'Strategy Analysis'),
            content = COALESCE(p_data->'content', content),
            metadata = COALESCE(p_data->'metadata', metadata),
            updated_at = NOW()
        WHERE id = p_id AND org_id = p_org_id
        RETURNING jsonb_build_object(
            'id', id,
            'title', 'Strategy Analysis',
            'table_source', 'strategy_intelligence',
            'updated_at', updated_at
        ) INTO result;

    ELSIF v_table = 'marketing_strategies' THEN
        UPDATE public.marketing_strategies
        SET title = COALESCE((p_data->>'title')::TEXT, title),
            content = COALESCE(p_data->'content', content),
            metadata = COALESCE(p_data->'metadata', metadata),
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = p_id AND org_id = p_org_id
        RETURNING jsonb_build_object(
            'id', id,
            'title', title,
            'table_source', 'marketing_strategies',
            'updated_at', updated_at
        ) INTO result;

    ELSE
        RAISE EXCEPTION 'Unsupported table source: %', p_table_source;
    END IF;

    IF result IS NULL THEN
        RAISE EXCEPTION 'Item not found or access denied';
    END IF;

    -- Notify for real-time updates
    PERFORM pg_notify('unified_outputs_changed',
        jsonb_build_object('org_id', p_org_id, 'action', 'updated')::text);

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") IS 'Update outputs in any supported table with schema-prefix normalization.
Version: 1.1 (Dec 2025)
- Fixed: Normalize table_source by stripping public./agency. prefix
- Handles both "agent_outputs" and "public.agent_outputs" formats';



CREATE OR REPLACE FUNCTION "public"."update_ai_insights_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_insights_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_user_id UUID;
  v_intelligence_exists BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE organizations.id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    -- Update agency.clients table with client metadata
    UPDATE agency.clients
    SET
      name = COALESCE(p_data->>'company_name', name),
      industry = COALESCE(p_data->>'industry', industry),
      website = COALESCE(p_data->>'website', website),
      contact_email = COALESCE(p_data->>'contact_email', contact_email),
      contact_phone = COALESCE(p_data->>'contact_phone', contact_phone),
      updated_at = NOW(),
      updated_by = v_user_id
    WHERE id = p_client_id AND org_id = p_org_id;

    -- Check if intelligence record exists
    SELECT EXISTS(
      SELECT 1 FROM agency.client_intelligence
      WHERE client_id = p_client_id AND org_id = p_org_id
    ) INTO v_intelligence_exists;

    IF v_intelligence_exists THEN
      -- Update existing intelligence record
      UPDATE agency.client_intelligence
      SET
        company_size = COALESCE((p_data->>'company_size')::company_size_enum, company_size),
        company_stage = COALESCE((p_data->>'company_stage')::company_stage_enum, company_stage),
        business_model = COALESCE((p_data->>'business_model')::business_model_enum, business_model),
        geography = CASE
          WHEN p_data ? 'geography' AND jsonb_typeof(p_data->'geography') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'geography'))
          ELSE geography
        END,
        funding_status = COALESCE((p_data->>'funding_status')::funding_status_enum, funding_status),
        target_market = CASE
          WHEN p_data ? 'target_market' AND jsonb_typeof(p_data->'target_market') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'target_market'))
          ELSE target_market
        END,
        main_products = CASE
          WHEN p_data ? 'main_products' AND jsonb_typeof(p_data->'main_products') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'main_products'))
          ELSE main_products
        END,
        key_competitors = CASE
          WHEN p_data ? 'key_competitors' AND jsonb_typeof(p_data->'key_competitors') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'key_competitors'))
          ELSE key_competitors
        END,
        tech_stack = CASE
          WHEN p_data ? 'tech_stack' AND jsonb_typeof(p_data->'tech_stack') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'tech_stack'))
          ELSE tech_stack
        END,
        annual_revenue = COALESCE(p_data->>'annual_revenue', annual_revenue),
        unique_value_proposition = COALESCE(p_data->>'unique_value_proposition', unique_value_proposition),
        marketing_budget = COALESCE(p_data->>'marketing_budget', marketing_budget),
        current_marketing_channels = CASE
          WHEN p_data ? 'current_marketing_channels' AND jsonb_typeof(p_data->'current_marketing_channels') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'current_marketing_channels'))
          ELSE current_marketing_channels
        END,
        marketing_goals = CASE
          WHEN p_data ? 'marketing_goals' AND jsonb_typeof(p_data->'marketing_goals') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'marketing_goals'))
          ELSE marketing_goals
        END,
        ai_insights = COALESCE(p_data->'ai_insights', ai_insights),
        persona_patterns = COALESCE(p_data->'persona_patterns', persona_patterns),
        content_themes = COALESCE(p_data->'content_themes', content_themes),
        campaign_preferences = COALESCE(p_data->'campaign_preferences', campaign_preferences),
        business_metrics = COALESCE(p_data->'business_metrics', business_metrics),
        learning_metadata = COALESCE(p_data->'learning_metadata', learning_metadata),
        last_manual_update = CASE WHEN p_data ? 'manual_update' AND (p_data->>'manual_update')::boolean THEN NOW() ELSE last_manual_update END,
        updated_at = NOW(),
        updated_by = v_user_id
      WHERE client_id = p_client_id AND org_id = p_org_id;
    ELSE
      -- Create new intelligence record
      INSERT INTO agency.client_intelligence (
        org_id,
        client_id,
        company_size,
        company_stage,
        business_model,
        geography,
        funding_status,
        target_market,
        main_products,
        key_competitors,
        tech_stack,
        annual_revenue,
        unique_value_proposition,
        marketing_budget,
        current_marketing_channels,
        marketing_goals,
        ai_insights,
        persona_patterns,
        content_themes,
        campaign_preferences,
        business_metrics,
        learning_metadata,
        last_manual_update,
        created_by,
        updated_by
      ) VALUES (
        p_org_id,
        p_client_id,
        (p_data->>'company_size')::company_size_enum,
        (p_data->>'company_stage')::company_stage_enum,
        (p_data->>'business_model')::business_model_enum,
        CASE WHEN p_data ? 'geography' AND jsonb_typeof(p_data->'geography') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'geography')) ELSE NULL END,
        (p_data->>'funding_status')::funding_status_enum,
        CASE WHEN p_data ? 'target_market' AND jsonb_typeof(p_data->'target_market') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'target_market')) ELSE NULL END,
        CASE WHEN p_data ? 'main_products' AND jsonb_typeof(p_data->'main_products') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'main_products')) ELSE NULL END,
        CASE WHEN p_data ? 'key_competitors' AND jsonb_typeof(p_data->'key_competitors') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'key_competitors')) ELSE NULL END,
        CASE WHEN p_data ? 'tech_stack' AND jsonb_typeof(p_data->'tech_stack') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'tech_stack')) ELSE NULL END,
        p_data->>'annual_revenue',
        p_data->>'unique_value_proposition',
        p_data->>'marketing_budget',
        CASE WHEN p_data ? 'current_marketing_channels' AND jsonb_typeof(p_data->'current_marketing_channels') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'current_marketing_channels')) ELSE NULL END,
        CASE WHEN p_data ? 'marketing_goals' AND jsonb_typeof(p_data->'marketing_goals') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'marketing_goals')) ELSE NULL END,
        COALESCE(p_data->'ai_insights', '{}'::jsonb),
        COALESCE(p_data->'persona_patterns', '{}'::jsonb),
        COALESCE(p_data->'content_themes', '{}'::jsonb),
        COALESCE(p_data->'campaign_preferences', '{}'::jsonb),
        COALESCE(p_data->'business_metrics', '{"product": {}, "financial": {}, "marketing": {}, "operational": {}}'::jsonb),
        COALESCE(p_data->'learning_metadata', '{}'::jsonb),
        CASE WHEN p_data ? 'manual_update' AND (p_data->>'manual_update')::boolean THEN NOW() ELSE NULL END,
        v_user_id,
        v_user_id
      );
    END IF;

    -- Return combined data from view
    SELECT row_to_json(ci.*)::jsonb INTO v_result
    FROM public.client_intelligence ci
    WHERE ci.client_id = p_client_id AND ci.org_id = p_org_id;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Update public.core_business_data
    -- FIX (Migration 260): Added website field
    UPDATE public.core_business_data
    SET
      company_name = COALESCE(p_data->>'company_name', company_name),
      website = COALESCE(p_data->>'website', website),  -- FIXED: Added this line
      industry = COALESCE((p_data->>'industry')::industry_enum, industry),
      company_size = COALESCE((p_data->>'company_size')::company_size_enum, company_size),
      company_stage = COALESCE((p_data->>'company_stage')::company_stage_enum, company_stage),
      business_model = COALESCE((p_data->>'business_model')::business_model_enum, business_model),
      geography = CASE
        WHEN p_data ? 'geography' AND jsonb_typeof(p_data->'geography') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'geography'))
        ELSE geography
      END,
      funding_status = COALESCE((p_data->>'funding_status')::funding_status_enum, funding_status),
      target_market = CASE
        WHEN p_data ? 'target_market' AND jsonb_typeof(p_data->'target_market') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'target_market'))
        ELSE target_market
      END,
      main_products = CASE
        WHEN p_data ? 'main_products' AND jsonb_typeof(p_data->'main_products') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'main_products'))
        ELSE main_products
      END,
      key_competitors = CASE
        WHEN p_data ? 'key_competitors' AND jsonb_typeof(p_data->'key_competitors') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'key_competitors'))
        ELSE key_competitors
      END,
      tech_stack = CASE
        WHEN p_data ? 'tech_stack' AND jsonb_typeof(p_data->'tech_stack') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'tech_stack'))
        ELSE tech_stack
      END,
      annual_revenue = COALESCE(p_data->>'annual_revenue', annual_revenue),
      marketing_budget = COALESCE(p_data->>'marketing_budget', marketing_budget),
      business_metrics = COALESCE(p_data->'business_metrics', business_metrics),
      learning_metadata = COALESCE(p_data->'learning_metadata', learning_metadata),
      last_manual_update = CASE WHEN p_data ? 'manual_update' AND (p_data->>'manual_update')::boolean THEN NOW() ELSE last_manual_update END,
      updated_at = NOW()
    WHERE org_id = p_org_id AND client_id IS NULL;

    -- Return updated data
    SELECT row_to_json(cbd.*)::jsonb INTO v_result
    FROM public.core_business_data cbd
    WHERE cbd.org_id = p_org_id AND cbd.client_id IS NULL;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") IS 'Router function for updating business/client data with full field support.
Migration 220: Added industry enum casting.
Migration 245: Fixed Agency industry - removed cast since agency.clients.industry is TEXT.
Migration 246: Fixed JSONB array casting using ARRAY(SELECT jsonb_array_elements_text()) for all array fields.
Long-term solution: Works for both SME and Agency with proper type handling.';



CREATE OR REPLACE FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision DEFAULT 0.8) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update the specific field based on field name
    -- Only update if record exists, otherwise skip
    CASE p_field
        WHEN 'key_competitors' THEN
            UPDATE core_business_data SET
                key_competitors = COALESCE(key_competitors, ARRAY[]::text[]) || p_value,
                learning_metadata = COALESCE(learning_metadata, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('learned_by', p_source_agent, 'learned_at', NOW(), 'confidence', p_confidence)),
                updated_at = NOW()
            WHERE org_id = p_org_id;

        WHEN 'main_products' THEN
            UPDATE core_business_data SET
                main_products = COALESCE(main_products, ARRAY[]::text[]) || p_value,
                learning_metadata = COALESCE(learning_metadata, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('learned_by', p_source_agent, 'learned_at', NOW(), 'confidence', p_confidence)),
                updated_at = NOW()
            WHERE org_id = p_org_id;

        WHEN 'target_market' THEN
            UPDATE core_business_data SET
                target_market = COALESCE(target_market, ARRAY[]::text[]) || p_value,
                learning_metadata = COALESCE(learning_metadata, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('learned_by', p_source_agent, 'learned_at', NOW(), 'confidence', p_confidence)),
                updated_at = NOW()
            WHERE org_id = p_org_id;

        WHEN 'tech_stack' THEN
            UPDATE core_business_data SET
                tech_stack = COALESCE(tech_stack, ARRAY[]::text[]) || p_value,
                learning_metadata = COALESCE(learning_metadata, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('learned_by', p_source_agent, 'learned_at', NOW(), 'confidence', p_confidence)),
                updated_at = NOW()
            WHERE org_id = p_org_id;

        WHEN 'geography' THEN
            UPDATE core_business_data SET
                geography = COALESCE(geography, ARRAY[]::text[]) || p_value,
                learning_metadata = COALESCE(learning_metadata, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('learned_by', p_source_agent, 'learned_at', NOW(), 'confidence', p_confidence)),
                updated_at = NOW()
            WHERE org_id = p_org_id;

        ELSE
            RAISE EXCEPTION 'Unknown field: %. Supported fields: key_competitors, main_products, target_market, tech_stack, geography', p_field;
    END CASE;

    -- Return updated info
    SELECT jsonb_build_object(
        'field', p_field,
        'org_id', p_org_id,
        'value_added', p_value,
        'source_agent', p_source_agent,
        'confidence', p_confidence,
        'updated_at', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision) IS 'Merges new business learnings from any agent into core_business_data. Supports progressive learning across all agent conversations.';


CREATE OR REPLACE FUNCTION "public"."update_extraction_metrics"("p_org_id" "uuid", "p_agent_type" "text", "p_success" boolean, "p_confidence" numeric, "p_is_empty" boolean, "p_cost" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO insight_extraction_metrics (
        org_id,
        agent_type,
        extraction_date,
        total_extractions,
        successful_parses,
        empty_responses,
        avg_confidence,
        total_cost
    ) VALUES (
        p_org_id,
        p_agent_type,
        CURRENT_DATE,
        1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_is_empty THEN 1 ELSE 0 END,
        p_confidence,
        p_cost
    )
    ON CONFLICT (org_id, agent_type, extraction_date)
    DO UPDATE SET
        total_extractions = insight_extraction_metrics.total_extractions + 1,
        successful_parses = insight_extraction_metrics.successful_parses + CASE WHEN p_success THEN 1 ELSE 0 END,
        empty_responses = insight_extraction_metrics.empty_responses + CASE WHEN p_is_empty THEN 1 ELSE 0 END,
        avg_confidence = (
            (insight_extraction_metrics.avg_confidence * insight_extraction_metrics.total_extractions + p_confidence) /
            (insight_extraction_metrics.total_extractions + 1)
        ),
        total_cost = insight_extraction_metrics.total_cost + p_cost,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_extraction_metrics"("p_org_id" "uuid", "p_agent_type" "text", "p_success" boolean, "p_confidence" numeric, "p_is_empty" boolean, "p_cost" numeric) OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb", "p_source_agent" "text" DEFAULT 'unknown'::"text", "p_confidence" double precision DEFAULT 0.8, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_existing_row RECORD;
    v_updated_metrics INTEGER := 0;
    v_skipped_metrics INTEGER := 0;
    v_category TEXT;
    v_metric_name TEXT;
    v_metric_data JSONB;
    v_existing_metric JSONB;
    v_existing_metric_name TEXT;
    v_existing_metric_confidence FLOAT;
    v_business_metrics JSONB;
    v_incoming_aliases TEXT[];
    v_existing_aliases TEXT[];
    v_found_match BOOLEAN;
BEGIN
    -- Validate client_id is provided
    IF p_client_id IS NULL THEN
        RAISE EXCEPTION 'client_id is required for agency routing';
    END IF;

    -- Get or create row in agency.client_intelligence
    SELECT * INTO v_existing_row
    FROM agency.client_intelligence
    WHERE org_id = p_org_id AND client_id = p_client_id;

    IF NOT FOUND THEN
        -- Create new row with default business_metrics structure
        INSERT INTO agency.client_intelligence (
            org_id,
            client_id,
            business_metrics,
            created_at,
            updated_at
        ) VALUES (
            p_org_id,
            p_client_id,
            '{"financial": {}, "marketing": {}, "product": {}, "operational": {}}'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_existing_row;
    END IF;

    -- Get existing business_metrics from TOP-LEVEL column
    v_business_metrics := COALESCE(
        v_existing_row.business_metrics,
        '{"financial": {}, "marketing": {}, "product": {}, "operational": {}}'::jsonb
    );

    -- ========================================================================
    -- Update Business Metrics with ALIAS-AWARE Confidence-Based Merging
    -- ========================================================================
    FOR v_category IN SELECT * FROM jsonb_object_keys(p_metrics)
    LOOP
        -- Ensure category exists in business_metrics
        IF NOT (v_business_metrics ? v_category) THEN
            v_business_metrics := jsonb_set(
                v_business_metrics,
                ARRAY[v_category],
                '{}'::jsonb
            );
        END IF;

        -- Process each incoming metric in the category
        FOR v_metric_name, v_metric_data IN
            SELECT * FROM jsonb_each(p_metrics->v_category)
        LOOP
            -- Get incoming metric aliases (includes the metric name itself)
            v_incoming_aliases := COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(v_metric_data->'aliases')),
                ARRAY[]::TEXT[]
            );
            -- Add the incoming metric name to aliases for matching
            v_incoming_aliases := v_incoming_aliases || v_metric_name;

            -- ============================================================
            -- ALIAS-AWARE DEDUPLICATION: Find existing metric by name OR aliases
            -- ============================================================
            v_found_match := FALSE;
            v_existing_metric_name := NULL;

            -- Iterate through existing metrics in this category to find alias matches
            FOR v_existing_metric_name IN
                SELECT * FROM jsonb_object_keys(v_business_metrics->v_category)
            LOOP
                -- Get existing metric's aliases
                v_existing_aliases := COALESCE(
                    ARRAY(SELECT jsonb_array_elements_text(
                        (v_business_metrics->v_category->v_existing_metric_name)->'aliases'
                    )),
                    ARRAY[]::TEXT[]
                );
                -- Add existing metric name to its aliases for matching
                v_existing_aliases := v_existing_aliases || v_existing_metric_name;

                -- Check if there's any overlap between incoming and existing aliases
                -- This catches cases like:
                --   incoming: "monthly_campaign_budget" with aliases ["campaign_budget", "monthly_budget"]
                --   existing: "marketing_budget_monthly" with aliases ["marketing_budget", "monthly_budget"]
                --   Match found via shared alias "monthly_budget"
                IF v_incoming_aliases && v_existing_aliases THEN
                    v_found_match := TRUE;
                    EXIT; -- Found a match, use this existing metric
                END IF;
            END LOOP;

            -- ============================================================
            -- Merge or Skip based on confidence
            -- ============================================================
            IF v_found_match THEN
                -- Found existing metric via alias match
                v_existing_metric := v_business_metrics->v_category->v_existing_metric_name;
                v_existing_metric_confidence := COALESCE(
                    (v_existing_metric->>'confidence')::float,
                    0.0
                );

                -- Update if new confidence is higher or equal
                IF p_confidence >= v_existing_metric_confidence THEN
                    -- Merge incoming metric data with learning metadata
                    v_metric_data := v_metric_data || jsonb_build_object(
                        'learned_by', p_source_agent,
                        'learned_at', NOW(),
                        'confidence', p_confidence,
                        'user_id', p_user_id,
                        'version', COALESCE((v_existing_metric->>'version')::int, 0) + 1,
                        -- Merge aliases: combine incoming + existing, remove duplicates
                        'aliases', (
                            SELECT jsonb_agg(DISTINCT alias)
                            FROM (
                                SELECT jsonb_array_elements_text(v_metric_data->'aliases') AS alias
                                UNION
                                SELECT jsonb_array_elements_text(v_existing_metric->'aliases') AS alias
                                UNION
                                SELECT v_metric_name AS alias -- Include incoming name
                                UNION
                                SELECT v_existing_metric_name AS alias -- Include existing name
                            ) combined_aliases
                            WHERE alias IS NOT NULL
                        )
                    );

                    -- Update the EXISTING metric key (not create new one)
                    v_business_metrics := jsonb_set(
                        v_business_metrics,
                        ARRAY[v_category, v_existing_metric_name],
                        v_metric_data
                    );

                    v_updated_metrics := v_updated_metrics + 1;
                ELSE
                    -- Lower confidence, skip update
                    v_skipped_metrics := v_skipped_metrics + 1;
                END IF;
            ELSE
                -- No alias match found - this is a genuinely new metric
                -- Merge metric with learning metadata
                v_metric_data := v_metric_data || jsonb_build_object(
                    'learned_by', p_source_agent,
                    'learned_at', NOW(),
                    'confidence', p_confidence,
                    'user_id', p_user_id,
                    'version', 1
                );

                -- Insert as new metric
                v_business_metrics := jsonb_set(
                    v_business_metrics,
                    ARRAY[v_category, v_metric_name],
                    v_metric_data
                );

                v_updated_metrics := v_updated_metrics + 1;
            END IF;
        END LOOP;
    END LOOP;

    -- ========================================================================
    -- Save Business Metrics to TOP-LEVEL business_metrics column
    -- ========================================================================
    UPDATE agency.client_intelligence
    SET business_metrics = v_business_metrics,
        updated_at = NOW()
    WHERE org_id = p_org_id AND client_id = p_client_id;

    -- Return result summary
    RETURN jsonb_build_object(
        'updated_metrics', v_updated_metrics,
        'skipped_metrics', v_skipped_metrics,
        'org_id', p_org_id,
        'client_id', p_client_id
    );
END;
$$;


ALTER FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") IS 'Upsert business metrics data for AGENCY organizations with ALIAS-AWARE deduplication.
Routes to agency.client_intelligence.business_metrics (top-level column).
Prevents duplicate metrics by checking if incoming metric name/aliases match existing metric names/aliases.
Example: "monthly_campaign_budget" with alias "monthly_budget" will merge with existing "marketing_budget_monthly"
that also has alias "monthly_budget" instead of creating a duplicate.
Uses confidence-based merging to preserve highest quality data.
Added in Migration 264 for robust metric deduplication.';



CREATE OR REPLACE FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb", "p_source_agent" "text" DEFAULT 'unknown'::"text", "p_confidence" double precision DEFAULT 0.8, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_existing_row RECORD;
    v_updated_fields INTEGER := 0;
    v_skipped_fields INTEGER := 0;
    v_updated_metrics INTEGER := 0;
    v_skipped_metrics INTEGER := 0;
    v_field_key TEXT;
    v_field_value TEXT;
    v_existing_confidence FLOAT;
    v_category TEXT;
    v_metric_name TEXT;
    v_metric_data JSONB;
    v_existing_metric JSONB;
    v_existing_metric_confidence FLOAT;
    v_learning_metadata JSONB;
    v_learning_metadata_input JSONB;  -- NEW: Extracted from p_data
    v_column_type TEXT;
    v_udt_name TEXT;
BEGIN
    -- Get or create row
    SELECT * INTO v_existing_row
    FROM core_business_data
    WHERE org_id = p_org_id;

    IF NOT FOUND THEN
        -- Create new row with default structure
        INSERT INTO core_business_data (
            org_id,
            company_name,
            learning_metadata,
            business_metrics,
            created_at,
            updated_at
        ) VALUES (
            p_org_id,
            COALESCE(p_data->>'company_name', 'Unknown'),
            '{}'::jsonb,
            '{"financial": {}, "marketing": {}, "product": {}, "operational": {}}'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_existing_row;
    END IF;

    -- Initialize learning_metadata from existing row
    v_learning_metadata := COALESCE(v_existing_row.learning_metadata, '{}'::jsonb);

    -- ========================================================================
    -- NEW: Extract _learning_metadata from p_data (Two-Tier Storage)
    -- ========================================================================
    v_learning_metadata_input := p_data->'_learning_metadata';

    -- Merge extracted learning_metadata with existing (if provided)
    IF v_learning_metadata_input IS NOT NULL AND jsonb_typeof(v_learning_metadata_input) = 'object' THEN
        v_learning_metadata := v_learning_metadata || v_learning_metadata_input;
        RAISE NOTICE 'Merged _learning_metadata with % keys into learning_metadata',
            (SELECT count(*) FROM jsonb_object_keys(v_learning_metadata_input));
    END IF;

    -- ========================================================================
    -- PART 1: Update Static Profile Fields with Error Handling
    -- ========================================================================
    FOR v_field_key, v_field_value IN
        SELECT * FROM jsonb_each_text(p_data)
    LOOP
        -- SKIP _learning_metadata key (not a database column)
        IF v_field_key = '_learning_metadata' THEN
            CONTINUE;
        END IF;

        -- Get existing confidence for this field
        v_existing_confidence := COALESCE(
            (v_learning_metadata->v_field_key->>'confidence')::float,
            0.0
        );

        -- Update if new confidence is higher OR field is currently NULL
        IF p_confidence >= v_existing_confidence OR
           v_existing_row.company_name IS NULL AND v_field_key = 'company_name' OR
           v_existing_row.industry IS NULL AND v_field_key = 'industry' OR
           v_existing_row.company_size IS NULL AND v_field_key = 'company_size' OR
           v_existing_row.annual_revenue IS NULL AND v_field_key = 'annual_revenue' OR
           v_existing_row.marketing_budget IS NULL AND v_field_key = 'marketing_budget' OR
           v_existing_row.business_model IS NULL AND v_field_key = 'business_model' THEN

            -- Get column type to handle ENUM and array casting
            SELECT data_type, udt_name INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'core_business_data'
              AND column_name = v_field_key;

            -- Update the field with ERROR HANDLING for enum casts
            IF v_udt_name IN ('industry_enum', 'company_size_enum', 'business_model_enum',
                              'company_stage_enum', 'funding_status_enum') THEN
                -- ENUM field: explicit cast with error handling
                BEGIN
                    EXECUTE format(
                        'UPDATE core_business_data SET %I = $1::%s, updated_at = NOW() WHERE org_id = $2',
                        v_field_key, v_udt_name
                    ) USING v_field_value, p_org_id;

                    -- Update learning metadata only on success (provenance tracking)
                    v_learning_metadata := jsonb_set(
                        v_learning_metadata,
                        ARRAY[v_field_key],
                        jsonb_build_object(
                            'learned_by', p_source_agent,
                            'learned_at', NOW(),
                            'confidence', p_confidence,
                            'user_id', p_user_id
                        )
                    );
                    v_updated_fields := v_updated_fields + 1;

                EXCEPTION
                    WHEN invalid_text_representation THEN
                        -- Invalid enum value - skip this field and continue
                        RAISE WARNING 'Skipping field % - invalid enum value: %', v_field_key, v_field_value;
                        v_skipped_fields := v_skipped_fields + 1;
                    WHEN OTHERS THEN
                        -- Unexpected error - log and skip
                        RAISE WARNING 'Unexpected error updating field %: %', v_field_key, SQLERRM;
                        v_skipped_fields := v_skipped_fields + 1;
                END;

            ELSIF v_column_type = 'ARRAY' THEN
                -- Array field (text[], jsonb[]): cast text to array
                IF v_field_value IS NOT NULL AND v_field_value != '' THEN
                    EXECUTE format(
                        'UPDATE core_business_data SET %I = string_to_array($1, '','')::text[], updated_at = NOW() WHERE org_id = $2',
                        v_field_key
                    ) USING v_field_value, p_org_id;
                END IF;

                -- Update metadata
                v_learning_metadata := jsonb_set(
                    v_learning_metadata,
                    ARRAY[v_field_key],
                    jsonb_build_object(
                        'learned_by', p_source_agent,
                        'learned_at', NOW(),
                        'confidence', p_confidence,
                        'user_id', p_user_id
                    )
                );
                v_updated_fields := v_updated_fields + 1;

            ELSE
                -- Regular text/varchar field: no cast needed
                EXECUTE format(
                    'UPDATE core_business_data SET %I = $1, updated_at = NOW() WHERE org_id = $2',
                    v_field_key
                ) USING v_field_value, p_org_id;

                -- Update metadata
                v_learning_metadata := jsonb_set(
                    v_learning_metadata,
                    ARRAY[v_field_key],
                    jsonb_build_object(
                        'learned_by', p_source_agent,
                        'learned_at', NOW(),
                        'confidence', p_confidence,
                        'user_id', p_user_id
                    )
                );
                v_updated_fields := v_updated_fields + 1;
            END IF;

        ELSE
            v_skipped_fields := v_skipped_fields + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- PART 2: Update Business Metrics (Unchanged from Migration 135)
    -- ========================================================================
    FOR v_category IN SELECT * FROM jsonb_object_keys(p_metrics)
    LOOP
        FOR v_metric_name, v_metric_data IN
            SELECT * FROM jsonb_each(p_metrics->v_category)
        LOOP
            v_existing_metric := v_existing_row.business_metrics->v_category->v_metric_name;
            v_existing_metric_confidence := COALESCE(
                (v_existing_metric->>'confidence')::float,
                0.0
            );

            IF p_confidence >= v_existing_metric_confidence THEN
                -- Merge metric with learning metadata
                v_metric_data := v_metric_data || jsonb_build_object(
                    'learned_by', p_source_agent,
                    'learned_at', NOW(),
                    'confidence', p_confidence,
                    'version', COALESCE((v_existing_metric->>'version')::int, 0) + 1
                );

                -- Update metric in business_metrics JSONB
                UPDATE core_business_data
                SET business_metrics = jsonb_set(
                    business_metrics,
                    ARRAY[v_category, v_metric_name],
                    v_metric_data
                ),
                updated_at = NOW()
                WHERE org_id = p_org_id;

                v_updated_metrics := v_updated_metrics + 1;
            ELSE
                v_skipped_metrics := v_skipped_metrics + 1;
            END IF;
        END LOOP;
    END LOOP;

    -- ========================================================================
    -- PART 3: Save Learning Metadata (Now includes extracted _learning_metadata)
    -- ========================================================================
    UPDATE core_business_data
    SET learning_metadata = v_learning_metadata,
        updated_at = NOW()
    WHERE org_id = p_org_id;

    -- Return result summary
    RETURN jsonb_build_object(
        'updated_fields', v_updated_fields,
        'skipped_fields', v_skipped_fields,
        'updated_metrics', v_updated_metrics,
        'skipped_metrics', v_skipped_metrics,
        'org_id', p_org_id
    );
END;
$_$;


ALTER FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") IS 'Upsert business profile data with confidence-based field merging and error handling.
Migration 231: Added BEGIN...EXCEPTION blocks around enum casts to skip invalid values.
Migration 244: Added _learning_metadata extraction for two-tier storage (enum ranges + specific values).';



CREATE OR REPLACE FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb", "p_source_agent" "text" DEFAULT 'unknown'::"text", "p_confidence" double precision DEFAULT 0.8, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $_$
DECLARE
    v_existing_row RECORD;
    v_updated_fields INTEGER := 0;
    v_skipped_fields INTEGER := 0;
    v_field_key TEXT;
    v_field_value TEXT;
    v_existing_confidence FLOAT;
    v_ai_insights JSONB;
    v_learning_metadata JSONB;
    v_learning_metadata_input JSONB;  -- NEW: Extracted from p_data
    v_column_type TEXT;
    v_udt_name TEXT;
BEGIN
    -- Validate client_id is provided
    IF p_client_id IS NULL THEN
        RAISE EXCEPTION 'client_id is required for agency routing';
    END IF;

    -- Get or create row in agency.client_intelligence
    SELECT * INTO v_existing_row
    FROM agency.client_intelligence
    WHERE org_id = p_org_id AND client_id = p_client_id;

    IF NOT FOUND THEN
        -- Create new row with default structure
        INSERT INTO agency.client_intelligence (
            org_id,
            client_id,
            ai_insights,
            created_at,
            updated_at
        ) VALUES (
            p_org_id,
            p_client_id,
            '{}'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_existing_row;
    END IF;

    -- Initialize ai_insights and learning_metadata
    v_ai_insights := COALESCE(v_existing_row.ai_insights, '{}'::jsonb);
    v_learning_metadata := COALESCE(v_ai_insights->'learning_metadata', '{}'::jsonb);

    -- ========================================================================
    -- NEW: Extract _learning_metadata from p_data (Two-Tier Storage)
    -- ========================================================================
    v_learning_metadata_input := p_data->'_learning_metadata';

    -- Merge extracted learning_metadata with existing (if provided)
    IF v_learning_metadata_input IS NOT NULL AND jsonb_typeof(v_learning_metadata_input) = 'object' THEN
        v_learning_metadata := v_learning_metadata || v_learning_metadata_input;
        RAISE NOTICE 'Merged _learning_metadata with % keys into learning_metadata',
            (SELECT count(*) FROM jsonb_object_keys(v_learning_metadata_input));
    END IF;

    -- ========================================================================
    -- PART 1: Update Static Profile Fields with Error Handling
    -- ========================================================================
    -- Note: agency.client_intelligence has fewer fields than public.core_business_data
    -- Supported fields: company_size, company_stage, business_model, target_market,
    --                   key_competitors, marketing_budget
    -- Unsupported fields are stored in learning_metadata only

    FOR v_field_key, v_field_value IN
        SELECT * FROM jsonb_each_text(p_data)
    LOOP
        -- SKIP _learning_metadata key (not a database column)
        IF v_field_key = '_learning_metadata' THEN
            CONTINUE;
        END IF;

        -- Get existing confidence for this field from learning_metadata
        v_existing_confidence := COALESCE(
            (v_learning_metadata->v_field_key->>'confidence')::float,
            0.0
        );

        -- Update if new confidence is higher
        IF p_confidence >= v_existing_confidence THEN
            -- Check if field exists in agency.client_intelligence table
            SELECT data_type, udt_name INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_schema = 'agency'
              AND table_name = 'client_intelligence'
              AND column_name = v_field_key;

            -- Update the field if it exists in the table
            IF FOUND THEN
                IF v_udt_name IN ('company_size_enum', 'company_stage_enum', 'business_model_enum') THEN
                    -- ENUM field: explicit cast with error handling
                    BEGIN
                        EXECUTE format(
                            'UPDATE agency.client_intelligence SET %I = $1::%s, updated_at = NOW()
                             WHERE org_id = $2 AND client_id = $3',
                            v_field_key, v_udt_name
                        ) USING v_field_value, p_org_id, p_client_id;

                        v_updated_fields := v_updated_fields + 1;

                    EXCEPTION
                        WHEN invalid_text_representation THEN
                            -- Invalid enum value - skip this field and continue
                            RAISE WARNING 'Skipping field % - invalid enum value: %', v_field_key, v_field_value;
                            v_skipped_fields := v_skipped_fields + 1;
                        WHEN OTHERS THEN
                            -- Unexpected error - log and skip
                            RAISE WARNING 'Unexpected error updating field %: %', v_field_key, SQLERRM;
                            v_skipped_fields := v_skipped_fields + 1;
                    END;

                ELSIF v_column_type = 'ARRAY' THEN
                    -- Array field (text[]): cast text to array
                    IF v_field_value IS NOT NULL AND v_field_value != '' THEN
                        EXECUTE format(
                            'UPDATE agency.client_intelligence SET %I = string_to_array($1, '','')::text[], updated_at = NOW()
                             WHERE org_id = $2 AND client_id = $3',
                            v_field_key
                        ) USING v_field_value, p_org_id, p_client_id;
                    END IF;

                    v_updated_fields := v_updated_fields + 1;

                ELSE
                    -- Regular text field: no cast needed
                    EXECUTE format(
                        'UPDATE agency.client_intelligence SET %I = $1, updated_at = NOW()
                         WHERE org_id = $2 AND client_id = $3',
                        v_field_key
                    ) USING v_field_value, p_org_id, p_client_id;

                    v_updated_fields := v_updated_fields + 1;
                END IF;
            ELSE
                -- Field doesn't exist in table - only store in learning_metadata
                RAISE NOTICE 'Field % not in agency.client_intelligence schema - storing in learning_metadata only', v_field_key;
                v_skipped_fields := v_skipped_fields + 1;
            END IF;

            -- Always update learning_metadata (regardless of whether field exists in table)
            -- This tracks provenance for fields that got updated
            v_learning_metadata := jsonb_set(
                v_learning_metadata,
                ARRAY[v_field_key],
                jsonb_build_object(
                    'learned_by', p_source_agent,
                    'learned_at', NOW(),
                    'confidence', p_confidence,
                    'user_id', p_user_id,
                    'value', v_field_value  -- Store value in metadata for fields not in schema
                )
            );

        ELSE
            v_skipped_fields := v_skipped_fields + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- PART 2: Save Learning Metadata to ai_insights (Now includes extracted _learning_metadata)
    -- ========================================================================
    v_ai_insights := jsonb_set(
        v_ai_insights,
        ARRAY['learning_metadata'],
        v_learning_metadata
    );

    UPDATE agency.client_intelligence
    SET ai_insights = v_ai_insights,
        updated_at = NOW()
    WHERE org_id = p_org_id AND client_id = p_client_id;

    -- Return result summary
    RETURN jsonb_build_object(
        'updated_fields', v_updated_fields,
        'skipped_fields', v_skipped_fields,
        'org_id', p_org_id,
        'client_id', p_client_id
    );
END;
$_$;


ALTER FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") IS 'Upsert business profile data for AGENCY organizations into agency.client_intelligence.
Routes to agency.client_intelligence table using client_id.
Stores supported fields (company_size, company_stage, business_model, target_market, key_competitors, marketing_budget) in table columns.
Stores all fields and learning metadata in ai_insights JSONB for full context preservation.
Migration 233: Created routed function for Agency progressive learning.
Migration 244: Added _learning_metadata extraction for two-tier storage (enum ranges + specific values).';