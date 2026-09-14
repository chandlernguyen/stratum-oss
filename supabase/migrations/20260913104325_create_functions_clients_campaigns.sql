-- ============================================================================
-- create_functions_clients_campaigns
-- Functions for clients and campaigns.
-- ============================================================================





CREATE OR REPLACE FUNCTION "agency"."archive_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "archived_at" timestamp with time zone, "archive_reason" "text", "archived_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_campaign_exists BOOLEAN := FALSE;
    v_campaign_id UUID;
    v_campaign_name TEXT;
    v_archived_at TIMESTAMPTZ;
    v_archive_reason TEXT;
    v_archived_by UUID;
BEGIN
    -- Get current user ID
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate campaign exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM agency.campaigns
        WHERE agency.campaigns.id = p_campaign_id
          AND agency.campaigns.org_id = p_org_id
          AND agency.campaigns.archived_at IS NULL
    ) INTO v_campaign_exists;

    IF NOT v_campaign_exists THEN
        RAISE EXCEPTION 'Campaign not found or already archived';
    END IF;

    -- Archive the campaign (in agency schema)
    UPDATE agency.campaigns SET
        archived_at = NOW(),
        archive_reason = COALESCE(p_archive_reason, 'User requested'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agency.campaigns.id = p_campaign_id
      AND agency.campaigns.org_id = p_org_id
    RETURNING
        agency.campaigns.id,
        agency.campaigns.name,
        agency.campaigns.archived_at,
        agency.campaigns.archive_reason,
        agency.campaigns.archived_by
    INTO v_campaign_id, v_campaign_name, v_archived_at, v_archive_reason, v_archived_by;

    -- Set output variables
    id := v_campaign_id;
    name := v_campaign_name;
    archived_at := v_archived_at;
    archive_reason := v_archive_reason;
    archived_by := v_archived_by;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "agency"."archive_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."archive_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archives a campaign in the agency schema.
Agency-specific archival handling for agency.campaigns.
Migration 261.';



CREATE OR REPLACE FUNCTION "agency"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
    v_campaigns_count INTEGER := 0;
    v_client_record RECORD;
BEGIN
    -- Get current user ID (get_current_user returns a record, extract user_id field)
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM agency.clients
        WHERE agency.clients.id = p_client_id
          AND agency.clients.org_id = p_org_id
          AND agency.clients.archived_at IS NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Client not found or already archived';
    END IF;

    -- Archive related active campaigns first (in agency schema)
    UPDATE agency.campaigns SET
        archived_at = NOW(),
        archive_reason = 'Client archived: ' || COALESCE(p_archive_reason, 'User requested'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE client_id = p_client_id
      AND org_id = p_org_id
      AND archived_at IS NULL;

    GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;

    -- Archive the client (in agency schema)
    UPDATE agency.clients SET
        archived_at = NOW(),
        archive_reason = COALESCE(p_archive_reason, 'User requested'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agency.clients.id = p_client_id AND agency.clients.org_id = p_org_id
    RETURNING
        agency.clients.id,
        agency.clients.archived_at,
        agency.clients.archive_reason,
        agency.clients.archived_by
    INTO v_client_record;

    -- Return JSONB directly (no ambiguity!)
    RETURN jsonb_build_object(
        'id', v_client_record.id,
        'archived_at', v_client_record.archived_at,
        'archive_reason', v_client_record.archive_reason,
        'archived_by', v_client_record.archived_by,
        'campaigns_archived_count', v_campaigns_count
    );
END;
$$;


ALTER FUNCTION "agency"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archives a client and all related campaigns in the agency schema.
Returns JSONB with archived client details and campaigns count.
Agency-specific archival handling for agency.clients and agency.campaigns.
Migration 196 (fixed from 195 - eliminated TABLE return type ambiguity).';



CREATE OR REPLACE FUNCTION "agency"."create_client"("p_org_id" "uuid", "p_name" "text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT 'active'::"text", "p_company_size" "public"."company_size_enum" DEFAULT NULL::"public"."company_size_enum", "p_company_stage" "public"."company_stage_enum" DEFAULT NULL::"public"."company_stage_enum", "p_business_model" "public"."business_model_enum" DEFAULT NULL::"public"."business_model_enum", "p_target_market" "text"[] DEFAULT NULL::"text"[], "p_key_competitors" "text"[] DEFAULT NULL::"text"[], "p_unique_value_proposition" "text" DEFAULT NULL::"text", "p_marketing_budget" "text" DEFAULT NULL::"text", "p_current_marketing_channels" "text"[] DEFAULT NULL::"text"[], "p_marketing_goals" "text"[] DEFAULT NULL::"text"[], "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "company_size" "public"."company_size_enum", "company_stage" "public"."company_stage_enum", "business_model" "public"."business_model_enum", "target_market" "text"[], "data_completeness_score" integer, "created_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_client_id UUID;
    v_slug TEXT;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID
    SELECT user_id INTO v_user_id FROM get_current_user();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate required fields
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Client name is required';
    END IF;

    -- Generate slug from name (will be refined by trigger if it exists)
    v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));

    -- Check for slug uniqueness
    IF EXISTS(
        SELECT 1 FROM agency.clients
        WHERE agency.clients.org_id = p_org_id
          AND agency.clients.slug = v_slug
          AND agency.clients.archived_at IS NULL
    ) THEN
        -- Append random suffix to ensure uniqueness
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
    END IF;

    -- Step 1: Insert into agency.clients (static information)
    INSERT INTO agency.clients (
        org_id,
        name,
        slug,
        industry,
        website,
        contact_email,
        contact_phone,
        status,
        settings,
        created_by,
        updated_by
    ) VALUES (
        p_org_id,
        trim(p_name),
        v_slug,
        p_industry,
        p_website,
        p_contact_email,
        p_contact_phone,
        COALESCE(p_status, 'active'),
        COALESCE(p_settings, '{}'::jsonb),
        v_user_id,
        v_user_id
    )
    RETURNING agency.clients.id INTO v_client_id;

    -- Step 2: Insert into agency.client_intelligence (business context)
    INSERT INTO agency.client_intelligence (
        org_id,
        client_id,
        company_size,
        company_stage,
        business_model,
        target_market,
        key_competitors,
        unique_value_proposition,
        marketing_budget,
        current_marketing_channels,
        marketing_goals,
        data_completeness_score,
        created_by,
        updated_by
    ) VALUES (
        p_org_id,
        v_client_id,
        p_company_size,
        p_company_stage,
        p_business_model,
        p_target_market,
        p_key_competitors,
        p_unique_value_proposition,
        p_marketing_budget,
        p_current_marketing_channels,
        p_marketing_goals,
        -- Calculate completeness score based on provided fields
        (
            (CASE WHEN p_company_size IS NOT NULL THEN 10 ELSE 0 END) +
            (CASE WHEN p_company_stage IS NOT NULL THEN 10 ELSE 0 END) +
            (CASE WHEN p_business_model IS NOT NULL THEN 15 ELSE 0 END) +
            (CASE WHEN p_target_market IS NOT NULL AND array_length(p_target_market, 1) > 0 THEN 15 ELSE 0 END) +
            (CASE WHEN p_key_competitors IS NOT NULL AND array_length(p_key_competitors, 1) > 0 THEN 10 ELSE 0 END) +
            (CASE WHEN p_unique_value_proposition IS NOT NULL THEN 15 ELSE 0 END) +
            (CASE WHEN p_marketing_budget IS NOT NULL THEN 10 ELSE 0 END) +
            (CASE WHEN p_current_marketing_channels IS NOT NULL THEN 10 ELSE 0 END) +
            (CASE WHEN p_marketing_goals IS NOT NULL THEN 5 ELSE 0 END)
        ),
        v_user_id,
        v_user_id
    );

    -- Return combined data from both tables
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        ci.company_size,
        ci.company_stage,
        ci.business_model,
        ci.target_market,
        ci.data_completeness_score,
        c.created_at,
        c.created_by
    FROM agency.clients c
    INNER JOIN agency.client_intelligence ci
        ON ci.client_id = c.id AND ci.org_id = c.org_id
    WHERE c.id = v_client_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agency_clients_changed',
        json_build_object(
            'action', 'CREATE',
            'org_id', p_org_id,
            'client_id', v_client_id
        )::text
    );
END;
$$;


ALTER FUNCTION "agency"."create_client"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."create_client"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") IS 'Atomically create client and intelligence records in agency schema. Handles dual-insert with proper validation and completeness scoring. Migration 155.';



CREATE OR REPLACE FUNCTION "agency"."delete_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "deleted_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_campaign_id UUID;
    v_campaign_name TEXT;
    v_deleted_at TIMESTAMPTZ := NOW();
BEGIN
    -- Get campaign name before deletion
    SELECT agency.campaigns.id, agency.campaigns.name
    INTO v_campaign_id, v_campaign_name
    FROM agency.campaigns
    WHERE agency.campaigns.id = p_campaign_id
      AND agency.campaigns.org_id = p_org_id;

    IF v_campaign_id IS NULL THEN
        RAISE EXCEPTION 'Campaign not found or access denied';
    END IF;

    -- Delete the campaign (in agency schema)
    DELETE FROM agency.campaigns
    WHERE agency.campaigns.id = p_campaign_id
      AND agency.campaigns.org_id = p_org_id;

    -- Set output variables
    id := v_campaign_id;
    name := v_campaign_name;
    deleted_at := v_deleted_at;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "agency"."delete_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."delete_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Permanently deletes a campaign in the agency schema.
Agency-specific deletion handling for agency.campaigns.
Migration 262.';



CREATE OR REPLACE FUNCTION "agency"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
    v_client_name TEXT;
    v_campaigns_deleted INTEGER := 0;
BEGIN
    -- Get current user ID (get_current_user returns a record, extract user_id field)
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM agency.clients
        WHERE agency.clients.id = p_client_id
          AND agency.clients.org_id = p_org_id
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Client not found or does not belong to organization';
    END IF;

    -- Get client name for response
    SELECT name INTO v_client_name
    FROM agency.clients
    WHERE id = p_client_id;

    -- Delete related campaigns first (in agency schema)
    DELETE FROM agency.campaigns
    WHERE client_id = p_client_id
      AND org_id = p_org_id;

    GET DIAGNOSTICS v_campaigns_deleted = ROW_COUNT;

    -- Delete the client (in agency schema)
    DELETE FROM agency.clients
    WHERE agency.clients.id = p_client_id
      AND agency.clients.org_id = p_org_id;

    -- Return JSONB with deletion summary
    RETURN jsonb_build_object(
        'id', p_client_id,
        'name', v_client_name,
        'campaigns_deleted_count', v_campaigns_deleted,
        'deleted_at', NOW()
    );
END;
$$;


ALTER FUNCTION "agency"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Deletes a client and all related campaigns in the agency schema.
Agency-specific deletion handling for agency.clients and agency.campaigns.
Migration 197.';



CREATE OR REPLACE FUNCTION "agency"."get_campaigns_by_client"("p_client_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "client_id" "uuid", "name" "text", "description" "text", "status" "text", "budget" numeric, "spent" numeric, "start_date" "date", "end_date" "date", "priority_level" "text", "white_label_config" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.client_id,
        c.name,
        c.description,
        c.status,
        c.budget,
        c.spent,
        c.start_date,
        c.end_date,
        c.priority_level,
        c.white_label_config,
        c.created_at
    FROM agency.campaigns c
    WHERE c.client_id = p_client_id
      AND c.archived_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "agency"."get_campaigns_by_client"("p_client_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."get_campaigns_by_client"("p_client_id" "uuid", "p_limit" integer) IS 'Get all campaigns for a specific agency client. Week 3. Migration 160.';



CREATE OR REPLACE FUNCTION "agency"."get_client_context"("p_org_id" "uuid", "p_client_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "company_size" "public"."company_size_enum", "company_stage" "public"."company_stage_enum", "business_model" "public"."business_model_enum", "geography" "text"[], "funding_status" "public"."funding_status_enum", "target_market" "text"[], "main_products" "text"[], "key_competitors" "text"[], "tech_stack" "text"[], "annual_revenue" "text", "unique_value_proposition" "text", "marketing_budget" "text", "current_marketing_channels" "text"[], "marketing_goals" "text"[], "business_metrics" "jsonb", "learning_metadata" "jsonb", "data_completeness_score" integer, "campaign_count" bigint, "persona_count" bigint, "output_count" bigint, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,

        ci.company_size,
        ci.company_stage,
        ci.business_model,
        ci.geography,
        ci.funding_status,
        ci.target_market,
        ci.main_products,
        ci.key_competitors,
        ci.tech_stack,
        ci.annual_revenue,
        ci.unique_value_proposition,
        ci.marketing_budget,
        ci.current_marketing_channels,
        ci.marketing_goals,
        ci.business_metrics,
        ci.learning_metadata,
        ci.data_completeness_score,

        -- Stats from related tables
        (SELECT COUNT(*) FROM agency.campaigns WHERE client_id = p_client_id AND archived_at IS NULL)::BIGINT as campaign_count,
        (SELECT COUNT(*) FROM agency.personas WHERE client_id = p_client_id AND archived_at IS NULL)::BIGINT as persona_count,
        (SELECT COUNT(*) FROM agency.agent_outputs WHERE client_id = p_client_id AND archived_at IS NULL)::BIGINT as output_count,
        GREATEST(
            c.updated_at,
            (SELECT MAX(created_at) FROM agency.campaigns WHERE client_id = p_client_id),
            (SELECT MAX(created_at) FROM agency.agent_outputs WHERE client_id = p_client_id)
        ) as last_activity

    FROM agency.clients c
    INNER JOIN agency.client_intelligence ci ON ci.client_id = c.id AND ci.org_id = c.org_id
    WHERE c.id = p_client_id
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;
END;
$$;


ALTER FUNCTION "agency"."get_client_context"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."get_client_context"("p_org_id" "uuid", "p_client_id" "uuid") IS 'Get complete client context including all business data fields (geography, funding, tech stack, revenue, etc.) and stats. Migration 209.';



CREATE OR REPLACE FUNCTION "agency"."get_client_outputs"("p_client_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "agent_type" "text", "title" "text", "summary" "text", "category" "text", "content" "jsonb", "campaign_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.agent_type,
        o.title,
        o.summary,
        o.category,
        o.content,
        o.campaign_id,
        o.created_at
    FROM agency.agent_outputs o
    WHERE o.client_id = p_client_id
      AND o.archived_at IS NULL
      AND (p_agent_type IS NULL OR o.agent_type = p_agent_type)
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "agency"."get_client_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."get_client_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer) IS 'Get agent outputs for a specific agency client, optionally filtered by agent type. Week 3. Migration 160.';



CREATE OR REPLACE FUNCTION "agency"."get_client_personas"("p_client_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" "text", "title" "text", "company_name" "text", "industry" "text", "demographics" "jsonb", "goals" "jsonb", "pain_points" "jsonb", "is_primary" boolean, "campaign_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.title,
        p.company_name,
        p.industry,
        p.demographics,
        p.goals,
        p.pain_points,
        p.is_primary,
        p.campaign_id,
        p.created_at
    FROM agency.personas p
    WHERE p.client_id = p_client_id
      AND p.archived_at IS NULL
    ORDER BY p.is_primary DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "agency"."get_client_personas"("p_client_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."get_client_personas"("p_client_id" "uuid", "p_limit" integer) IS 'Get all personas for a specific agency client. Week 3. Migration 160.';



CREATE OR REPLACE FUNCTION "agency"."restore_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "restored_at" timestamp with time zone, "restored_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_campaign_id UUID;
    v_campaign_name TEXT;
    v_restored_at TIMESTAMPTZ;
    v_restored_by UUID;
BEGIN
    -- Get current user ID
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Restore the campaign (in agency schema)
    UPDATE agency.campaigns SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agency.campaigns.id = p_campaign_id
      AND agency.campaigns.org_id = p_org_id
      AND agency.campaigns.archived_at IS NOT NULL
    RETURNING
        agency.campaigns.id,
        agency.campaigns.name
    INTO v_campaign_id, v_campaign_name;

    IF v_campaign_id IS NULL THEN
        RAISE EXCEPTION 'Campaign not found or not archived';
    END IF;

    -- Set output variables
    id := v_campaign_id;
    name := v_campaign_name;
    restored_at := NOW();
    restored_by := v_user_id;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "agency"."restore_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."restore_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Restores an archived campaign in the agency schema.
Agency-specific restoration handling for agency.campaigns.
Migration 263.';



CREATE OR REPLACE FUNCTION "agency"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "status" "text", "restored_at" timestamp with time zone, "campaigns_restored_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
    v_campaigns_count INTEGER := 0;
    v_client_id UUID;
    v_client_name TEXT;
    v_client_slug TEXT;
    v_client_status TEXT;
BEGIN
    -- Get current user ID
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists, belongs to org, and is archived
    SELECT EXISTS(
        SELECT 1 FROM agency.clients
        WHERE agency.clients.id = p_client_id
          AND agency.clients.org_id = p_org_id
          AND agency.clients.archived_at IS NOT NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Archived client not found';
    END IF;

    -- Restore related archived campaigns that were archived with the client
    UPDATE agency.campaigns SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE client_id = p_client_id
      AND org_id = p_org_id
      AND archived_at IS NOT NULL
      AND archive_reason LIKE 'Client archived:%';

    GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;

    -- Restore the client
    UPDATE agency.clients SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agency.clients.id = p_client_id AND agency.clients.org_id = p_org_id
    RETURNING
        agency.clients.id,
        agency.clients.name,
        agency.clients.slug,
        agency.clients.status
    INTO v_client_id, v_client_name, v_client_slug, v_client_status;

    -- Set output variables
    id := v_client_id;
    name := v_client_name;
    slug := v_client_slug;
    status := v_client_status;
    restored_at := NOW();
    campaigns_restored_count := v_campaigns_count;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "agency"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Restores an archived client and related campaigns in the agency schema.
Also restores campaigns that were archived when the client was archived.
Migration 268.';



CREATE OR REPLACE FUNCTION "agency"."sync_client_delete_to_public"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    -- Mirror the archive to public.clients
    UPDATE public.clients
    SET
        archived_at = OLD.archived_at,
        archived_by = OLD.archived_by,
        archive_reason = OLD.archive_reason
    WHERE id = OLD.id;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "agency"."sync_client_delete_to_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "agency"."sync_client_to_public"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
BEGIN
    -- Mirror the client record to public.clients for UI backward compatibility
    INSERT INTO public.clients (
        id,                    -- Use same ID for easy cross-schema reference
        org_id,
        name,
        slug,
        industry,
        website,
        contact_email,
        contact_phone,
        status,
        settings,
        created_by,
        updated_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.org_id,
        NEW.name,
        NEW.slug,
        NEW.industry,
        NEW.website,
        NEW.contact_email,
        NEW.contact_phone,
        NEW.status,
        NEW.settings,
        NEW.created_by,
        NEW.updated_by,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        industry = EXCLUDED.industry,
        website = EXCLUDED.website,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        status = EXCLUDED.status,
        settings = EXCLUDED.settings,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "agency"."sync_client_to_public"() OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."sync_client_to_public"() IS 'Week 1: Mirrors agency.clients to public.clients for UI backward compatibility. Remove in Week 2+ when frontend is schema-aware. Migration 157.';



CREATE OR REPLACE FUNCTION "agency"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_company_size" "public"."company_size_enum" DEFAULT NULL::"public"."company_size_enum", "p_company_stage" "public"."company_stage_enum" DEFAULT NULL::"public"."company_stage_enum", "p_business_model" "public"."business_model_enum" DEFAULT NULL::"public"."business_model_enum", "p_target_market" "text"[] DEFAULT NULL::"text"[], "p_key_competitors" "text"[] DEFAULT NULL::"text"[], "p_unique_value_proposition" "text" DEFAULT NULL::"text", "p_marketing_budget" "text" DEFAULT NULL::"text", "p_current_marketing_channels" "text"[] DEFAULT NULL::"text"[], "p_marketing_goals" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "company_size" "public"."company_size_enum", "company_stage" "public"."company_stage_enum", "business_model" "public"."business_model_enum", "target_market" "text"[], "data_completeness_score" integer, "updated_at" timestamp with time zone, "updated_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
    v_intelligence_exists BOOLEAN := FALSE;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID
    SELECT user_id INTO v_user_id FROM get_current_user();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM agency.clients
        WHERE agency.clients.id = p_client_id
          AND agency.clients.org_id = p_org_id
          AND agency.clients.archived_at IS NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Client not found or does not belong to organization';
    END IF;

    -- Validate slug uniqueness if provided
    IF p_slug IS NOT NULL AND trim(p_slug) != '' THEN
        IF EXISTS(
            SELECT 1 FROM agency.clients
            WHERE agency.clients.org_id = p_org_id
              AND agency.clients.slug = trim(p_slug)
              AND agency.clients.id != p_client_id
              AND agency.clients.archived_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Client slug already exists in organization';
        END IF;
    END IF;

    -- Validate name if provided
    IF p_name IS NOT NULL AND trim(p_name) = '' THEN
        RAISE EXCEPTION 'Client name cannot be empty';
    END IF;

    -- Update static client information (agency.clients)
    UPDATE agency.clients SET
        name = COALESCE(NULLIF(trim(p_name), ''), agency.clients.name),
        slug = COALESCE(NULLIF(trim(p_slug), ''), agency.clients.slug),
        industry = COALESCE(p_industry, agency.clients.industry),
        website = COALESCE(p_website, agency.clients.website),
        contact_email = COALESCE(p_contact_email, agency.clients.contact_email),
        contact_phone = COALESCE(p_contact_phone, agency.clients.contact_phone),
        status = COALESCE(p_status, agency.clients.status),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agency.clients.id = p_client_id
      AND agency.clients.org_id = p_org_id;

    -- Check if intelligence record exists (FIX: Fully qualify ambiguous columns)
    SELECT EXISTS(
        SELECT 1 FROM agency.client_intelligence
        WHERE agency.client_intelligence.client_id = p_client_id
          AND agency.client_intelligence.org_id = p_org_id
    ) INTO v_intelligence_exists;

    -- Update or create intelligence record (agency.client_intelligence)
    IF v_intelligence_exists THEN
        -- Update existing intelligence
        UPDATE agency.client_intelligence SET
            company_size = COALESCE(p_company_size, agency.client_intelligence.company_size),
            company_stage = COALESCE(p_company_stage, agency.client_intelligence.company_stage),
            business_model = COALESCE(p_business_model, agency.client_intelligence.business_model),
            target_market = COALESCE(p_target_market, agency.client_intelligence.target_market),
            key_competitors = COALESCE(p_key_competitors, agency.client_intelligence.key_competitors),
            unique_value_proposition = COALESCE(p_unique_value_proposition, agency.client_intelligence.unique_value_proposition),
            marketing_budget = COALESCE(p_marketing_budget, agency.client_intelligence.marketing_budget),
            current_marketing_channels = COALESCE(p_current_marketing_channels, agency.client_intelligence.current_marketing_channels),
            marketing_goals = COALESCE(p_marketing_goals, agency.client_intelligence.marketing_goals),
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE agency.client_intelligence.client_id = p_client_id
          AND agency.client_intelligence.org_id = p_org_id;
    ELSE
        -- Create new intelligence record
        INSERT INTO agency.client_intelligence (
            org_id,
            client_id,
            company_size,
            company_stage,
            business_model,
            target_market,
            key_competitors,
            unique_value_proposition,
            marketing_budget,
            current_marketing_channels,
            marketing_goals,
            created_by,
            updated_by
        ) VALUES (
            p_org_id,
            p_client_id,
            p_company_size,
            p_company_stage,
            p_business_model,
            p_target_market,
            p_key_competitors,
            p_unique_value_proposition,
            p_marketing_budget,
            p_current_marketing_channels,
            p_marketing_goals,
            v_user_id,
            v_user_id
        );
    END IF;

    -- Return combined data from both tables
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        ci.company_size,
        ci.company_stage,
        ci.business_model,
        ci.target_market,
        ci.data_completeness_score,
        c.updated_at,
        c.updated_by
    FROM agency.clients c
    LEFT JOIN agency.client_intelligence ci
        ON ci.client_id = c.id AND ci.org_id = c.org_id
    WHERE c.id = p_client_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agency_clients_changed',
        json_build_object(
            'action', 'UPDATE',
            'org_id', p_org_id,
            'client_id', p_client_id
        )::text
    );
END;
$$;


ALTER FUNCTION "agency"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[]) IS 'Update agency client information across dual tables (clients + client_intelligence). Fixed ambiguous column references. Migration 171.';



CREATE OR REPLACE FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_sme_result RECORD;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.archive_campaign
        SELECT * INTO v_agency_result
        FROM agency.archive_campaign(
            p_campaign_id,
            p_org_id,
            p_archive_reason
        );

        -- Convert to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Call public.archive_record (generic function)
        -- Note: public.campaigns doesn't have a specific archive function yet
        -- Using the generic archive_record function
        DECLARE
            v_success BOOLEAN;
            v_campaign_name TEXT;
        BEGIN
            -- Get campaign name before archiving
            SELECT name INTO v_campaign_name
            FROM public.campaigns
            WHERE id = p_campaign_id AND org_id = p_org_id;

            -- Archive using generic function
            SELECT archive_record('campaigns', p_campaign_id, (get_current_user()).user_id, p_archive_reason)
            INTO v_success;

            IF NOT v_success THEN
                RAISE EXCEPTION 'Failed to archive campaign';
            END IF;

            -- Build result
            v_result := jsonb_build_object(
                'id', p_campaign_id,
                'name', v_campaign_name,
                'archived_at', NOW(),
                'archive_reason', COALESCE(p_archive_reason, 'User requested'),
                'archived_by', (get_current_user()).user_id
            );
        END;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Router function that archives campaigns in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.archive_campaign (archives agency.campaigns)
SME orgs: Uses archive_record for public.campaigns
Returns JSONB with archived campaign details.
Migration 261.';



CREATE OR REPLACE FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "archived_at" timestamp with time zone, "archive_reason" "text", "archived_by" "uuid", "campaigns_archived_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_client_exists BOOLEAN;
    v_campaigns_count INTEGER;
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

    -- Validate client exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM clients
        WHERE clients.id = p_client_id
          AND clients.org_id = p_org_id
          AND clients.archived_at IS NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Client not found or already archived';
    END IF;

    -- Count campaigns that will be archived
    SELECT COUNT(*)::INTEGER INTO v_campaigns_count
    FROM campaigns
    WHERE campaigns.client_id = p_client_id
      AND campaigns.archived_at IS NULL;

    -- Archive the client (is_archived auto-updates)
    UPDATE clients SET
        archived_at = NOW(),
        archive_reason = COALESCE(p_archive_reason, 'User archived'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE clients.id = p_client_id
      AND clients.org_id = p_org_id;

    -- Archive associated campaigns
    UPDATE campaigns SET
        archived_at = NOW(),
        archive_reason = 'Parent client archived',
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE campaigns.client_id = p_client_id
      AND campaigns.archived_at IS NULL;

    -- Return archived client info (matching existing return type)
    RETURN QUERY
    SELECT
        c.id,
        c.archived_at,
        c.archive_reason,
        c.archived_by,
        v_campaigns_count AS campaigns_archived_count
    FROM clients c
    WHERE c.id = p_client_id;
END;
$$;


ALTER FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archive clients (is_archived auto-updates from archived_at)';



CREATE OR REPLACE FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.archive_client (now returns JSONB directly)
        SELECT agency.archive_client(
            p_client_id,
            p_org_id,
            p_archive_reason
        ) INTO v_result;

    ELSE
        -- SME: Call public.archive_client
        -- Note: public.archive_client returns TABLE, need to convert
        SELECT row_to_json(public.archive_client.*)::jsonb INTO v_result
        FROM public.archive_client(
            p_client_id,
            p_org_id,
            p_archive_reason
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Router function that archives clients in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.archive_client (returns JSONB directly)
SME orgs: Calls public.archive_client (returns TABLE, converted to JSONB)
Returns JSONB with archived client details and campaigns count.
Migration 196 (updated from 195).';


CREATE OR REPLACE FUNCTION "public"."calculate_campaign_derived_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Auto-calculate Cost Per Lead
    IF NEW.leads > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_lead := NEW.spend / NEW.leads;
    END IF;

    -- Auto-calculate Cost Per Acquisition (use conversions if available)
    IF NEW.conversions > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_acquisition := NEW.spend / NEW.conversions;
    ELSIF NEW.qualified_leads > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_acquisition := NEW.spend / NEW.qualified_leads;
    END IF;

    -- Auto-calculate Estimated Revenue (conversion_value × conversions)
    IF NEW.conversion_value IS NOT NULL AND NEW.conversions > 0 THEN
        NEW.estimated_revenue := NEW.conversion_value * NEW.conversions;
    END IF;

    -- Auto-calculate CPC if missing
    IF NEW.clicks > 0 AND NEW.spend > 0 AND NEW.cpc IS NULL THEN
        NEW.cpc := NEW.spend / NEW.clicks;
    END IF;

    -- Auto-calculate CTR if missing
    IF NEW.impressions > 0 AND NEW.clicks > 0 AND NEW.ctr IS NULL THEN
        NEW.ctr := (NEW.clicks::NUMERIC / NEW.impressions::NUMERIC) * 100;
    END IF;

    -- PHASE 6.5: Auto-calculate engagement metrics

    -- Cost Per View (CPV)
    IF NEW.video_views > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_view := NEW.spend / NEW.video_views;
    END IF;

    -- Cost Per Engagement (CPE)
    IF (NEW.likes + NEW.shares + NEW.comments) > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_engagement := NEW.spend / (NEW.likes + NEW.shares + NEW.comments);
    END IF;

    -- Cost Per Follower
    IF NEW.followers_gained > 0 AND NEW.spend > 0 THEN
        NEW.cost_per_follower := NEW.spend / NEW.followers_gained;
    END IF;

    -- Engagement Rate (if impressions available)
    IF NEW.impressions > 0 AND (NEW.likes + NEW.shares + NEW.comments) > 0 THEN
        NEW.engagement_rate := ((NEW.likes + NEW.shares + NEW.comments)::NUMERIC / NEW.impressions::NUMERIC) * 100;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_campaign_derived_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_client_health_score"("p_client_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  health_score NUMERIC := 100;
  campaign_count INTEGER;
  avg_performance NUMERIC;
  budget_adherence NUMERIC;
  engagement_score NUMERIC;
BEGIN
  -- Get basic campaign metrics for the client
  SELECT
    COUNT(*),
    AVG(CASE WHEN budget > 0 THEN (conversions::NUMERIC / budget * 1000) ELSE 0 END),
    AVG(CASE WHEN budget > 0 THEN LEAST(100, (spent / budget * 100)) ELSE 0 END)
  INTO campaign_count, avg_performance, budget_adherence
  FROM campaigns
  WHERE client_id = p_client_id
    AND archived_at IS NULL
    AND created_at >= (CURRENT_DATE - INTERVAL '90 days');

  -- No campaigns = neutral score
  IF campaign_count = 0 THEN
    RETURN 70;
  END IF;

  -- Calculate performance score (0-40 points)
  health_score := health_score * 0.6 + (COALESCE(avg_performance, 0) / 10.0 * 40);

  -- Calculate budget adherence score (0-30 points)
  -- Penalty for over-spending, bonus for efficient spending
  IF budget_adherence > 100 THEN
    health_score := health_score - ((budget_adherence - 100) * 0.5);
  ELSIF budget_adherence < 80 THEN
    health_score := health_score + ((80 - budget_adherence) * 0.2);
  END IF;

  -- Engagement score based on recent activity (0-30 points)
  SELECT COUNT(*) INTO engagement_score
  FROM campaigns c
  WHERE c.client_id = p_client_id
    AND c.updated_at >= (CURRENT_DATE - INTERVAL '30 days');

  health_score := health_score + LEAST(30, engagement_score * 5);

  -- Ensure score is between 0 and 100
  RETURN GREATEST(0, LEAST(100, ROUND(health_score, 1)));
END;
$$;


ALTER FUNCTION "public"."calculate_client_health_score"("p_client_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."count_active_clients"("p_org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_count INT;
BEGIN
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type = 'AGENCY' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM agency.clients
    WHERE org_id = p_org_id AND archived_at IS NULL;
  ELSE
    v_count := 0;
  END IF;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."count_active_clients"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_active_clients"("p_org_id" "uuid") IS 'Count active (non-archived) clients for billing limit checks. Routes to correct schema based on org type.';



CREATE OR REPLACE FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_objectives" "jsonb" DEFAULT NULL::"jsonb", "p_target_audience" "text" DEFAULT NULL::"text", "p_budget_cents" integer DEFAULT NULL::integer, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_status" "text" DEFAULT 'draft'::"text", "p_success_metrics" "jsonb" DEFAULT '{}'::"jsonb", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_campaign_id UUID;
BEGIN
  -- Get current user if not provided
  IF p_created_by IS NULL THEN
    p_created_by := auth.uid();
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Must have client_id, write to agency.campaigns
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id required for agency organizations';
    END IF;

    INSERT INTO agency.campaigns (
      org_id,
      client_id,
      name,
      description,
      objectives,
      target_audience,
      budget_cents,
      start_date,
      end_date,
      status,
      success_metrics,
      created_by
    ) VALUES (
      p_org_id,
      p_client_id,
      p_name,
      p_description,
      p_objectives,
      p_target_audience,
      p_budget_cents,
      p_start_date,
      p_end_date,
      p_status,
      p_success_metrics,
      p_created_by
    ) RETURNING id INTO v_campaign_id;

    -- Return from agency schema
    SELECT row_to_json(c.*)::jsonb INTO v_result
    FROM agency.campaigns c
    WHERE c.id = v_campaign_id;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Write to public.campaigns, client_id should be NULL
    INSERT INTO public.campaigns (
      org_id,
      client_id,
      name,
      description,
      objectives,
      target_audience,
      budget_cents,
      start_date,
      end_date,
      status,
      success_metrics,
      created_by
    ) VALUES (
      p_org_id,
      NULL, -- SME campaigns don't have client_id
      p_name,
      p_description,
      p_objectives,
      p_target_audience,
      p_budget_cents,
      p_start_date,
      p_end_date,
      p_status,
      p_success_metrics,
      p_created_by
    ) RETURNING id INTO v_campaign_id;

    -- Return from public schema
    SELECT row_to_json(c.*)::jsonb INTO v_result
    FROM public.campaigns c
    WHERE c.id = v_campaign_id;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid", "p_description" "text", "p_objectives" "jsonb", "p_target_audience" "text", "p_budget_cents" integer, "p_start_date" "date", "p_end_date" "date", "p_status" "text", "p_success_metrics" "jsonb", "p_created_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid", "p_description" "text", "p_objectives" "jsonb", "p_target_audience" "text", "p_budget_cents" integer, "p_start_date" "date", "p_end_date" "date", "p_status" "text", "p_success_metrics" "jsonb", "p_created_by" "uuid") IS 'Router function for creating campaigns. Routes to agency.campaigns for AGENCY orgs with client_id, public.campaigns for SME orgs.';



CREATE OR REPLACE FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text" DEFAULT NULL::"text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "settings" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_client_id UUID;
    v_generated_slug TEXT;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID
    SELECT get_current_user() INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate required fields
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Client name is required';
    END IF;

    -- Generate client ID
    v_client_id := gen_random_uuid();

    -- Generate slug if not provided
    IF p_slug IS NULL OR trim(p_slug) = '' THEN
        v_generated_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
        v_generated_slug := regexp_replace(v_generated_slug, '^-+|-+$', '', 'g');
        -- Ensure slug is unique within org
        IF EXISTS(SELECT 1 FROM clients WHERE org_id = p_org_id AND slug = v_generated_slug) THEN
            v_generated_slug := v_generated_slug || '-' || substring(v_client_id::text from 1 for 8);
        END IF;
    ELSE
        v_generated_slug := p_slug;
        -- Validate slug uniqueness within org
        IF EXISTS(SELECT 1 FROM clients WHERE org_id = p_org_id AND slug = v_generated_slug AND id != v_client_id) THEN
            RAISE EXCEPTION 'Client slug already exists in organization';
        END IF;
    END IF;

    -- Insert new client
    INSERT INTO clients (
        id,
        org_id,
        name,
        slug,
        industry,
        website,
        contact_email,
        contact_phone,
        status,
        settings,
        created_at,
        updated_at,
        is_archived,
        created_by,
        updated_by
    ) VALUES (
        v_client_id,
        p_org_id,
        trim(p_name),
        v_generated_slug,
        p_industry,
        p_website,
        p_contact_email,
        p_contact_phone,
        COALESCE(p_status, 'active'),
        COALESCE(p_settings, '{}'::JSONB),
        NOW(),
        NOW(),
        FALSE,
        v_user_id,
        v_user_id
    );

    -- Return the created client
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        c.settings,
        c.created_at,
        c.updated_at,
        c.created_by
    FROM clients c
    WHERE c.id = v_client_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('clients_changed',
        json_build_object(
            'action', 'INSERT',
            'org_id', p_org_id,
            'client_id', v_client_id
        )::text
    );
END;
$_$;


ALTER FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") IS 'Database-First function to create a new client with org validation, slug generation, and real-time notifications';



CREATE OR REPLACE FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT 'active'::"text", "p_company_size" "public"."company_size_enum" DEFAULT NULL::"public"."company_size_enum", "p_company_stage" "public"."company_stage_enum" DEFAULT NULL::"public"."company_stage_enum", "p_business_model" "public"."business_model_enum" DEFAULT NULL::"public"."business_model_enum", "p_target_market" "text"[] DEFAULT NULL::"text"[], "p_key_competitors" "text"[] DEFAULT NULL::"text"[], "p_unique_value_proposition" "text" DEFAULT NULL::"text", "p_marketing_budget" "text" DEFAULT NULL::"text", "p_current_marketing_channels" "text"[] DEFAULT NULL::"text"[], "p_marketing_goals" "text"[] DEFAULT NULL::"text"[], "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_sme_result RECORD;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema based on org_type
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.create_client for dual-table insert
        SELECT * INTO v_agency_result
        FROM agency.create_client(
            p_org_id,
            p_name,
            p_industry,
            p_website,
            p_contact_email,
            p_contact_phone,
            p_status,
            p_company_size,
            p_company_stage,
            p_business_model,
            p_target_market,
            p_key_competitors,
            p_unique_value_proposition,
            p_marketing_budget,
            p_current_marketing_channels,
            p_marketing_goals,
            p_settings
        );

        -- Convert record to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Direct insert to public.clients table
        INSERT INTO public.clients (
            org_id,
            name,
            industry,
            website,
            contact_email,
            contact_phone,
            status,
            settings
        ) VALUES (
            p_org_id,
            p_name,
            p_industry,
            p_website,
            p_contact_email,
            p_contact_phone,
            COALESCE(p_status, 'active'),
            COALESCE(p_settings, '{}'::jsonb)
        )
        RETURNING * INTO v_sme_result;

        -- Convert record to JSONB
        v_result := row_to_json(v_sme_result)::jsonb;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") IS 'Router function that creates clients in the appropriate schema based on org_type. AGENCY → agency.create_client (dual-table), SME → public.clients (single table). Migration 156.';



CREATE OR REPLACE FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_campaign_name TEXT;
    v_deleted_at TIMESTAMPTZ := NOW();
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.delete_campaign
        SELECT * INTO v_agency_result
        FROM agency.delete_campaign(
            p_campaign_id,
            p_org_id
        );

        -- Convert to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Delete from public.campaigns
        SELECT name INTO v_campaign_name
        FROM public.campaigns
        WHERE id = p_campaign_id AND org_id = p_org_id;

        IF v_campaign_name IS NULL THEN
            RAISE EXCEPTION 'Campaign not found or access denied';
        END IF;

        DELETE FROM public.campaigns
        WHERE id = p_campaign_id AND org_id = p_org_id;

        -- Build result
        v_result := jsonb_build_object(
            'id', p_campaign_id,
            'name', v_campaign_name,
            'deleted_at', v_deleted_at
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Router function that deletes campaigns in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.delete_campaign (deletes from agency.campaigns)
SME orgs: Deletes from public.campaigns
Returns JSONB with deleted campaign details.
Migration 262.';



CREATE OR REPLACE FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "deleted_at" timestamp with time zone, "campaigns_deleted" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_client_name TEXT;
    v_campaigns_count INTEGER;
BEGIN
    -- Validate org ownership
    IF NOT EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = p_client_id AND c.org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'Client not found or access denied';
    END IF;

    -- Get client name for return
    SELECT c.name INTO v_client_name
    FROM clients c
    WHERE c.id = p_client_id;

    -- Count campaigns that will be deleted
    SELECT COUNT(*) INTO v_campaigns_count
    FROM campaigns
    WHERE client_id = p_client_id;

    -- Delete the client (cascade will handle related records)
    DELETE FROM clients
    WHERE clients.id = p_client_id
        AND clients.org_id = p_org_id;

    -- Return deletion confirmation
    RETURN QUERY
    SELECT
        p_client_id as id,
        v_client_name as name,
        NOW() as deleted_at,
        v_campaigns_count as campaigns_deleted;
END;
$$;


ALTER FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Permanently delete a client and cascade to related data. Validates org_id ownership. Now with secure search_path. Migration 173.';



CREATE OR REPLACE FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_client_name TEXT;
    v_campaigns_deleted INTEGER := 0;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.delete_client (returns JSONB directly)
        SELECT agency.delete_client(
            p_client_id,
            p_org_id
        ) INTO v_result;

    ELSE
        -- SME: Call public.delete_client (if exists) or perform direct delete
        -- Get client name for response
        SELECT name INTO v_client_name
        FROM public.clients
        WHERE id = p_client_id AND org_id = p_org_id;

        IF v_client_name IS NULL THEN
            RAISE EXCEPTION 'Client not found or does not belong to organization';
        END IF;

        -- Delete related campaigns
        DELETE FROM public.campaigns
        WHERE client_id = p_client_id
          AND org_id = p_org_id;

        GET DIAGNOSTICS v_campaigns_deleted = ROW_COUNT;

        -- Delete the client
        DELETE FROM public.clients
        WHERE id = p_client_id
          AND org_id = p_org_id;

        -- Build JSONB response
        v_result := jsonb_build_object(
            'id', p_client_id,
            'name', v_client_name,
            'campaigns_deleted_count', v_campaigns_deleted,
            'deleted_at', NOW()
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Router function that deletes clients in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.delete_client (deletes agency.clients + agency.campaigns)
SME orgs: Deletes directly from public.clients + public.campaigns
Returns JSONB with deleted client details and campaigns count.
Migration 197.';


CREATE OR REPLACE FUNCTION "public"."generate_slug"("input_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(input_text, '[^a-zA-Z0-9]+', '-', 'g'),
      '^-|-$', '', 'g'
    )
  );
END;
$_$;


ALTER FUNCTION "public"."generate_slug"("input_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_slug"("input_text" "text") IS 'Generate URL-safe slug from text. Now with secure search_path.';



CREATE OR REPLACE FUNCTION "public"."generate_unique_slug"("input_text" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INT := 0;
BEGIN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    base_slug := LOWER(TRIM(input_text));
    base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
    
    -- Start with base slug
    final_slug := base_slug;
    
    -- Check for uniqueness and append number if needed
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$_$;


ALTER FUNCTION "public"."generate_unique_slug"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "status" "text", "priority_level" "text", "budget_cents" integer, "spent_cents" integer, "client_name" "text", "days_remaining" integer, "progress_percentage" numeric, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.status::TEXT,
    c.priority_level::TEXT,
    c.budget_cents::INT,
    c.spent_cents::INT,
    cl.name::TEXT as client_name,
    CASE
      WHEN c.end_date IS NOT NULL
      THEN (c.end_date - CURRENT_DATE)::INT
      ELSE NULL
    END as days_remaining,
    CASE
      WHEN c.start_date IS NOT NULL AND c.end_date IS NOT NULL
      THEN GREATEST(0, LEAST(100,
        ROUND(
          ((CURRENT_DATE - c.start_date)::NUMERIC /
           (c.end_date - c.start_date)::NUMERIC) * 100, 1
        )
      ))
      ELSE 0::NUMERIC
    END as progress_percentage,
    c.created_at
  FROM campaigns c
  LEFT JOIN clients cl ON c.client_id = cl.id
  WHERE c.org_id = p_org_id
    AND c.status = 'active'
    AND c.archived_at IS NULL
  ORDER BY
    c.priority_level DESC NULLS LAST,
    c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") IS 'Returns active campaigns with progress metrics.
Optimized for dashboard and quick access views. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Get active campaigns from agency.campaigns
    SELECT jsonb_agg(
      row_to_json(c)::jsonb
      ORDER BY c.priority_level DESC NULLS LAST, c.created_at DESC
    ) INTO v_result
    FROM agency.campaigns c
    WHERE c.org_id = p_org_id
      AND c.status = 'active'
      AND c.archived_at IS NULL;

  ELSE
    -- SME: Get active campaigns from public.campaigns
    SELECT jsonb_agg(
      row_to_json(c)::jsonb
      ORDER BY c.priority_level DESC NULLS LAST, c.created_at DESC
    ) INTO v_result
    FROM public.campaigns c
    WHERE c.org_id = p_org_id
      AND c.status = 'active'
      AND c.archived_at IS NULL;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") IS 'Router function for active campaigns widget on dashboard.
Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs.
Returns array of active campaigns sorted by priority and creation date.
Phase 2, Migration 166.';


CREATE OR REPLACE FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN get_cached_recommendations(p_org_id, 'campaign_plan', p_data_hash);
END;
$$;


ALTER FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") IS 'Backward-compatible wrapper. Use get_cached_recommendations directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "name" "text", "description" "text", "campaign_type" "text", "priority_level" "text", "budget_cents" integer, "spent_cents" integer, "start_date" "date", "end_date" "date", "marketing_channels" "jsonb", "target_audience" "text", "success_metrics" "jsonb", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archive_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.org_id,
    c.client_id,
    c.name::TEXT,
    c.description::TEXT,
    c.campaign_type::TEXT,
    c.priority_level::TEXT,
    c.budget_cents::INT,
    c.spent_cents::INT,
    c.start_date,
    c.end_date,
    c.marketing_channels,
    c.target_audience::TEXT,
    c.success_metrics,
    c.status::TEXT,
    c.created_at,
    c.updated_at,
    c.archived_at,
    c.archive_reason::TEXT
  FROM campaigns c
  LEFT JOIN clients cl ON c.client_id = cl.id
  WHERE c.id = p_campaign_id
    -- ✅ FIX: Multi-tenant validation
    AND (
      -- SME: Direct org ownership (no client)
      (c.org_id = p_org_id AND c.client_id IS NULL)
      OR
      -- Agency: Via client ownership
      (c.client_id IS NOT NULL AND cl.org_id = p_org_id)
    );
END;
$$;


ALTER FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Get basic campaign information with multi-tenant validation.
Supports both SME (direct org_id) and Agency (via client_id) access patterns.
Fixed in migration 257 (2025-11-14) to resolve agency user access issues.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "name" "text", "description" "text", "status" "text", "campaign_type" "text", "priority_level" "text", "budget_cents" integer, "spent_cents" integer, "objectives" "jsonb", "metrics" "jsonb", "start_date" "date", "end_date" "date", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "target_audience" "text", "archived_at" timestamp with time zone, "archived_by" "uuid", "archive_reason" "text", "updated_by" "uuid", "marketing_channels" "jsonb", "content_pillars" "jsonb", "target_personas" "jsonb", "success_metrics" "jsonb", "competitor_context" "text", "geographic_target" "text", "tags" "jsonb", "reach" integer, "metadata" "jsonb", "budget_utilization_percentage" numeric, "strategies_count" integer, "personas_count" integer, "content_outputs_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- All campaign fields directly from table
        c.id,
        c.org_id,
        c.client_id,
        c.name,
        c.description,
        c.status,
        c.campaign_type,
        c.priority_level,
        c.budget_cents,
        c.spent_cents,
        c.objectives,
        c.metrics,
        c.start_date,
        c.end_date,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.target_audience,
        c.archived_at,
        c.archived_by,
        c.archive_reason,
        c.updated_by,
        c.marketing_channels,
        c.content_pillars,
        c.target_personas,
        c.success_metrics,
        c.competitor_context,
        c.geographic_target,
        c.tags,
        c.reach,
        c.metadata,

        -- Computed: budget utilization percentage
        CASE
            WHEN c.budget_cents > 0
            THEN ROUND((c.spent_cents::NUMERIC / c.budget_cents::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END as budget_utilization_percentage,

        -- Computed: related counts
        COALESCE(
            (SELECT COUNT(*)::INTEGER
             FROM marketing_strategies ms
             WHERE ms.campaign_id = c.id AND ms.archived_at IS NULL),
            0
        ) as strategies_count,

        COALESCE(
            (SELECT COUNT(*)::INTEGER
             FROM synthetic_personas sp
             WHERE sp.campaign_id = c.id AND sp.archived_at IS NULL),
            0
        ) as personas_count,

        COALESCE(
            (SELECT COUNT(*)::INTEGER
             FROM agent_outputs ao
             WHERE (ao.content->>'campaign_id')::UUID = c.id
               AND ao.agent_type = 'content'
               AND ao.archived_at IS NULL),
            0
        ) as content_outputs_count

    FROM campaigns c
    WHERE c.id = p_campaign_id
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Comprehensive function returning ALL campaign fields plus computed metrics';



CREATE OR REPLACE FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
  v_org_type TEXT;
  v_schema_name TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Determine schema
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- Route to appropriate schema using dynamic SQL
  EXECUTE format('
    SELECT to_jsonb(campaign_data)
    FROM (
      SELECT
        c.id,
        c.org_id,
        c.client_id,
        c.name,
        c.description,
        c.status,
        c.campaign_type,
        c.priority_level,
        c.budget_cents,
        c.spent_cents,
        c.objectives,
        c.metrics,
        c.start_date,
        c.end_date,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.target_audience,
        c.archived_at,
        c.archived_by,
        c.archive_reason,
        c.updated_by,
        c.marketing_channels,
        c.content_pillars,
        c.target_personas,
        c.success_metrics,
        c.competitor_context,
        c.geographic_target,
        c.tags,
        c.reach,
        c.metadata,
        CASE
          WHEN c.budget_cents > 0
          THEN ROUND((c.spent_cents::NUMERIC / c.budget_cents::NUMERIC) * 100, 2)
          ELSE 0::NUMERIC
        END as budget_utilization_percentage,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM marketing_strategies ms
           WHERE ms.campaign_id = c.id AND ms.archived_at IS NULL),
          0
        ) as strategies_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM agent_outputs ao
           WHERE ao.agent_type = ''persona''
             AND ao.campaign_id = c.id
             AND ao.archived_at IS NULL),
          0
        ) as personas_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM agent_outputs ao
           WHERE ao.agent_type = ''content''
             AND (ao.content->>''campaign_id'')::UUID = c.id
             AND ao.archived_at IS NULL),
          0
        ) as content_outputs_count
      FROM %I.campaigns c
      LEFT JOIN %I.clients cl ON c.client_id = cl.id
      WHERE c.id = $1
        AND c.archived_at IS NULL
        -- ✅ FIX: Multi-tenant validation
        AND (
          -- SME: Direct org ownership (no client)
          (c.org_id = $2 AND c.client_id IS NULL)
          OR
          -- Agency: Via client ownership
          (c.client_id IS NOT NULL AND cl.org_id = $2)
        )
    ) campaign_data
  ', v_schema_name, v_schema_name)
  INTO v_result
  USING p_campaign_id, p_org_id;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'P3: Schema-aware router for campaign details with all fields and computed metrics.
Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs.
Returns JSONB object with complete campaign data and related counts.
Fixed in migration 257 (2025-11-14) to support multi-tenant validation.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_campaigns" bigint, "total_spend" numeric, "total_revenue" numeric, "avg_roi" numeric, "campaigns_tracked" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT campaign_name)::BIGINT AS total_campaigns,
    COALESCE(SUM(spend), 0) AS total_spend,
    COALESCE(SUM(revenue), 0) AS total_revenue,
    ROUND(
      CASE
        WHEN SUM(spend) > 0 THEN
          (SUM(revenue) - SUM(spend)) / SUM(spend) * 100
        ELSE NULL
      END::NUMERIC, 2
    ) AS avg_roi,
    ARRAY_AGG(DISTINCT campaign_name) AS campaigns_tracked
  FROM campaign_metrics
  WHERE org_id = p_org_id
    AND (p_start_date IS NULL OR metric_date >= p_start_date)
    AND (p_end_date IS NULL OR metric_date <= p_end_date);
END;
$$;


ALTER FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Get aggregated campaign metrics for dashboard (total spend, revenue, ROI, campaigns tracked)';



CREATE OR REPLACE FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer DEFAULT 30) RETURNS TABLE("total_campaigns" integer, "active_campaigns" integer, "completed_campaigns" integer, "draft_campaigns" integer, "paused_campaigns" integer, "total_budget_cents" bigint, "total_spent_cents" bigint, "avg_budget_utilization" numeric, "campaigns_by_type" "jsonb", "performance_trends" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  campaigns_by_type_json JSONB;
  performance_trends_json JSONB;
BEGIN
  -- Get campaigns by type
  SELECT json_agg(
    json_build_object(
      'type', COALESCE(campaign_type, 'unspecified'),
      'count', count,
      'percentage', ROUND((count::NUMERIC / total_count::NUMERIC) * 100, 1)
    )
  ) INTO campaigns_by_type_json
  FROM (
    SELECT
      campaign_type,
      COUNT(*) as count,
      (SELECT COUNT(*) FROM campaigns WHERE org_id = p_org_id AND archived_at IS NULL) as total_count
    FROM campaigns
    WHERE org_id = p_org_id AND archived_at IS NULL
    GROUP BY campaign_type
  ) type_counts;

  -- Get performance trends (simplified)
  SELECT json_agg(
    json_build_object(
      'date', date_created,
      'campaigns_created', campaigns_created,
      'budget_allocated', budget_allocated
    ) ORDER BY date_created
  ) INTO performance_trends_json
  FROM (
    SELECT
      DATE(created_at) as date_created,
      COUNT(*) as campaigns_created,
      COALESCE(SUM(budget_cents), 0) as budget_allocated
    FROM campaigns
    WHERE org_id = p_org_id
      AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_period_days)
      AND archived_at IS NULL
    GROUP BY DATE(created_at)
    ORDER BY date_created
    LIMIT 30
  ) daily_stats;

  RETURN QUERY
  SELECT
    COALESCE(COUNT(*), 0)::INT as total_campaigns,
    COALESCE(COUNT(*) FILTER (WHERE status = 'active'), 0)::INT as active_campaigns,
    COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)::INT as completed_campaigns,
    COALESCE(COUNT(*) FILTER (WHERE status = 'draft'), 0)::INT as draft_campaigns,
    COALESCE(COUNT(*) FILTER (WHERE status = 'paused'), 0)::INT as paused_campaigns,
    COALESCE(SUM(budget_cents), 0)::BIGINT as total_budget_cents,
    COALESCE(SUM(spent_cents), 0)::BIGINT as total_spent_cents,
    CASE
      WHEN SUM(budget_cents) > 0
      THEN ROUND(AVG(spent_cents::NUMERIC / NULLIF(budget_cents, 0)) * 100, 2)
      ELSE 0::NUMERIC
    END as avg_budget_utilization,
    COALESCE(campaigns_by_type_json, '[]'::JSONB) as campaigns_by_type,
    COALESCE(performance_trends_json, '[]'::JSONB) as performance_trends
  FROM campaigns
  WHERE org_id = p_org_id
    AND archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer) IS 'Returns campaign performance analytics and trends.
Provides aggregated statistics for reporting. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_period_days" integer DEFAULT 30) RETURNS TABLE("total_campaigns" integer, "active_campaigns" integer, "completed_campaigns" integer, "draft_campaigns" integer, "paused_campaigns" integer, "total_budget_cents" bigint, "total_spent_cents" bigint, "avg_budget_utilization" numeric, "campaigns_by_type" "jsonb", "performance_trends" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    campaigns_by_type_json JSONB;
    performance_trends_json JSONB;
BEGIN
    -- Schema routing: if client_id is provided, query agency.campaigns
    -- Otherwise, query public.campaigns (SME users)
    IF p_client_id IS NOT NULL THEN
        -- AGENCY CONTEXT: Query agency.campaigns

        -- Get campaigns by type
        SELECT json_agg(
            json_build_object(
                'type', COALESCE(campaign_type, 'unspecified'),
                'count', count,
                'percentage', ROUND((count::NUMERIC / total_count::NUMERIC) * 100, 1)
            )
        ) INTO campaigns_by_type_json
        FROM (
            SELECT
                campaign_type,
                COUNT(*) as count,
                (SELECT COUNT(*) FROM agency.campaigns WHERE org_id = p_org_id AND client_id = p_client_id AND archived_at IS NULL) as total_count
            FROM agency.campaigns
            WHERE org_id = p_org_id AND client_id = p_client_id AND archived_at IS NULL
            GROUP BY campaign_type
        ) type_counts;

        -- Get performance trends
        SELECT json_agg(
            json_build_object(
                'date', date_created,
                'campaigns_created', campaigns_created,
                'budget_allocated', budget_allocated
            ) ORDER BY date_created
        ) INTO performance_trends_json
        FROM (
            SELECT
                DATE(created_at) as date_created,
                COUNT(*) as campaigns_created,
                COALESCE(SUM(budget_cents), 0) as budget_allocated
            FROM agency.campaigns
            WHERE org_id = p_org_id
                AND client_id = p_client_id
                AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_period_days)
                AND archived_at IS NULL
            GROUP BY DATE(created_at)
            ORDER BY date_created
            LIMIT 30
        ) daily_stats;

        RETURN QUERY
        SELECT
            COALESCE(COUNT(*), 0)::INT as total_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'active'), 0)::INT as active_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)::INT as completed_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'draft'), 0)::INT as draft_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'paused'), 0)::INT as paused_campaigns,
            COALESCE(SUM(budget_cents), 0)::BIGINT as total_budget_cents,
            COALESCE(SUM(spent_cents), 0)::BIGINT as total_spent_cents,
            CASE
                WHEN SUM(budget_cents) > 0
                THEN ROUND(AVG(spent_cents::NUMERIC / NULLIF(budget_cents, 0)) * 100, 2)
                ELSE 0::NUMERIC
            END as avg_budget_utilization,
            COALESCE(campaigns_by_type_json, '[]'::JSONB) as campaigns_by_type,
            COALESCE(performance_trends_json, '[]'::JSONB) as performance_trends
        FROM agency.campaigns
        WHERE org_id = p_org_id
            AND client_id = p_client_id
            AND archived_at IS NULL;

    ELSE
        -- SME CONTEXT: Query public.campaigns

        -- Get campaigns by type
        SELECT json_agg(
            json_build_object(
                'type', COALESCE(campaign_type, 'unspecified'),
                'count', count,
                'percentage', ROUND((count::NUMERIC / total_count::NUMERIC) * 100, 1)
            )
        ) INTO campaigns_by_type_json
        FROM (
            SELECT
                campaign_type,
                COUNT(*) as count,
                (SELECT COUNT(*) FROM public.campaigns WHERE org_id = p_org_id AND archived_at IS NULL) as total_count
            FROM public.campaigns
            WHERE org_id = p_org_id AND archived_at IS NULL
            GROUP BY campaign_type
        ) type_counts;

        -- Get performance trends
        SELECT json_agg(
            json_build_object(
                'date', date_created,
                'campaigns_created', campaigns_created,
                'budget_allocated', budget_allocated
            ) ORDER BY date_created
        ) INTO performance_trends_json
        FROM (
            SELECT
                DATE(created_at) as date_created,
                COUNT(*) as campaigns_created,
                COALESCE(SUM(budget_cents), 0) as budget_allocated
            FROM public.campaigns
            WHERE org_id = p_org_id
                AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_period_days)
                AND archived_at IS NULL
            GROUP BY DATE(created_at)
            ORDER BY date_created
            LIMIT 30
        ) daily_stats;

        RETURN QUERY
        SELECT
            COALESCE(COUNT(*), 0)::INT as total_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'active'), 0)::INT as active_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)::INT as completed_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'draft'), 0)::INT as draft_campaigns,
            COALESCE(COUNT(*) FILTER (WHERE status = 'paused'), 0)::INT as paused_campaigns,
            COALESCE(SUM(budget_cents), 0)::BIGINT as total_budget_cents,
            COALESCE(SUM(spent_cents), 0)::BIGINT as total_spent_cents,
            CASE
                WHEN SUM(budget_cents) > 0
                THEN ROUND(AVG(spent_cents::NUMERIC / NULLIF(budget_cents, 0)) * 100, 2)
                ELSE 0::NUMERIC
            END as avg_budget_utilization,
            COALESCE(campaigns_by_type_json, '[]'::JSONB) as campaigns_by_type,
            COALESCE(performance_trends_json, '[]'::JSONB) as performance_trends
        FROM public.campaigns
        WHERE org_id = p_org_id
            AND archived_at IS NULL;

    END IF;
