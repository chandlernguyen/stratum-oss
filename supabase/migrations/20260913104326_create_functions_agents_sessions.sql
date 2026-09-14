-- ============================================================================
-- create_functions_agents_sessions
-- Functions backing the agents and their sessions.
-- ============================================================================





CREATE OR REPLACE FUNCTION "agency"."get_agent_context"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'agency', 'public'
    AS $$
DECLARE
    v_context JSONB;
BEGIN
    -- Aggregate all context data for agency client into single JSONB object
    SELECT jsonb_build_object(
        'org_id', p_org_id,
        'client_id', p_client_id,
        'agent_type', p_agent_type,
        'loaded_at', NOW(),

        -- Client information (from both clients and client_intelligence)
        'client', (
            SELECT jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug,
                'industry', c.industry,
                'website', c.website,
                'status', c.status,
                'company_size', ci.company_size,
                'company_stage', ci.company_stage,
                'business_model', ci.business_model,
                'target_market', ci.target_market,
                'key_competitors', ci.key_competitors,
                'unique_value_proposition', ci.unique_value_proposition,
                'marketing_budget', ci.marketing_budget,
                'current_marketing_channels', ci.current_marketing_channels,
                'marketing_goals', ci.marketing_goals,
                'data_completeness_score', ci.data_completeness_score
            )
            FROM agency.clients c
            LEFT JOIN agency.client_intelligence ci ON ci.client_id = c.id
            WHERE c.id = p_client_id AND c.org_id = p_org_id
            LIMIT 1
        ),

        -- Brand guidelines (if client has them - for future extension)
        'brand_guidelines', '{}'::jsonb,

        -- Personas (client-scoped)
        'personas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'title', p.title,
                    'company_name', p.company_name,
                    'industry', p.industry,
                    'demographics', p.demographics,
                    'goals', p.goals,
                    'pain_points', p.pain_points,
                    'is_primary', p.is_primary,
                    'created_at', p.created_at
                ) ORDER BY p.is_primary DESC, p.created_at DESC
            ), '[]'::jsonb)
            FROM agency.personas p
            WHERE p.client_id = p_client_id
              AND p.archived_at IS NULL
            LIMIT 20
        ),

        -- Agent outputs (client-scoped)
        'agent_outputs', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', ao.id,
                    'agent_type', ao.agent_type,
                    'title', ao.title,
                    'summary', ao.summary,
                    'category', ao.category,
                    'content', ao.content,
                    'created_at', ao.created_at
                ) ORDER BY ao.created_at DESC
            ), '[]'::jsonb)
            FROM agency.agent_outputs ao
            WHERE ao.client_id = p_client_id
              AND ao.archived_at IS NULL
            LIMIT 50
        ),

        -- Active campaigns (client-scoped)
        'campaigns', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'description', c.description,
                    'status', c.status,
                    'budget', c.budget,
                    'spent', c.spent,
                    'start_date', c.start_date,
                    'end_date', c.end_date,
                    'priority_level', c.priority_level,
                    'created_at', c.created_at
                ) ORDER BY c.priority_level DESC NULLS LAST, c.created_at DESC
            ), '[]'::jsonb)
            FROM agency.campaigns c
            WHERE c.client_id = p_client_id
              AND c.archived_at IS NULL
            LIMIT 10
        ),

        -- Marketing strategies (client-scoped - for future extension)
        'marketing_strategies', '[]'::jsonb,

        -- AI insights (client-scoped - for future extension)
        'ai_insights', '[]'::jsonb,

        -- Organization details
        'organization', (
            SELECT row_to_json(o)
            FROM organizations o
            WHERE o.id = p_org_id
            LIMIT 1
        )
    ) INTO v_context;

    RETURN v_context;
END;
$$;


ALTER FUNCTION "agency"."get_agent_context"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "agency"."get_agent_context"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") IS 'Get complete agent context for agency client with client-scoped data. Week 3. Migration 161.';



CREATE OR REPLACE FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "archived_at" timestamp with time zone, "archive_reason" "text", "archived_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_session_exists BOOLEAN := FALSE;
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

    -- Validate session exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM agent_conversations
        WHERE agent_conversations.id = p_session_id
          AND agent_conversations.org_id = p_org_id
          AND agent_conversations.archived_at IS NULL
    ) INTO v_session_exists;

    IF NOT v_session_exists THEN
        RAISE EXCEPTION 'Session not found or already archived';
    END IF;

    -- Archive the session (is_archived auto-updates from archived_at)
    UPDATE agent_conversations SET
        archived_at = NOW(),
        archive_reason = COALESCE(p_archive_reason, 'User requested'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agent_conversations.id = p_session_id
      AND agent_conversations.org_id = p_org_id;

    -- Return archival information
    RETURN QUERY
    SELECT
        ac.id,
        ac.archived_at,
        ac.archive_reason,
        ac.archived_by
    FROM agent_conversations ac
    WHERE ac.id = p_session_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agent_sessions_changed',
        json_build_object(
            'action', 'DELETE',
            'org_id', p_org_id,
            'session_id', p_session_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archive agent sessions (is_archived auto-updates from archived_at)';



CREATE OR REPLACE FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_result JSONB;
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get org_id and org_type from conversation (try public first)
  SELECT c.org_id, o.type INTO v_org_id, v_org_type
  FROM public.agent_conversations c
  JOIN public.organizations o ON o.id = c.org_id
  WHERE c.id = p_conversation_id;

  -- If not found in public, try agency schema
  IF v_org_id IS NULL THEN
    SELECT c.org_id, o.type INTO v_org_id, v_org_type
    FROM agency.agent_conversations c
    JOIN public.organizations o ON o.id = c.org_id
    WHERE c.id = p_conversation_id;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found: %', p_conversation_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Update in agency.agent_conversations
    UPDATE agency.agent_conversations
    SET archived_at = NOW(),
        archived_by = v_user_id,
        archive_reason = COALESCE(p_archive_reason, 'User archived')
    WHERE id = p_conversation_id
    RETURNING row_to_json(agent_conversations.*)::jsonb INTO v_result;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Update in public.agent_conversations
    UPDATE public.agent_conversations
    SET archived_at = NOW(),
        archived_by = v_user_id,
        archive_reason = COALESCE(p_archive_reason, 'User archived')
    WHERE id = p_conversation_id
    RETURNING row_to_json(agent_conversations.*)::jsonb INTO v_result;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text") IS 'Router function for archiving agent conversations. Routes to agency.agent_conversations for AGENCY orgs, public.agent_conversations for SME orgs.';



CREATE OR REPLACE FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "archived_at" timestamp with time zone, "archive_reason" "text", "archived_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_strategy_exists BOOLEAN := FALSE;
    v_campaign_id UUID;
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

    -- Validate strategy exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM marketing_strategies
        WHERE id = p_strategy_id AND org_id = p_org_id AND archived_at IS NULL
    ), campaign_id
    INTO v_strategy_exists, v_campaign_id
    FROM marketing_strategies
    WHERE id = p_strategy_id AND org_id = p_org_id AND archived_at IS NULL;

    IF NOT v_strategy_exists THEN
        RAISE EXCEPTION 'Marketing strategy not found or already archived';
    END IF;

    -- Archive the marketing strategy
    UPDATE marketing_strategies SET
        archived_at = NOW(),
        archive_reason = COALESCE(p_archive_reason, 'User requested'),
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_strategy_id AND org_id = p_org_id;

    -- Return archival information
    RETURN QUERY
    SELECT
        ms.id,
        ms.archived_at,
        ms.archive_reason,
        ms.archived_by
    FROM marketing_strategies ms
    WHERE ms.id = p_strategy_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('marketing_strategies_changed',
        json_build_object(
            'action', 'DELETE',
            'org_id', p_org_id,
            'strategy_id', p_strategy_id,
            'campaign_id', v_campaign_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Database-First function to archive (soft delete) a marketing strategy with audit trail';



CREATE OR REPLACE FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text" DEFAULT 'User archived'::"text") RETURNS TABLE("persona_id" "uuid", "persona_archived_at" timestamp with time zone, "persona_archive_reason" "text", "persona_archived_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_persona_exists BOOLEAN;
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

    -- Check if persona exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM synthetic_personas
        WHERE synthetic_personas.id = p_persona_id
          AND synthetic_personas.org_id = p_org_id
          AND synthetic_personas.archived_at IS NULL
    ) INTO v_persona_exists;

    IF NOT v_persona_exists THEN
        RAISE EXCEPTION 'Persona not found or already archived';
    END IF;

    -- Archive the persona (is_archived auto-updates)
    UPDATE synthetic_personas SET
        archived_at = NOW(),
        archive_reason = p_archive_reason,
        archived_by = v_user_id,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE synthetic_personas.id = p_persona_id
      AND synthetic_personas.org_id = p_org_id;

    -- Return archived persona info (matching existing return type)
    RETURN QUERY
    SELECT
        p.id AS persona_id,
        p.archived_at AS persona_archived_at,
        p.archive_reason AS persona_archive_reason,
        p.archived_by AS persona_archived_by
    FROM synthetic_personas p
    WHERE p.id = p_persona_id;
END;
$$;


ALTER FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") IS 'Archive personas (is_archived auto-updates from archived_at)';


CREATE OR REPLACE FUNCTION "public"."auto_link_personas_to_strategy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Only proceed if there are active personas in the organization
    IF EXISTS (
        SELECT 1 FROM synthetic_personas
        WHERE org_id = NEW.org_id AND archived_at IS NULL
    ) THEN
        -- Link all active personas from the same org to the new strategy
        INSERT INTO marketing_strategy_personas (strategy_id, persona_id, is_primary, messaging_variation)
        SELECT
            NEW.id,
            sp.id,
            ROW_NUMBER() OVER (ORDER BY sp.created_at DESC) = 1 as is_primary,
            jsonb_build_object(
                'auto_linked', true,
                'linked_at', NOW(),
                'strategy_status', NEW.status
            ) as messaging_variation
        FROM synthetic_personas sp
        WHERE sp.org_id = NEW.org_id
            AND sp.archived_at IS NULL
        ON CONFLICT (strategy_id, persona_id) DO NOTHING;

        RAISE NOTICE 'Auto-linked % personas to strategy %',
            (SELECT COUNT(*) FROM synthetic_personas WHERE org_id = NEW.org_id AND archived_at IS NULL),
            NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_link_personas_to_strategy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_link_strategies_to_persona"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Only proceed if persona is active (not archived)
    IF NEW.archived_at IS NULL THEN
        -- Link all active strategies from the same org to the new persona
        INSERT INTO marketing_strategy_personas (strategy_id, persona_id, is_primary, messaging_variation)
        SELECT
            ms.id,
            NEW.id,
            false as is_primary, -- New personas are not primary by default
            jsonb_build_object(
                'auto_linked', true,
                'linked_at', NOW()
                -- Removed 'persona_type' - column doesn't exist
            ) as messaging_variation
        FROM marketing_strategies ms
        WHERE ms.org_id = NEW.org_id
            AND ms.status = 'active'
        ON CONFLICT (strategy_id, persona_id) DO NOTHING;

        RAISE NOTICE 'Auto-linked persona % to % active strategies',
            NEW.id,
            (SELECT COUNT(*) FROM marketing_strategies WHERE org_id = NEW.org_id AND status = 'active');
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_link_strategies_to_persona"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_link_strategies_to_persona"() IS 'Fixed trigger function that auto-links new personas to existing strategies. Removed persona_type reference from migration 091.';


CREATE OR REPLACE FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_spend IS NULL OR p_spend = 0 THEN
    RETURN NULL;
  END IF;

  IF p_revenue IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(((p_revenue - p_spend) / p_spend * 100)::NUMERIC, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) IS 'Helper function: Calculate ROI percentage from spend and revenue';



CREATE OR REPLACE FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text" DEFAULT NULL::"text", "p_initial_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "agent_type" "text", "session_data" "jsonb", "created_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_session_id UUID;
    v_session_data JSONB;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID (FIXED: use auth.uid() instead of get_current_user())
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Generate session ID
    v_session_id := gen_random_uuid();

    -- Prepare session data
    v_session_data := jsonb_build_object(
        'session_title', COALESCE(p_session_title, 'New Session'),
        'message_count', 0,
        'created_at', NOW()::TEXT
    );

    -- Merge with any initial data provided
    IF p_initial_data IS NOT NULL THEN
        v_session_data := v_session_data || p_initial_data;
    END IF;

    -- Insert new session
    INSERT INTO agent_conversations (
        id,
        org_id,
        user_id,
        agent_type,
        session_data,
        is_archived,
        created_at,
        updated_at,
        created_by,
        updated_by
    ) VALUES (
        v_session_id,
        p_org_id,
        v_user_id,
        p_agent_type,
        v_session_data,
        FALSE,
        NOW(),
        NOW(),
        v_user_id,
        v_user_id
    );

    -- Return the created session (FIXED: qualified column names)
    RETURN QUERY
    SELECT
        ac.id,
        ac.org_id,
        ac.user_id,
        ac.agent_type,
        ac.session_data,
        ac.created_at,
        ac.created_by
    FROM agent_conversations ac
    WHERE ac.id = v_session_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agent_sessions_changed',
        json_build_object(
            'action', 'INSERT',
            'org_id', p_org_id,
            'session_id', v_session_id,
            'agent_type', p_agent_type
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text", "p_initial_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text", "p_initial_data" "jsonb") IS 'Database-First function to create new agent conversation sessions (FIXED: qualified column names)';



CREATE OR REPLACE FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_session_name" "text" DEFAULT NULL::"text", "p_mode" "text" DEFAULT NULL::"text", "p_session_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_session_id UUID;
BEGIN
  -- Detect organization type
  SELECT organizations.type INTO v_org_type
  FROM organizations
  WHERE organizations.id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Generate session ID
  v_session_id := gen_random_uuid();

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Insert into agency.agent_conversations
    -- REQUIRED: client_id must be provided for agency sessions
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id is required for AGENCY organization sessions';
    END IF;

    INSERT INTO agency.agent_conversations (
      id,
      org_id,
      user_id,
      agent_type,
      client_id,
      campaign_id,
      title,
      mode,
      session_metadata,
      created_at,
      updated_at
    ) VALUES (
      v_session_id,
      p_org_id,
      p_user_id,
      p_agent_type,
      p_client_id,
      p_campaign_id,
      COALESCE(p_session_name, 'New Session'),
      p_mode,
      COALESCE(p_session_metadata, '{}'::jsonb),
      NOW(),
      NOW()
    );

  ELSIF v_org_type = 'SME' THEN
    -- SME: Insert into public.agent_conversations
    INSERT INTO public.agent_conversations (
      id,
      org_id,
      user_id,
      agent_type,
      client_id,
      session_data,
      created_at,
      updated_at
    ) VALUES (
      v_session_id,
      p_org_id,
      p_user_id,
      p_agent_type,
      p_client_id,  -- Nullable for SME
      jsonb_build_object(
        'name', COALESCE(p_session_name, 'New Session'),
        'mode', p_mode,
        'campaign_id', p_campaign_id,
        'client_id', p_client_id,
        'metadata', COALESCE(p_session_metadata, '{}'::jsonb),
        'title_generated', false
      ),
      NOW(),
      NOW()
    );

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  -- Return the created session ID
  RETURN v_session_id;
END;
$$;


ALTER FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_campaign_id" "uuid", "p_session_name" "text", "p_mode" "text", "p_session_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_campaign_id" "uuid", "p_session_name" "text", "p_mode" "text", "p_session_metadata" "jsonb") IS 'Router function for creating agent sessions. Routes to agency.agent_conversations for AGENCY orgs (requires client_id), public.agent_conversations for SME orgs. Created in Migration 236 to fix Agency session creation.';


CREATE OR REPLACE FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_session_data" "jsonb" DEFAULT '{}'::"jsonb", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_mode" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_conversation_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user if not provided
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Detect organization type
  SELECT type INTO v_org_type FROM organizations WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Write to agency.agent_conversations (uses session_metadata, has campaign_id/title/mode)
    INSERT INTO agency.agent_conversations (
      org_id,
      agent_type,
      user_id,
      client_id,
      campaign_id,
      title,
      mode,
      session_metadata,  -- Agency uses session_metadata
      created_at,
      updated_at
    ) VALUES (
      p_org_id,
      p_agent_type,
      p_user_id,
      p_client_id,  -- Required for agency
      p_campaign_id,
      COALESCE(p_title, 'New conversation'),
      p_mode,
      p_session_data,  -- Stored as session_metadata in agency schema
      NOW(),
      NOW()
    ) RETURNING id INTO v_conversation_id;

    -- Return from agency schema
    SELECT jsonb_build_object(
      'id', c.id,
      'org_id', c.org_id,
      'agent_type', c.agent_type,
      'user_id', c.user_id,
      'client_id', c.client_id,
      'campaign_id', c.campaign_id,
      'title', c.title,
      'mode', c.mode,
      'session_data', c.session_metadata,  -- Map session_metadata → session_data for consistent API
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'archived_at', c.archived_at
    ) INTO v_result
    FROM agency.agent_conversations c
    WHERE c.id = v_conversation_id;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Write to public.agent_conversations (uses session_data, no campaign_id/title/mode)
    INSERT INTO public.agent_conversations (
      org_id,
      agent_type,
      user_id,
      client_id,  -- NULL for SME
      session_data,  -- Public uses session_data
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_org_id,
      p_agent_type,
      p_user_id,
      NULL,  -- SME conversations don't have client_id
      p_session_data,
      p_user_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_conversation_id;

    -- Return from public schema
    SELECT jsonb_build_object(
      'id', c.id,
      'org_id', c.org_id,
      'agent_type', c.agent_type,
      'user_id', c.user_id,
      'client_id', c.client_id,
      'session_data', c.session_data,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'archived_at', c.archived_at,
      'created_by', c.created_by
    ) INTO v_result
    FROM public.agent_conversations c
    WHERE c.id = v_conversation_id;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_session_data" "jsonb", "p_campaign_id" "uuid", "p_title" "text", "p_mode" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_session_data" "jsonb", "p_campaign_id" "uuid", "p_title" "text", "p_mode" "text") IS 'Router function for creating agent conversations. Routes to agency.agent_conversations (with campaign_id/title/mode/session_metadata) for AGENCY orgs, public.agent_conversations (with session_data) for SME orgs. Parameters are flexible - agency-specific params (campaign_id, title, mode) are optional and only used for AGENCY orgs.';



CREATE OR REPLACE FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_strategy_type" "text" DEFAULT NULL::"text", "p_positioning_statement" "text" DEFAULT NULL::"text", "p_value_propositions" "jsonb" DEFAULT NULL::"jsonb", "p_key_messages" "jsonb" DEFAULT NULL::"jsonb", "p_differentiation_points" "text"[] DEFAULT NULL::"text"[], "p_elevator_pitches" "jsonb" DEFAULT NULL::"jsonb", "p_tone_of_voice" "jsonb" DEFAULT NULL::"jsonb", "p_brand_personality" "jsonb" DEFAULT NULL::"jsonb", "p_channel_mix" "jsonb" DEFAULT NULL::"jsonb", "p_budget_allocation" "jsonb" DEFAULT NULL::"jsonb", "p_content_pillars" "text"[] DEFAULT NULL::"text"[], "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "title" "text", "strategy_type" "text", "positioning_statement" "text", "value_propositions" "jsonb", "key_messages" "jsonb", "differentiation_points" "text"[], "elevator_pitches" "jsonb", "tone_of_voice" "jsonb", "brand_personality" "jsonb", "channel_mix" "jsonb", "budget_allocation" "jsonb", "content_pillars" "text"[], "metadata" "jsonb", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_strategy_id UUID;
    v_campaign_exists BOOLEAN := FALSE;
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

    -- Validate campaign exists and belongs to org (if provided)
    IF p_campaign_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM campaigns
            WHERE id = p_campaign_id AND org_id = p_org_id AND archived_at IS NULL
        ) INTO v_campaign_exists;

        IF NOT v_campaign_exists THEN
            RAISE EXCEPTION 'Campaign not found or does not belong to organization';
        END IF;
    END IF;

    -- Generate new strategy ID
    v_strategy_id := gen_random_uuid();

    -- Insert new marketing strategy
    INSERT INTO marketing_strategies (
        id,
        org_id,
        campaign_id,
        title,
        strategy_type,
        positioning_statement,
        value_propositions,
        key_messages,
        differentiation_points,
        elevator_pitches,
        tone_of_voice,
        brand_personality,
        channel_mix,
        budget_allocation,
        content_pillars,
        metadata,
        status,
        created_at,
        updated_at,
        created_by
    ) VALUES (
        v_strategy_id,
        p_org_id,
        p_campaign_id,
        COALESCE(p_title, 'Untitled Strategy'),
        COALESCE(p_strategy_type, 'general'),
        p_positioning_statement,
        COALESCE(p_value_propositions, '{}'::JSONB),
        COALESCE(p_key_messages, '{}'::JSONB),
        COALESCE(p_differentiation_points, ARRAY[]::TEXT[]),
        COALESCE(p_elevator_pitches, '{}'::JSONB),
        COALESCE(p_tone_of_voice, '{}'::JSONB),
        COALESCE(p_brand_personality, '{}'::JSONB),
        COALESCE(p_channel_mix, '{}'::JSONB),
        COALESCE(p_budget_allocation, '{}'::JSONB),
        COALESCE(p_content_pillars, ARRAY[]::TEXT[]),
        COALESCE(p_metadata, '{}'::JSONB),
        'draft',
        NOW(),
        NOW(),
        v_user_id
    );

    -- Return the created strategy
    RETURN QUERY
    SELECT
        ms.id,
        ms.org_id,
        ms.campaign_id,
        ms.title,
        ms.strategy_type,
        ms.positioning_statement,
        ms.value_propositions,
        ms.key_messages,
        ms.differentiation_points,
        ms.elevator_pitches,
        ms.tone_of_voice,
        ms.brand_personality,
        ms.channel_mix,
        ms.budget_allocation,
        ms.content_pillars,
        ms.metadata,
        ms.status,
        ms.created_at,
        ms.updated_at,
        ms.created_by
    FROM marketing_strategies ms
    WHERE ms.id = v_strategy_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('marketing_strategies_changed',
        json_build_object(
            'action', 'INSERT',
            'org_id', p_org_id,
            'strategy_id', v_strategy_id,
            'campaign_id', p_campaign_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb") IS 'Database-First function to create a new marketing strategy with org validation and real-time notifications';



CREATE OR REPLACE FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text", "p_persona_type" "text" DEFAULT 'buyer'::"text", "p_age_range" "text" DEFAULT NULL::"text", "p_location" "jsonb" DEFAULT NULL::"jsonb", "p_pain_points" "jsonb" DEFAULT NULL::"jsonb", "p_goals" "jsonb" DEFAULT NULL::"jsonb", "p_preferred_channels" "jsonb" DEFAULT NULL::"jsonb", "p_content_preferences" "jsonb" DEFAULT NULL::"jsonb", "p_objections" "jsonb" DEFAULT NULL::"jsonb", "p_buying_stage" "text" DEFAULT NULL::"text", "p_decision_making_role" "text" DEFAULT NULL::"text", "p_budget_authority" "text" DEFAULT NULL::"text", "p_tech_savviness" "text" DEFAULT NULL::"text", "p_information_sources" "jsonb" DEFAULT NULL::"jsonb", "p_social_media_habits" "jsonb" DEFAULT NULL::"jsonb", "p_typical_day" "text" DEFAULT NULL::"text", "p_frustrations" "jsonb" DEFAULT NULL::"jsonb", "p_motivations" "jsonb" DEFAULT NULL::"jsonb", "p_quotes" "jsonb" DEFAULT NULL::"jsonb", "p_success_metrics" "jsonb" DEFAULT NULL::"jsonb", "p_buying_triggers" "jsonb" DEFAULT NULL::"jsonb", "p_demographics" "jsonb" DEFAULT NULL::"jsonb", "p_psychographics" "jsonb" DEFAULT NULL::"jsonb", "p_behavioral_traits" "jsonb" DEFAULT NULL::"jsonb", "p_customer_journey" "jsonb" DEFAULT NULL::"jsonb", "p_interaction_history" "jsonb" DEFAULT NULL::"jsonb", "p_background_story" "text" DEFAULT NULL::"text", "p_key_quote" "text" DEFAULT NULL::"text", "p_is_primary" boolean DEFAULT NULL::boolean) RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "name" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_new_persona_id UUID;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;
    SELECT user_id INTO v_user_id FROM get_current_user();

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Insert new persona (FIXED: removed is_active from column list and VALUES)
    INSERT INTO synthetic_personas (
        org_id,
        campaign_id,
        name,
        title,
        persona_type,
        age_range,
        location,
        pain_points,
        goals,
        preferred_channels,
        content_preferences,
        objections,
        buying_stage,
        decision_making_role,
        budget_authority,
        tech_savviness,
        information_sources,
        social_media_habits,
        typical_day,
        frustrations,
        motivations,
        quotes,
        success_metrics,
        buying_triggers,
        demographics,
        psychographics,
        behavioral_traits,
        customer_journey,
        interaction_history,
        background_story,
        key_quote,
        is_primary,
        -- REMOVED: is_active (was line 106)
        created_by,
        updated_by
    ) VALUES (
        p_org_id,
        p_campaign_id,
        p_name,
        p_title,
        p_persona_type,
        p_age_range,
        p_location,
        p_pain_points,
        p_goals,
        p_preferred_channels,
        p_content_preferences,
        p_objections,
        p_buying_stage,
        p_decision_making_role,
        p_budget_authority,
        p_tech_savviness,
        p_information_sources,
        p_social_media_habits,
        p_typical_day,
        p_frustrations,
        p_motivations,
        p_quotes,
        p_success_metrics,
        p_buying_triggers,
        p_demographics,
        p_psychographics,
        p_behavioral_traits,
        p_customer_journey,
        p_interaction_history,
        p_background_story,
        p_key_quote,
        p_is_primary,
        -- REMOVED: true (was is_active value)
        v_user_id,
        v_user_id
    )
    RETURNING id INTO v_new_persona_id;

    -- Return created persona info
    RETURN QUERY
    SELECT
        sp.id,
        sp.org_id,
        sp.campaign_id,
        sp.name::TEXT,
        sp.created_at
    FROM synthetic_personas sp
    WHERE sp.id = v_new_persona_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('personas_changed',
        json_build_object(
            'action', 'INSERT',
            'org_id', p_org_id,
            'persona_id', v_new_persona_id,
            'campaign_id', p_campaign_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) IS 'Creates a new persona with all fields. Validates org access and notifies real-time subscribers.
Version: 1.1 (Fixed: removed deprecated is_active column reference)
Dependencies: synthetic_personas table, get_user_org_id(), get_current_user() functions';


CREATE OR REPLACE FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  -- Check agency schema first
  SELECT EXISTS(
    SELECT 1
    FROM agency.agent_conversations
    WHERE id = p_session_id
  ) INTO v_found;

  IF v_found THEN
    RETURN 'agency';
  END IF;

  -- Check public schema
  SELECT EXISTS(
    SELECT 1
    FROM public.agent_conversations
    WHERE id = p_session_id
  ) INTO v_found;

  IF v_found THEN
    RETURN 'public';
  END IF;

  -- Session not found in either schema
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") IS 'Detects which schema (agency or public) a session belongs to by checking both tables. Returns ''agency'', ''public'', or NULL if not found. Created in Migration 237 to support schema routing in session_service.py.';



CREATE OR REPLACE FUNCTION "public"."ensure_single_active_content_plan"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate other plans for the same campaign
    UPDATE content_plans
    SET is_active = false, updated_at = NOW()
    WHERE campaign_id = NEW.campaign_id
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_active_content_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_primary_persona"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If setting a persona as primary
    IF NEW.is_primary = true AND (OLD IS NULL OR OLD.is_primary != true) THEN
        -- Unset other primary personas in the same campaign (if campaign_id is set)
        IF NEW.campaign_id IS NOT NULL THEN
            UPDATE synthetic_personas
            SET is_primary = false
            WHERE campaign_id = NEW.campaign_id
                AND org_id = NEW.org_id
                AND id != NEW.id
                AND is_primary = true;
        ELSE
            -- Unset other primary personas in the same org (when no campaign)
            UPDATE synthetic_personas
            SET is_primary = false
            WHERE org_id = NEW.org_id
                AND campaign_id IS NULL
                AND id != NEW.id
                AND is_primary = true;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_primary_persona"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_agent_output"("output_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE agent_outputs
  SET
    status = 'final',
    finalized_at = NOW(),
    expires_at = NULL  -- Remove expiry for finalized outputs
  WHERE id = output_id AND status = 'draft';

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."finalize_agent_output"("output_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."get_active_personas"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "title" "text", "persona_type" "text", "age_range" "text", "location" "jsonb", "pain_points" "jsonb", "goals" "jsonb", "buying_stage" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name::TEXT,
    p.title::TEXT,
    p.persona_type::TEXT,
    p.age_range::TEXT,
    p.location,
    p.pain_points,
    p.goals,
    p.buying_stage::TEXT,
    p.created_at
  FROM synthetic_personas p
  LEFT JOIN campaigns c ON p.campaign_id = c.id
  LEFT JOIN (
    SELECT persona_id, count(*)
    FROM marketing_strategy_personas msp
    JOIN marketing_strategies ms ON msp.strategy_id = ms.id
    WHERE ms.archived_at IS NULL
    GROUP BY persona_id
  ) strategy_count ON p.id = strategy_count.persona_id
  WHERE p.org_id = p_org_id
    -- FIXED: Removed AND p.is_active = true (was line 177)
    AND p.archived_at IS NULL
  ORDER BY
    p.is_primary DESC NULLS LAST,
    p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_personas"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_personas"("p_org_id" "uuid") IS 'Returns all active (non-archived) personas for an organization.
Version: 1.1 (Fixed: removed is_active column reference, using archived_at IS NULL)
Dependencies: synthetic_personas, campaigns, marketing_strategies tables';



CREATE OR REPLACE FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "title" "text", "challenge_area" "text", "opportunities_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ao.id,
    ao.title,
    ao.content->>'challenge_area' as challenge_area,
    jsonb_array_length(ao.content->'opportunities') as opportunities_count,
    ao.created_at
  FROM agent_outputs ao
  WHERE
    ao.org_id = p_org_id
    AND ao.agent_type = 'performance_intelligence'
    AND ao.output_type = 'quick_wins'
    AND ao.status IN ('final', 'published')
    AND ao.archived_at IS NULL
    AND (p_challenge_area IS NULL OR ao.content->>'challenge_area' = p_challenge_area)
  ORDER BY ao.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text") IS 'Get active quick win opportunities, optionally filtered by challenge area';



CREATE OR REPLACE FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_context JSONB;
BEGIN
  -- Aggregate all context data into single JSONB object
  SELECT jsonb_build_object(
    'org_id', p_org_id,
    'agent_type', p_agent_type,
    'loaded_at', NOW(),

    -- Core business data (company profile)
    'company', (
      SELECT row_to_json(cbd)
      FROM core_business_data cbd
      WHERE cbd.org_id = p_org_id
      LIMIT 1
    ),

    -- Brand guidelines
    'brand_guidelines', (
      SELECT row_to_json(bg)
      FROM brand_guidelines bg
      WHERE bg.org_id = p_org_id
      LIMIT 1
    ),

    -- ✅ FIX: Personas with proper filtering and field extraction
    'personas', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ao.id,
          'title', ao.title,
          'summary', ao.summary,
          -- ✅ Extract structured fields from content JSONB
          'name', COALESCE(
            (ao.content->>'name')::TEXT,
            split_part(ao.title, ' - ', 1)
          ),
          'job_title', COALESCE(
            (ao.content->>'title')::TEXT,
            split_part(ao.title, ' - ', 2)
          ),
          'company_name', (ao.content->>'company_name')::TEXT,
          'company_size', (ao.content->>'company_size')::TEXT,
          'industry', (ao.content->>'industry')::TEXT,
          'vertical', (ao.content->>'vertical')::TEXT,
          -- ✅ Extract JSONB arrays and objects
          'goals', (ao.content->'goals')::JSONB,
          'pain_points', (ao.content->'pain_points')::JSONB,
          'jobs_to_be_done', (ao.content->'jobs_to_be_done')::JSONB,
          'preferred_channels', (ao.content->'preferred_channels')::JSONB,
          'decision_criteria', (ao.content->'decision_criteria')::JSONB,
          'demographics', (ao.content->'demographics')::JSONB,
          'personality_traits', (ao.content->'personality_traits')::JSONB,
          'buyer_journey', (ao.content->'buyer_journey')::JSONB,
          'objections', (ao.content->'objections')::JSONB,
          'current_tools', (ao.content->'current_tools')::JSONB,
          -- Metadata
          'is_primary', (ao.metadata->>'is_primary')::BOOLEAN,
          'created_at', ao.created_at,
          'updated_at', ao.updated_at
        ) ORDER BY
          (ao.metadata->>'is_primary')::BOOLEAN DESC NULLS LAST,
          ao.created_at DESC
      ), '[]'::jsonb)
      FROM agent_outputs ao
      WHERE ao.org_id = p_org_id
        AND ao.agent_type = 'persona'
        AND ao.output_type = 'persona'  -- ✅ FIX: Filter out interview_insight and intelligence
        AND ao.archived_at IS NULL
      LIMIT 20
    ),

    -- Strategy outputs (agent outputs with agent_type = 'strategy')
    'strategy_outputs', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ao.id,
          'title', ao.title,
          'summary', ao.summary,
          'content', ao.content,
          'created_at', ao.created_at,
          'updated_at', ao.updated_at
        ) ORDER BY ao.created_at DESC
      ), '[]'::jsonb)
      FROM agent_outputs ao
      WHERE ao.org_id = p_org_id
        AND ao.agent_type = 'strategy'
        AND ao.archived_at IS NULL
      LIMIT 10
    ),

    -- Content outputs (agent outputs with agent_type = 'content')
    'content_outputs', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ao.id,
          'title', ao.title,
          'summary', ao.summary,
          'content', ao.content,
          'created_at', ao.created_at
        ) ORDER BY ao.created_at DESC
      ), '[]'::jsonb)
      FROM agent_outputs ao
      WHERE ao.org_id = p_org_id
        AND ao.agent_type = 'content'
        AND ao.archived_at IS NULL
      LIMIT 10
    ),

    -- Marketing strategies
    'marketing_strategies', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ms.id,
          'title', ms.title,
          'created_at', ms.created_at,
          'updated_at', ms.updated_at
        ) ORDER BY ms.created_at DESC
      ), '[]'::jsonb)
      FROM marketing_strategies ms
      WHERE ms.org_id = p_org_id
        AND ms.archived_at IS NULL
      LIMIT 10
    ),

    -- AI insights (approved only)
    'ai_insights', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ai.id,
          'content', ai.content,
          'confidence_score', ai.confidence_score,
          'created_at', ai.created_at
        ) ORDER BY ai.confidence_score DESC, ai.created_at DESC
      ), '[]'::jsonb)
      FROM ai_insights ai
      WHERE ai.org_id = p_org_id
        AND ai.validation_status IN ('approved', 'auto_approved')
        AND ai.is_archived = false
      LIMIT 50
    ),

    -- Active campaigns
    'campaigns', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'status', c.status,
          'created_at', c.created_at
        ) ORDER BY c.created_at DESC
      ), '[]'::jsonb)
      FROM campaigns c
      WHERE c.org_id = p_org_id
        AND c.archived_at IS NULL
      LIMIT 10
    ),

    -- Organization details
    'organization', (
      SELECT row_to_json(o)
      FROM organizations o
      WHERE o.id = p_org_id
      LIMIT 1
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$;


ALTER FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text") IS 'Consolidates all agent context queries into single database call.
Performance: 12s (7 API calls) → 1.2s (1 RPC call) = 91% improvement.
Returns JSONB with company, brand_guidelines, personas (with structured fields),
strategies, insights, campaigns, and organization data.
Used by Progressive Learning Context Service for all AI agents.

Migration 255 (2025-11-13): Fixed persona loading to:
- Filter by output_type = persona (exclude interview_insight, intelligence)
- Extract structured fields from content JSONB (goals, pain_points, etc.)
- Enable Marketing Strategy agent to access persona data properly';



CREATE OR REPLACE FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_agent_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
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
        -- AGENCY: Require client_id, query agency schema
        IF p_client_id IS NULL THEN
            RAISE EXCEPTION 'client_id required for agency organizations';
        END IF;

        v_result := agency.get_agent_context(p_org_id, p_client_id, p_agent_type);

    ELSE
        -- SME: Query public schema (existing function)
        v_result := public.get_agent_context(p_org_id, p_agent_type);
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") IS 'Router function that gets agent context from correct schema based on org_type. Week 3. Migration 161.';



CREATE OR REPLACE FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_include_archived" boolean DEFAULT false, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "agent_type" "text", "session_title" "text", "message_count" integer, "first_message" "text", "last_message" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archive_reason" "text", "is_archived" boolean)
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
        ac.id,
        ac.org_id,
        ac.user_id,
        ac.agent_type,
        -- FIXED: Check 'name' key first, then 'session_title', then 'title'
        COALESCE((ac.session_data->>'name')::TEXT,
                 (ac.session_data->>'session_title')::TEXT,
                 (ac.session_data->>'title')::TEXT,
                 'Untitled Session') AS session_title,
        COALESCE((ac.session_data->>'message_count')::INTEGER, 0) AS message_count,
        (ac.session_data->>'first_message')::TEXT AS first_message,
        (ac.session_data->>'last_message')::TEXT AS last_message,
        ac.created_at,
        ac.updated_at,
        ac.archived_at,
        ac.archive_reason,
        COALESCE(ac.is_archived, FALSE) AS is_archived
    FROM agent_conversations ac
    WHERE ac.org_id = p_org_id
      AND ac.agent_type = p_agent_type
      AND (p_user_id IS NULL OR ac.user_id = p_user_id)
      AND (p_include_archived OR ac.archived_at IS NULL)
    ORDER BY
        CASE WHEN ac.archived_at IS NULL THEN 0 ELSE 1 END,
        ac.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) IS 'Database-First function to retrieve agent sessions with metadata for sidebar navigation. Fixed to extract session title from name, session_title, or title keys in session_data JSONB.';