END;
$$;


ALTER FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_period_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_period_days" integer) IS 'Campaign performance aggregation with schema routing. Queries agency.campaigns when client_id provided, otherwise queries public.campaigns for SME users. Migration 210.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("total_spend" numeric, "total_revenue" numeric, "total_impressions" bigint, "total_clicks" bigint, "total_conversions" bigint, "avg_ctr" numeric, "avg_cpc" numeric, "conversion_rate" numeric, "roi_percentage" numeric, "first_activity_date" "date", "last_activity_date" "date", "days_active" integer, "sources_count" integer, "records_count" integer, "has_data" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_campaign_name TEXT;
    v_rows_updated INTEGER;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Verify campaign exists and belongs to org
    IF NOT EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.id = p_campaign_id
          AND c.org_id = p_org_id
          AND c.archived_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Campaign not found or does not belong to organization';
    END IF;

    -- PHASE 1 FIX: Get campaign name for matching
    SELECT name INTO v_campaign_name
    FROM campaigns
    WHERE id = p_campaign_id
      AND org_id = p_org_id;

    -- CRITICAL FIX: Auto-link NULL campaign_ids by matching campaign names
    -- This retroactively links CSV-uploaded metrics to campaigns
    UPDATE campaign_metrics cm
    SET campaign_id = p_campaign_id,
        updated_at = NOW()
    WHERE cm.campaign_id IS NULL
      AND cm.campaign_name = v_campaign_name
      AND cm.org_id = p_org_id;

    -- Get count of rows updated (for debugging/logging)
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    -- Log if any rows were linked (optional, for monitoring)
    IF v_rows_updated > 0 THEN
        RAISE NOTICE 'Auto-linked % campaign_metrics rows to campaign %', v_rows_updated, p_campaign_id;
    END IF;

    -- Aggregate metrics (now includes previously NULL campaign_id rows)
    RETURN QUERY
    SELECT
        -- Aggregated totals
        COALESCE(SUM(cm.spend), 0)::NUMERIC as total_spend,
        COALESCE(SUM(cm.revenue), 0)::NUMERIC as total_revenue,
        COALESCE(SUM(cm.impressions), 0)::BIGINT as total_impressions,
        COALESCE(SUM(cm.clicks), 0)::BIGINT as total_clicks,
        COALESCE(SUM(cm.conversions), 0)::BIGINT as total_conversions,

        -- Calculated metrics (CTR = clicks/impressions * 100)
        CASE
            WHEN SUM(cm.impressions) > 0
            THEN ROUND((SUM(cm.clicks)::NUMERIC / SUM(cm.impressions)::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END as avg_ctr,

        -- CPC = spend/clicks
        CASE
            WHEN SUM(cm.clicks) > 0
            THEN ROUND(SUM(cm.spend)::NUMERIC / SUM(cm.clicks)::NUMERIC, 2)
            ELSE 0::NUMERIC
        END as avg_cpc,

        -- Conversion rate = conversions/impressions * 100
        CASE
            WHEN SUM(cm.impressions) > 0
            THEN ROUND((SUM(cm.conversions)::NUMERIC / SUM(cm.impressions)::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END as conversion_rate,

        -- ROI = (revenue - spend) / spend * 100
        CASE
            WHEN SUM(cm.spend) > 0
            THEN ROUND(((SUM(cm.revenue) - SUM(cm.spend)) / SUM(cm.spend)) * 100, 2)
            ELSE 0::NUMERIC
        END as roi_percentage,

        -- Time range
        MIN(cm.metric_date) as first_activity_date,
        MAX(cm.metric_date) as last_activity_date,
        COUNT(DISTINCT cm.metric_date)::INTEGER as days_active,

        -- Data completeness
        COUNT(DISTINCT cm.source)::INTEGER as sources_count,
        COUNT(*)::INTEGER as records_count,
        CASE
            WHEN COUNT(*) > 0 THEN TRUE
            ELSE FALSE
        END as has_data

    FROM campaign_metrics cm
    WHERE cm.campaign_id = p_campaign_id
      AND cm.org_id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Phase 1: Aggregates campaign_metrics with auto-linking for NULL campaign_ids via campaign name matching. Returns zero values when no metrics exist.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("total_spend" numeric, "total_revenue" numeric, "total_impressions" bigint, "total_clicks" bigint, "total_conversions" bigint, "avg_ctr" numeric, "avg_cpc" numeric, "conversion_rate" numeric, "roi_percentage" numeric, "first_activity_date" "date", "last_activity_date" "date", "days_active" integer, "sources_count" integer, "records_count" integer, "has_data" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
    v_org_type TEXT;
    v_schema_name TEXT;
    v_user_org_id UUID;
    v_campaign_name TEXT;
    v_rows_updated INTEGER;
    v_campaign_exists BOOLEAN := FALSE;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Detect organization type
    SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;
    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Determine schema
    v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

    -- ✅ FIX: Verify campaign exists with multi-tenant validation
    EXECUTE format('
        SELECT EXISTS(
            SELECT 1 FROM %I.campaigns c
            LEFT JOIN %I.clients cl ON c.client_id = cl.id
            WHERE c.id = $1
              AND c.archived_at IS NULL
              AND (
                -- SME: Direct org ownership
                (c.org_id = $2 AND c.client_id IS NULL)
                OR
                -- Agency: Via client ownership
                (c.client_id IS NOT NULL AND cl.org_id = $2)
              )
        )
    ', v_schema_name, v_schema_name)
    INTO v_campaign_exists
    USING p_campaign_id, p_org_id;

    IF NOT v_campaign_exists THEN
        RAISE EXCEPTION 'Campaign not found or does not belong to organization';
    END IF;

    -- Get campaign name for auto-linking metrics
    EXECUTE format('
        SELECT c.name
        FROM %I.campaigns c
        LEFT JOIN %I.clients cl ON c.client_id = cl.id
        WHERE c.id = $1
          AND (
            (c.org_id = $2 AND c.client_id IS NULL)
            OR
            (c.client_id IS NOT NULL AND cl.org_id = $2)
          )
    ', v_schema_name, v_schema_name)
    INTO v_campaign_name
    USING p_campaign_id, p_org_id;

    -- CRITICAL FIX: Auto-link NULL campaign_ids by matching campaign names
    -- Note: campaign_metrics table is not schema-separated (always in public)
    UPDATE campaign_metrics cm
    SET campaign_id = p_campaign_id,
        updated_at = NOW()
    WHERE cm.campaign_id IS NULL
      AND cm.campaign_name = v_campaign_name
      AND cm.org_id = p_org_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated > 0 THEN
        RAISE NOTICE 'Auto-linked % campaign_metrics rows to campaign %', v_rows_updated, p_campaign_id;
    END IF;

    -- Aggregate metrics (campaign_metrics is always in public schema)
    RETURN QUERY
    SELECT
        -- Aggregated totals
        COALESCE(SUM(cm.spend), 0)::NUMERIC as total_spend,
        COALESCE(SUM(cm.revenue), 0)::NUMERIC as total_revenue,
        COALESCE(SUM(cm.impressions), 0)::BIGINT as total_impressions,
        COALESCE(SUM(cm.clicks), 0)::BIGINT as total_clicks,
        COALESCE(SUM(cm.conversions), 0)::BIGINT as total_conversions,

        -- Calculated metrics (CTR = clicks/impressions * 100)
        CASE
            WHEN SUM(cm.impressions) > 0
            THEN ROUND((SUM(cm.clicks)::NUMERIC / SUM(cm.impressions)::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END as avg_ctr,

        -- CPC = spend/clicks
        CASE
            WHEN SUM(cm.clicks) > 0
            THEN ROUND(SUM(cm.spend)::NUMERIC / SUM(cm.clicks)::NUMERIC, 2)
            ELSE 0::NUMERIC
        END as avg_cpc,

        -- Conversion rate = conversions/impressions * 100
        CASE
            WHEN SUM(cm.impressions) > 0
            THEN ROUND((SUM(cm.conversions)::NUMERIC / SUM(cm.impressions)::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END as conversion_rate,

        -- ROI = (revenue - spend) / spend * 100
        CASE
            WHEN SUM(cm.spend) > 0
            THEN ROUND(((SUM(cm.revenue) - SUM(cm.spend)) / SUM(cm.spend)) * 100, 2)
            ELSE 0::NUMERIC
        END as roi_percentage,

        -- Time range
        MIN(cm.metric_date) as first_activity_date,
        MAX(cm.metric_date) as last_activity_date,
        COUNT(DISTINCT cm.metric_date)::INTEGER as days_active,

        -- Data completeness
        COUNT(DISTINCT cm.source)::INTEGER as sources_count,
        COUNT(*)::INTEGER as records_count,
        CASE
            WHEN COUNT(*) > 0 THEN TRUE
            ELSE FALSE
        END as has_data

    FROM campaign_metrics cm
    WHERE cm.campaign_id = p_campaign_id
      AND cm.org_id = p_org_id;
END;
$_$;


ALTER FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Schema-aware router for campaign performance summary with multi-tenant validation.
Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs.
Aggregates campaign_metrics (always in public schema) with auto-linking.
Fixed in migration 259 (2025-11-14) to resolve agency user access issues.';



CREATE OR REPLACE FUNCTION "public"."get_campaign_realtime_metrics"("p_org_id" "uuid") RETURNS TABLE("campaign_id" "uuid", "campaign_name" "text", "budget" numeric, "spent" numeric, "budget_utilization" numeric, "performance_score" numeric, "alert_level" "text", "status" "text", "conversions" integer, "reach" integer, "cost_per_click" numeric, "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as campaign_id,
    c.name as campaign_name,
    (c.budget_cents / 100.0)::NUMERIC as budget,
    (c.spent_cents / 100.0)::NUMERIC as spent,
    CASE
      WHEN c.budget_cents > 0 THEN ROUND((c.spent_cents::NUMERIC / c.budget_cents * 100), 2)
      ELSE 0
    END as budget_utilization,
    -- Performance score based on conversions and efficiency
    CASE
      WHEN c.budget_cents > 0 THEN
        LEAST(100, GREATEST(0,
          (COALESCE(c.conversions, 0) * 100.0 / GREATEST(c.budget_cents / 100.0, 1))
        ))
      ELSE 0
    END::NUMERIC as performance_score,
    -- Alert level based on budget utilization and performance
    CASE
      WHEN c.budget_cents = 0 THEN 'normal'
      WHEN (c.spent_cents::NUMERIC / c.budget_cents * 100) >= 100 THEN 'critical'
      WHEN (c.spent_cents::NUMERIC / c.budget_cents * 100) >= 90 THEN 'warning'
      WHEN (c.spent_cents::NUMERIC / c.budget_cents * 100) >= 75 THEN 'caution'
      ELSE 'normal'
    END as alert_level,
    c.status,
    COALESCE(c.conversions, 0) as conversions,
    COALESCE(c.reach, 0) as reach,
    COALESCE(c.cost_per_click, 0) as cost_per_click,
    c.updated_at as last_updated
  FROM campaigns c
  WHERE c.org_id = p_org_id
    AND c.archived_at IS NULL
  ORDER BY budget_utilization DESC NULLS LAST, c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_campaign_realtime_metrics"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "client_name" "text", "name" "text", "description" "text", "campaign_type" "text", "priority_level" "text", "budget_cents" integer, "spent_cents" integer, "budget_utilization_percentage" numeric, "start_date" "date", "end_date" "date", "marketing_channels" "jsonb", "geographic_target" "text", "target_audience" "text", "success_metrics" "jsonb", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid", "creator_email" "text", "archived_at" timestamp with time zone, "is_active" boolean, "days_remaining" integer, "progress_percentage" numeric, "strategies_count" integer, "personas_count" integer, "content_outputs_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.org_id,
    c.client_id,
    cl.name::TEXT as client_name,
    c.name::TEXT,
    c.description::TEXT,
    c.campaign_type::TEXT,
    c.priority_level::TEXT,
    c.budget_cents::INT,
    c.spent_cents::INT,
    CASE
      WHEN c.budget_cents > 0
      THEN ROUND((c.spent_cents::NUMERIC / c.budget_cents::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as budget_utilization_percentage,
    c.start_date,
    c.end_date,
    c.marketing_channels,
    c.geographic_target::TEXT,
    c.target_audience::TEXT,
    c.success_metrics,
    c.status::TEXT,
    c.created_at,
    c.updated_at,
    c.created_by,
    u.email::TEXT as creator_email,
    -- Standardized archive field
    c.archived_at,
    -- Deprecated: Kept for backward compatibility, but use archived_at IS NULL instead
    (c.archived_at IS NULL)::BOOLEAN as is_active,
    CASE
      WHEN c.end_date IS NOT NULL
      THEN (c.end_date - CURRENT_DATE)::INT
      ELSE NULL
    END as days_remaining,
    CASE
      WHEN c.start_date IS NOT NULL AND c.end_date IS NOT NULL
      THEN GREATEST(0, LEAST(100,
        ROUND(
          ((CURRENT_DATE - c.start_date)::NUMERIC /
           (c.end_date - c.start_date)::NUMERIC) * 100, 1
        )
      ))
      ELSE 0::NUMERIC
    END as progress_percentage,
    -- Relationship counts using unified agent_outputs table
    COALESCE(ms_count.count, 0)::INT as strategies_count,
    COALESCE(persona_count.count, 0)::INT as personas_count,
    COALESCE(content_count.count, 0)::INT as content_outputs_count
  FROM campaigns c
  LEFT JOIN clients cl ON c.client_id = cl.id
  LEFT JOIN users u ON c.created_by = u.id
  LEFT JOIN (
    SELECT ms.campaign_id, count(*)
    FROM marketing_strategies ms
    WHERE ms.archived_at IS NULL
    GROUP BY ms.campaign_id
  ) ms_count ON c.id = ms_count.campaign_id
  LEFT JOIN (
    SELECT sp.campaign_id, count(*)
    FROM synthetic_personas sp
    WHERE sp.archived_at IS NULL
    GROUP BY sp.campaign_id
  ) persona_count ON c.id = persona_count.campaign_id
  LEFT JOIN (
    SELECT
      COALESCE(
        (ao.metadata->>'campaign_id')::UUID,
        (ao.content->>'campaign_id')::UUID
      ) as campaign_id,
      count(*)
    FROM agent_outputs ao
    WHERE ao.archived_at IS NULL
      AND ao.agent_type = 'content'
      AND (
        (ao.metadata->>'campaign_id') IS NOT NULL OR
        (ao.content->>'campaign_id') IS NOT NULL
      )
    GROUP BY COALESCE(
      (ao.metadata->>'campaign_id')::UUID,
      (ao.content->>'campaign_id')::UUID
    )
  ) content_count ON c.id = content_count.campaign_id
  WHERE c.org_id = p_org_id
    AND (p_include_archived OR c.archived_at IS NULL)
    AND (p_client_id IS NULL OR c.client_id = p_client_id)
    AND (p_status IS NULL OR c.status = p_status)
  ORDER BY
    c.priority_level DESC NULLS LAST,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) IS 'Version 1.2: Added archived_at field to support unified archive pattern.
The is_active field is deprecated - use archived_at IS NULL instead.
Frontend can now filter: allCampaigns.filter(c => !c.archived_at) for status counts.';



CREATE OR REPLACE FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
  v_org_type TEXT;
  v_schema_name TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Determine schema
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- Route to appropriate schema using dynamic SQL
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(row_to_json(campaigns_data)), ''[]''::jsonb)
    FROM (
      SELECT
        c.id,
        c.org_id,
        c.client_id,
        cl.name::TEXT as client_name,
        c.name::TEXT,
        c.description::TEXT,
        c.campaign_type::TEXT,
        c.priority_level::TEXT,
        c.budget_cents::INT,
        c.spent_cents::INT,
        CASE
          WHEN c.budget_cents > 0
          THEN ROUND((c.spent_cents::NUMERIC / c.budget_cents::NUMERIC) * 100, 2)
          ELSE 0::NUMERIC
        END as budget_utilization_percentage,
        c.start_date,
        c.end_date,
        c.marketing_channels,
        c.geographic_target,
        c.target_audience,
        c.success_metrics,
        c.status,
        c.created_at,
        c.updated_at,
        c.created_by,
        u.email::TEXT as creator_email,
        c.archived_at,
        (c.archived_at IS NOT NULL) as is_archived,
        (c.archived_at IS NULL) as is_active,
        CASE
          WHEN c.end_date IS NOT NULL AND c.end_date >= CURRENT_DATE
          THEN (c.end_date - CURRENT_DATE)
          ELSE 0
        END as days_remaining,
        CASE
          WHEN c.end_date IS NOT NULL AND c.start_date IS NOT NULL AND c.end_date > c.start_date
          THEN ROUND(
            ((CURRENT_DATE - c.start_date)::NUMERIC /
             NULLIF((c.end_date - c.start_date)::NUMERIC, 0)) * 100,
            2
          )
          ELSE 0::NUMERIC
        END as progress_percentage,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM marketing_strategies ms
           WHERE ms.campaign_id = c.id AND ms.archived_at IS NULL),
          0
        ) as strategies_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM agent_outputs ao
           WHERE ao.agent_type = ''persona''
             AND ao.campaign_id = c.id
             AND ao.archived_at IS NULL),
          0
        ) as personas_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM agent_outputs ao
           WHERE ao.agent_type = ''content''
             AND (ao.content->>''campaign_id'')::UUID = c.id
             AND ao.archived_at IS NULL),
          0
        ) as content_outputs_count
      FROM %I.campaigns c
      LEFT JOIN %I.clients cl ON cl.id = c.client_id AND cl.archived_at IS NULL
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.org_id = $1
        AND ($2 OR c.archived_at IS NULL)
        AND ($3::UUID IS NULL OR c.client_id = $3)
        AND ($4::TEXT IS NULL OR c.status = $4)
      ORDER BY c.created_at DESC
      LIMIT $5 OFFSET $6
    ) campaigns_data
  ', v_schema_name, v_schema_name)
  INTO v_result
  USING p_org_id, p_include_archived, p_client_id, p_status, p_limit, p_offset;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) IS 'P3: Schema-aware router for campaigns list with client joins and computed fields.
Routes to agency.campaigns/clients for AGENCY orgs, public.campaigns/clients for SME orgs.
Returns JSONB array with campaign data, metadata, and related counts.
Migration 169, 2025-10-27.';



CREATE OR REPLACE FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Require client_id, query agency.campaigns
        IF p_client_id IS NULL THEN
            RAISE EXCEPTION 'client_id required for agency organizations';
        END IF;

        SELECT jsonb_agg(row_to_json(c)::jsonb) INTO v_result
        FROM agency.get_campaigns_by_client(p_client_id, p_limit) c;

    ELSE
        -- SME: Query public.campaigns
        SELECT jsonb_agg(row_to_json(c)::jsonb) INTO v_result
        FROM (
            SELECT id, name, description, status, budget, spent, start_date, end_date, priority_level, created_at
            FROM public.campaigns
            WHERE org_id = p_org_id
              AND archived_at IS NULL
            ORDER BY created_at DESC
            LIMIT p_limit
        ) c;
    END IF;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_limit" integer) IS 'Router function that gets campaigns from correct schema based on org_type. Week 3. Migration 160.';



CREATE OR REPLACE FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Get from agency.clients
    SELECT row_to_json(c)::jsonb INTO v_result
    FROM agency.clients c
    WHERE c.id = p_client_id
      AND c.org_id = p_org_id;

  ELSE
    -- SME: Get from public.clients
    SELECT row_to_json(c)::jsonb INTO v_result
    FROM public.clients c
    WHERE c.id = p_client_id
      AND c.org_id = p_org_id;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") IS 'Router function for single client fetch by ID.
Routes to agency.clients for AGENCY orgs, public.clients for SME orgs.
Returns full client record as JSONB.
Phase 2, Migration 166.';



CREATE OR REPLACE FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Get client branding from agency.clients.settings
    SELECT jsonb_build_object(
      'clientName', c.name,
      'brandKit', COALESCE(c.settings->'branding', '{}'::jsonb)
    ) INTO v_result
    FROM agency.clients c
    WHERE c.id = p_client_id
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;

  ELSE
    -- SME: Get org branding from public.clients.settings
    SELECT jsonb_build_object(
      'clientName', c.name,
      'brandKit', COALESCE(c.settings->'branding', '{}'::jsonb)
    ) INTO v_result
    FROM public.clients c
    WHERE c.id = p_client_id
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;
  END IF;

  -- Return empty object if not found (graceful fallback)
  RETURN COALESCE(v_result, '{"clientName": "Unknown", "brandKit": {}}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") IS 'P1 CRITICAL: Router function for white-label branding on guest dashboards.
Routes to agency.clients for AGENCY orgs, public.clients for SME orgs.
Returns brandKit JSONB from settings.branding path with logo_url, primary_color, etc.
Guest dashboards use this to apply client-specific branding.
Fixed in Migration 167 to use settings->>branding instead of brand_kit column.';



CREATE OR REPLACE FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Get from agency.clients by slug
    SELECT row_to_json(c)::jsonb INTO v_result
    FROM agency.clients c
    WHERE c.slug = p_slug
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;

  ELSE
    -- SME: Get from public.clients by slug
    SELECT row_to_json(c)::jsonb INTO v_result
    FROM public.clients c
    WHERE c.slug = p_slug
      AND c.org_id = p_org_id
      AND c.archived_at IS NULL;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") IS 'Router function for client lookup by slug (URL routing).
Routes to agency.clients for AGENCY orgs, public.clients for SME orgs.
Returns full client record as JSONB or NULL if not found.
Phase 2, Migration 166.';



CREATE OR REPLACE FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("client_info" "jsonb", "campaign_count" integer, "active_campaigns" "jsonb", "team_members" "jsonb", "recent_activity" "jsonb", "metrics_summary" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  client_record RECORD;
BEGIN
  -- Validate org ownership and client exists
  SELECT * INTO client_record
  FROM clients
  WHERE id = p_client_id
    AND org_id = p_org_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RETURN;  -- Silently fail if no access (security by obscurity)
  END IF;

  -- Return aggregated client data in single query
  RETURN QUERY
  SELECT
    -- Client info
    to_jsonb(client_record) AS client_info,

    -- Campaign count
    (SELECT COUNT(*)::INT
     FROM campaigns
     WHERE client_id = p_client_id AND archived_at IS NULL
    ) AS campaign_count,

    -- Active campaigns (limit 10 for performance)
    (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
     FROM (
       SELECT id, name, status, start_date, end_date, budget, spent, conversions, reach
       FROM campaigns
       WHERE client_id = p_client_id
         AND status = 'active'
         AND archived_at IS NULL
       ORDER BY created_at DESC
       LIMIT 10
     ) c
    ) AS active_campaigns,

    -- Team members (all users in org)
    (SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
     FROM (
       SELECT id, email, full_name, created_at
       FROM users
       WHERE org_id = p_org_id AND archived_at IS NULL
       ORDER BY created_at ASC
       LIMIT 20
     ) u
    ) AS team_members,

    -- Recent activity (if activity_log table exists, otherwise empty array)
    '[]'::jsonb AS recent_activity,

    -- Metrics summary
    (SELECT jsonb_build_object(
      'total_spend', COALESCE(SUM(spent), 0),
      'total_budget', COALESCE(SUM(budget), 0),
      'total_conversions', COALESCE(SUM(conversions), 0),
      'total_reach', COALESCE(SUM(reach), 0),
      'active_campaign_count', COUNT(*) FILTER (WHERE status = 'active'),
      'completed_campaign_count', COUNT(*) FILTER (WHERE status = 'completed')
    )
     FROM campaigns
     WHERE client_id = p_client_id AND archived_at IS NULL
    ) AS metrics_summary;
END;
$$;


ALTER FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Version: 1.0 - Returns comprehensive client dashboard data
Performance: < 50ms target
Dependencies: clients, campaigns, users tables';



CREATE OR REPLACE FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("client_info" "jsonb", "campaign_count" integer, "active_campaigns" "jsonb", "team_members" "jsonb", "recent_activity" "jsonb", "metrics_summary" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
  v_org_type TEXT;
  v_schema_name TEXT;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Determine schema based on org type
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- Route to appropriate schema using dynamic SQL
  RETURN QUERY EXECUTE format('
    WITH client_record AS (
      SELECT *
      FROM %I.clients
      WHERE id = $1
        AND org_id = $2
        AND archived_at IS NULL
    ),
    campaign_counts AS (
      SELECT
        COUNT(*)::INT AS total_count,
        COUNT(*) FILTER (WHERE status = ''active'')::INT AS active_count,
        COUNT(*) FILTER (WHERE status = ''completed'')::INT AS completed_count
      FROM %I.campaigns
      WHERE client_id = $1 AND archived_at IS NULL
    ),
    active_campaign_list AS (
      SELECT COALESCE(jsonb_agg(to_jsonb(c)), ''[]''::jsonb) AS campaigns
      FROM (
        SELECT id, name, status, start_date, end_date, budget_cents, spent_cents
        FROM %I.campaigns
        WHERE client_id = $1
          AND status = ''active''
          AND archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 10
      ) c
    ),
    team_list AS (
      SELECT COALESCE(jsonb_agg(to_jsonb(u)), ''[]''::jsonb) AS members
      FROM (
        SELECT id, email, full_name, created_at
        FROM users
        WHERE org_id = $2 AND archived_at IS NULL
        ORDER BY created_at ASC
        LIMIT 20
      ) u
    ),
    campaign_metrics AS (
      SELECT jsonb_build_object(
        ''total_spend'', COALESCE(SUM(spent_cents) / 100.0, 0),
        ''total_budget'', COALESCE(SUM(budget_cents) / 100.0, 0),
        ''active_campaign_count'', COUNT(*) FILTER (WHERE status = ''active''),
        ''completed_campaign_count'', COUNT(*) FILTER (WHERE status = ''completed'')
      ) AS metrics
      FROM %I.campaigns
      WHERE client_id = $1 AND archived_at IS NULL
    )
    SELECT
      to_jsonb(client_record.*) AS client_info,
      campaign_counts.total_count AS campaign_count,
      active_campaign_list.campaigns AS active_campaigns,
      team_list.members AS team_members,
      ''[]''::jsonb AS recent_activity,
      campaign_metrics.metrics AS metrics_summary
    FROM client_record
    CROSS JOIN campaign_counts
    CROSS JOIN active_campaign_list
    CROSS JOIN team_list
    CROSS JOIN campaign_metrics
  ', v_schema_name, v_schema_name, v_schema_name, v_schema_name)
  USING p_client_id, p_org_id;

END;
$_$;


ALTER FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") IS 'P0 CRITICAL: Schema-aware router function for client dashboard data.
Routes to agency.clients/campaigns for AGENCY orgs, public.clients/campaigns for SME orgs.
Fixes client-scoped agent route redirects caused by non-schema-aware get_client_dashboard.
Returns comprehensive dashboard data: client info, campaign counts, active campaigns, team members, metrics.
Migration 168, 2025-10-27.';



CREATE OR REPLACE FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
  v_org_type TEXT;
  v_schema_name TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Determine schema
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- Route to appropriate schema using dynamic SQL
  -- NEW: Added LEFT JOIN with client_intelligence table
  EXECUTE format('
    SELECT to_jsonb(client_data)
    FROM (
      SELECT
        -- Basic client fields
        c.*,

        -- Campaign metadata (existing)
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id AND camp.archived_at IS NULL),
          0
        ) as campaigns_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id
             AND camp.status = ''active''
             AND camp.archived_at IS NULL),
          0
        ) as active_campaigns_count,
        COALESCE(
          (SELECT SUM(camp.budget_cents) / 100.0
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id AND camp.archived_at IS NULL),
          0
        ) as total_budget,
        (SELECT MAX(camp.updated_at)
         FROM %I.campaigns camp
         WHERE camp.client_id = c.id
        ) as last_activity_at,

        -- NEW: Client Intelligence fields
        ci.company_size,
        ci.company_stage,
        ci.business_model,
        ci.target_market,
        ci.key_competitors,
        ci.unique_value_proposition,
        ci.marketing_budget,
        ci.current_marketing_channels,
        ci.marketing_goals,
        ci.ai_insights,
        ci.persona_patterns,
        ci.content_themes,
        ci.campaign_preferences,
        ci.data_completeness_score,
        ci.last_enriched_at,
        ci.conversation_count,
        ci.last_interaction_at,
        ci.learning_milestones

      FROM %I.clients c
      LEFT JOIN %I.client_intelligence ci
        ON ci.client_id = c.id
        AND ci.org_id = c.org_id
      WHERE c.id = $1
        AND c.org_id = $2
        AND c.archived_at IS NULL
    ) client_data
  ', v_schema_name, v_schema_name, v_schema_name, v_schema_name, v_schema_name, v_schema_name)
  INTO v_result
  USING p_client_id, p_org_id;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") IS 'P3: Schema-aware router for client details with all fields, campaign metadata, AND client intelligence.
Routes to agency.clients/campaigns for AGENCY orgs, public.clients/campaigns for SME orgs.
Returns JSONB object with complete client data INCLUDING intelligence from agency.client_intelligence table.
Updated in Migration 185 (2025-10-29) to include client intelligence for agent context loading.';



CREATE OR REPLACE FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("campaign_performance" "jsonb", "channel_breakdown" "jsonb", "trend_data" "jsonb", "roi_summary" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Validate org ownership
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id
      AND org_id = p_org_id
      AND archived_at IS NULL
  ) THEN
    RETURN;  -- No access
  END IF;

  -- Return performance metrics
  RETURN QUERY
  SELECT
    -- Campaign performance (all campaigns)
    (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC), '[]'::jsonb)
     FROM (
       SELECT id, name, spent, budget, conversions, reach, status, start_date, end_date, created_at
       FROM campaigns
       WHERE client_id = p_client_id AND archived_at IS NULL
       ORDER BY created_at DESC
     ) c
    ) AS campaign_performance,

    -- Channel breakdown (aggregate from marketing_channels JSONB array)
    (SELECT COALESCE(jsonb_object_agg(channel_name, channel_data), '{}'::jsonb)
     FROM (
       SELECT
         channel_name,
         jsonb_build_object(
           'spend', SUM(c.spent),
           'campaigns', COUNT(*),
           'conversions', SUM(c.conversions)
         ) AS channel_data
       FROM campaigns c,
       jsonb_array_elements_text(c.marketing_channels) AS channel_name
       WHERE c.client_id = p_client_id AND c.archived_at IS NULL
       GROUP BY channel_name
     ) channel_agg
    ) AS channel_breakdown,

    -- Trend data (monthly aggregation)
    (SELECT COALESCE(jsonb_agg(to_jsonb(trend) ORDER BY trend.month DESC), '[]'::jsonb)
     FROM (
       SELECT
         date_trunc('month', created_at) AS month,
         SUM(spent) AS spend,
         SUM(budget) AS budget,
         SUM(conversions) AS conversions,
         COUNT(*) AS campaign_count
       FROM campaigns
       WHERE client_id = p_client_id AND archived_at IS NULL
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at) DESC
       LIMIT 12  -- Last 12 months
     ) trend
    ) AS trend_data,

    -- Performance summary
    (SELECT jsonb_build_object(
      'total_spend', COALESCE(SUM(spent), 0),
      'total_budget', COALESCE(SUM(budget), 0),
      'total_conversions', COALESCE(SUM(conversions), 0),
      'total_reach', COALESCE(SUM(reach), 0),
      'campaign_count', COUNT(*),
      'avg_conversions_per_campaign', COALESCE(AVG(conversions), 0)
    )
     FROM campaigns
     WHERE client_id = p_client_id AND archived_at IS NULL
    ) AS roi_summary;
END;
$$;


ALTER FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Version: 1.0 - Returns detailed client performance metrics
Performance: < 50ms target
Dependencies: campaigns table';



CREATE OR REPLACE FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "settings" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archived_by" "uuid", "archive_reason" "text", "is_archived" boolean, "created_by" "uuid", "updated_by" "uuid", "campaigns_count" integer, "active_campaigns_count" integer, "total_budget" numeric, "last_activity_at" timestamp with time zone)
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
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        c.settings,
        c.created_at,
        c.updated_at,
        c.archived_at,
        c.archived_by,
        c.archive_reason,
        c.is_archived,
        c.created_by,
        c.updated_by,
        -- Enhanced metadata from campaigns
        COALESCE(campaigns.total_campaigns, 0)::INTEGER AS campaigns_count,
        COALESCE(campaigns.active_campaigns, 0)::INTEGER AS active_campaigns_count,
        COALESCE(campaigns.total_budget, 0) AS total_budget,
        campaigns.last_activity_at
    FROM clients c
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*) AS total_campaigns,
            COUNT(*) FILTER (WHERE camp.archived_at IS NULL) AS active_campaigns,  -- FIX: Qualified column reference
            SUM(COALESCE(camp.budget, 0)) AS total_budget,  -- FIX: Use budget column, not budget_data
            MAX(camp.updated_at) AS last_activity_at
        FROM campaigns camp
        WHERE camp.client_id = c.id
          AND camp.org_id = p_org_id
    ) campaigns ON true
    WHERE c.org_id = p_org_id
      AND (p_include_archived OR c.archived_at IS NULL)
      AND (p_status IS NULL OR c.status = p_status)
    ORDER BY
        CASE WHEN c.archived_at IS NULL THEN 0 ELSE 1 END,
        campaigns.last_activity_at DESC NULLS LAST,
        c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) IS 'Database-First function to retrieve clients list with campaign metadata for an organization';