CREATE OR REPLACE FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_include_archived" boolean DEFAULT false, "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "client_id" "uuid", "agent_type" "text", "session_title" "text", "message_count" integer, "first_message" "text", "last_message" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archive_reason" "text", "is_archived" boolean)
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
        ac.id,
        ac.org_id,
        ac.user_id,
        ac.client_id, -- NEW: Include client_id in results
        ac.agent_type,
        -- Extract session_title from session_data JSONB
        COALESCE(
            (ac.session_data->>'name')::TEXT,
            (ac.session_data->>'session_title')::TEXT,
            (ac.session_data->>'title')::TEXT,
            'Untitled Session'
        ) AS session_title,
        COALESCE((ac.session_data->>'message_count')::INTEGER, 0) AS message_count,
        (ac.session_data->>'first_message')::TEXT AS first_message,
        (ac.session_data->>'last_message')::TEXT AS last_message,
        ac.created_at,
        ac.updated_at,
        ac.archived_at,
        ac.archive_reason,
        COALESCE(ac.is_archived, FALSE) AS is_archived
    FROM agent_conversations ac
    WHERE ac.org_id = p_org_id
      AND ac.agent_type = p_agent_type
      AND (p_user_id IS NULL OR ac.user_id = p_user_id)
      AND (p_client_id IS NULL OR ac.client_id = p_client_id) -- NEW: Filter by client when provided
      AND (p_include_archived OR ac.archived_at IS NULL)
    ORDER BY
        CASE WHEN ac.archived_at IS NULL THEN 0 ELSE 1 END, -- Active sessions first
        ac.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) IS 'Retrieves agent sessions with optional client filtering for multi-tenant isolation. When p_client_id is provided, only returns sessions for that client (agency use case). When NULL, returns all sessions for the organization (SME use case).';



CREATE OR REPLACE FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer DEFAULT 30) RETURNS TABLE("total_insights" integer, "approved_insights" integer, "pending_insights" integer, "rejected_insights" integer, "auto_approved_insights" integer, "avg_confidence_score" numeric, "avg_impact_score" numeric, "total_usage_count" bigint, "unique_agents_count" integer, "insights_by_type" "jsonb", "insights_by_source" "jsonb", "validation_distribution" "jsonb", "confidence_distribution" "jsonb", "performance_trends" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  insights_by_type_json JSONB;
  insights_by_source_json JSONB;
  validation_distribution_json JSONB;
  confidence_distribution_json JSONB;
  performance_trends_json JSONB;
BEGIN
  -- Get insights by type
  SELECT json_agg(
    json_build_object(
      'type', insight_type,
      'count', count,
      'percentage', ROUND((count::NUMERIC / total_count::NUMERIC) * 100, 1)
    )
  ) INTO insights_by_type_json
  FROM (
    SELECT
      insight_type,
      COUNT(*) as count,
      (SELECT COUNT(*) FROM ai_insights WHERE org_id = p_org_id AND archived_at IS NULL) as total_count
    FROM ai_insights
    WHERE org_id = p_org_id AND archived_at IS NULL
    GROUP BY insight_type
  ) type_counts;

  -- Get insights by source agent
  SELECT json_agg(
    json_build_object(
      'source_agent', COALESCE(source_agent, 'unknown'),
      'count', count,
      'avg_confidence', avg_confidence
    )
  ) INTO insights_by_source_json
  FROM (
    SELECT
      source_agent,
      COUNT(*) as count,
      ROUND(AVG(confidence_score)::NUMERIC, 3) as avg_confidence
    FROM ai_insights
    WHERE org_id = p_org_id AND archived_at IS NULL
    GROUP BY source_agent
    ORDER BY count DESC
  ) source_counts;

  -- Get validation status distribution
  SELECT json_agg(
    json_build_object(
      'status', validation_status,
      'count', count,
      'percentage', ROUND((count::NUMERIC / total_count::NUMERIC) * 100, 1)
    )
  ) INTO validation_distribution_json
  FROM (
    SELECT
      validation_status,
      COUNT(*) as count,
      (SELECT COUNT(*) FROM ai_insights WHERE org_id = p_org_id AND archived_at IS NULL) as total_count
    FROM ai_insights
    WHERE org_id = p_org_id AND archived_at IS NULL
    GROUP BY validation_status
  ) validation_counts;

  -- Get confidence score distribution
  SELECT json_agg(
    json_build_object(
      'confidence_range', confidence_range,
      'count', count
    )
  ) INTO confidence_distribution_json
  FROM (
    SELECT
      CASE
        WHEN confidence_score >= 0.8 THEN 'High (0.8-1.0)'
        WHEN confidence_score >= 0.6 THEN 'Medium (0.6-0.79)'
        WHEN confidence_score >= 0.4 THEN 'Low (0.4-0.59)'
        ELSE 'Very Low (0.0-0.39)'
      END as confidence_range,
      COUNT(*) as count
    FROM ai_insights
    WHERE org_id = p_org_id AND archived_at IS NULL AND confidence_score IS NOT NULL
    GROUP BY
      CASE
        WHEN confidence_score >= 0.8 THEN 'High (0.8-1.0)'
        WHEN confidence_score >= 0.6 THEN 'Medium (0.6-0.79)'
        WHEN confidence_score >= 0.4 THEN 'Low (0.4-0.59)'
        ELSE 'Very Low (0.0-0.39)'
      END
  ) confidence_ranges;

  -- Get performance trends
  SELECT json_agg(
    json_build_object(
      'date', date_created,
      'insights_created', insights_created,
      'avg_confidence', avg_confidence,
      'approved_count', approved_count
    ) ORDER BY date_created
  ) INTO performance_trends_json
  FROM (
    SELECT
      DATE(created_at) as date_created,
      COUNT(*) as insights_created,
      ROUND(AVG(confidence_score)::NUMERIC, 3) as avg_confidence,
      COUNT(*) FILTER (WHERE validation_status IN ('approved', 'auto_approved')) as approved_count
    FROM ai_insights
    WHERE org_id = p_org_id
      AND created_at >= (CURRENT_DATE - INTERVAL '1 day' * p_period_days)
      AND archived_at IS NULL
    GROUP BY DATE(created_at)
    ORDER BY date_created
    LIMIT 30
  ) daily_stats;

  RETURN QUERY
  SELECT
    COALESCE(COUNT(*), 0)::INT as total_insights,
    COALESCE(COUNT(*) FILTER (WHERE validation_status = 'approved'), 0)::INT as approved_insights,
    COALESCE(COUNT(*) FILTER (WHERE validation_status = 'pending'), 0)::INT as pending_insights,
    COALESCE(COUNT(*) FILTER (WHERE validation_status = 'rejected'), 0)::INT as rejected_insights,
    COALESCE(COUNT(*) FILTER (WHERE validation_status = 'auto_approved'), 0)::INT as auto_approved_insights,
    ROUND(AVG(confidence_score)::NUMERIC, 3) as avg_confidence_score,
    ROUND(AVG(impact_score)::NUMERIC, 1) as avg_impact_score,
    COALESCE(SUM(usage_count), 0)::BIGINT as total_usage_count,
    COUNT(DISTINCT source_agent)::INT as unique_agents_count,
    COALESCE(insights_by_type_json, '[]'::JSONB) as insights_by_type,
    COALESCE(insights_by_source_json, '[]'::JSONB) as insights_by_source,
    COALESCE(validation_distribution_json, '[]'::JSONB) as validation_distribution,
    COALESCE(confidence_distribution_json, '[]'::JSONB) as confidence_distribution,
    COALESCE(performance_trends_json, '[]'::JSONB) as performance_trends
  FROM ai_insights
  WHERE org_id = p_org_id
    AND archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer) IS 'Returns business intelligence performance analytics and trends.
Provides aggregated statistics for AI insights reporting. Version: 1.0';



CREATE OR REPLACE FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN get_cached_recommendations(p_org_id, 'content', p_data_hash);
END;
$$;


ALTER FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") IS 'Backward-compatible wrapper. Use get_cached_recommendations directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN get_cached_recommendations(p_org_id, 'opportunity', p_data_hash);
END;
$$;


ALTER FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") IS 'New function for opportunity recommendations. Uses unified cache system.';



CREATE OR REPLACE FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN get_cached_recommendations(p_org_id, 'roi', p_data_hash);
END;
$$;


ALTER FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") IS 'Backward-compatible wrapper. Use get_cached_recommendations directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "conversation_id" "uuid", "role" "text", "content" "text", "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_schema TEXT;
BEGIN
  -- Detect which schema the session belongs to
  v_schema := detect_session_schema(p_session_id);

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Route query based on schema
  IF v_schema = 'agency' THEN
    -- Query from agency.agent_messages
    RETURN QUERY
    SELECT
      am.id,
      am.conversation_id,
      am.role,
      am.content,
      am.metadata,
      am.created_at
    FROM agency.agent_messages am
    WHERE am.conversation_id = p_session_id
    ORDER BY am.created_at ASC
    LIMIT p_limit;

  ELSIF v_schema = 'public' THEN
    -- Query from public.agent_messages
    RETURN QUERY
    SELECT
      am.id,
      am.conversation_id,
      am.role,
      am.content,
      am.metadata,
      am.created_at
    FROM public.agent_messages am
    WHERE am.conversation_id = p_session_id
    ORDER BY am.created_at ASC
    LIMIT p_limit;

  ELSE
    RAISE EXCEPTION 'Invalid schema detected: %', v_schema;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer) IS 'Retrieves conversation history from the correct schema (agency or public) based on session location. Uses detect_session_schema() to determine routing. Returns messages ordered by created_at ascending. Created in Migration 239 to fix Supabase Python client schema prefix limitations.';



CREATE OR REPLACE FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text" DEFAULT NULL::"text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "agent_type" "text", "user_id" "uuid", "client_id" "uuid", "campaign_id" "uuid", "title" "text", "message_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
BEGIN
  -- Detect organization type
  SELECT organizations.type INTO v_org_type
  FROM organizations
  WHERE organizations.id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Query from agency.agent_conversations
    RETURN QUERY
    SELECT
      c.id,
      c.org_id,
      c.agent_type,
      c.user_id,
      c.client_id,
      c.campaign_id,
      c.title,
      COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM agency.agent_messages m
        WHERE m.conversation_id = c.id
      ), 0) AS message_count,
      c.created_at,
      c.updated_at,
      c.archived_at
    FROM agency.agent_conversations c
    WHERE c.org_id = p_org_id
      AND (p_agent_type IS NULL OR c.agent_type = p_agent_type)
      AND (p_client_id IS NULL OR c.client_id = p_client_id)
      AND c.archived_at IS NULL
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Query from public.agent_conversations
    -- FIX: Use session_data->>'name' instead of session_data->>'title'
    RETURN QUERY
    SELECT
      c.id,
      c.org_id,
      c.agent_type,
      c.user_id,
      c.client_id,
      NULL::UUID AS campaign_id,
      COALESCE(
        c.session_data->>'name',  --  FIXED: 'name' not 'title'
        'Session ' || LEFT(c.id::TEXT, 8)
      ) AS title,
      COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM public.agent_messages m
        WHERE m.conversation_id = c.id
      ), 0) AS message_count,
      c.created_at,
      c.updated_at,
      c.archived_at
    FROM public.agent_conversations c
    WHERE c.org_id = p_org_id
      AND (p_agent_type IS NULL OR c.agent_type = p_agent_type)
      AND c.archived_at IS NULL
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Router function for retrieving agent conversations. Routes to agency.agent_conversations for AGENCY orgs, public.agent_conversations for SME orgs. Fixed: session_data JSON key changed from ''title'' to ''name'' (Migration 230).';



CREATE OR REPLACE FUNCTION "public"."get_cross_agent_context"("p_org_id" "uuid", "p_exclude_agent" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "agent_type" "text", "output_type" "text", "title" "text", "summary" "text", "created_at" timestamp with time zone, "confidence_score" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ao.id,
    ao.agent_type,
    ao.output_type,
    ao.title,
    ao.summary,
    ao.created_at,
    ao.confidence_score
  FROM agent_outputs ao
  WHERE
    ao.org_id = p_org_id
    AND ao.status IN ('final', 'published')
    AND ao.validation_status != 'rejected'
    AND ao.archived_at IS NULL
    AND (p_exclude_agent IS NULL OR ao.agent_type != p_exclude_agent)
  ORDER BY ao.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_cross_agent_context"("p_org_id" "uuid", "p_exclude_agent" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20) RETURNS TABLE("agent_type" "text", "title" "text", "summary" "text", "relevance_score" double precision, "content" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ao.agent_type,
        ao.title,
        ao.summary,
        -- Relevance scoring (prefer recent + different agent types + context match)
        (
            -- Recent boost (decay over time using 1/sqrt for recency weighting)
            1.0 / SQRT(EXTRACT(EPOCH FROM (NOW() - ao.created_at)) / 86400.0 + 1.0)
            -- Cross-agent boost (prefer insights from other agents)
            + CASE WHEN ao.agent_type != p_current_agent THEN 0.3 ELSE 0.0 END
            -- Context relevance boost (keyword matching)
            + CASE
                WHEN p_query_context IS NOT NULL
                AND (
                    ao.title ILIKE '%' || p_query_context || '%'
                    OR ao.summary ILIKE '%' || p_query_context || '%'
                )
                THEN 0.5
                ELSE 0.0
              END
        )::FLOAT as relevance_score,
        ao.content,
        ao.created_at
    FROM agent_outputs ao
    WHERE ao.org_id = p_org_id
      AND ao.archived_at IS NULL
    ORDER BY relevance_score DESC, ao.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text", "p_limit" integer) IS 'Queries agent_outputs with relevance scoring. Prioritizes recent insights from different agents and context-relevant content.';



CREATE OR REPLACE FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer DEFAULT 30) RETURNS TABLE("total_strategies" integer, "active_strategies" integer, "draft_strategies" integer, "completed_strategies" integer, "avg_completion_percentage" numeric, "total_outputs" integer, "avg_priority_score" numeric, "strategies_by_type" "jsonb", "completion_distribution" "jsonb", "performance_trends" "jsonb")
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
  WITH strategy_stats AS (
    SELECT
      COUNT(*)::INT as total_strategies,
      COUNT(*) FILTER (WHERE status = 'active')::INT as active_strategies,
      COUNT(*) FILTER (WHERE status = 'draft')::INT as draft_strategies,
      COUNT(*) FILTER (WHERE status = 'completed')::INT as completed_strategies,
      ROUND(AVG(
        CASE WHEN title IS NOT NULL AND title != '' THEN 20 ELSE 0 END +
        CASE WHEN positioning_statement IS NOT NULL AND positioning_statement != '' THEN 20 ELSE 0 END +
        CASE WHEN value_propositions IS NOT NULL AND value_propositions != '{}'::JSONB THEN 20 ELSE 0 END +
        CASE WHEN key_messages IS NOT NULL AND key_messages != '{}'::JSONB THEN 20 ELSE 0 END +
        CASE WHEN channel_mix IS NOT NULL AND channel_mix != '{}'::JSONB THEN 20 ELSE 0 END
      ), 1) as avg_completion_percentage,
      (SELECT COUNT(*) FROM agent_outputs ao
       JOIN marketing_strategies ms ON (ao.metadata->>'strategy_id')::UUID = ms.id
       WHERE ms.org_id = p_org_id AND ao.agent_type = 'marketing_strategy' AND ao.archived_at IS NULL)::INT as total_outputs,
      ROUND(AVG(priority_score), 1) as avg_priority_score
    FROM marketing_strategies ms
    WHERE ms.org_id = p_org_id
      AND ms.archived_at IS NULL
      AND ms.created_at > NOW() - INTERVAL '1 day' * p_period_days
  )
  SELECT
    ss.total_strategies,
    ss.active_strategies,
    ss.draft_strategies,
    ss.completed_strategies,
    ss.avg_completion_percentage,
    ss.total_outputs,
    ss.avg_priority_score,
    '{}'::JSONB as strategies_by_type,
    '{}'::JSONB as completion_distribution,
    '{}'::JSONB as performance_trends
  FROM strategy_stats ss;
END;
$$;


ALTER FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer) IS 'Updated function to use unified agent_outputs table instead of marketing_strategy_outputs';



CREATE OR REPLACE FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "campaign_info" "jsonb", "title" "text", "strategy_type" "text", "status" "text", "value_propositions" "jsonb", "key_messages" "jsonb", "differentiation_points" "text"[], "elevator_pitches" "jsonb", "tone_of_voice" "jsonb", "brand_personality" "jsonb", "positioning_statement" "text", "channel_mix" "jsonb", "budget_allocation" "jsonb", "content_pillars" "text"[], "estimated_reach" integer, "estimated_cost" numeric, "priority_score" integer, "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archive_reason" "text", "creator_info" "jsonb", "linked_personas" "jsonb", "strategy_outputs" "jsonb", "brand_guidelines" "jsonb", "performance_metrics" "jsonb", "details_generated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_org_id UUID;
  campaign_info_json JSONB;
  creator_info_json JSONB;
  linked_personas_json JSONB;
  strategy_outputs_json JSONB;
  brand_guidelines_json JSONB;
  performance_metrics_json JSONB;