CREATE OR REPLACE FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
  v_org_type TEXT;
  v_schema_name TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Determine schema
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- Route to appropriate schema using dynamic SQL
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(row_to_json(clients_data)), ''[]''::jsonb)
    FROM (
      SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        c.settings,
        c.created_at,
        c.updated_at,
        c.archived_at,
        c.archived_by,
        c.archive_reason,
        c.is_archived,
        c.created_by,
        c.updated_by,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id AND camp.archived_at IS NULL),
          0
        ) as campaigns_count,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id
             AND camp.status = ''active''
             AND camp.archived_at IS NULL),
          0
        ) as active_campaigns_count,
        COALESCE(
          (SELECT SUM(camp.budget_cents) / 100.0
           FROM %I.campaigns camp
           WHERE camp.client_id = c.id AND camp.archived_at IS NULL),
          0
        ) as total_budget,
        (SELECT MAX(camp.updated_at)
         FROM %I.campaigns camp
         WHERE camp.client_id = c.id
        ) as last_activity_at
      FROM %I.clients c
      WHERE c.org_id = $1
        AND ($2 OR c.archived_at IS NULL)
        AND ($3::TEXT IS NULL OR c.status = $3)
      ORDER BY c.created_at DESC
      LIMIT $4 OFFSET $5
    ) clients_data
  ', v_schema_name, v_schema_name, v_schema_name, v_schema_name, v_schema_name)
  INTO v_result
  USING p_org_id, p_include_archived, p_status, p_limit, p_offset;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) IS 'P3: Schema-aware router for clients list with campaign metadata.