BEGIN
  -- Security: Verify user has access to this organization
  SELECT get_user_org_id() INTO v_user_org_id;
  IF v_user_org_id != p_org_id THEN
    RAISE EXCEPTION 'Unauthorized access to organization data';
  END IF;

  -- Get campaign info
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'status', c.status,
    'start_date', c.start_date,
    'end_date', c.end_date
  ) INTO campaign_info_json
  FROM campaigns c
  JOIN marketing_strategies ms ON c.id = ms.campaign_id
  WHERE ms.id = p_strategy_id;

  -- Get creator info
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name
  ) INTO creator_info_json
  FROM users u
  JOIN marketing_strategies ms ON u.id = ms.created_by
  WHERE ms.id = p_strategy_id;

  -- Get linked personas
  SELECT jsonb_agg(jsonb_build_object(
    'id', sp.id,
    'name', sp.name,
    'title', sp.title,
    'company_name', sp.company_name,
    'industry', sp.industry,
    'is_primary', sp.is_primary,
    'created_at', sp.created_at
  )) INTO linked_personas_json
  FROM marketing_strategy_personas msp
  JOIN synthetic_personas sp ON msp.persona_id = sp.id
  WHERE msp.strategy_id = p_strategy_id AND sp.archived_at IS NULL;

  -- Get strategy outputs (from unified agent_outputs table)
  SELECT jsonb_agg(jsonb_build_object(
    'id', ao.id,
    'title', ao.title,
    'output_type', ao.output_type,
    'summary', ao.summary,
    'content', ao.content,
    'confidence_score', ao.confidence_score,
    'created_at', ao.created_at
  ) ORDER BY ao.created_at DESC) INTO strategy_outputs_json
  FROM agent_outputs ao
  WHERE ao.agent_type = 'marketing_strategy'
    AND ao.metadata ? 'strategy_id'
    AND (ao.metadata->>'strategy_id')::UUID = p_strategy_id
    AND ao.archived_at IS NULL;

  -- Get brand guidelines
  SELECT jsonb_agg(jsonb_build_object(
    'id', bg.id,
    'name', bg.name,
    'content', bg.content,
    'created_at', bg.created_at
  )) INTO brand_guidelines_json
  FROM marketing_strategy_brand_guidelines msbg
  JOIN brand_guidelines bg ON msbg.brand_guidelines_id = bg.id
  WHERE msbg.strategy_id = p_strategy_id AND bg.archived_at IS NULL;

  -- Calculate performance metrics
  SELECT jsonb_build_object(
    'linked_personas_count', COALESCE(jsonb_array_length(linked_personas_json), 0),
    'outputs_count', COALESCE(jsonb_array_length(strategy_outputs_json), 0),
    'brand_guidelines_count', COALESCE(jsonb_array_length(brand_guidelines_json), 0),
    'completion_score', CASE
      WHEN ms.title IS NOT NULL AND ms.positioning_statement IS NOT NULL
           AND ms.value_propositions IS NOT NULL AND ms.key_messages IS NOT NULL
      THEN 85
      ELSE 45
    END
  ) INTO performance_metrics_json
  FROM marketing_strategies ms
  WHERE ms.id = p_strategy_id;

  -- Return the complete strategy details
  RETURN QUERY
  SELECT
    ms.id,
    ms.org_id,
    ms.campaign_id,
    campaign_info_json as campaign_info,
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
    ms.archived_at,
    ms.archive_reason,
    creator_info_json as creator_info,
    linked_personas_json as linked_personas,
    strategy_outputs_json as strategy_outputs,
    brand_guidelines_json as brand_guidelines,
    performance_metrics_json as performance_metrics,
    NOW() as details_generated_at
  FROM marketing_strategies ms
  WHERE ms.id = p_strategy_id AND ms.org_id = p_org_id;
END;
$$;


ALTER FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") IS 'Updated function to use unified agent_outputs table instead of marketing_strategy_outputs';



CREATE OR REPLACE FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_summary JSON;
  v_by_category JSON;
  v_by_status JSON;
BEGIN
  -- Build category breakdown as JSON object
  -- Note: category is text[] array type, use first element
  SELECT COALESCE(json_object_agg(category, count), '{}'::json)
  INTO v_by_category
  FROM (
    SELECT COALESCE(category[1], 'other') as category, COUNT(*) as count
    FROM agent_outputs
    WHERE agent_type = 'quick_wins'
      AND org_id = p_org_id
      AND archived_at IS NULL
    GROUP BY category[1]
  ) cat_counts;

  -- Build status breakdown as JSON object
  SELECT COALESCE(json_object_agg(status, count), '{}'::json)
  INTO v_by_status
  FROM (
    SELECT COALESCE(status, 'pending') as status, COUNT(*) as count
    FROM agent_outputs
    WHERE agent_type = 'quick_wins'
      AND org_id = p_org_id
      AND archived_at IS NULL
    GROUP BY status
  ) status_counts;

  -- Build complete summary with all aggregations in a single query
  SELECT json_build_object(
    'total_opportunities', COUNT(*),
    'by_priority', json_build_object(
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
      'low', COUNT(*) FILTER (WHERE priority = 'low')
    ),
    'by_status', v_by_status,
    'by_category', v_by_category,
    'actionable_now', COUNT(*) FILTER (
      WHERE status = 'ready'
      AND metadata->>'implementation_time' = 'immediate'
    ),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    -- Extract numeric values from business_value strings like "+1,200" or "$1,200"
    'total_estimated_value', COALESCE(
      SUM(
        (regexp_match(content->'expected_impact'->>'business_value', '[\d,]+'))[1]::text::numeric
      ) FILTER (
        WHERE content->'expected_impact'->>'business_value' ~ '[\d,]+'
      ),
      0
    ),
    'average_estimated_impact', COALESCE(
      AVG(
        (regexp_match(content->'expected_impact'->>'business_value', '[\d,]+'))[1]::text::numeric
      ) FILTER (
        WHERE content->'expected_impact'->>'business_value' ~ '[\d,]+'
      ),
      0
    )
  ) INTO v_summary
  FROM agent_outputs
  WHERE agent_type = 'quick_wins'
    AND org_id = p_org_id
    AND archived_at IS NULL;

  RETURN v_summary;
END;
$_$;


ALTER FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") IS 'Version: 1.0
Purpose: Calculate opportunity intelligence summary metrics with single database query
Returns: JSON object with total_opportunities, by_priority, by_status, by_category, actionable_now, completed, total_estimated_value, average_estimated_impact
Performance: O(1) aggregation vs O(n) client-side calculation
Usage: SELECT get_opportunity_summary(''org-uuid'')';


CREATE OR REPLACE FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer DEFAULT 24) RETURNS TABLE("database_performance" "jsonb", "function_performance" "jsonb", "cache_performance" "jsonb", "user_activity" "jsonb", "system_health" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_time_threshold TIMESTAMPTZ;
    v_db_perf JSONB := '{}';
    v_func_perf JSONB := '{}';
    v_cache_perf JSONB := '{}';
    v_user_activity JSONB := '{}';
    v_system_health JSONB := '{}';
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    v_time_threshold := NOW() - (p_time_range_hours || ' hours')::INTERVAL;

    -- Database Performance Metrics
    WITH db_stats AS (
        SELECT
            AVG(execution_time_ms) as avg_execution_time,
            MAX(execution_time_ms) as max_execution_time,
            MIN(execution_time_ms) as min_execution_time,
            COUNT(*) as total_operations,
            SUM(CASE WHEN error_count > 0 THEN 1 ELSE 0 END) as error_operations,
            AVG(memory_usage_mb) as avg_memory_usage,
            SUM(rows_affected) as total_rows_processed
        FROM performance_metrics
        WHERE org_id = p_org_id
          AND measured_at > v_time_threshold
          AND metric_type IN ('function_execution', 'query_performance')
    )
    SELECT jsonb_build_object(
        'avg_execution_time_ms', COALESCE(avg_execution_time, 0),
        'max_execution_time_ms', COALESCE(max_execution_time, 0),
        'min_execution_time_ms', COALESCE(min_execution_time, 0),
        'total_operations', COALESCE(total_operations, 0),
        'error_rate_percentage', CASE
            WHEN total_operations > 0 THEN ROUND((error_operations::NUMERIC / total_operations * 100)::numeric, 2)
            ELSE 0
        END,
        'avg_memory_usage_mb', COALESCE(avg_memory_usage, 0),
        'total_rows_processed', COALESCE(total_rows_processed, 0),
        'success_rate_percentage', CASE
            WHEN total_operations > 0 THEN ROUND(((total_operations - error_operations)::NUMERIC / total_operations * 100)::numeric, 2)
            ELSE 100
        END
    )
    INTO v_db_perf
    FROM db_stats;

    -- Function Performance Metrics (Phase 4 specific functions)
    WITH func_stats AS (
        SELECT
            metric_name,
            AVG(execution_time_ms) as avg_time,
            COUNT(*) as call_count,
            SUM(error_count) as total_errors,
            MAX(measured_at) as last_called
        FROM performance_metrics
        WHERE org_id = p_org_id
          AND measured_at > v_time_threshold
          AND metric_type = 'function_execution'
          AND metric_name IN (
              'get_unified_outputs_hub',
              'get_output_hub_summary_cached',
              'get_agent_sessions',
              'create_agent_session',
              'update_agent_session',
              'archive_agent_session'
          )
        GROUP BY metric_name
    )
    SELECT jsonb_object_agg(
        metric_name,
        jsonb_build_object(
            'avg_execution_time_ms', avg_time,
            'call_count', call_count,
            'error_count', total_errors,
            'success_rate', CASE
                WHEN call_count > 0 THEN ROUND(((call_count - total_errors)::NUMERIC / call_count * 100)::numeric, 2)
                ELSE 100
            END,
            'last_called', last_called
        )
    )
    INTO v_func_perf
    FROM func_stats;

    -- Cache Performance Metrics
    WITH cache_stats AS (
        SELECT
            COUNT(*) as total_requests,
            SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
            AVG(CASE WHEN cache_hit THEN execution_time_ms ELSE NULL END) as avg_cache_hit_time,
            AVG(CASE WHEN NOT cache_hit THEN execution_time_ms ELSE NULL END) as avg_cache_miss_time
        FROM performance_metrics
        WHERE org_id = p_org_id
          AND measured_at > v_time_threshold
          AND cache_hit IS NOT NULL
    )
    SELECT jsonb_build_object(
        'total_requests', COALESCE(total_requests, 0),
        'cache_hits', COALESCE(cache_hits, 0),
        'hit_rate_percentage', CASE
            WHEN total_requests > 0 THEN ROUND((cache_hits::NUMERIC / total_requests * 100)::numeric, 2)
            ELSE 0
        END,
        'avg_hit_time_ms', COALESCE(avg_cache_hit_time, 0),
        'avg_miss_time_ms', COALESCE(avg_cache_miss_time, 0),
        'performance_improvement', CASE
            WHEN avg_cache_miss_time > 0 AND avg_cache_hit_time > 0
            THEN ROUND(((avg_cache_miss_time - avg_cache_hit_time) / avg_cache_miss_time * 100)::numeric, 2)
            ELSE 0
        END
    )
    INTO v_cache_perf
    FROM cache_stats;

    -- User Activity Metrics
    WITH activity_stats AS (
        SELECT
            COUNT(*) as total_operations,
            COUNT(DISTINCT DATE_TRUNC('hour', measured_at)) as active_hours,
            AVG(metric_value) as avg_operations_per_request
        FROM performance_metrics
        WHERE org_id = p_org_id
          AND measured_at > v_time_threshold
          AND metric_type = 'user_activity'
    )
    SELECT jsonb_build_object(
        'total_user_operations', COALESCE(total_operations, 0),
        'active_hours', COALESCE(active_hours, 0),
        'avg_operations_per_request', COALESCE(avg_operations_per_request, 0),
        'operations_per_hour', CASE
            WHEN active_hours > 0 THEN ROUND((total_operations::NUMERIC / active_hours)::numeric, 1)
            ELSE 0
        END
    )
    INTO v_user_activity
    FROM activity_stats;

    -- System Health Metrics
    WITH health_stats AS (
        SELECT
            COUNT(*) FILTER (WHERE error_count = 0) as healthy_operations,
            COUNT(*) as total_operations,
            AVG(execution_time_ms) FILTER (WHERE measured_at > NOW() - INTERVAL '1 hour') as recent_avg_time,
            AVG(execution_time_ms) FILTER (WHERE measured_at BETWEEN NOW() - INTERVAL '25 hours' AND NOW() - INTERVAL '1 hour') as previous_avg_time
        FROM performance_metrics
        WHERE org_id = p_org_id
          AND measured_at > v_time_threshold
    ),
    materialized_view_stats AS (
        SELECT refreshed_at
        FROM mv_output_hub_summary
        WHERE org_id = p_org_id
    )
    SELECT jsonb_build_object(
        'system_health_percentage', CASE
            WHEN hs.total_operations > 0 THEN ROUND((hs.healthy_operations::NUMERIC / hs.total_operations * 100)::numeric, 2)
            ELSE 100
        END,
        'performance_trend', CASE
            WHEN hs.previous_avg_time > 0 AND hs.recent_avg_time > 0 THEN
                CASE
                    WHEN hs.recent_avg_time < hs.previous_avg_time THEN 'improving'
                    WHEN hs.recent_avg_time > hs.previous_avg_time THEN 'degrading'
                    ELSE 'stable'
                END
            ELSE 'insufficient_data'
        END,
        'recent_avg_response_time_ms', COALESCE(hs.recent_avg_time, 0),
        'performance_change_percentage', CASE
            WHEN hs.previous_avg_time > 0 AND hs.recent_avg_time > 0 THEN
                ROUND(((hs.recent_avg_time - hs.previous_avg_time) / hs.previous_avg_time * 100)::numeric, 2)
            ELSE 0
        END,
        'cache_last_refreshed', mvs.refreshed_at,
        'cache_freshness_hours', CASE
            WHEN mvs.refreshed_at IS NOT NULL THEN
                ROUND(EXTRACT(EPOCH FROM (NOW() - mvs.refreshed_at)) / 3600::numeric, 1)
            ELSE NULL
        END
    )
    INTO v_system_health
    FROM health_stats hs
    LEFT JOIN materialized_view_stats mvs ON true;

    RETURN QUERY SELECT
        COALESCE(v_db_perf, '{}'::jsonb),
        COALESCE(v_func_perf, '{}'::jsonb),
        COALESCE(v_cache_perf, '{}'::jsonb),
        COALESCE(v_user_activity, '{}'::jsonb),
        COALESCE(v_system_health, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer) IS 'Comprehensive performance dashboard for Phase 4 monitoring';



CREATE OR REPLACE FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE output_type = 'roi_calculation') as roi_calculations,
      COUNT(*) FILTER (WHERE output_type = 'quick_wins') as quick_wins_analyses,
      COUNT(*) FILTER (WHERE output_type = 'budget_optimization') as budget_optimizations,
      COUNT(*) FILTER (WHERE output_type = 'performance_forecast') as forecasts,
      COUNT(*) FILTER (WHERE output_type = 'performance_analysis') as performance_analyses,
      AVG(confidence_score) as avg_confidence
    FROM agent_outputs
    WHERE
      org_id = p_org_id
      AND agent_type = 'performance_intelligence'
      AND status IN ('final', 'published')
      AND archived_at IS NULL
  ),
  recent_outputs AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'output_type', output_type,
          'title', title,
          'created_at', created_at,
          'confidence_score', confidence_score
        )
        ORDER BY created_at DESC
      ) as outputs
    FROM (
      SELECT id, output_type, title, created_at, confidence_score
      FROM agent_outputs
      WHERE
        org_id = p_org_id
        AND agent_type = 'performance_intelligence'
        AND status IN ('final', 'published')
        AND archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    ) recent
  )
  SELECT
    jsonb_build_object(
      'total_analyses', COALESCE(s.roi_calculations + s.quick_wins_analyses + s.budget_optimizations + s.forecasts + s.performance_analyses, 0),
      'roi_calculations', COALESCE(s.roi_calculations, 0),
      'quick_wins_analyses', COALESCE(s.quick_wins_analyses, 0),
      'budget_optimizations', COALESCE(s.budget_optimizations, 0),
      'forecasts', COALESCE(s.forecasts, 0),
      'performance_analyses', COALESCE(s.performance_analyses, 0),
      'avg_confidence', COALESCE(ROUND(s.avg_confidence::numeric, 2), 0),
      'recent_outputs', COALESCE(ro.outputs, '[]'::jsonb)
    )
  INTO result
  FROM stats s
  CROSS JOIN recent_outputs ro;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") IS 'Get comprehensive dashboard data for Performance Intelligence agent including counts and recent outputs';



CREATE OR REPLACE FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "output_type" "text", "title" "text", "summary" "text", "confidence_score" double precision, "created_at" timestamp with time zone, "key_metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ao.id,
    ao.output_type,
    ao.title,
    ao.summary,
    ao.confidence_score,
    ao.created_at,
    CASE
      -- Extract key metrics from content based on output_type
      WHEN ao.output_type = 'roi_calculation' THEN
        jsonb_build_object(
          'roi_percentage', (ao.content->'roi_metrics'->>'roi_percentage')::float,
          'roas', (ao.content->'roi_metrics'->>'roas')::float,
          'performance_level', ao.content->'roi_metrics'->>'performance_level'
        )
      WHEN ao.output_type = 'quick_wins' THEN
        jsonb_build_object(
          'opportunities_count', jsonb_array_length(ao.content->'opportunities'),
          'challenge_area', ao.content->>'challenge_area'
        )
      WHEN ao.output_type = 'budget_optimization' THEN
        jsonb_build_object(
          'total_budget', (ao.content->>'total_budget')::float,
          'business_goals', ao.content->>'business_goals'
        )
      WHEN ao.output_type = 'performance_forecast' THEN
        jsonb_build_object(
          'forecast_period', ao.content->>'forecast_period',
          'confidence_level', (ao.content->>'confidence_level')::float
        )
      ELSE
        '{}'::jsonb
    END as key_metrics
  FROM agent_outputs ao
  WHERE
    ao.org_id = p_org_id
    AND ao.agent_type = 'performance_intelligence'
    AND ao.status IN ('final', 'published')
    AND ao.archived_at IS NULL
  ORDER BY ao.created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer) IS 'Get summary of Performance Intelligence outputs with key metrics extracted from JSONB content';