Routes to agency.clients/campaigns for AGENCY orgs, public.clients/campaigns for SME orgs.
Returns JSONB array with client data and campaign counts.
Migration 169, 2025-10-27.';



CREATE OR REPLACE FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") RETURNS TABLE("client_summaries" "jsonb", "org_totals" "jsonb", "top_performers" "jsonb", "alerts" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Client summaries (all clients with campaign data)
    (SELECT COALESCE(jsonb_agg(to_jsonb(summary) ORDER BY summary.total_spend DESC), '[]'::jsonb)
     FROM (
       SELECT
         cl.id AS client_id,
         cl.name AS client_name,
         COUNT(ca.id) AS campaign_count,
         COALESCE(SUM(ca.spent), 0) AS total_spend,
         COALESCE(SUM(ca.budget), 0) AS total_budget,
         COALESCE(SUM(ca.conversions), 0) AS total_conversions,
         COUNT(*) FILTER (WHERE ca.status = 'active') AS active_campaigns
       FROM clients cl
       LEFT JOIN campaigns ca ON ca.client_id = cl.id AND ca.archived_at IS NULL
       WHERE cl.org_id = p_org_id AND cl.archived_at IS NULL
       GROUP BY cl.id, cl.name
     ) summary
    ) AS client_summaries,

    -- Organization totals
    (SELECT jsonb_build_object(
      'total_clients', COUNT(DISTINCT cl.id),
      'total_campaigns', COUNT(ca.id),
      'total_spend', COALESCE(SUM(ca.spent), 0),
      'total_budget', COALESCE(SUM(ca.budget), 0),
      'total_conversions', COALESCE(SUM(ca.conversions), 0),
      'active_campaigns', COUNT(*) FILTER (WHERE ca.status = 'active')
    )
     FROM clients cl
     LEFT JOIN campaigns ca ON ca.client_id = cl.id AND ca.archived_at IS NULL
     WHERE cl.org_id = p_org_id AND cl.archived_at IS NULL
    ) AS org_totals,

    -- Top performers (clients with highest conversions)
    (SELECT COALESCE(jsonb_agg(to_jsonb(top) ORDER BY top.conversions DESC), '[]'::jsonb)
     FROM (
       SELECT
         cl.name AS client_name,
         cl.id AS client_id,
         SUM(ca.conversions) AS conversions,
         SUM(ca.spent) AS spend,
         COUNT(ca.id) AS campaign_count
       FROM clients cl
       JOIN campaigns ca ON ca.client_id = cl.id AND ca.archived_at IS NULL
       WHERE cl.org_id = p_org_id AND cl.archived_at IS NULL
       GROUP BY cl.name, cl.id
       HAVING COUNT(ca.id) > 0
       ORDER BY SUM(ca.conversions) DESC
       LIMIT 5
     ) top
    ) AS top_performers,

    -- Alerts (clients with campaigns but low conversions)
    (SELECT COALESCE(jsonb_agg(to_jsonb(alert)), '[]'::jsonb)
     FROM (
       SELECT
         cl.name AS client_name,
         cl.id AS client_id,
         'low_conversions' AS alert_type,
         'Average conversions below 10 per campaign' AS message,
         AVG(ca.conversions) AS avg_conversions
       FROM clients cl
       JOIN campaigns ca ON ca.client_id = cl.id AND ca.archived_at IS NULL
       WHERE cl.org_id = p_org_id AND cl.archived_at IS NULL
       GROUP BY cl.name, cl.id
       HAVING AVG(ca.conversions) < 10 AND COUNT(ca.id) > 0
     ) alert
    ) AS alerts;
END;
$$;


ALTER FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") IS 'Version: 1.0 - Returns agency-wide analytics across all clients
Performance: < 100ms target (expensive query, use sparingly)
Access: agency_owner role only (frontend enforced)
Dependencies: clients, campaigns tables';


CREATE OR REPLACE FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
BEGIN
  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Query agency.campaigns with client info
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'status', c.status,
        'budget', c.budget_cents,
        'spent', c.spent_cents,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'client_id', c.client_id,
        'client_name', cl.name,
        'created_at', c.created_at
      )
      ORDER BY c.created_at DESC
    ) INTO v_result
    FROM agency.campaigns c
    LEFT JOIN agency.clients cl ON cl.id = c.client_id
    WHERE c.org_id = p_org_id
      AND c.archived_at IS NULL
    LIMIT p_limit;

  ELSE
    -- SME: Query public.campaigns (no client_id needed)
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'status', c.status,
        'budget', c.budget_cents,
        'spent', c.spent_cents,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'client_id', c.client_id,
        'created_at', c.created_at
      )
      ORDER BY c.created_at DESC
    ) INTO v_result
    FROM public.campaigns c
    WHERE c.org_id = p_org_id
      AND c.archived_at IS NULL
    LIMIT p_limit;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer) IS 'Router function for dashboard campaign display.
Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs.
Includes client information for agency campaigns.
Phase 2, Migration 166.';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer DEFAULT 20, "p_include_archived" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_user_id UUID;
  v_has_client_restriction BOOLEAN := FALSE;
  v_assigned_client_ids UUID[];