CREATE OR REPLACE FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "campaign_name" "text", "name" "text", "title" "text", "persona_type" "text", "age_range" "text", "location" "jsonb", "pain_points" "jsonb", "goals" "jsonb", "preferred_channels" "jsonb", "content_preferences" "jsonb", "objections" "jsonb", "buying_stage" "text", "decision_making_role" "text", "budget_authority" "text", "tech_savviness" "text", "information_sources" "jsonb", "social_media_habits" "jsonb", "typical_day" "text", "frustrations" "jsonb", "motivations" "jsonb", "quotes" "jsonb", "success_metrics" "jsonb", "buying_triggers" "jsonb", "demographics" "jsonb", "psychographics" "jsonb", "behavioral_traits" "jsonb", "customer_journey" "jsonb", "interaction_history" "jsonb", "is_primary" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "strategy_count" integer, "content_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.org_id,
    p.campaign_id,
    c.name::TEXT as campaign_name,
    p.name::TEXT,
    p.title::TEXT,
    p.persona_type::TEXT,
    p.age_range::TEXT,
    p.location,
    p.pain_points,
    p.goals,
    p.preferred_channels,
    p.content_preferences,
    p.objections,
    p.buying_stage::TEXT,
    p.decision_making_role::TEXT,
    p.budget_authority::TEXT,
    p.tech_savviness::TEXT,
    p.information_sources,
    p.social_media_habits,
    p.typical_day,
    p.frustrations,
    p.motivations,
    p.quotes,
    p.success_metrics,
    p.buying_triggers,
    p.demographics,
    p.psychographics,
    p.behavioral_traits,
    p.customer_journey,
    p.interaction_history,
    p.is_primary::BOOLEAN,
    -- FIXED: Removed p.is_active::BOOLEAN (was line 341)
    p.created_at,
    p.updated_at,
    COALESCE(strategy_count.count, 0)::INT as strategy_count,
    COALESCE(content_count.count, 0)::INT as content_count
  FROM synthetic_personas p
  LEFT JOIN campaigns c ON p.campaign_id = c.id
  LEFT JOIN (
    SELECT persona_id, count(*)
    FROM marketing_strategy_personas msp
    JOIN marketing_strategies ms ON msp.strategy_id = ms.id
    WHERE ms.archived_at IS NULL
    GROUP BY persona_id
  ) strategy_count ON p.id = strategy_count.persona_id
  LEFT JOIN (
    SELECT
      COALESCE(
        (metadata->>'persona_id')::UUID,
        (content->>'persona_id')::UUID
      ) as persona_id,
      count(*)
    FROM agent_outputs
    WHERE archived_at IS NULL
      AND agent_type = 'content'
      AND (
        (metadata->>'persona_id') IS NOT NULL OR
        (content->>'persona_id') IS NOT NULL
      )
    GROUP BY COALESCE(
      (metadata->>'persona_id')::UUID,
      (content->>'persona_id')::UUID
    )
  ) content_count ON p.id = content_count.persona_id
  WHERE p.id = p_persona_id
    AND p.org_id = p_org_id
    AND p.archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") IS 'Returns complete persona details with related strategy and content counts.
Version: 1.1 (Fixed: removed is_active column reference, using archived_at pattern)
Dependencies: synthetic_personas, campaigns, marketing_strategies, agent_outputs tables';



CREATE OR REPLACE FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") RETURNS "jsonb"
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

  -- Determine schema for routing
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- ✅ FIX: Route agent_outputs to correct schema (agency vs public)
  -- Previous bug: Used unqualified 'agent_outputs' which defaulted to public schema
  EXECUTE format('
    SELECT to_jsonb(persona_data)
    FROM (
      SELECT
        ao.id,
        ao.org_id,
        ao.campaign_id,
        c.name AS campaign_name,
        ao.title,
        ao.summary,
        ao.content,
        ao.metadata,
        ao.created_at,
        ao.updated_at,
        ao.archived_at,
        ao.archived_by,
        ao.archive_reason
      FROM %I.agent_outputs ao
      LEFT JOIN %I.campaigns c ON c.id = ao.campaign_id
      WHERE ao.id = $1
        AND ao.org_id = $2
        AND ao.agent_type = ''persona''
        AND ao.output_type = ''persona''
    ) persona_data
  ', v_schema_name, v_schema_name)
  INTO v_result
  USING p_persona_id, p_org_id;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") IS 'Fetch single persona details with schema routing.
Bug Fix (2025-11-04): Added schema routing to agent_outputs table query.
Routes to agency.agent_outputs for Agency orgs, public.agent_outputs for SME orgs.';



CREATE OR REPLACE FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "campaign_name" "text", "name" "text", "title" "text", "company_name" "text", "company_size" "text", "industry" "text", "vertical" "text", "location" "jsonb", "goals" "jsonb", "pain_points" "jsonb", "jobs_to_be_done" "jsonb", "decision_criteria" "jsonb", "preferred_channels" "jsonb", "buyer_journey" "jsonb", "satisfaction_score" integer, "insights_summary" "jsonb", "is_primary" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "archived_at" timestamp with time zone, "archived_by" "uuid", "archive_reason" "text", "is_archived" boolean, "strategy_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ao.id,
        ao.org_id,
        ao.campaign_id,
        c.name AS campaign_name,
        -- Extract name from content, fallback to parsing title
        COALESCE(
            (ao.content->>'name')::TEXT,
            split_part(ao.title, ' - ', 1)
        ) AS name,
        -- Use the table-level title (which is "Name - Title" format)
        ao.title,
        (ao.content->>'company_name')::TEXT AS company_name,
        (ao.content->>'company_size')::TEXT AS company_size,
        (ao.content->>'industry')::TEXT AS industry,
        (ao.content->>'vertical')::TEXT AS vertical,
        (ao.content->'location')::JSONB AS location,
        (ao.content->'goals')::JSONB AS goals,
        (ao.content->'pain_points')::JSONB AS pain_points,
        (ao.content->'jobs_to_be_done')::JSONB AS jobs_to_be_done,
        (ao.content->'decision_criteria')::JSONB AS decision_criteria,
        (ao.content->'preferred_channels')::JSONB AS preferred_channels,
        (ao.content->'buyer_journey')::JSONB AS buyer_journey,
        (ao.content->>'satisfaction_score')::INTEGER AS satisfaction_score,
        NULL::JSONB AS insights_summary,
        FALSE AS is_primary,
        ao.created_at,
        ao.updated_at,
        ao.archived_at,
        ao.archived_by,
        ao.archive_reason,
        (ao.archived_at IS NOT NULL) AS is_archived,
        0 AS strategy_count
    FROM agent_outputs ao
    LEFT JOIN campaigns c ON c.id = ao.campaign_id
    WHERE
        ao.org_id = p_org_id
        AND ao.agent_type = 'persona'
        AND (p_campaign_id IS NULL OR ao.campaign_id = p_campaign_id)
        AND (p_include_archived = TRUE OR ao.archived_at IS NULL)
    ORDER BY ao.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Nuclear migration v2.1: Fixed field extraction to match actual content JSONB structure';



CREATE OR REPLACE FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean DEFAULT false, "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
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

  -- Determine schema for campaign joins
  v_schema_name := CASE WHEN v_org_type = 'AGENCY' THEN 'agency' ELSE 'public' END;

  -- FIX: Query from correct schema for agent_outputs AND campaigns
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(row_to_json(personas_data)), ''[]''::jsonb)
    FROM (
      SELECT
        ao.id,
        ao.org_id,
        ao.campaign_id,
        c.name AS campaign_name,
        -- FIX: Extract name from content (was correct)
        COALESCE(
          (ao.content->>''name'')::TEXT,
          split_part(ao.title, '' - '', 1)
        ) AS name,
        -- FIX: Extract job title from content field, not record title
        COALESCE(
          (ao.content->>''title'')::TEXT,
          split_part(ao.title, '' - '', 2)
        ) AS title,
        (ao.content->>''company_name'')::TEXT AS company_name,
        (ao.content->>''company_size'')::TEXT AS company_size,
        (ao.content->>''industry'')::TEXT AS industry,
        (ao.content->>''vertical'')::TEXT AS vertical,
        -- FIX: Extract location object correctly
        COALESCE(
          (ao.content->''demographics''->''location'')::JSONB,
          (ao.content->''location'')::JSONB
        ) AS location,
        (ao.content->''goals'')::JSONB AS goals,
        (ao.content->''pain_points'')::JSONB AS pain_points,
        (ao.content->''jobs_to_be_done'')::JSONB AS jobs_to_be_done,
        (ao.content->''decision_criteria'')::JSONB AS decision_criteria,
        (ao.content->''preferred_channels'')::JSONB AS preferred_channels,
        (ao.content->''buyer_journey'')::JSONB AS buyer_journey,
        -- FIX: Extract satisfaction_score if it exists
        (ao.content->>''satisfaction_score'')::INTEGER AS satisfaction_score,
        -- FIX: Extract customer_status if it exists
        (ao.content->>''customer_status'')::TEXT AS customer_status,
        -- FIX: Extract background_story if it exists
        (ao.content->>''background_story'')::TEXT AS background_story,
        -- FIX: Extract key_quote from buyer_journey or root
        COALESCE(
          (ao.content->''buyer_journey''->>''quote'')::TEXT,
          (ao.content->>''quote'')::TEXT
        ) AS key_quote,
        (ao.content->''insights_summary'')::JSONB AS insights_summary,
        -- FIX: is_primary is in metadata, not content
        (ao.metadata->>''is_primary'')::BOOLEAN AS is_primary,
        -- FIX: Extract demographics and personality_traits
        (ao.content->''demographics'')::JSONB AS demographics,
        (ao.content->''personality_traits'')::JSONB AS personality_traits,
        -- FIX: Extract objections and current_tools
        (ao.content->''objections'')::JSONB AS objections,
        (ao.content->''current_tools'')::JSONB AS current_tools,
        ao.created_at,
        ao.updated_at,
        ao.archived_at,
        ao.archived_by,
        ao.archive_reason,
        (ao.archived_at IS NOT NULL) as is_archived,
        COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM marketing_strategy_personas msp
           JOIN marketing_strategies ms ON ms.id = msp.strategy_id
           WHERE msp.persona_id = ao.id AND ms.archived_at IS NULL),
          0
        ) as strategy_count
      FROM %I.agent_outputs ao
      LEFT JOIN %I.campaigns c ON c.id = ao.campaign_id
      WHERE ao.org_id = $1
        AND ao.agent_type = ''persona''
        AND ao.output_type = ''persona''  -- FIX: Filter out interview insights
        AND ($2 OR ao.archived_at IS NULL)
        AND ($3::UUID IS NULL OR ao.campaign_id = $3)
        AND ($4::UUID IS NULL OR ao.client_id = $4)
      ORDER BY ao.created_at DESC
      LIMIT $5 OFFSET $6
    ) personas_data
  ', v_schema_name, v_schema_name)
  INTO v_result
  USING p_org_id, p_include_archived, p_campaign_id, p_client_id, p_limit, p_offset;

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'P4: Fixed field mapping for personas from agent_outputs table.
Key fixes:
- Extract job title from content field, not record title
- Extract location from demographics.location or content.location
- Extract is_primary from metadata field
- Extract key_quote from buyer_journey.quote
- Filter by output_type = persona to exclude interview insights
- Support client_id filtering for Agency orgs
Migration 226, 2025-11-04.';