BEGIN
  -- Version: 1.2 (Dec 2025) - Added client assignment filtering for client-scoped roles

  -- Get current user ID
  SELECT (get_current_user()).user_id INTO v_user_id;

  -- Check if user has client-specific role assignments
  -- If any of their role assignments have a client_id, they are restricted to those clients
  SELECT
    COALESCE(bool_or(client_id IS NOT NULL), FALSE),
    ARRAY_AGG(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL)
  INTO v_has_client_restriction, v_assigned_client_ids
  FROM user_role_assignments
  WHERE user_id = v_user_id AND org_id = p_org_id;

  -- Lookup organization type
  SELECT type INTO v_org_type
  FROM organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route to appropriate schema
  IF v_org_type = 'AGENCY' THEN
    -- AGENCY: Query agency.clients with campaign counts
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ac.id,
        'name', ac.name,
        'slug', ac.slug,
        'status', ac.status,
        'industry', ac.industry,
        'created_at', ac.created_at,
        'archived_at', ac.archived_at,
        'archive_reason', ac.archive_reason,
        'campaigns_count', COALESCE(campaign_counts.total, 0),
        'active_campaigns', COALESCE(campaign_counts.active, 0)
      )
      ORDER BY
        -- Show active clients first, then archived
        CASE WHEN ac.archived_at IS NULL THEN 0 ELSE 1 END,
        ac.created_at DESC
    ) INTO v_result
    FROM agency.clients ac
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE status = 'active')::INT as active
      FROM agency.campaigns
      WHERE client_id = ac.id AND archived_at IS NULL
    ) campaign_counts ON true
    WHERE ac.org_id = p_org_id
      AND (p_include_archived OR ac.archived_at IS NULL)
      -- NEW: Filter by assigned clients if user has client-scoped role
      AND (
        NOT v_has_client_restriction
        OR ac.id = ANY(v_assigned_client_ids)
      )
    LIMIT p_limit;

  ELSE
    -- SME: Query public.clients with campaign counts (no client restrictions for SME)
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'status', c.status,
        'industry', c.industry,
        'created_at', c.created_at,
        'archived_at', c.archived_at,
        'archive_reason', c.archive_reason,
        'campaigns_count', COALESCE(campaign_counts.total, 0),
        'active_campaigns', COALESCE(campaign_counts.active, 0)
      )
      ORDER BY
        CASE WHEN c.archived_at IS NULL THEN 0 ELSE 1 END,
        c.created_at DESC
    ) INTO v_result
    FROM public.clients c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::INT as total,
        COUNT(*) FILTER (WHERE status = 'active')::INT as active
      FROM public.campaigns
      WHERE client_id = c.id AND archived_at IS NULL
    ) campaign_counts ON true
    WHERE c.org_id = p_org_id
      AND (p_include_archived OR c.archived_at IS NULL)
    LIMIT p_limit;
  END IF;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer, "p_include_archived" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer, "p_include_archived" boolean) IS 'Get dashboard clients for an organization with client assignment filtering.
Version: 1.2 (Dec 2025)
Parameters:
  - p_org_id: Organization UUID
  - p_limit: Maximum clients to return (default 20)
  - p_include_archived: Include archived clients (default false)
Features:
  - Routes to correct schema (agency vs public) based on org type
  - Filters by assigned clients for client-scoped roles (agency_account_manager, agency_freelancer, agency_client_viewer)
  - Users with org-wide roles see all clients
Returns: JSONB array of client objects with campaign counts';



CREATE OR REPLACE FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") RETURNS TABLE("campaign_name" "text", "roi_percentage" double precision, "roas" double precision, "performance_level" "text", "calculated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH ranked_roi AS (
    SELECT
      ao.content->>'campaign_name' as campaign_name,
      (ao.content->'roi_metrics'->>'roi_percentage')::float as roi_percentage,
      (ao.content->'roi_metrics'->>'roas')::float as roas,
      ao.content->'roi_metrics'->>'performance_level' as performance_level,
      ao.created_at as calculated_at,
      ROW_NUMBER() OVER (
        PARTITION BY ao.content->>'campaign_name'
        ORDER BY ao.created_at DESC
      ) as rn
    FROM agent_outputs ao
    WHERE
      ao.org_id = p_org_id
      AND ao.agent_type = 'performance_intelligence'
      AND ao.output_type = 'roi_calculation'
      AND ao.status IN ('final', 'published')
      AND ao.archived_at IS NULL
  )
  SELECT
    r.campaign_name,
    r.roi_percentage,
    r.roas,
    r.performance_level,
    r.calculated_at
  FROM ranked_roi r
  WHERE r.rn = 1
  ORDER BY r.calculated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") IS 'Get the most recent ROI calculation for each campaign';