CREATE OR REPLACE FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer DEFAULT 30) RETURNS TABLE("total_personas" integer, "active_personas" integer, "primary_personas" integer, "satisfaction_avg" numeric, "interaction_count" bigint, "strategy_links" bigint, "campaign_coverage" numeric, "personas_by_industry" "jsonb", "satisfaction_distribution" "jsonb", "performance_trends" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    personas_by_industry_json JSONB;
    satisfaction_distribution_json JSONB;
    performance_trends_json JSONB;
BEGIN
    -- Calculate personas by industry
    SELECT jsonb_agg(
        jsonb_build_object(
            'industry', industry,
            'count', count
        )
    ) INTO personas_by_industry_json
    FROM (
        SELECT industry, COUNT(*) as count
        FROM synthetic_personas
        WHERE org_id = p_org_id AND archived_at IS NULL
        GROUP BY industry
        ORDER BY count DESC
        LIMIT 10
    ) ind;

    -- Calculate satisfaction distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'score_range', score_range,
            'count', count
        )
    ) INTO satisfaction_distribution_json
    FROM (
        SELECT
            CASE
                WHEN satisfaction_score >= 80 THEN 'high'
                WHEN satisfaction_score >= 50 THEN 'medium'
                ELSE 'low'
            END as score_range,
            COUNT(*) as count
        FROM synthetic_personas
        WHERE org_id = p_org_id AND archived_at IS NULL
        GROUP BY score_range
    ) sat;

    -- Calculate performance trends
    SELECT jsonb_build_object(
        'new_personas_last_30d', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
        'personas_with_interactions', COUNT(DISTINCT persona_id)
    ) INTO performance_trends_json
    FROM persona_interactions pi
    JOIN synthetic_personas sp ON pi.persona_id = sp.id
    WHERE sp.org_id = p_org_id AND sp.archived_at IS NULL;

    -- Return aggregated data (FIX: Replace is_active with archived_at IS NULL)
    RETURN QUERY
  SELECT
    COALESCE(COUNT(*), 0)::INT as total_personas,
    COALESCE(COUNT(*) FILTER (WHERE archived_at IS NULL), 0)::INT as active_personas,
    COALESCE(COUNT(*) FILTER (WHERE is_primary = true), 0)::INT as primary_personas,
    ROUND(AVG(satisfaction_score), 2) as satisfaction_avg,
    (SELECT COUNT(*) FROM persona_interactions pi
     JOIN synthetic_personas sp ON pi.persona_id = sp.id
     WHERE sp.org_id = p_org_id)::BIGINT as interaction_count,
    (SELECT COUNT(*) FROM marketing_strategy_personas msp
     JOIN synthetic_personas sp ON msp.persona_id = sp.id
     WHERE sp.org_id = p_org_id)::BIGINT as strategy_links,
    CASE
      WHEN (SELECT COUNT(*) FROM campaigns WHERE org_id = p_org_id AND archived_at IS NULL) > 0
      THEN ROUND((COUNT(DISTINCT campaign_id)::NUMERIC /
                  (SELECT COUNT(*) FROM campaigns WHERE org_id = p_org_id AND archived_at IS NULL)::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END as campaign_coverage,
    COALESCE(personas_by_industry_json, '[]'::JSONB) as personas_by_industry,
    COALESCE(satisfaction_distribution_json, '[]'::JSONB) as satisfaction_distribution,
    COALESCE(performance_trends_json, '[]'::JSONB) as performance_trends
  FROM synthetic_personas
  WHERE org_id = p_org_id
    AND archived_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer) IS 'Get persona performance metrics. Fixed is_active reference. Migration 172.';



CREATE OR REPLACE FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") RETURNS TABLE("session_management_stats" "jsonb", "output_system_stats" "jsonb", "overall_improvements" "jsonb", "recommendations" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_session_stats JSONB := '{}';
    v_output_stats JSONB := '{}';
    v_improvements JSONB := '{}';
    v_recommendations JSONB := '[]';
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Session Management Performance
    WITH session_stats AS (
        SELECT
            COUNT(*) as total_sessions,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_session_duration_seconds,
            COUNT(*) FILTER (WHERE archived_at IS NOT NULL) as archived_sessions,
            MAX(updated_at) as last_session_activity
        FROM agent_conversations
        WHERE org_id = p_org_id
          AND created_at > NOW() - INTERVAL '30 days'
    )
    SELECT jsonb_build_object(
        'total_sessions_30d', COALESCE(total_sessions, 0),
        'avg_session_duration_minutes', COALESCE(ROUND((avg_session_duration_seconds / 60)::numeric, 1), 0),
        'archived_sessions', COALESCE(archived_sessions, 0),
        'session_retention_rate', CASE
            WHEN total_sessions > 0 THEN ROUND(((total_sessions - archived_sessions)::NUMERIC / total_sessions * 100)::numeric, 1)
            ELSE 100
        END,
        'last_activity', last_session_activity,
        'phase_4_hybrid_approach', TRUE
    )
    INTO v_session_stats
    FROM session_stats;

    -- Output System Performance
    WITH output_stats AS (
        SELECT
            COUNT(*) as total_outputs,
            COUNT(DISTINCT agent_type) as active_agent_types,
            COUNT(DISTINCT table_source) as data_sources,
            AVG(confidence_score) as avg_confidence,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_outputs
        FROM get_unified_outputs_hub(p_org_id, NULL, NULL, FALSE, 1000, 0)
    ),
    cache_effectiveness AS (
        SELECT refreshed_at, total_count
        FROM mv_output_hub_summary
        WHERE org_id = p_org_id
    )
    SELECT jsonb_build_object(
        'total_unified_outputs', COALESCE(os.total_outputs, 0),
        'active_agent_types', COALESCE(os.active_agent_types, 0),
        'unified_data_sources', COALESCE(os.data_sources, 0),
        'avg_confidence_score', COALESCE(ROUND(os.avg_confidence::numeric, 3), 0),
        'outputs_last_7_days', COALESCE(os.recent_outputs, 0),
        'materialized_view_enabled', ce.refreshed_at IS NOT NULL,
        'cache_last_refresh', ce.refreshed_at,
        'cached_output_count', COALESCE(ce.total_count, 0),
        'phase_4_database_first', TRUE
    )
    INTO v_output_stats
    FROM output_stats os
    LEFT JOIN cache_effectiveness ce ON TRUE;

    -- Overall Improvements
    SELECT jsonb_build_object(
        'architecture_pattern', 'Database-First with Hybrid Approach',
        'session_operations', 'Optimized with database functions',
        'output_aggregation', 'Unified cross-table queries with caching',
        'performance_monitoring', 'Real-time metrics and health tracking',
        'scalability_improvements', jsonb_build_array(
            'Materialized view caching for output hub',
            'Optimized indices for frequent queries',
            'Database-level session management',
            'Cross-resource output aggregation'
        ),
        'security_enhancements', jsonb_build_array(
            'SECURITY DEFINER functions with org scoping',
            'Controlled access patterns',
            'Input validation at database level'
        )
    )
    INTO v_improvements;

    -- Recommendations based on current performance
    SELECT jsonb_agg(recommendation)
    INTO v_recommendations
    FROM (
        SELECT jsonb_build_object(
            'type', 'cache_refresh',
            'priority', 'medium',
            'title', 'Schedule regular cache refresh',
            'description', 'Set up periodic refresh of materialized views for optimal performance'
        ) as recommendation
        WHERE NOT EXISTS (
            SELECT 1 FROM mv_output_hub_summary
            WHERE org_id = p_org_id AND refreshed_at > NOW() - INTERVAL '1 hour'
        )

        UNION ALL

        SELECT jsonb_build_object(
            'type', 'monitoring',
            'priority', 'low',
            'title', 'Enable performance tracking',
            'description', 'Implement automatic performance metric collection for better insights'
        ) as recommendation
        WHERE NOT EXISTS (
            SELECT 1 FROM performance_metrics
            WHERE org_id = p_org_id AND measured_at > NOW() - INTERVAL '24 hours'
        )
    ) recommendations;

    RETURN QUERY SELECT
        COALESCE(v_session_stats, '{}'::jsonb),
        COALESCE(v_output_stats, '{}'::jsonb),
        COALESCE(v_improvements, '{}'::jsonb),
        COALESCE(v_recommendations, '[]'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") IS 'Summary of Phase 4 improvements and performance gains with recommendations';


CREATE OR REPLACE FUNCTION "public"."get_roi_dashboard_metrics"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
    has_revenue BOOLEAN;
    has_conversions BOOLEAN;
BEGIN
    -- Check if any campaigns have revenue data
    SELECT EXISTS(
        SELECT 1 FROM campaign_metrics
        WHERE org_id = p_org_id AND revenue IS NOT NULL AND revenue > 0
    ) INTO has_revenue;

    -- Check if any campaigns have conversion data (but no revenue)
    SELECT EXISTS(
        SELECT 1 FROM campaign_metrics
        WHERE org_id = p_org_id
        AND (leads > 0 OR calls > 0 OR appointments > 0 OR conversions > 0)
        AND (revenue IS NULL OR revenue = 0)
    ) INTO has_conversions;

    IF has_revenue THEN
        -- TIER 3: Revenue-based metrics (traditional ROI)
        SELECT jsonb_build_object(
            'total_spend', COALESCE(SUM(spend), 0),
            'total_revenue', COALESCE(SUM(revenue), 0),
            'avg_roi', CASE
                WHEN SUM(spend) > 0 THEN ((SUM(revenue) - SUM(spend)) / SUM(spend) * 100)
                ELSE 0
            END,
            'campaigns_tracked', COUNT(DISTINCT campaign_name),
            'total_conversions', COALESCE(SUM(conversions), 0),
            'avg_cpc', CASE WHEN SUM(clicks) > 0 THEN SUM(spend) / SUM(clicks) ELSE 0 END,
            'metrics_count', COUNT(*),
            'active_channels', COUNT(DISTINCT source),
            'earliest_date', MIN(metric_date),
            'latest_date', MAX(metric_date),
            'metric_type', 'revenue',
            -- Add engagement metrics (optional for revenue campaigns)
            'total_video_views', COALESCE(SUM(video_views), 0),
            'total_likes', COALESCE(SUM(likes), 0),
            'total_shares', COALESCE(SUM(shares), 0),
            'total_comments', COALESCE(SUM(comments), 0),
            'avg_engagement_rate', CASE WHEN COUNT(*) > 0 THEN AVG(engagement_rate) ELSE 0 END,
            'avg_cpv', CASE WHEN SUM(video_views) > 0 THEN SUM(spend) / SUM(video_views) ELSE 0 END,
            'avg_cpe', CASE
                WHEN (SUM(likes) + SUM(shares) + SUM(comments)) > 0
                THEN SUM(spend) / (SUM(likes) + SUM(shares) + SUM(comments))
                ELSE 0
            END
        )
        FROM campaign_metrics
        WHERE org_id = p_org_id
        INTO result;
    ELSIF has_conversions THEN
        -- TIER 2: Conversion-based metrics (leads/calls)
        SELECT jsonb_build_object(
            'total_spend', COALESCE(SUM(spend), 0),
            'total_leads', COALESCE(SUM(leads), 0),
            'total_calls', COALESCE(SUM(calls), 0),
            'total_appointments', COALESCE(SUM(appointments), 0),
            'total_conversions', COALESCE(SUM(conversions), 0),
            'avg_cpl', CASE
                WHEN SUM(leads) > 0 THEN SUM(spend) / SUM(leads)
                ELSE 0
            END,
            'avg_cpa', CASE
                WHEN SUM(conversions) > 0 THEN SUM(spend) / SUM(conversions)
                ELSE 0
            END,
            'campaigns_tracked', COUNT(DISTINCT campaign_name),
            'avg_cpc', CASE WHEN SUM(clicks) > 0 THEN SUM(spend) / SUM(clicks) ELSE 0 END,
            'metrics_count', COUNT(*),
            'active_channels', COUNT(DISTINCT source),
            'earliest_date', MIN(metric_date),
            'latest_date', MAX(metric_date),
            'metric_type', 'conversions',
            'estimated_total_revenue', COALESCE(SUM(estimated_revenue), 0),
            -- Add engagement metrics
            'total_video_views', COALESCE(SUM(video_views), 0),
            'total_likes', COALESCE(SUM(likes), 0),
            'total_shares', COALESCE(SUM(shares), 0),
            'total_comments', COALESCE(SUM(comments), 0),
            'avg_engagement_rate', CASE WHEN COUNT(*) > 0 THEN AVG(engagement_rate) ELSE 0 END,
            'avg_cpv', CASE WHEN SUM(video_views) > 0 THEN SUM(spend) / SUM(video_views) ELSE 0 END,
            'avg_cpe', CASE
                WHEN (SUM(likes) + SUM(shares) + SUM(comments)) > 0
                THEN SUM(spend) / (SUM(likes) + SUM(shares) + SUM(comments))
                ELSE 0
            END
        )
        FROM campaign_metrics
        WHERE org_id = p_org_id
        INTO result;
    ELSE
        -- TIER 1: Engagement-only metrics (social/video campaigns)
        SELECT jsonb_build_object(
            'total_spend', COALESCE(SUM(spend), 0),
            'total_video_views', COALESCE(SUM(video_views), 0),
            'total_likes', COALESCE(SUM(likes), 0),
            'total_shares', COALESCE(SUM(shares), 0),
            'total_comments', COALESCE(SUM(comments), 0),
            'total_saves', COALESCE(SUM(saves), 0),
            'total_followers_gained', COALESCE(SUM(followers_gained), 0),
            'avg_engagement_rate', CASE WHEN COUNT(*) > 0 THEN AVG(engagement_rate) ELSE 0 END,
            'total_watch_time_seconds', COALESCE(SUM(watch_time_seconds), 0),
            'total_profile_visits', COALESCE(SUM(profile_visits), 0),
            'avg_cpv', CASE WHEN SUM(video_views) > 0 THEN SUM(spend) / SUM(video_views) ELSE 0 END,
            'avg_cpe', CASE
                WHEN (SUM(likes) + SUM(shares) + SUM(comments)) > 0
                THEN SUM(spend) / (SUM(likes) + SUM(shares) + SUM(comments))
                ELSE 0
            END,
            'avg_cost_per_follower', CASE
                WHEN SUM(followers_gained) > 0
                THEN SUM(spend) / SUM(followers_gained)
                ELSE 0
            END,
            'campaigns_tracked', COUNT(DISTINCT campaign_name),
            'avg_cpc', CASE WHEN SUM(clicks) > 0 THEN SUM(spend) / SUM(clicks) ELSE 0 END,
            'metrics_count', COUNT(*),
            'active_channels', COUNT(DISTINCT source),
            'earliest_date', MIN(metric_date),
            'latest_date', MAX(metric_date),
            'metric_type', 'engagement'
        )
        FROM campaign_metrics
        WHERE org_id = p_org_id
        INTO result;
    END IF;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_roi_dashboard_metrics"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
  alerts JSONB := '[]'::jsonb;
  roi_insights JSONB := '[]'::jsonb;
  recent_calculations JSONB := '[]'::jsonb;
  campaign_budgets JSONB := '[]'::jsonb;
  has_data BOOLEAN := false;
BEGIN
  -- Get recent ROI calculations from agent_outputs
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'created_at', created_at,
      'content', content
    )
  ) INTO recent_calculations
  FROM (
    SELECT id, title, created_at, content
    FROM agent_outputs
    WHERE org_id = p_org_id
      AND agent_type = 'roi_budget'
      AND archived_at IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;

  -- Get campaign budget alerts
  WITH budget_analysis AS (
    SELECT
      name,
      budget,
      spent,
      CASE
        WHEN budget > 0 AND spent > budget THEN 'over_budget'
        WHEN budget > 0 AND spent < budget * 0.5 THEN 'under_budget'
        ELSE NULL
      END as alert_type,
      CASE
        WHEN budget > 0 AND spent > budget THEN
          CASE
            WHEN ((spent - budget) / budget * 100) > 20 THEN 'high'
            ELSE 'medium'
          END
        WHEN budget > 0 AND spent < budget * 0.5 THEN 'low'
        ELSE NULL
      END as severity,
      CASE
        WHEN budget > 0 AND spent > budget THEN
          ROUND(((spent - budget) / budget * 100)::numeric, 0) || '% over budget'
        WHEN budget > 0 AND spent < budget * 0.5 THEN
          'Only ' || ROUND((spent / budget * 100)::numeric, 0) || '% budget used'
        ELSE NULL
      END as message,
      CASE
        WHEN budget > 0 AND spent > budget THEN spent - budget
        WHEN budget > 0 AND spent < budget * 0.5 THEN budget - spent
        ELSE 0
      END as amount
    FROM campaigns
    WHERE org_id = p_org_id
      AND archived_at IS NULL
      AND budget > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', alert_type,
      'severity', severity,
      'campaign_name', name,
      'message', message,
      'amount', amount
    )
  ) INTO alerts
  FROM budget_analysis
  WHERE alert_type IS NOT NULL
  LIMIT 5;

  -- Calculate ROI insights from metrics
  WITH metrics_summary AS (
    SELECT
      SUM(spend) as total_spend,
      SUM(COALESCE(revenue, 0)) as total_revenue,
      CASE WHEN SUM(spend) > 0 THEN
        ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100)
      ELSE 0 END as avg_roi
    FROM campaign_metrics
    WHERE org_id = p_org_id
  ),
  source_performance AS (
    SELECT
      source,
      SUM(spend) as spend,
      SUM(COALESCE(revenue, 0)) as revenue,
      CASE WHEN SUM(spend) > 0 THEN
        ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100)
      ELSE 0 END as roi
    FROM campaign_metrics
    WHERE org_id = p_org_id AND source IS NOT NULL
    GROUP BY source
    HAVING SUM(spend) > 0
  ),
  all_insights AS (
    -- Overall ROI insight
    SELECT jsonb_build_object(
      'type', CASE WHEN avg_roi > 0 THEN 'positive_roi' ELSE 'negative_roi' END,
      'message', 'Overall ROI is ' || CASE WHEN avg_roi > 0 THEN 'positive' ELSE 'negative' END ||
                 ' at ' || ROUND(avg_roi::numeric, 1) || '%',
      'value', ROUND(avg_roi::numeric, 2)
    ) as insight, 1 as priority
    FROM metrics_summary
    WHERE total_spend > 0

    UNION ALL

    -- Best source
    SELECT jsonb_build_object(
      'type', 'best_source',
      'message', source || ' has highest ROI at ' || ROUND(roi::numeric, 1) || '%',
      'value', ROUND(roi::numeric, 2)
    ) as insight, 2 as priority
    FROM (
      SELECT * FROM source_performance ORDER BY roi DESC LIMIT 1
    ) best

    UNION ALL

    -- Worst source
    SELECT jsonb_build_object(
      'type', 'worst_source',
      'message', source || ' has lowest ROI at ' || ROUND(roi::numeric, 1) || '%',
      'value', ROUND(roi::numeric, 2)
    ) as insight, 3 as priority
    FROM (
      SELECT * FROM source_performance ORDER BY roi ASC LIMIT 1
    ) worst
  )
  SELECT jsonb_agg(insight ORDER BY priority)
  INTO roi_insights
  FROM all_insights;

  -- Get campaign budgets with utilization
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'budget', budget,
      'actual_spend', spent,
      'utilization_pct', ROUND((spent / NULLIF(budget, 0) * 100)::numeric, 1)
    )
  ) INTO campaign_budgets
  FROM (
    SELECT id, name, budget, spent
    FROM campaigns
    WHERE org_id = p_org_id
      AND archived_at IS NULL
      AND budget > 0
    ORDER BY created_at DESC
    LIMIT 5
  ) recent_campaigns;

  -- Determine if we have any data
  has_data := (
    COALESCE(jsonb_array_length(recent_calculations), 0) > 0 OR
    COALESCE(jsonb_array_length(alerts), 0) > 0 OR
    COALESCE(jsonb_array_length(roi_insights), 0) > 0 OR
    COALESCE(jsonb_array_length(campaign_budgets), 0) > 0
  );

  -- Build final result
  result := jsonb_build_object(
    'recent_calculations', COALESCE(recent_calculations, '[]'::jsonb),
    'alerts', COALESCE(alerts, '[]'::jsonb),
    'roi_insights', COALESCE(roi_insights, '[]'::jsonb),
    'campaign_budgets', COALESCE(campaign_budgets, '[]'::jsonb),
    'has_data', has_data
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") IS 'Aggregates cross-agent financial intelligence: performance alerts, ROI insights, recent calculations, and campaign budgets. Returns unified JSONB for intelligent display component.';



CREATE OR REPLACE FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSONB;
  recommendations JSONB := '[]'::jsonb;
  total_campaigns INTEGER;
  avg_roi DECIMAL;
  total_spend DECIMAL;
  total_revenue DECIMAL;
  confidence TEXT := 'medium';
BEGIN
  -- Get overall metrics
  SELECT
    COUNT(DISTINCT campaign_name)::INTEGER,
    CASE WHEN SUM(spend) > 0 THEN
      ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100)::DECIMAL
    ELSE 0 END,
    SUM(spend)::DECIMAL,
    SUM(COALESCE(revenue, 0))::DECIMAL
  INTO total_campaigns, avg_roi, total_spend, total_revenue
  FROM campaign_metrics
  WHERE org_id = p_org_id;

  -- Determine confidence based on data quality
  IF total_campaigns >= 10 AND total_spend >= 10000 THEN
    confidence := 'high';
  ELSIF total_campaigns >= 5 AND total_spend >= 5000 THEN
    confidence := 'medium';
  ELSE
    confidence := 'low';
  END IF;

  -- Recommendation 1: Identify underperforming campaigns (ROI < 0%)
  WITH underperformers AS (
    SELECT
      campaign_name,
      SUM(spend)::DECIMAL as camp_spend,
      SUM(COALESCE(revenue, 0))::DECIMAL as camp_revenue,
      CASE WHEN SUM(spend) > 0 THEN
        ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100)::DECIMAL
      ELSE 0 END as roi_pct
    FROM campaign_metrics
    WHERE org_id = p_org_id
    GROUP BY campaign_name
    HAVING SUM(spend) > 0 AND
           ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100) < 0
    ORDER BY roi_pct ASC
    LIMIT 3
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'underperformer',
      'priority', 'high',
      'title', 'Stop Losing Money on ' || campaign_name,
      'description', format('Campaign has negative ROI of %s%%. Consider pausing or reducing budget.',
                           ROUND(roi_pct, 1)),
      'data', jsonb_build_object(
        'campaign_name', campaign_name,
        'spend', camp_spend,
        'revenue', camp_revenue,
        'roi_pct', ROUND(roi_pct, 2)
      ),
      'action', 'pause_or_reduce',
      'estimated_savings', camp_spend * 0.5
    )
  ) INTO result
  FROM underperformers;

  IF result IS NOT NULL THEN
    recommendations := recommendations || result;
  END IF;

  -- Recommendation 2: Identify high performers to scale (ROI > avg_roi)
  WITH top_performers AS (
    SELECT
      campaign_name,
      SUM(spend)::DECIMAL as camp_spend,
      SUM(COALESCE(revenue, 0))::DECIMAL as camp_revenue,
      CASE WHEN SUM(spend) > 0 THEN
        ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100)::DECIMAL
      ELSE 0 END as roi_pct
    FROM campaign_metrics
    WHERE org_id = p_org_id
    GROUP BY campaign_name
    HAVING SUM(spend) > 0 AND
           ((SUM(COALESCE(revenue, 0)) - SUM(spend)) / SUM(spend) * 100) > COALESCE(avg_roi, 100)
    ORDER BY roi_pct DESC
    LIMIT 3
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'scale_opportunity',
      'priority', 'medium',
      'title', 'Scale Up ' || campaign_name,
      'description', format('Campaign has strong ROI of %s%%. Consider increasing budget by 20-50%%.',
                           ROUND(roi_pct, 1)),
      'data', jsonb_build_object(
        'campaign_name', campaign_name,
        'spend', camp_spend,
        'revenue', camp_revenue,
        'roi_pct', ROUND(roi_pct, 2)
      ),
      'action', 'increase_budget',
      'estimated_gain', camp_spend * 0.3 * (roi_pct / 100)
    )
  ) INTO result
  FROM top_performers;

  IF result IS NOT NULL THEN
    recommendations := recommendations || result;
  END IF;

  -- Recommendation 3: Detect campaigns with declining ROI over time
  WITH declining_campaigns AS (
    SELECT
      campaign_name,
      AVG(CASE WHEN metric_date >= CURRENT_DATE - INTERVAL '7 days' THEN
        CASE WHEN spend > 0 THEN ((COALESCE(revenue, 0) - spend) / spend * 100) ELSE 0 END
      END) as recent_roi,
      AVG(CASE WHEN metric_date < CURRENT_DATE - INTERVAL '7 days' AND metric_date >= CURRENT_DATE - INTERVAL '30 days' THEN
        CASE WHEN spend > 0 THEN ((COALESCE(revenue, 0) - spend) / spend * 100) ELSE 0 END
      END) as historical_roi
    FROM campaign_metrics
    WHERE org_id = p_org_id
      AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY campaign_name
    HAVING COUNT(*) >= 10
      AND AVG(CASE WHEN metric_date >= CURRENT_DATE - INTERVAL '7 days' THEN
           CASE WHEN spend > 0 THEN ((COALESCE(revenue, 0) - spend) / spend * 100) ELSE 0 END
         END) <
         AVG(CASE WHEN metric_date < CURRENT_DATE - INTERVAL '7 days' AND metric_date >= CURRENT_DATE - INTERVAL '30 days' THEN
           CASE WHEN spend > 0 THEN ((COALESCE(revenue, 0) - spend) / spend * 100) ELSE 0 END
         END) - 20
    LIMIT 3
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'declining_performance',
      'priority', 'high',
      'title', 'Investigate ' || campaign_name || ' Performance Drop',
      'description', format('ROI dropped from %s%% to %s%% in the past week.',
                           ROUND(historical_roi, 1), ROUND(recent_roi, 1)),
      'data', jsonb_build_object(
        'campaign_name', campaign_name,
        'recent_roi', ROUND(recent_roi, 2),
        'historical_roi', ROUND(historical_roi, 2),
        'decline_pct', ROUND(historical_roi - recent_roi, 2)
      ),
      'action', 'investigate',
      'urgency', 'high'
    )
  ) INTO result
  FROM declining_campaigns;

  IF result IS NOT NULL THEN
    recommendations := recommendations || result;
  END IF;

  -- Recommendation 4: Budget reallocation opportunities
  IF jsonb_array_length(recommendations) >= 2 THEN
    -- Add meta-recommendation to reallocate from underperformers to top performers
    recommendations := recommendations || jsonb_build_array(
      jsonb_build_object(
        'type', 'reallocation',
        'priority', 'medium',
        'title', 'Reallocate Budget for Better ROI',
        'description', format('Move budget from %s underperforming campaigns to %s high-performers.',
                             (SELECT COUNT(*) FROM jsonb_array_elements(recommendations) WHERE value->>'type' = 'underperformer'),
                             (SELECT COUNT(*) FROM jsonb_array_elements(recommendations) WHERE value->>'type' = 'scale_opportunity')),
        'action', 'reallocate',
        'confidence', confidence
      )
    );
  END IF;

  -- If no recommendations, suggest data collection
  IF jsonb_array_length(recommendations) = 0 THEN
    recommendations := jsonb_build_array(
      jsonb_build_object(
        'type', 'data_collection',
        'priority', 'low',
        'title', 'Import More Campaign Data',
        'description', 'Add more campaign metrics to get personalized recommendations.',
        'action', 'import_data',
        'confidence', 'low'
      )
    );
  END IF;

  -- Build final result
  result := jsonb_build_object(
    'recommendations', recommendations,
    'confidence', confidence,
    'context_summary', jsonb_build_object(
      'total_campaigns', total_campaigns,
      'avg_roi', ROUND(COALESCE(avg_roi, 0), 2),
      'total_spend', ROUND(COALESCE(total_spend, 0), 2),
      'total_revenue', ROUND(COALESCE(total_revenue, 0), 2),
      'data_quality', confidence
    )
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") IS 'Generates AI-powered budget optimization recommendations based on campaign metrics. Returns prioritized actions for improving ROI, scaling winners, and reallocating budget.';



CREATE OR REPLACE FUNCTION "public"."get_session_routed"("p_session_id" "uuid") RETURNS TABLE("id" "uuid", "org_id" "uuid", "user_id" "uuid", "agent_type" "text", "client_id" "uuid", "campaign_id" "uuid", "title" "text", "session_data" "jsonb", "mode" "text", "session_metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_schema TEXT;
BEGIN
  -- Detect which schema the session belongs to
  v_schema := detect_session_schema(p_session_id);

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Route query based on schema
  IF v_schema = 'agency' THEN
    -- Query from agency.agent_conversations
    -- Return unified format (both schemas have different column structures)
    RETURN QUERY
    SELECT
      ac.id,
      ac.org_id,
      ac.user_id,
      ac.agent_type,
      ac.client_id,
      ac.campaign_id,
      ac.title,
      NULL::JSONB as session_data,  -- Agency doesn't use session_data
      ac.mode,
      ac.session_metadata,
      ac.created_at,
      ac.updated_at
    FROM agency.agent_conversations ac
    WHERE ac.id = p_session_id;

  ELSIF v_schema = 'public' THEN
    -- Query from public.agent_conversations
    -- Return unified format
    RETURN QUERY
    SELECT
      ac.id,
      ac.org_id,
      ac.user_id,
      ac.agent_type,
      ac.client_id,
      NULL::UUID as campaign_id,  -- SME doesn't have campaign_id column
      (ac.session_data->>'name')::TEXT as title,  -- Extract name from JSONB
      ac.session_data,
      (ac.session_data->>'mode')::TEXT as mode,  -- Extract mode from JSONB
      NULL::JSONB as session_metadata,  -- SME doesn't use session_metadata
      ac.created_at,
      ac.updated_at
    FROM public.agent_conversations ac
    WHERE ac.id = p_session_id;

  ELSE
    RAISE EXCEPTION 'Invalid schema detected: %', v_schema;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_session_routed"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_session_routed"("p_session_id" "uuid") IS 'Retrieves session metadata from the correct schema (agency or public) based on session location. Uses detect_session_schema() to determine routing. Returns unified format with columns from both schemas (NULL for missing columns). Created in Migration 240 to fix Supabase Python client schema prefix limitations.';


CREATE OR REPLACE FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric DEFAULT NULL::numeric, "p_memory_usage_mb" numeric DEFAULT NULL::numeric, "p_rows_affected" integer DEFAULT NULL::integer, "p_cache_hit" boolean DEFAULT NULL::boolean, "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    INSERT INTO performance_metrics (
        org_id,
        metric_type,
        metric_name,
        metric_value,
        metric_unit,
        execution_time_ms,
        memory_usage_mb,
        rows_affected,
        cache_hit,
        metadata
    ) VALUES (
        p_org_id,
        p_metric_type,
        p_metric_name,
        p_metric_value,
        p_metric_unit,
        p_execution_time_ms,
        p_memory_usage_mb,
        p_rows_affected,
        p_cache_hit,
        COALESCE(p_metadata, '{}')
    )
    RETURNING id INTO v_metric_id;

    RETURN v_metric_id;
END;
$$;


ALTER FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric, "p_memory_usage_mb" numeric, "p_rows_affected" integer, "p_cache_hit" boolean, "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric, "p_memory_usage_mb" numeric, "p_rows_affected" integer, "p_cache_hit" boolean, "p_metadata" "jsonb") IS 'Function to log performance metrics for analysis and monitoring';


CREATE OR REPLACE FUNCTION "public"."notify_agent_output_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Notify via pg_notify for real-time updates
  PERFORM pg_notify(
    'agent_output_updates',
    json_build_object(
      'org_id', COALESCE(NEW.org_id, OLD.org_id),
      'output_id', COALESCE(NEW.id, OLD.id),
      'agent_type', COALESCE(NEW.agent_type, OLD.agent_type),
      'action', TG_OP,
      'timestamp', now()
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."notify_agent_output_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_agent_output_change"() IS 'Notifies agent output changes via pg_notify for real-time updates';


CREATE OR REPLACE FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") RETURNS TABLE("id" "uuid", "restored_at" timestamp with time zone, "restored_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_session_exists BOOLEAN := FALSE;
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

    -- Validate session exists and is archived
    SELECT EXISTS(
        SELECT 1 FROM agent_conversations
        WHERE agent_conversations.id = p_session_id
          AND agent_conversations.org_id = p_org_id
          AND agent_conversations.archived_at IS NOT NULL
    ) INTO v_session_exists;

    IF NOT v_session_exists THEN
        RAISE EXCEPTION 'Session not found or not archived';
    END IF;

    -- Restore the session (is_archived auto-updates from archived_at = NULL)
    UPDATE agent_conversations SET
        archived_at = NULL,
        archive_reason = NULL,
        archived_by = NULL,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agent_conversations.id = p_session_id
      AND agent_conversations.org_id = p_org_id;

    -- Return restoration information
    RETURN QUERY
    SELECT
        ac.id,
        ac.updated_at AS restored_at,
        ac.updated_by AS restored_by
    FROM agent_conversations ac
    WHERE ac.id = p_session_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agent_sessions_changed',
        json_build_object(
            'action', 'RESTORE',
            'org_id', p_org_id,
            'session_id', p_session_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") IS 'Restore archived agent sessions (is_archived auto-updates from archived_at = NULL)';



CREATE OR REPLACE FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_schema TEXT;
  v_message_id UUID;
  v_messages_table TEXT;
  v_conversations_table TEXT;
BEGIN
  -- Detect which schema the session belongs to
  v_schema := detect_session_schema(p_session_id);

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Generate message ID
  v_message_id := gen_random_uuid();

  -- Route message insertion based on schema
  IF v_schema = 'agency' THEN
    -- Save to agency.agent_messages
    INSERT INTO agency.agent_messages (
      id,
      conversation_id,
      role,
      content,
      metadata,
      created_at
    ) VALUES (
      v_message_id,
      p_session_id,
      p_role,
      p_content,
      p_metadata,
      NOW()
    );

    -- Update agency.agent_conversations timestamp
    UPDATE agency.agent_conversations
    SET updated_at = NOW()
    WHERE id = p_session_id;

  ELSIF v_schema = 'public' THEN
    -- Save to public.agent_messages
    INSERT INTO public.agent_messages (
      id,
      conversation_id,
      role,
      content,
      metadata,
      created_at
    ) VALUES (
      v_message_id,
      p_session_id,
      p_role,
      p_content,
      p_metadata,
      NOW()
    );

    -- Update public.agent_conversations timestamp
    UPDATE public.agent_conversations
    SET updated_at = NOW()
    WHERE id = p_session_id;

  ELSE
    RAISE EXCEPTION 'Invalid schema detected: %', v_schema;
  END IF;

  -- Return the message ID
  RETURN v_message_id;
END;
$$;


ALTER FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") IS 'Saves agent messages to the correct schema (agency or public) based on session location. Uses detect_session_schema() to determine routing. Updates session timestamp atomically. Created in Migration 238 to fix Supabase Python client schema prefix limitations.';



CREATE OR REPLACE FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_summary" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_category" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_confidence_score" double precision DEFAULT 0.8, "p_source_type" "text" DEFAULT 'agent_conversation'::"text", "p_status" "text" DEFAULT 'draft'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
    v_org_type TEXT;
    v_output_id UUID;
    v_result JSONB;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- Security: Verify user has access to this organization
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE id = p_user_id AND org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: user does not belong to organization';
    END IF;

    -- Detect organization type for schema routing
    SELECT o.type INTO v_org_type FROM organizations o WHERE o.id = p_org_id;

    IF v_org_type IS NULL THEN
        RAISE EXCEPTION 'Organization not found: %', p_org_id;
    END IF;

    -- Route based on org type
    IF v_org_type = 'AGENCY' THEN
        -- Validate client_id is provided for agency
        IF p_client_id IS NULL THEN
            RAISE EXCEPTION 'client_id is required for AGENCY organizations';
        END IF;

        -- Verify client belongs to organization
        IF NOT EXISTS (
            SELECT 1 FROM clients WHERE id = p_client_id AND org_id = p_org_id
        ) THEN
            RAISE EXCEPTION 'Client does not belong to organization';
        END IF;

        -- Insert into agency schema
        INSERT INTO agency.agent_outputs (
            org_id, client_id, user_id, created_by,
            agent_type, output_type, source_type, session_id, campaign_id,
            title, summary, content, category, metadata,
            confidence_score, status
        ) VALUES (
            p_org_id, p_client_id, p_user_id, p_user_id,
            p_agent_type, p_output_type, p_source_type, p_session_id, p_campaign_id,
            p_title, p_summary, p_content,
            CASE WHEN p_category IS NULL THEN NULL ELSE ARRAY[p_category]::TEXT[] END,
            p_metadata, p_confidence_score, p_status
        )
        RETURNING id, created_at INTO v_output_id, v_created_at;

        -- Build result from agency schema
        SELECT jsonb_build_object(
            'id', v_output_id,
            'org_id', p_org_id,
            'client_id', p_client_id,
            'user_id', p_user_id,
            'created_by', p_user_id,
            'agent_type', p_agent_type,
            'output_type', p_output_type,
            'source_type', p_source_type,
            'session_id', p_session_id,
            'campaign_id', p_campaign_id,
            'title', p_title,
            'summary', p_summary,
            'content', p_content,
            'category', CASE WHEN p_category IS NULL THEN NULL ELSE ARRAY[p_category]::TEXT[] END,
            'metadata', p_metadata,
            'confidence_score', p_confidence_score,
            'status', p_status,
            'created_at', v_created_at,
            'table_source', 'agency.agent_outputs'
        ) INTO v_result;

    ELSIF v_org_type = 'SME' THEN
        -- Insert into public schema
        INSERT INTO public.agent_outputs (
            org_id, client_id, user_id, created_by,
            agent_type, output_type, source_type, session_id, campaign_id,
            title, summary, content, category, metadata,
            confidence_score, status
        ) VALUES (
            p_org_id, NULL,  -- SME has no client_id
            p_user_id, p_user_id,
            p_agent_type, p_output_type, p_source_type, p_session_id, p_campaign_id,
            p_title, p_summary, p_content,
            CASE WHEN p_category IS NULL THEN NULL ELSE ARRAY[p_category]::TEXT[] END,
            p_metadata, p_confidence_score, p_status
        )
        RETURNING id, created_at INTO v_output_id, v_created_at;

        -- Build result from public schema
        SELECT jsonb_build_object(
            'id', v_output_id,
            'org_id', p_org_id,
            'client_id', NULL,
            'user_id', p_user_id,
            'created_by', p_user_id,
            'agent_type', p_agent_type,
            'output_type', p_output_type,
            'source_type', p_source_type,
            'session_id', p_session_id,
            'campaign_id', p_campaign_id,
            'title', p_title,
            'summary', p_summary,
            'content', p_content,
            'category', CASE WHEN p_category IS NULL THEN NULL ELSE ARRAY[p_category]::TEXT[] END,
            'metadata', p_metadata,
            'confidence_score', p_confidence_score,
            'status', p_status,
            'created_at', v_created_at,
            'table_source', 'public.agent_outputs'
        ) INTO v_result;

    ELSE
        RAISE EXCEPTION 'Unknown organization type: %', v_org_type;
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid", "p_summary" "text", "p_session_id" "text", "p_campaign_id" "uuid", "p_category" "text", "p_metadata" "jsonb", "p_confidence_score" double precision, "p_source_type" "text", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid", "p_summary" "text", "p_session_id" "text", "p_campaign_id" "uuid", "p_category" "text", "p_metadata" "jsonb", "p_confidence_score" double precision, "p_source_type" "text", "p_status" "text") IS 'Schema-aware agent output creation with client_id routing for agency multi-tenancy.
Routes to agency.agent_outputs for AGENCY orgs (client_id required),
public.agent_outputs for SME orgs (client_id NULL).
Matches pattern established in save_brand_guideline_routed (Migration 188).
Replaces direct .insert() calls in universal_output_service.py';



CREATE OR REPLACE FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN save_recommendations_cache(
    p_org_id,
    'content',
    p_data_hash,
    p_recommendations,
    p_cache_duration_hours,
    p_generation_time_ms,
    p_llm_tokens_used
  );
END;
$$;


ALTER FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer) IS 'Backward-compatible wrapper. Use save_recommendations_cache directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb" DEFAULT '[]'::"jsonb", "p_importance" double precision DEFAULT 0.5, "p_confidence" double precision DEFAULT 0.8, "p_tags" "text"[] DEFAULT ARRAY[]::"text"[], "p_themes" "text"[] DEFAULT ARRAY[]::"text"[], "p_context" "text" DEFAULT ''::"text") RETURNS TABLE("id" "uuid", "org_id" "uuid", "agent_type" "text", "output_type" "text", "title" "text", "content" "jsonb", "confidence_score" double precision, "validation_status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_insight_id UUID;
    v_title TEXT;
BEGIN
    -- Generate title from category and raw text preview
    v_title := initcap(replace(p_insight_category, '_', ' ')) || ': ' ||
               left(p_raw_text, 50) || CASE WHEN length(p_raw_text) > 50 THEN '...' ELSE '' END;

    -- Insert insight into agent_outputs table
    INSERT INTO agent_outputs (
        org_id,
        agent_type,
        output_type,
        source_type,
        session_id,
        title,
        summary,
        content,
        confidence_score,
        validation_status,
        category,
        status
    ) VALUES (
        p_org_id,
        'persona',  -- Agent type for persona agent
        'interview_insight',  -- Output type specific to interview insights
        'agent_conversation',  -- Source is from agent conversation
        p_session_id,
        v_title,
        p_raw_text,  -- Store raw text as summary for quick reference
        jsonb_build_object(
            'persona_id', p_persona_id,
            'session_id', p_session_id,
            'insight_category', p_insight_category,
            'raw_text', p_raw_text,
            'actionable_recommendations', p_actionable_recommendations,
            'tags', to_jsonb(p_tags),
            'themes', to_jsonb(p_themes),
            'importance', p_importance,
            'context', p_context
        ),
        p_confidence,
        'pending',  -- All interview insights start as pending for user review
        p_tags,  -- Store tags in the category array for searchability
        'draft'  -- Initial status
    )
    RETURNING agent_outputs.id INTO v_insight_id;

    -- Return the created insight
    RETURN QUERY
    SELECT
        ao.id,
        ao.org_id,
        ao.agent_type,
        ao.output_type,
        ao.title,
        ao.content,
        ao.confidence_score,
        ao.validation_status,
        ao.created_at
    FROM agent_outputs ao
    WHERE ao.id = v_insight_id;
END;
$$;


ALTER FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb", "p_importance" double precision, "p_confidence" double precision, "p_tags" "text"[], "p_themes" "text"[], "p_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb", "p_importance" double precision, "p_confidence" double precision, "p_tags" "text"[], "p_themes" "text"[], "p_context" "text") IS 'Database-first approach: Saves persona interview insights to agent_outputs table with pending validation status';



CREATE OR REPLACE FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_org_type TEXT;
  v_message_id UUID;
  v_result JSONB;
  v_org_id UUID;
BEGIN
  -- Get org_id and org_type from conversation (try public first)
  SELECT c.org_id, o.type INTO v_org_id, v_org_type
  FROM public.agent_conversations c
  JOIN public.organizations o ON o.id = c.org_id
  WHERE c.id = p_conversation_id;

  -- If not found in public, try agency schema
  IF v_org_id IS NULL THEN
    SELECT c.org_id, o.type INTO v_org_id, v_org_type
    FROM agency.agent_conversations c
    JOIN public.organizations o ON o.id = c.org_id
    WHERE c.id = p_conversation_id;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found: %', p_conversation_id;
  END IF;

  -- Route based on org type
  IF v_org_type = 'AGENCY' THEN
    -- Agency: Write to agency.agent_messages
    INSERT INTO agency.agent_messages (
      conversation_id,
      role,
      content,
      metadata,
      created_at
    ) VALUES (
      p_conversation_id,
      p_role,
      p_content,
      p_metadata,
      NOW()
    ) RETURNING id INTO v_message_id;

    -- Update conversation updated_at
    UPDATE agency.agent_conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Return from agency schema
    SELECT row_to_json(m.*)::jsonb INTO v_result
    FROM agency.agent_messages m
    WHERE m.id = v_message_id;

  ELSIF v_org_type = 'SME' THEN
    -- SME: Write to public.agent_messages
    INSERT INTO public.agent_messages (
      conversation_id,
      role,
      content,
      metadata,
      created_at
    ) VALUES (
      p_conversation_id,
      p_role,
      p_content,
      p_metadata,
      NOW()
    ) RETURNING id INTO v_message_id;

    -- Update conversation updated_at
    UPDATE public.agent_conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Return from public schema
    SELECT row_to_json(m.*)::jsonb INTO v_result
    FROM public.agent_messages m
    WHERE m.id = v_message_id;

  ELSE
    RAISE EXCEPTION 'Invalid organization type: %', v_org_type;
  END IF;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") IS 'Router function for saving agent messages. Routes to agency.agent_messages for AGENCY orgs, public.agent_messages for SME orgs. Updates conversation updated_at.';



CREATE OR REPLACE FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN save_recommendations_cache(
    p_org_id,
    'opportunity',
    p_data_hash,
    p_opportunities,
    p_cache_duration_hours,
    p_generation_time_ms,
    0, -- tokens (not tracked yet)
    NULL, -- overall_assessment
    'medium' -- confidence
  );
END;
$$;


ALTER FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) IS 'New function for opportunity recommendations. Uses unified cache system.';



CREATE OR REPLACE FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer DEFAULT 0, "p_overall_assessment" "text" DEFAULT NULL::"text", "p_confidence" "text" DEFAULT 'medium'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN save_recommendations_cache(
    p_org_id,
    'roi',
    p_data_hash,
    p_recommendations,
    p_cache_duration_hours,
    p_generation_time_ms,
    p_llm_tokens_used,
    p_overall_assessment,
    p_confidence
  );
END;
$$;


ALTER FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") IS 'Backward-compatible wrapper. Use save_recommendations_cache directly. Will be deprecated in next version.';



CREATE OR REPLACE FUNCTION "public"."search_personas_by_location"("p_country" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_org_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "name" "text", "title" "text", "company_name" "text", "location" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.name,
        sp.title,
        sp.company_name,
        sp.location
    FROM synthetic_personas sp
    WHERE 
        (p_org_id IS NULL OR sp.org_id = p_org_id)
        AND (p_country IS NULL OR sp.location->>'country' ILIKE '%' || p_country || '%')
        AND (p_state IS NULL OR sp.location->>'state_province' ILIKE '%' || p_state || '%')
        AND (p_city IS NULL OR sp.location->>'city' ILIKE '%' || p_city || '%')
        AND sp.is_active = true;
END;
$$;


ALTER FUNCTION "public"."search_personas_by_location"("p_country" "text", "p_state" "text", "p_city" "text", "p_org_id" "uuid") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."update_agent_outputs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_agent_outputs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text" DEFAULT NULL::"text", "p_session_data" "jsonb" DEFAULT NULL::"jsonb", "p_merge_data" boolean DEFAULT true) RETURNS TABLE("id" "uuid", "session_data" "jsonb", "updated_at" timestamp with time zone, "updated_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_session_exists BOOLEAN := FALSE;
    v_current_data JSONB;
    v_new_data JSONB;
BEGIN
    -- Security: Verify user has access to this organization
    SELECT get_user_org_id() INTO v_user_org_id;
    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get current user ID (FIXED: use auth.uid() instead of get_current_user())
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User authentication required';
    END IF;

    -- Validate session exists and belongs to org (FIXED: qualified column names)
    SELECT EXISTS(
        SELECT 1 FROM agent_conversations
        WHERE agent_conversations.id = p_session_id
          AND agent_conversations.org_id = p_org_id
          AND agent_conversations.archived_at IS NULL
    ), session_data
    INTO v_session_exists, v_current_data
    FROM agent_conversations
    WHERE agent_conversations.id = p_session_id
      AND agent_conversations.org_id = p_org_id
      AND agent_conversations.archived_at IS NULL;

    IF NOT v_session_exists THEN
        RAISE EXCEPTION 'Session not found or does not belong to organization';
    END IF;

    -- Prepare new session data
    v_new_data := COALESCE(v_current_data, '{}'::JSONB);

    -- Update session title if provided
    IF p_session_title IS NOT NULL THEN
        v_new_data := v_new_data || jsonb_build_object('session_title', p_session_title);
    END IF;

    -- Merge or replace session data if provided
    IF p_session_data IS NOT NULL THEN
        IF p_merge_data THEN
            v_new_data := v_new_data || p_session_data;
        ELSE
            v_new_data := p_session_data;
        END IF;
    END IF;

    -- Update session (FIXED: qualified column names)
    UPDATE agent_conversations SET
        session_data = v_new_data,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE agent_conversations.id = p_session_id
      AND agent_conversations.org_id = p_org_id;

    -- Return updated session info (FIXED: qualified column names)
    RETURN QUERY
    SELECT
        ac.id,
        ac.session_data,
        ac.updated_at,
        ac.updated_by
    FROM agent_conversations ac
    WHERE ac.id = p_session_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('agent_sessions_changed',
        json_build_object(
            'action', 'UPDATE',
            'org_id', p_org_id,
            'session_id', p_session_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text", "p_session_data" "jsonb", "p_merge_data" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text", "p_session_data" "jsonb", "p_merge_data" boolean) IS 'Database-First function to update agent session metadata and data (FIXED: qualified column names)';



CREATE OR REPLACE FUNCTION "public"."update_interview_insights_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.insight_type = 'persona_interview' AND NEW.content->>'session_id' IS NOT NULL THEN
    UPDATE persona_interview_sessions
    SET insights_count = insights_count + 1
    WHERE id = (NEW.content->>'session_id')::UUID;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_interview_insights_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_strategy_type" "text" DEFAULT NULL::"text", "p_positioning_statement" "text" DEFAULT NULL::"text", "p_value_propositions" "jsonb" DEFAULT NULL::"jsonb", "p_key_messages" "jsonb" DEFAULT NULL::"jsonb", "p_differentiation_points" "text"[] DEFAULT NULL::"text"[], "p_elevator_pitches" "jsonb" DEFAULT NULL::"jsonb", "p_tone_of_voice" "jsonb" DEFAULT NULL::"jsonb", "p_brand_personality" "jsonb" DEFAULT NULL::"jsonb", "p_channel_mix" "jsonb" DEFAULT NULL::"jsonb", "p_budget_allocation" "jsonb" DEFAULT NULL::"jsonb", "p_content_pillars" "text"[] DEFAULT NULL::"text"[], "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_status" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "org_id" "uuid", "campaign_id" "uuid", "title" "text", "strategy_type" "text", "positioning_statement" "text", "value_propositions" "jsonb", "key_messages" "jsonb", "differentiation_points" "text"[], "elevator_pitches" "jsonb", "tone_of_voice" "jsonb", "brand_personality" "jsonb", "channel_mix" "jsonb", "budget_allocation" "jsonb", "content_pillars" "text"[], "metadata" "jsonb", "status" "text", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_strategy_exists BOOLEAN := FALSE;
    v_campaign_id UUID;
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

    -- Validate strategy exists and belongs to org
    SELECT EXISTS(
        SELECT 1 FROM marketing_strategies
        WHERE id = p_strategy_id AND org_id = p_org_id AND archived_at IS NULL
    ), campaign_id
    INTO v_strategy_exists, v_campaign_id
    FROM marketing_strategies
    WHERE id = p_strategy_id AND org_id = p_org_id AND archived_at IS NULL;

    IF NOT v_strategy_exists THEN
        RAISE EXCEPTION 'Marketing strategy not found or does not belong to organization';
    END IF;

    -- Update marketing strategy (only update provided fields)
    UPDATE marketing_strategies SET
        title = COALESCE(p_title, title),
        strategy_type = COALESCE(p_strategy_type, strategy_type),
        positioning_statement = COALESCE(p_positioning_statement, positioning_statement),
        value_propositions = COALESCE(p_value_propositions, value_propositions),
        key_messages = COALESCE(p_key_messages, key_messages),
        differentiation_points = COALESCE(p_differentiation_points, differentiation_points),
        elevator_pitches = COALESCE(p_elevator_pitches, elevator_pitches),
        tone_of_voice = COALESCE(p_tone_of_voice, tone_of_voice),
        brand_personality = COALESCE(p_brand_personality, brand_personality),
        channel_mix = COALESCE(p_channel_mix, channel_mix),
        budget_allocation = COALESCE(p_budget_allocation, budget_allocation),
        content_pillars = COALESCE(p_content_pillars, content_pillars),
        metadata = COALESCE(p_metadata, metadata),
        status = COALESCE(p_status, status),
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_strategy_id AND org_id = p_org_id;

    -- Return the updated strategy
    RETURN QUERY
    SELECT
        ms.id,
        ms.org_id,
        ms.campaign_id,
        ms.title,
        ms.strategy_type,
        ms.positioning_statement,
        ms.value_propositions,
        ms.key_messages,
        ms.differentiation_points,
        ms.elevator_pitches,
        ms.tone_of_voice,
        ms.brand_personality,
        ms.channel_mix,
        ms.budget_allocation,
        ms.content_pillars,
        ms.metadata,
        ms.status,
        ms.updated_at
    FROM marketing_strategies ms
    WHERE ms.id = p_strategy_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('marketing_strategies_changed',
        json_build_object(
            'action', 'UPDATE',
            'org_id', p_org_id,
            'strategy_id', p_strategy_id,
            'campaign_id', v_campaign_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb", "p_status" "text") IS 'Database-First function to update an existing marketing strategy with partial updates support';



CREATE OR REPLACE FUNCTION "public"."update_marketing_strategy_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_marketing_strategy_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text", "p_persona_type" "text" DEFAULT NULL::"text", "p_age_range" "text" DEFAULT NULL::"text", "p_location" "jsonb" DEFAULT NULL::"jsonb", "p_pain_points" "jsonb" DEFAULT NULL::"jsonb", "p_goals" "jsonb" DEFAULT NULL::"jsonb", "p_preferred_channels" "jsonb" DEFAULT NULL::"jsonb", "p_content_preferences" "jsonb" DEFAULT NULL::"jsonb", "p_objections" "jsonb" DEFAULT NULL::"jsonb", "p_buying_stage" "text" DEFAULT NULL::"text", "p_decision_making_role" "text" DEFAULT NULL::"text", "p_budget_authority" "text" DEFAULT NULL::"text", "p_tech_savviness" "text" DEFAULT NULL::"text", "p_information_sources" "jsonb" DEFAULT NULL::"jsonb", "p_social_media_habits" "jsonb" DEFAULT NULL::"jsonb", "p_typical_day" "text" DEFAULT NULL::"text", "p_frustrations" "jsonb" DEFAULT NULL::"jsonb", "p_motivations" "jsonb" DEFAULT NULL::"jsonb", "p_quotes" "jsonb" DEFAULT NULL::"jsonb", "p_success_metrics" "jsonb" DEFAULT NULL::"jsonb", "p_buying_triggers" "jsonb" DEFAULT NULL::"jsonb", "p_demographics" "jsonb" DEFAULT NULL::"jsonb", "p_psychographics" "jsonb" DEFAULT NULL::"jsonb", "p_behavioral_traits" "jsonb" DEFAULT NULL::"jsonb", "p_customer_journey" "jsonb" DEFAULT NULL::"jsonb", "p_interaction_history" "jsonb" DEFAULT NULL::"jsonb", "p_background_story" "text" DEFAULT NULL::"text", "p_key_quote" "text" DEFAULT NULL::"text", "p_is_primary" boolean DEFAULT NULL::boolean) RETURNS TABLE("id" "uuid", "org_id" "uuid", "name" "text", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_org_id UUID;
    v_user_id UUID;
    v_campaign_id UUID;
BEGIN
    -- Security: Verify user access
    SELECT get_user_org_id() INTO v_user_org_id;
    SELECT user_id INTO v_user_id FROM get_current_user();

    IF v_user_org_id != p_org_id THEN
        RAISE EXCEPTION 'Unauthorized access to organization data';
    END IF;

    -- Get campaign_id for notification
    SELECT campaign_id INTO v_campaign_id
    FROM synthetic_personas
    WHERE id = p_persona_id AND org_id = p_org_id;

    IF v_campaign_id IS NULL THEN
        RAISE EXCEPTION 'Persona not found or access denied';
    END IF;

    -- Update persona (FIXED: removed is_active from SET clause)
    UPDATE synthetic_personas SET
        name = COALESCE(p_name, name),
        title = COALESCE(p_title, title),
        persona_type = COALESCE(p_persona_type, persona_type),
        age_range = COALESCE(p_age_range, age_range),
        location = COALESCE(p_location, location),
        pain_points = COALESCE(p_pain_points, pain_points),
        goals = COALESCE(p_goals, goals),
        preferred_channels = COALESCE(p_preferred_channels, preferred_channels),
        content_preferences = COALESCE(p_content_preferences, content_preferences),
        objections = COALESCE(p_objections, objections),
        buying_stage = COALESCE(p_buying_stage, buying_stage),
        decision_making_role = COALESCE(p_decision_making_role, decision_making_role),
        budget_authority = COALESCE(p_budget_authority, budget_authority),
        tech_savviness = COALESCE(p_tech_savviness, tech_savviness),
        information_sources = COALESCE(p_information_sources, information_sources),
        social_media_habits = COALESCE(p_social_media_habits, social_media_habits),
        typical_day = COALESCE(p_typical_day, typical_day),
        frustrations = COALESCE(p_frustrations, frustrations),
        motivations = COALESCE(p_motivations, motivations),
        quotes = COALESCE(p_quotes, quotes),
        success_metrics = COALESCE(p_success_metrics, success_metrics),
        buying_triggers = COALESCE(p_buying_triggers, buying_triggers),
        demographics = COALESCE(p_demographics, demographics),
        psychographics = COALESCE(p_psychographics, psychographics),
        behavioral_traits = COALESCE(p_behavioral_traits, behavioral_traits),
        customer_journey = COALESCE(p_customer_journey, customer_journey),
        interaction_history = COALESCE(p_interaction_history, interaction_history),
        background_story = COALESCE(p_background_story, background_story),
        key_quote = COALESCE(p_key_quote, key_quote),
        is_primary = COALESCE(p_is_primary, is_primary),
        -- REMOVED: is_active = COALESCE(p_is_active, is_active) (was line 248)
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_persona_id AND org_id = p_org_id;

    -- Return updated persona info
    RETURN QUERY
    SELECT
        sp.id,
        sp.org_id,
        sp.name::TEXT,
        sp.updated_at
    FROM synthetic_personas sp
    WHERE sp.id = p_persona_id;

    -- Notify real-time subscribers
    PERFORM pg_notify('personas_changed',
        json_build_object(
            'action', 'UPDATE',
            'org_id', p_org_id,
            'persona_id', p_persona_id,
            'campaign_id', v_campaign_id
        )::text
    );
END;
$$;


ALTER FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) IS 'Updates an existing persona. All fields are optional (COALESCE pattern). Validates org access.
Version: 1.1 (Fixed: removed deprecated is_active parameter and column reference)
Dependencies: synthetic_personas table, get_user_org_id(), get_current_user() functions';



CREATE OR REPLACE FUNCTION "public"."update_persona_insights_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_persona_id UUID;
  v_insights_data JSONB;
BEGIN
  -- Extract persona_id from the insight
  v_persona_id := (NEW.content->>'persona_id')::UUID;
  
  IF v_persona_id IS NOT NULL AND NEW.insight_type = 'persona_interview' THEN
    -- Aggregate insights for this persona
    SELECT jsonb_build_object(
      'total_insights', COUNT(*),
      'categories', jsonb_object_agg(
        content->>'insight_category', 
        COUNT(*)
      ),
      'top_themes', (
        SELECT jsonb_agg(DISTINCT theme)
        FROM ai_insights, jsonb_array_elements_text(content->'themes') AS theme
        WHERE content->>'persona_id' = v_persona_id::TEXT
        LIMIT 5
      ),
      'last_updated', NOW()
    ) INTO v_insights_data
    FROM ai_insights
    WHERE content->>'persona_id' = v_persona_id::TEXT
    AND insight_type = 'persona_interview';
    
    -- Update the persona's insights summary
    UPDATE synthetic_personas
    SET insights_summary = v_insights_data
    WHERE id = v_persona_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_persona_insights_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'agency'
    AS $$
DECLARE
  v_schema TEXT;
  v_session RECORD;
  v_updated_session_data JSONB;
BEGIN
  -- Detect which schema the session belongs to
  v_schema := detect_session_schema(p_session_id);

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Route update based on schema
  IF v_schema = 'agency' THEN
    -- Agency: Update title column directly
    UPDATE agency.agent_conversations
    SET
      title = p_new_title,
      updated_at = NOW()
    WHERE id = p_session_id;

    RETURN FOUND;

  ELSIF v_schema = 'public' THEN
    -- SME: Update session_data JSONB
    -- Get existing session_data
    SELECT session_data INTO v_session
    FROM public.agent_conversations
    WHERE id = p_session_id;

    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;

    -- Update session_data with new title and title_generated flag
    v_updated_session_data := COALESCE(v_session.session_data, '{}'::jsonb);
    v_updated_session_data := jsonb_set(v_updated_session_data, '{name}', to_jsonb(p_new_title));
    v_updated_session_data := jsonb_set(v_updated_session_data, '{title_generated}', 'true'::jsonb);

    -- Update the row
    UPDATE public.agent_conversations
    SET
      session_data = v_updated_session_data,
      updated_at = NOW()
    WHERE id = p_session_id;

    RETURN FOUND;

  ELSE
    RAISE EXCEPTION 'Invalid schema detected: %', v_schema;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") IS 'Updates session title in the correct schema (agency or public) based on session location. Uses detect_session_schema() to determine routing. Agency: updates title column directly. SME: updates session_data JSONB with name and title_generated flag. Created in Migration 241 to fix Supabase Python client schema prefix limitations.';


CREATE OR REPLACE FUNCTION "public"."validate_agent_output"("output_id" "uuid", "new_status" "text", "validator_id" "uuid", "reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE agent_outputs
  SET
    validation_status = new_status,
    validated_by = validator_id,
    validated_at = NOW(),
    rejection_reason = CASE
      WHEN new_status = 'rejected' THEN reason
      ELSE NULL
    END
  WHERE id = output_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."validate_agent_output"("output_id" "uuid", "new_status" "text", "validator_id" "uuid", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_persona_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Ensure location is a valid JSON object if not null
    IF NEW.location IS NOT NULL AND jsonb_typeof(NEW.location) != 'object' THEN
        RAISE EXCEPTION 'Location must be a JSON object';
    END IF;
    
    -- Ensure coordinates have proper structure if present
    IF NEW.location ? 'coordinates' AND NEW.location->'coordinates' IS NOT NULL THEN
        IF NOT (
            (NEW.location->'coordinates') ? 'lat' AND 
            (NEW.location->'coordinates') ? 'lng'
        ) THEN
            RAISE EXCEPTION 'Coordinates must have lat and lng fields';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_persona_location"() OWNER TO "postgres";