CREATE OR REPLACE FUNCTION "public"."notify_campaign_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Notify via pg_notify for real-time updates
  PERFORM pg_notify(
    'campaign_updates',
    json_build_object(
      'org_id', COALESCE(NEW.org_id, OLD.org_id),
      'campaign_id', COALESCE(NEW.id, OLD.id),
      'client_id', COALESCE(NEW.client_id, OLD.client_id),
      'action', TG_OP,
      'timestamp', now()
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."notify_campaign_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_campaign_change"() IS 'Notifies campaign changes via pg_notify for real-time updates';



CREATE OR REPLACE FUNCTION "public"."notify_client_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Notify via pg_notify for real-time updates
  PERFORM pg_notify(
    'client_updates',
    json_build_object(
      'org_id', COALESCE(NEW.org_id, OLD.org_id),
      'client_id', COALESCE(NEW.id, OLD.id),
      'action', TG_OP,
      'timestamp', now()
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."notify_client_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_client_change"() IS 'Notifies client changes via pg_notify for real-time updates';


CREATE OR REPLACE FUNCTION "public"."refresh_client_metrics_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Refresh materialized view concurrently (doesn't block reads)
  REFRESH MATERIALIZED VIEW CONCURRENTLY client_metrics_cache;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_client_metrics_cache"() OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_user_id UUID;
    v_success BOOLEAN;
    v_campaign_name TEXT;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.restore_campaign
        SELECT * INTO v_agency_result
        FROM agency.restore_campaign(
            p_campaign_id,
            p_org_id
        );

        -- Convert to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Restore in public.campaigns
        SELECT (get_current_user()).user_id INTO v_user_id;

        UPDATE public.campaigns SET
            archived_at = NULL,
            archive_reason = NULL,
            archived_by = NULL,
            updated_at = NOW(),
            updated_by = v_user_id
        WHERE id = p_campaign_id
          AND org_id = p_org_id
          AND archived_at IS NOT NULL
        RETURNING name INTO v_campaign_name;

        IF v_campaign_name IS NULL THEN
            RAISE EXCEPTION 'Campaign not found or not archived';
        END IF;

        -- Build result
        v_result := jsonb_build_object(
            'id', p_campaign_id,
            'name', v_campaign_name,
            'restored_at', NOW(),
            'restored_by', v_user_id
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") IS 'Router function that restores campaigns in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.restore_campaign (restores agency.campaigns)
SME orgs: Restores public.campaigns
Returns JSONB with restored campaign details.
Migration 263.';



CREATE OR REPLACE FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "status" "text", "restored_at" timestamp with time zone, "campaigns_restored_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
    v_campaigns_count INTEGER := 0;
    v_client_id UUID;
    v_client_name TEXT;
    v_client_slug TEXT;
    v_client_status TEXT;
BEGIN
    -- Get current user ID
    SELECT (get_current_user()).user_id INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists, belongs to org, and is archived
    SELECT EXISTS(
        SELECT 1 FROM public.clients
        WHERE clients.id = p_client_id
          AND clients.org_id = p_org_id
          AND clients.archived_at IS NOT NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Archived client not found';
    END IF;

    -- Restore related archived campaigns that were archived with the client
    UPDATE public.campaigns SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE client_id = p_client_id
      AND org_id = p_org_id
      AND archived_at IS NOT NULL
      AND archive_reason LIKE 'Client archived:%';

    GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;

    -- Restore the client
    UPDATE public.clients SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE clients.id = p_client_id AND clients.org_id = p_org_id
    RETURNING
        clients.id,
        clients.name,
        clients.slug,
        clients.status
    INTO v_client_id, v_client_name, v_client_slug, v_client_status;

    -- Set output variables
    id := v_client_id;
    name := v_client_name;
    slug := v_client_slug;
    status := v_client_status;
    restored_at := NOW();
    campaigns_restored_count := v_campaigns_count;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Restores an archived client and related campaigns in the public schema (SME orgs).
Also restores campaigns that were archived when the client was archived.
Migration 268.';



CREATE OR REPLACE FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_sme_result RECORD;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.restore_client
        SELECT * INTO v_agency_result
        FROM agency.restore_client(
            p_client_id,
            p_org_id
        );

        -- Convert to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Call public.restore_client
        SELECT * INTO v_sme_result
        FROM public.restore_client(
            p_client_id,
            p_org_id
        );

        -- Convert to JSONB
        v_result := row_to_json(v_sme_result)::jsonb;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") IS 'Router function that restores archived clients in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.restore_client (restores agency.clients + cascaded campaigns)
SME orgs: Calls public.restore_client (restores public.clients + cascaded campaigns)
Returns JSONB with restored client details and campaigns count.
Migration 268.';



CREATE OR REPLACE FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN save_recommendations_cache(
    p_org_id,
    'campaign_plan',
    p_data_hash,
    p_plans,
    p_cache_duration_hours,
    p_generation_time_ms,
    0, -- tokens (not tracked yet)
    NULL, -- overall_assessment
    'medium' -- confidence
  );
END;
$$;


ALTER FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) IS 'Backward-compatible wrapper. Use save_recommendations_cache directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."set_client_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Auto-generate slug from name if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;

  -- If name changed, update slug
  IF TG_OP = 'UPDATE' AND OLD.name != NEW.name THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_client_slug"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_client_slug"() IS 'Trigger function to auto-generate client slugs. Now with secure search_path and SECURITY DEFINER.';


CREATE OR REPLACE FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_objectives" "jsonb" DEFAULT NULL::"jsonb", "p_budget_cents" integer DEFAULT NULL::integer, "p_status" "text" DEFAULT NULL::"text", "p_target_audience" "text" DEFAULT NULL::"text", "p_campaign_type" "text" DEFAULT NULL::"text", "p_marketing_channels" "jsonb" DEFAULT NULL::"jsonb", "p_content_pillars" "jsonb" DEFAULT NULL::"jsonb", "p_target_personas" "jsonb" DEFAULT NULL::"jsonb", "p_success_metrics" "jsonb" DEFAULT NULL::"jsonb", "p_competitor_context" "text" DEFAULT NULL::"text", "p_geographic_target" "text" DEFAULT NULL::"text", "p_priority_level" "text" DEFAULT NULL::"text", "p_tags" "jsonb" DEFAULT NULL::"jsonb", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "org_id" "uuid", "client_id" "uuid", "name" "text", "description" "text", "objectives" "jsonb", "budget_cents" integer, "spent_cents" integer, "status" "text", "target_audience" "text", "campaign_type" "text", "marketing_channels" "jsonb", "content_pillars" "jsonb", "target_personas" "jsonb", "success_metrics" "jsonb", "competitor_context" "text", "geographic_target" "text", "priority_level" "text", "tags" "jsonb", "start_date" "date", "end_date" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "updated_by" "uuid", "metadata" "jsonb", "metrics" "jsonb", "reach" integer, "archived_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_campaign_exists BOOLEAN := FALSE;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID (get_current_user returns a table, extract user_id)
    SELECT user_id INTO v_user_id FROM get_current_user();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- ✅ FIX: Validate campaign exists with multi-tenant support
    -- Supports both SME (direct org) and Agency (via client) patterns
    SELECT EXISTS(
        SELECT 1 FROM campaigns c
        LEFT JOIN clients cl ON c.client_id = cl.id
        WHERE c.id = p_campaign_id
          AND c.archived_at IS NULL
          AND (
            -- SME: Direct org ownership (no client)
            (c.org_id = p_org_id AND c.client_id IS NULL)
            OR
            -- Agency: Via client ownership
            (c.client_id IS NOT NULL AND cl.org_id = p_org_id)
          )
    )
    INTO v_campaign_exists;

    IF NOT v_campaign_exists THEN
        RAISE EXCEPTION 'Campaign not found or does not belong to organization';
    END IF;

    -- Update campaign (only update provided fields)
    UPDATE campaigns c SET
        name = COALESCE(p_name, c.name),
        description = COALESCE(p_description, c.description),
        objectives = COALESCE(p_objectives, c.objectives),
        budget_cents = COALESCE(p_budget_cents, c.budget_cents),
        status = COALESCE(p_status, c.status),
        target_audience = COALESCE(p_target_audience, c.target_audience),
        campaign_type = COALESCE(p_campaign_type, c.campaign_type),
        marketing_channels = COALESCE(p_marketing_channels, c.marketing_channels),
        content_pillars = COALESCE(p_content_pillars, c.content_pillars),
        target_personas = COALESCE(p_target_personas, c.target_personas),
        success_metrics = COALESCE(p_success_metrics, c.success_metrics),
        competitor_context = COALESCE(p_competitor_context, c.competitor_context),
        geographic_target = COALESCE(p_geographic_target, c.geographic_target),
        priority_level = COALESCE(p_priority_level, c.priority_level),
        tags = COALESCE(p_tags, c.tags),
        start_date = COALESCE(p_start_date, c.start_date),
        end_date = COALESCE(p_end_date, c.end_date),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE c.id = p_campaign_id
      -- ✅ FIX: Also update WHERE clause for consistency
      AND EXISTS(
        SELECT 1 FROM campaigns c2
        LEFT JOIN clients cl2 ON c2.client_id = cl2.id
        WHERE c2.id = c.id
          AND (
            (c2.org_id = p_org_id AND c2.client_id IS NULL)
            OR
            (c2.client_id IS NOT NULL AND cl2.org_id = p_org_id)
          )
      );

    -- Return the updated campaign with multi-tenant validation
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.client_id,
        c.name,
        c.description,
        c.objectives,
        c.budget_cents,
        c.spent_cents,
        c.status,
        c.target_audience,
        c.campaign_type,
        c.marketing_channels,
        c.content_pillars,
        c.target_personas,
        c.success_metrics,
        c.competitor_context,
        c.geographic_target,
        c.priority_level,
        c.tags,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at,
        c.updated_by,
        c.metadata,
        c.metrics,
        c.reach,
        c.archived_at
    FROM campaigns c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = p_campaign_id
      -- ✅ FIX: Ensure returned data belongs to requesting org
      AND (
        -- SME: Direct org ownership
        (c.org_id = p_org_id AND c.client_id IS NULL)
        OR
        -- Agency: Via client ownership
        (c.client_id IS NOT NULL AND cl.org_id = p_org_id)
      );
END;
$$;


ALTER FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") IS 'Database-First function to update campaigns with multi-tenant validation.
Supports both SME (direct org_id) and Agency (via client_id) access patterns.
Fixed in migration 256 (2025-11-14) to resolve agency user access issues.';



CREATE OR REPLACE FUNCTION "public"."update_campaign_metrics_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campaign_metrics_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_objectives" "jsonb" DEFAULT NULL::"jsonb", "p_budget_cents" integer DEFAULT NULL::integer, "p_status" "text" DEFAULT NULL::"text", "p_target_audience" "text" DEFAULT NULL::"text", "p_campaign_type" "text" DEFAULT NULL::"text", "p_marketing_channels" "jsonb" DEFAULT NULL::"jsonb", "p_content_pillars" "jsonb" DEFAULT NULL::"jsonb", "p_target_personas" "jsonb" DEFAULT NULL::"jsonb", "p_success_metrics" "jsonb" DEFAULT NULL::"jsonb", "p_competitor_context" "text" DEFAULT NULL::"text", "p_geographic_target" "text" DEFAULT NULL::"text", "p_priority_level" "text" DEFAULT NULL::"text", "p_tags" "jsonb" DEFAULT NULL::"jsonb", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $_$
DECLARE
    v_org_type TEXT;
    v_schema_name TEXT;
    v_user_id UUID;
    v_campaign_exists BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO v_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Detect organization type
    SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Determine schema
    v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

    -- ✅ FIX: Validate campaign exists with multi-tenant support
    EXECUTE format('
        SELECT EXISTS(
            SELECT 1 FROM %I.campaigns c
            LEFT JOIN %I.clients cl ON c.client_id = cl.id
            WHERE c.id = $1
              AND c.archived_at IS NULL
              AND (
                -- SME: Direct org ownership (no client)
                (c.org_id = $2 AND c.client_id IS NULL)
                OR
                -- Agency: Via client ownership
                (c.client_id IS NOT NULL AND cl.org_id = $2)
              )
        )
    ', v_schema_name, v_schema_name)
    INTO v_campaign_exists
    USING p_campaign_id, p_org_id;

    IF NOT v_campaign_exists THEN
        RAISE EXCEPTION 'Campaign not found or does not belong to organization';
    END IF;

    -- Update campaign in correct schema
    EXECUTE format('
        UPDATE %I.campaigns c SET
            name = COALESCE($1, c.name),
            description = COALESCE($2, c.description),
            objectives = COALESCE($3, c.objectives),
            budget_cents = COALESCE($4, c.budget_cents),
            status = COALESCE($5, c.status),
            target_audience = COALESCE($6, c.target_audience),
            campaign_type = COALESCE($7, c.campaign_type),
            marketing_channels = COALESCE($8, c.marketing_channels),
            content_pillars = COALESCE($9, c.content_pillars),
            target_personas = COALESCE($10, c.target_personas),
            success_metrics = COALESCE($11, c.success_metrics),
            competitor_context = COALESCE($12, c.competitor_context),
            geographic_target = COALESCE($13, c.geographic_target),
            priority_level = COALESCE($14, c.priority_level),
            tags = COALESCE($15, c.tags),
            start_date = COALESCE($16, c.start_date),
            end_date = COALESCE($17, c.end_date),
            updated_at = NOW(),
            updated_by = $18
        WHERE c.id = $19
          -- Multi-tenant validation in UPDATE clause
          AND EXISTS(
            SELECT 1 FROM %I.campaigns c2
            LEFT JOIN %I.clients cl2 ON c2.client_id = cl2.id
            WHERE c2.id = c.id
              AND (
                (c2.org_id = $20 AND c2.client_id IS NULL)
                OR
                (c2.client_id IS NOT NULL AND cl2.org_id = $20)
              )
          )
    ', v_schema_name, v_schema_name, v_schema_name)
    USING
        p_name, p_description, p_objectives, p_budget_cents, p_status,
        p_target_audience, p_campaign_type, p_marketing_channels, p_content_pillars,
        p_target_personas, p_success_metrics, p_competitor_context, p_geographic_target,
        p_priority_level, p_tags, p_start_date, p_end_date,
        v_user_id, p_campaign_id, p_org_id;

    -- Return the updated campaign with multi-tenant validation
    EXECUTE format('
        SELECT to_jsonb(c.*)
        FROM %I.campaigns c
        LEFT JOIN %I.clients cl ON c.client_id = cl.id
        WHERE c.id = $1
          AND (
            (c.org_id = $2 AND c.client_id IS NULL)
            OR
            (c.client_id IS NOT NULL AND cl.org_id = $2)
          )
    ', v_schema_name, v_schema_name)
    INTO v_result
    USING p_campaign_id, p_org_id;

    RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") IS 'Schema-aware router function for updating campaigns.
Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs.
Supports both SME (direct org_id) and Agency (via client_id) access patterns.
Created in migration 258 (2025-11-14) to fix agency campaign updates.';



CREATE OR REPLACE FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "slug" "text", "industry" "text", "website" "text", "contact_email" "text", "contact_phone" "text", "status" "text", "settings" "jsonb", "updated_at" timestamp with time zone, "updated_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_client_exists BOOLEAN := FALSE;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID - FIX: get_current_user() returns TABLE, so select user_id column
    SELECT user_id INTO v_user_id FROM get_current_user();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate client exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM clients
        WHERE clients.id = p_client_id AND clients.org_id = p_org_id AND clients.archived_at IS NULL
    ) INTO v_client_exists;

    IF NOT v_client_exists THEN
        RAISE EXCEPTION 'Client not found or does not belong to organization';
    END IF;

    -- Validate slug uniqueness if provided
    IF p_slug IS NOT NULL AND trim(p_slug) != '' THEN
        IF EXISTS(
            SELECT 1 FROM clients
            WHERE clients.org_id = p_org_id
              AND clients.slug = trim(p_slug)
              AND clients.id != p_client_id
              AND clients.archived_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Client slug already exists in organization';
        END IF;
    END IF;

    -- Validate name if provided
    IF p_name IS NOT NULL AND trim(p_name) = '' THEN
        RAISE EXCEPTION 'Client name cannot be empty';
    END IF;

    -- Update client (only update provided fields)
    UPDATE clients SET
        name = COALESCE(NULLIF(trim(p_name), ''), clients.name),
        slug = COALESCE(NULLIF(trim(p_slug), ''), clients.slug),
        industry = COALESCE(p_industry, clients.industry),
        website = COALESCE(p_website, clients.website),
        contact_email = COALESCE(p_contact_email, clients.contact_email),
        contact_phone = COALESCE(p_contact_phone, clients.contact_phone),
        status = COALESCE(p_status, clients.status),
        settings = COALESCE(p_settings, clients.settings),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE clients.id = p_client_id AND clients.org_id = p_org_id;

    -- Return the updated client
    RETURN QUERY
    SELECT
        c.id,
        c.org_id,
        c.name,
        c.slug,
        c.industry,
        c.website,
        c.contact_email,
        c.contact_phone,
        c.status,
        c.settings,
        c.updated_at,
        c.updated_by
    FROM clients c
    WHERE c.id = p_client_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('clients_changed',
        json_build_object(
            'action', 'UPDATE',
            'org_id', p_org_id,
            'client_id', p_client_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") IS 'Update client information including business context stored in settings JSONB. Fixed to properly handle get_current_user() TABLE return type. Migration 152.';



CREATE OR REPLACE FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_industry" "text" DEFAULT NULL::"text", "p_website" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_contact_phone" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_company_size" "public"."company_size_enum" DEFAULT NULL::"public"."company_size_enum", "p_company_stage" "public"."company_stage_enum" DEFAULT NULL::"public"."company_stage_enum", "p_business_model" "public"."business_model_enum" DEFAULT NULL::"public"."business_model_enum", "p_target_market" "text"[] DEFAULT NULL::"text"[], "p_key_competitors" "text"[] DEFAULT NULL::"text"[], "p_unique_value_proposition" "text" DEFAULT NULL::"text", "p_marketing_budget" "text" DEFAULT NULL::"text", "p_current_marketing_channels" "text"[] DEFAULT NULL::"text"[], "p_marketing_goals" "text"[] DEFAULT NULL::"text"[], "p_slug" "text" DEFAULT NULL::"text", "p_settings" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_result JSONB;
    v_agency_result RECORD;
    v_sme_result RECORD;
BEGIN
    -- Lookup organization type
    SELECT type INTO v_org_type
    FROM organizations
    WHERE id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route to appropriate schema
    IF v_org_type = 'AGENCY' THEN
        -- AGENCY: Call agency.update_client (updates both agency.clients and agency.client_intelligence)
        SELECT * INTO v_agency_result
        FROM agency.update_client(
            p_client_id,
            p_org_id,
            p_name,
            p_slug,
            p_industry,
            p_website,
            p_contact_email,
            p_contact_phone,
            p_status,
            p_company_size,
            p_company_stage,
            p_business_model,
            p_target_market,
            p_key_competitors,
            p_unique_value_proposition,
            p_marketing_budget,
            p_current_marketing_channels,
            p_marketing_goals
        );

        -- Convert to JSONB
        v_result := row_to_json(v_agency_result)::jsonb;

    ELSE
        -- SME: Call public.update_client (updates only public.clients)
        SELECT * INTO v_sme_result
        FROM public.update_client(
            p_client_id,
            p_org_id,
            p_name,
            p_slug,
            p_industry,
            p_website,
            p_contact_email,
            p_contact_phone,
            p_status,
            p_settings
        );

        -- Convert to JSONB
        v_result := row_to_json(v_sme_result)::jsonb;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_slug" "text", "p_settings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_slug" "text", "p_settings" "jsonb") IS 'Router function that updates clients in the appropriate schema based on org_type.
AGENCY orgs: Calls agency.update_client (updates both agency.clients + agency.client_intelligence)
SME orgs: Calls public.update_client (updates only public.clients)
Migration 194.';