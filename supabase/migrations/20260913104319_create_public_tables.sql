-- ============================================================================
-- create_public_tables
-- Tables, columns, constraints and RLS-enable for the SME schema (`public`).
-- ============================================================================




CREATE TABLE IF NOT EXISTS "agency"."agent_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "agent_type" "text" NOT NULL,
    "title" "text",
    "mode" "text",
    "session_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid"
);



CREATE TABLE IF NOT EXISTS "agency"."agent_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text", 'tool'::"text"])))
);



CREATE TABLE IF NOT EXISTS "agency"."agent_outputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "agent_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text",
    "category" "text"[],
    "status" "text" DEFAULT 'active'::"text",
    "content" "jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "user_id" "uuid",
    "output_type" "text" DEFAULT 'agent_output'::"text" NOT NULL,
    "source_type" "text" DEFAULT 'agent_conversation'::"text",
    "session_id" "text",
    "confidence_score" double precision DEFAULT 0.8,
    "validation_status" "text" DEFAULT 'auto_approved'::"text",
    "impact_score" integer DEFAULT 0,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "approval_status" "text" DEFAULT 'not_submitted'::"text",
    "current_approval_id" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "approval_round" integer DEFAULT 0,
    "updated_by" "uuid",
    "version" integer DEFAULT 1,
    "previous_version_id" "uuid",
    "finalized_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "validated_by" "uuid",
    "validated_at" timestamp with time zone,
    "rejection_reason" "text",
    "used_by_agents" "text"[],
    "extraction_model" "text",
    "extraction_cost" numeric(10,6),
    "priority" "text",
    CONSTRAINT "agency_agent_outputs_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['not_submitted'::"text", 'pending'::"text", 'changes_needed'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "agency_outputs_impact_score_check" CHECK ((("impact_score" >= 0) AND ("impact_score" <= 100)))
);



CREATE TABLE IF NOT EXISTS "agency"."brand_guidelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "name" "text",
    "description" "text",
    "is_default" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "parent_id" "uuid",
    "guidelines" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED
);



CREATE TABLE IF NOT EXISTS "agency"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "campaign_type" "text",
    "target_audience" "text",
    "target_personas" "jsonb" DEFAULT '[]'::"jsonb",
    "geographic_target" "text",
    "budget_cents" integer DEFAULT 0,
    "spent_cents" integer DEFAULT 0,
    "budget" numeric GENERATED ALWAYS AS ((("budget_cents")::numeric / (100)::numeric)) STORED,
    "spent" numeric GENERATED ALWAYS AS ((("spent_cents")::numeric / (100)::numeric)) STORED,
    "conversions" integer DEFAULT 0,
    "reach" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "click_through_rate" numeric DEFAULT 0,
    "cost_per_click" numeric DEFAULT 0,
    "objectives" "jsonb" DEFAULT '{}'::"jsonb",
    "metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "success_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "marketing_channels" "jsonb" DEFAULT '[]'::"jsonb",
    "content_pillars" "jsonb" DEFAULT '[]'::"jsonb",
    "competitor_context" "text",
    "start_date" "date",
    "end_date" "date",
    "priority_level" "text" DEFAULT 'medium'::"text",
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "white_label_config" "jsonb" DEFAULT '{}'::"jsonb",
    "parent_campaign_id" "uuid",
    "campaign_template_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    CONSTRAINT "campaigns_budget_cents_check" CHECK (("budget_cents" >= 0)),
    CONSTRAINT "campaigns_priority_level_check" CHECK (("priority_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "campaigns_spent_cents_check" CHECK (("spent_cents" >= 0)),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'planned'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'archived'::"text"]))),
    CONSTRAINT "campaigns_valid_dates" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("end_date" >= "start_date")))
);



CREATE TABLE IF NOT EXISTS "agency"."client_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "company_size" "public"."company_size_enum",
    "company_stage" "public"."company_stage_enum",
    "business_model" "public"."business_model_enum",
    "target_market" "text"[],
    "key_competitors" "text"[],
    "unique_value_proposition" "text",
    "marketing_budget" "text",
    "current_marketing_channels" "text"[],
    "marketing_goals" "text"[],
    "ai_insights" "jsonb" DEFAULT '{}'::"jsonb",
    "persona_patterns" "jsonb" DEFAULT '{}'::"jsonb",
    "content_themes" "jsonb" DEFAULT '{}'::"jsonb",
    "campaign_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "data_completeness_score" integer DEFAULT 0,
    "last_enriched_at" timestamp with time zone,
    "conversation_count" integer DEFAULT 0,
    "last_interaction_at" timestamp with time zone,
    "learning_milestones" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "geography" "text"[],
    "funding_status" "public"."funding_status_enum",
    "main_products" "text"[],
    "tech_stack" "text"[],
    "annual_revenue" character varying(50),
    "last_manual_update" timestamp with time zone,
    "last_ai_update" timestamp with time zone,
    "learning_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "business_metrics" "jsonb" DEFAULT '{"product": {}, "financial": {}, "marketing": {}, "operational": {}}'::"jsonb",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    CONSTRAINT "client_intelligence_data_completeness_score_check" CHECK ((("data_completeness_score" >= 0) AND ("data_completeness_score" <= 100)))
);



CREATE TABLE IF NOT EXISTS "agency"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "industry" "text",
    "website" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "status" "text" DEFAULT 'active'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    CONSTRAINT "agency_clients_name_not_empty" CHECK ((TRIM(BOTH FROM "name") <> ''::"text")),
    CONSTRAINT "agency_clients_status_valid" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'onboarding'::"text", 'churned'::"text"])))
);



CREATE TABLE IF NOT EXISTS "agency"."personas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "vertical" "text",
    "company_size" "text",
    "annual_revenue" "text",
    "demographics" "jsonb" DEFAULT '{}'::"jsonb",
    "goals" "jsonb" DEFAULT '[]'::"jsonb",
    "pain_points" "jsonb" DEFAULT '[]'::"jsonb",
    "jobs_to_be_done" "jsonb" DEFAULT '[]'::"jsonb",
    "current_tools" "jsonb" DEFAULT '[]'::"jsonb",
    "decision_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "objections" "jsonb" DEFAULT '[]'::"jsonb",
    "preferred_channels" "jsonb" DEFAULT '[]'::"jsonb",
    "personality_traits" "jsonb" DEFAULT '{}'::"jsonb",
    "domain_expertise" "jsonb" DEFAULT '{}'::"jsonb",
    "buyer_journey" "jsonb",
    "location" "jsonb" DEFAULT "jsonb_build_object"('country', NULL::"unknown", 'state_province', NULL::"unknown", 'city', NULL::"unknown"),
    "customer_status" "text",
    "satisfaction_score" integer,
    "interaction_history" "jsonb" DEFAULT '[]'::"jsonb",
    "insights_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "background_story" "text",
    "key_quote" "text",
    "ai_personality_prompt" "text",
    "response_style" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_primary" boolean DEFAULT false,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    CONSTRAINT "personas_customer_status_check" CHECK (("customer_status" = ANY (ARRAY['prospect'::"text", 'active'::"text", 'churned'::"text", 'competitor_user'::"text"]))),
    CONSTRAINT "personas_satisfaction_score_check" CHECK ((("satisfaction_score" >= 0) AND ("satisfaction_score" <= 10)))
);



CREATE TABLE IF NOT EXISTS "public"."ai_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "insight_type" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_agent" "text",
    "session_id" "text",
    "campaign_id" "uuid",
    "title" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "category" "text"[],
    "contains_pii" boolean DEFAULT false,
    "pii_types" "text"[],
    "pii_confidence" double precision,
    "pii_masked_content" "jsonb",
    "confidence_score" double precision,
    "validation_status" "text" DEFAULT 'pending'::"text",
    "validated_by" "uuid",
    "validated_at" timestamp with time zone,
    "rejection_reason" "text",
    "impact_score" integer DEFAULT 0,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "used_by_agents" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "version" integer DEFAULT 1,
    "previous_version_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "extraction_model" "text",
    "extraction_cost" numeric(10,6),
    CONSTRAINT "ai_insights_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision))),
    CONSTRAINT "ai_insights_impact_score_check" CHECK ((("impact_score" >= 0) AND ("impact_score" <= 100))),
    CONSTRAINT "ai_insights_insight_type_check" CHECK (("insight_type" = ANY (ARRAY['learning'::"text", 'recommendation'::"text", 'observation'::"text", 'pattern'::"text", 'validation'::"text"]))),
    CONSTRAINT "ai_insights_pii_confidence_check" CHECK ((("pii_confidence" >= (0)::double precision) AND ("pii_confidence" <= (1)::double precision))),
    CONSTRAINT "ai_insights_source_type_check" CHECK (("source_type" = ANY (ARRAY['agent_conversation'::"text", 'user_activity'::"text", 'data_analysis'::"text", 'user_input'::"text"]))),
    CONSTRAINT "ai_insights_validation_status_check" CHECK (("validation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'auto_approved'::"text"])))
);


ALTER TABLE "public"."ai_insights" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_insights" IS 'RLS optimized in Migration 139 (2025-10-24): Auth functions wrapped in SELECT, policies targeted to specific roles';



COMMENT ON COLUMN "public"."ai_insights"."content" IS 'Flexible JSONB structure containing the actual insight data. Structure varies by insight_type';



COMMENT ON COLUMN "public"."ai_insights"."pii_masked_content" IS 'Version of content with PII automatically masked by LLM detection';



COMMENT ON COLUMN "public"."ai_insights"."impact_score" IS 'Calculated score (0-100) indicating the business impact of this insight';



COMMENT ON COLUMN "public"."ai_insights"."used_by_agents" IS 'Array tracking which AI agents have referenced this insight';



CREATE TABLE IF NOT EXISTS "public"."marketing_strategies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "value_propositions" "jsonb" DEFAULT '{}'::"jsonb",
    "key_messages" "jsonb" DEFAULT '{}'::"jsonb",
    "differentiation_points" "text"[] DEFAULT '{}'::"text"[],
    "elevator_pitches" "jsonb" DEFAULT '{}'::"jsonb",
    "tone_of_voice" "jsonb" DEFAULT '{}'::"jsonb",
    "brand_personality" "jsonb" DEFAULT '{}'::"jsonb",
    "positioning_statement" "text",
    "channel_mix" "jsonb" DEFAULT '{}'::"jsonb",
    "budget_allocation" "jsonb" DEFAULT '{}'::"jsonb",
    "content_pillars" "text"[] DEFAULT '{}'::"text"[],
    "estimated_reach" integer,
    "estimated_cost" numeric(10,2),
    "priority_score" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "org_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "strategy_type" character varying(50) DEFAULT 'manual'::character varying,
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "title" character varying(255),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "updated_by" "uuid",
    CONSTRAINT "check_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'archived'::character varying, 'template'::character varying])::"text"[]))),
    CONSTRAINT "check_strategy_type" CHECK ((("strategy_type")::"text" = ANY ((ARRAY['manual'::character varying, 'ai_generated'::character varying, 'ai_detected'::character varying, 'imported'::character varying, 'template'::character varying])::"text"[])))
);


ALTER TABLE "public"."marketing_strategies" OWNER TO "postgres";


COMMENT ON TABLE "public"."marketing_strategies" IS 'Marketing strategies can exist with or without campaigns. Multiple strategies allowed per campaign to support: (1) strategy iterations, (2) A/B testing different approaches, (3) exploratory work before campaign creation.';



COMMENT ON COLUMN "public"."marketing_strategies"."channel_mix" IS 'JSON object defining marketing channels and their priorities';



COMMENT ON COLUMN "public"."marketing_strategies"."budget_allocation" IS 'JSON object with owned/earned/paid percentages';



COMMENT ON COLUMN "public"."marketing_strategies"."content_pillars" IS 'Array of content themes for consistent messaging';



COMMENT ON COLUMN "public"."marketing_strategies"."metadata" IS 'Additional metadata including save location, detection confidence, and other flexible data';



COMMENT ON COLUMN "public"."marketing_strategies"."strategy_type" IS 'Type of strategy creation: manual, ai_generated, ai_detected, imported, or template';



COMMENT ON COLUMN "public"."marketing_strategies"."status" IS 'Current status: draft, active, archived, or template';



COMMENT ON COLUMN "public"."marketing_strategies"."title" IS 'Human-readable title for the strategy';



COMMENT ON COLUMN "public"."marketing_strategies"."archived_at" IS 'Timestamp when the record was archived (soft deleted)';



COMMENT ON COLUMN "public"."marketing_strategies"."archived_by" IS 'User who archived the record';



COMMENT ON COLUMN "public"."marketing_strategies"."archive_reason" IS 'Optional reason for archiving';



COMMENT ON COLUMN "public"."marketing_strategies"."is_archived" IS 'Computed column: true if archived_at is not null';



CREATE TABLE IF NOT EXISTS "public"."marketing_strategy_personas" (
    "strategy_id" "uuid" NOT NULL,
    "persona_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "messaging_variation" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketing_strategy_personas" OWNER TO "postgres";


COMMENT ON TABLE "public"."marketing_strategy_personas" IS 'Links marketing strategies to multiple target personas with customization';



CREATE TABLE IF NOT EXISTS "public"."synthetic_personas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "vertical" "text",
    "company_size" "text",
    "annual_revenue" "text",
    "demographics" "jsonb" DEFAULT '{}'::"jsonb",
    "goals" "jsonb" DEFAULT '[]'::"jsonb",
    "pain_points" "jsonb" DEFAULT '[]'::"jsonb",
    "jobs_to_be_done" "jsonb" DEFAULT '[]'::"jsonb",
    "current_tools" "jsonb" DEFAULT '[]'::"jsonb",
    "decision_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "objections" "jsonb" DEFAULT '[]'::"jsonb",
    "preferred_channels" "jsonb" DEFAULT '[]'::"jsonb",
    "personality_traits" "jsonb" DEFAULT '{}'::"jsonb",
    "customer_status" "text",
    "satisfaction_score" integer,
    "background_story" "text",
    "key_quote" "text",
    "interaction_history" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "ai_personality_prompt" "text",
    "response_style" "text",
    "domain_expertise" "jsonb" DEFAULT '{}'::"jsonb",
    "buyer_journey" "jsonb",
    "location" "jsonb" DEFAULT "jsonb_build_object"('country', NULL::"unknown", 'state_province', NULL::"unknown", 'city', NULL::"unknown", 'postal_code', NULL::"unknown", 'region', NULL::"unknown", 'timezone', NULL::"unknown", 'coordinates', NULL::"unknown", 'description', NULL::"unknown"),
    "insights_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "updated_by" "uuid",
    "campaign_id" "uuid",
    "is_primary" boolean DEFAULT false,
    CONSTRAINT "synthetic_personas_customer_status_check" CHECK (("customer_status" = ANY (ARRAY['prospect'::"text", 'active'::"text", 'churned'::"text", 'competitor_user'::"text"]))),
    CONSTRAINT "synthetic_personas_satisfaction_score_check" CHECK ((("satisfaction_score" >= 0) AND ("satisfaction_score" <= 10)))
);


ALTER TABLE "public"."synthetic_personas" OWNER TO "postgres";


COMMENT ON TABLE "public"."synthetic_personas" IS 'DEPRECATED: All personas migrated to agent_outputs table. Table kept for historical reference only.';



COMMENT ON COLUMN "public"."synthetic_personas"."jobs_to_be_done" IS 'Jobs to Be Done framework - what the persona is trying to accomplish';



COMMENT ON COLUMN "public"."synthetic_personas"."ai_personality_prompt" IS 'Instructions for AI to accurately embody this persona in conversations';



COMMENT ON COLUMN "public"."synthetic_personas"."buyer_journey" IS 'Stores customer journey mapping data with stages: awareness, consideration, decision, retention, advocacy. 
Example structure:
{
  "awareness": {
    "touchpoints": ["social_media", "search_ads", "content_marketing"],
    "pain_points": ["Unaware of solution existence"],
    "content_needs": ["Educational blog posts", "Industry reports"],
    "triggers_to_next": ["Recognizes problem needs solving"]
  },
  "consideration": {
    "touchpoints": ["website", "case_studies", "webinars"],
    "pain_points": ["Comparing multiple solutions"],
    "content_needs": ["Comparison guides", "ROI calculators"],
    "triggers_to_next": ["Clear understanding of value proposition"]
  },
  "decision": {
    "touchpoints": ["sales_demo", "free_trial", "references"],
    "pain_points": ["Budget approval", "Implementation concerns"],
    "content_needs": ["Implementation guides", "Security docs"],
    "triggers_to_next": ["Successful pilot or trial"]
  },
  "retention": {
    "touchpoints": ["customer_success", "product_updates", "support"],
    "pain_points": ["Adoption challenges", "ROI measurement"],
    "content_needs": ["Best practices", "Success metrics"],
    "triggers_to_next": ["Achieving consistent value"]
  },
  "advocacy": {
    "touchpoints": ["referral_program", "case_study_participation", "user_community"],
    "pain_points": ["Time to share experiences"],
    "content_needs": ["Success story templates", "Referral incentives"],
    "triggers_to_next": ["Exceptional results worth sharing"]
  }
}';



COMMENT ON COLUMN "public"."synthetic_personas"."location" IS 'Structured location data as JSONB. Expected fields:
{
  "country": "Country name or ISO code",
  "state_province": "State or province name",
  "city": "City name",
  "postal_code": "Postal/ZIP code",
  "region": "Geographic region (e.g., Bay Area, Greater London)",
  "timezone": "IANA timezone (e.g., America/New_York)",
  "coordinates": {"lat": number, "lng": number},
  "description": "Free-form location description"
}';



COMMENT ON COLUMN "public"."synthetic_personas"."insights_summary" IS 'Aggregated summary of insights from persona interviews';



COMMENT ON COLUMN "public"."synthetic_personas"."archived_at" IS 'Timestamp when record was archived. NULL = active, NOT NULL = archived. Standardized pattern as of migration 091.';



COMMENT ON COLUMN "public"."synthetic_personas"."campaign_id" IS 'Optional reference to the campaign this persona belongs to';



COMMENT ON COLUMN "public"."synthetic_personas"."is_primary" IS 'Indicates if this is the primary persona for its campaign or organization';



CREATE TABLE IF NOT EXISTS "public"."agent_context_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_name" "text" NOT NULL,
    "detail_level" "text",
    "included_fields" "text"[],
    "special_additions" "jsonb",
    "max_context_size" integer DEFAULT 4000,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "agent_context_profiles_detail_level_check" CHECK (("detail_level" = ANY (ARRAY['summary'::"text", 'standard'::"text", 'detailed'::"text"])))
);


ALTER TABLE "public"."agent_context_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_context_profiles" IS 'RLS optimized in Migration 140 (2025-10-24): Fixed legacy policy names for auth RLS initplan optimization';



CREATE TABLE IF NOT EXISTS "public"."agent_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "agent_type" "text" NOT NULL,
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "client_id" "uuid",
    "locale" character varying(10) DEFAULT 'en'::character varying,
    CONSTRAINT "chk_agent_conversations_locale" CHECK ((("locale")::"text" = ANY ((ARRAY['en'::character varying, 'vi'::character varying, 'es'::character varying, 'fr'::character varying, 'ja'::character varying, 'ko'::character varying, 'zh-CN'::character varying, 'de'::character varying, 'pt-BR'::character varying, 'zh-HK'::character varying])::"text"[])))
);


ALTER TABLE "public"."agent_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_conversations" IS 'Agent conversation sessions. The id field is the session ID used in URLs and API calls.';



COMMENT ON COLUMN "public"."agent_conversations"."id" IS 'Primary key and session ID used in URLs and API calls';



COMMENT ON COLUMN "public"."agent_conversations"."agent_type" IS 'Agent type identifier. campaign_planning (renamed from campaign_execution on 2025-10-09 for strategic clarity)';



COMMENT ON COLUMN "public"."agent_conversations"."client_id" IS 'Client ID for AGENCY organizations (references agency.clients) or SME organizations (references public.clients). No FK constraint to support multi-schema architecture. Validated via org_id checks.';



COMMENT ON COLUMN "public"."agent_conversations"."locale" IS 'Locale used for this conversation. Affects AI prompts, tool names, and response language.';



CREATE TABLE IF NOT EXISTS "public"."agent_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text", 'tool'::"text"]))),
    CONSTRAINT "assistant_messages_not_empty" CHECK ((("role" <> 'assistant'::"text") OR (("role" = 'assistant'::"text") AND ("content" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "content")) > 0))))
);


ALTER TABLE "public"."agent_messages" OWNER TO "postgres";


COMMENT ON CONSTRAINT "assistant_messages_not_empty" ON "public"."agent_messages" IS 'Prevents empty assistant messages from being saved. Empty messages cause frontend UI to appear stuck in loading state. This constraint ensures all assistant messages have actual content before being persisted.';



CREATE TABLE IF NOT EXISTS "public"."agent_outputs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "agent_type" "text" NOT NULL,
    "output_type" "text" NOT NULL,
    "source_type" "text" DEFAULT 'agent_conversation'::"text",
    "session_id" "text",
    "campaign_id" "uuid",
    "title" "text" NOT NULL,
    "summary" "text",
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "category" "text"[],
    "confidence_score" double precision DEFAULT 0.8,
    "validation_status" "text" DEFAULT 'auto_approved'::"text",
    "validated_by" "uuid",
    "validated_at" timestamp with time zone,
    "rejection_reason" "text",
    "impact_score" integer DEFAULT 0,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "used_by_agents" "text"[],
    "status" "text" DEFAULT 'draft'::"text",
    "published_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "version" integer DEFAULT 1,
    "previous_version_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "extraction_model" "text",
    "extraction_cost" numeric(10,6),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "priority" "text",
    "client_id" "uuid",
    "approval_status" "text" DEFAULT 'not_submitted'::"text",
    "current_approval_id" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "approval_round" integer DEFAULT 0,
    CONSTRAINT "agent_outputs_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['not_submitted'::"text", 'pending'::"text", 'changes_needed'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "agent_outputs_impact_score_check" CHECK ((("impact_score" >= 0) AND ("impact_score" <= 100))),
    CONSTRAINT "agent_outputs_priority_check" CHECK (("priority" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."agent_outputs" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_outputs" IS 'Single source of truth for all agent intelligence data. Replaced 9 individual intelligence tables (strategy_intelligence, persona_intelligence, content_intelligence, analytics_intelligence, roi_budget_intelligence, campaign_execution_intelligence, quick_wins_intelligence, competitive_intelligence, client_success_intelligence) with unified approach. Nuclear migration completed. Migration 092.';



COMMENT ON COLUMN "public"."agent_outputs"."agent_type" IS 'Agent type identifier. campaign_planning (renamed from campaign_execution on 2025-10-09 for strategic clarity)';



COMMENT ON COLUMN "public"."agent_outputs"."output_type" IS 'The type of output (strategy_synthesis, marketing_plan, persona_profile, blog_post, etc.)';



COMMENT ON COLUMN "public"."agent_outputs"."category" IS 'Opportunity category: seo, content, social, email, conversion, retention, analytics, etc. (used by quick_wins agent)';



COMMENT ON COLUMN "public"."agent_outputs"."confidence_score" IS 'AI confidence in the quality of this output (0.0 to 1.0)';



COMMENT ON COLUMN "public"."agent_outputs"."validation_status" IS 'Quality validation: draft, auto_approved (high confidence), user_approved, rejected';



COMMENT ON COLUMN "public"."agent_outputs"."status" IS 'Opportunity status: pending, ready, in_progress, completed, deferred, not_relevant (used by quick_wins agent)';



COMMENT ON COLUMN "public"."agent_outputs"."expires_at" IS 'Auto-cleanup timestamp for drafts (30 days from creation)';



COMMENT ON COLUMN "public"."agent_outputs"."priority" IS 'Opportunity priority: high, medium, low (used by quick_wins agent)';



COMMENT ON COLUMN "public"."agent_outputs"."client_id" IS 'Optional client reference for agency organizations. NULL for SME user outputs, points to agency.clients.id for agency client-specific outputs. Enables client-scoped learning history and intelligence filtering.';



CREATE TABLE IF NOT EXISTS "public"."alpha_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "text",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "alpha_invites_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."alpha_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."alpha_invites" IS 'Alpha invite whitelist - pre-approved emails for controlled alpha access';



COMMENT ON COLUMN "public"."alpha_invites"."email" IS 'Email address to whitelist (case-insensitive)';



COMMENT ON COLUMN "public"."alpha_invites"."invited_by" IS 'Who sent the invite (e.g., admin email or user email)';



COMMENT ON COLUMN "public"."alpha_invites"."used_at" IS 'When user completed signup (NULL = unused invite)';



COMMENT ON COLUMN "public"."alpha_invites"."used_by" IS 'User ID who claimed this invite';



COMMENT ON COLUMN "public"."alpha_invites"."notes" IS 'Optional context: how you met this person, referral source, etc.';



COMMENT ON COLUMN "public"."alpha_invites"."status" IS 'active = can sign up, revoked = blocked';



CREATE TABLE IF NOT EXISTS "public"."approval_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "round_number" integer NOT NULL,
    "approval_request_id" "uuid",
    "status" "text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "assigned_to" "uuid" NOT NULL,
    "resolved_by" "uuid",
    "resolution_note" "text",
    "content_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    CONSTRAINT "valid_history_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'changes_requested'::"text"]))),
    CONSTRAINT "valid_round_number" CHECK ((("round_number" > 0) AND ("round_number" <= 5)))
);


ALTER TABLE "public"."approval_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "assigned_to" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "priority" "text" DEFAULT 'normal'::"text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_note" "text",
    CONSTRAINT "valid_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'changes_requested'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "org_id" "uuid",
    "phone" "text",
    "avatar_url" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "locale" character varying(10) DEFAULT 'en'::character varying,
    CONSTRAINT "chk_users_locale" CHECK ((("locale")::"text" = ANY ((ARRAY['en'::character varying, 'vi'::character varying, 'es'::character varying, 'fr'::character varying, 'ja'::character varying, 'ko'::character varying, 'zh-CN'::character varying, 'de'::character varying, 'pt-BR'::character varying, 'zh-HK'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."locale" IS 'User preferred locale: en, vi, es, fr, ja, ko, zh-CN, de, pt-BR, zh-HK.';


CREATE TABLE IF NOT EXISTS "public"."brand_guidelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "name" character varying(255),
    "description" "text",
    "is_default" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "guidelines" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."brand_guidelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."brand_guidelines" IS 'Brand guidelines with structured schema: brand_voice (tone, personality, writing), messaging (key messages, value props, content rules), brand_strategy (mission, vision, values), visual_identity (colors, fonts, logos)';



COMMENT ON COLUMN "public"."brand_guidelines"."is_default" IS 'If true, these are the default guidelines for the organization';



COMMENT ON COLUMN "public"."brand_guidelines"."archived_at" IS 'Timestamp when record was archived. NULL = active, NOT NULL = archived. Standardized pattern as of migration 091.';



COMMENT ON COLUMN "public"."brand_guidelines"."archived_by" IS 'User who archived the guideline';



COMMENT ON COLUMN "public"."brand_guidelines"."archive_reason" IS 'Optional reason for archiving';



COMMENT ON COLUMN "public"."brand_guidelines"."guidelines" IS 'Structured JSONB for brand guidelines with sections: brand_voice (PRIMARY for Content Agent), messaging, brand_strategy (context), visual_identity (reference)';



CREATE TABLE IF NOT EXISTS "public"."gemini_cost_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "agent_type" "text" NOT NULL,
    "model_name" "text" NOT NULL,
    "session_id" "uuid",
    "query_complexity" "text",
    "input_tokens" integer NOT NULL,
    "output_tokens" integer NOT NULL,
    "cached_tokens" integer DEFAULT 0,
    "input_cost_usd" numeric(10,6) NOT NULL,
    "cache_cost_usd" numeric(10,6) DEFAULT 0,
    "output_cost_usd" numeric(10,6) NOT NULL,
    "total_cost_usd" numeric(10,6) NOT NULL,
    "cache_savings_usd" numeric(10,6) DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gemini_cost_tracking_query_complexity_check" CHECK (("query_complexity" = ANY (ARRAY['simple'::"text", 'moderate'::"text", 'complex'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."gemini_cost_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."gemini_cost_tracking" IS 'RLS optimized in Migration 139 (2025-10-24): Auth JWT wrapped in SELECT, policies targeted to specific roles';



COMMENT ON COLUMN "public"."gemini_cost_tracking"."query_complexity" IS 'Query complexity classification: simple (Flash-Lite), moderate/complex (Flash), premium (Pro)';



COMMENT ON COLUMN "public"."gemini_cost_tracking"."cached_tokens" IS 'Number of input tokens served from cache (75% cost savings)';



COMMENT ON COLUMN "public"."gemini_cost_tracking"."cache_savings_usd" IS 'Cost savings from context caching vs full input cost';



CREATE TABLE IF NOT EXISTS "public"."cache_refresh_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "agent_type" "text" NOT NULL,
    "cache_name" "text" NOT NULL,
    "context_data" "jsonb" NOT NULL,
    "ttl_type" "text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "refresh_scheduled_at" timestamp with time zone NOT NULL,
    "last_refreshed_at" timestamp with time zone,
    "refresh_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "error_message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cache_refresh_queue_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'refreshing'::"text", 'expired'::"text", 'failed'::"text"]))),
    CONSTRAINT "cache_refresh_queue_ttl_type_check" CHECK (("ttl_type" = ANY (ARRAY['stable'::"text", 'dynamic'::"text", 'session'::"text"])))
);


ALTER TABLE "public"."cache_refresh_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."cache_refresh_queue" IS 'Tracks Gemini context cache lifecycle for proactive refresh';



COMMENT ON COLUMN "public"."cache_refresh_queue"."ttl_type" IS 'stable=24h, dynamic=1h, session=6h';



COMMENT ON COLUMN "public"."cache_refresh_queue"."refresh_scheduled_at" IS 'Scheduled time to refresh cache (1 hour before expiry)';



CREATE TABLE IF NOT EXISTS "public"."campaign_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "acknowledged" boolean DEFAULT false,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "campaign_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['budget_threshold'::"text", 'performance_decline'::"text", 'client_health'::"text", 'completion_milestone'::"text", 'cross_agent_update'::"text"]))),
    CONSTRAINT "campaign_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."campaign_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "performance_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "roi_analysis" "jsonb" DEFAULT '{}'::"jsonb",
    "channel_effectiveness" "jsonb" DEFAULT '{}'::"jsonb",
    "optimization_opportunities" "jsonb" DEFAULT '[]'::"jsonb",
    "ab_test_results" "jsonb" DEFAULT '[]'::"jsonb",
    "content_performance" "jsonb" DEFAULT '{}'::"jsonb",
    "predicted_outcomes" "jsonb" DEFAULT '{}'::"jsonb",
    "recommended_actions" "jsonb" DEFAULT '[]'::"jsonb",
    "confidence_score" double precision,
    "source_agent" "text",
    "extraction_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "client_id" "uuid",
    CONSTRAINT "campaign_intelligence_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision)))
);


ALTER TABLE "public"."campaign_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "public"."campaign_intelligence" IS 'RLS optimized in Migration 140 (2025-10-24): Fixed legacy policy names for auth RLS initplan optimization';



COMMENT ON COLUMN "public"."campaign_intelligence"."client_id" IS 'Optional: NULL for SME users, specific client UUID for agency users managing multiple clients';



CREATE TABLE IF NOT EXISTS "public"."campaign_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "campaign_name" "text" NOT NULL,
    "metric_date" "date" NOT NULL,
    "spend" numeric(10,2) NOT NULL,
    "revenue" numeric(10,2),
    "impressions" integer,
    "clicks" integer,
    "conversions" integer,
    "ctr" numeric(5,2),
    "cpc" numeric(10,2),
    "source" "text",
    "import_method" "text",
    "raw_data" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "conversion_goal" "text",
    "conversion_value" numeric(10,2),
    "leads" integer,
    "qualified_leads" integer,
    "calls" integer,
    "appointments" integer,
    "form_fills" integer,
    "cost_per_lead" numeric(10,2),
    "cost_per_acquisition" numeric(10,2),
    "estimated_revenue" numeric(10,2),
    "video_views" integer,
    "likes" integer,
    "shares" integer,
    "comments" integer,
    "saves" integer,
    "followers_gained" integer,
    "engagement_rate" numeric(5,2),
    "watch_time_seconds" integer,
    "profile_visits" integer,
    "cost_per_view" numeric(10,4),
    "cost_per_engagement" numeric(10,4),
    "cost_per_follower" numeric(10,2),
    CONSTRAINT "campaign_metrics_appointments_check" CHECK (("appointments" >= 0)),
    CONSTRAINT "campaign_metrics_calls_check" CHECK (("calls" >= 0)),
    CONSTRAINT "campaign_metrics_clicks_check" CHECK (("clicks" >= 0)),
    CONSTRAINT "campaign_metrics_comments_check" CHECK (("comments" >= 0)),
    CONSTRAINT "campaign_metrics_conversion_goal_check" CHECK (("conversion_goal" = ANY (ARRAY['revenue'::"text", 'leads'::"text", 'calls'::"text", 'appointments'::"text", 'form_fills'::"text", 'downloads'::"text", 'signups'::"text", 'demo_requests'::"text", 'other'::"text"]))),
    CONSTRAINT "campaign_metrics_conversions_check" CHECK (("conversions" >= 0)),
    CONSTRAINT "campaign_metrics_cpc_check" CHECK (("cpc" >= (0)::numeric)),
    CONSTRAINT "campaign_metrics_ctr_check" CHECK ((("ctr" >= (0)::numeric) AND ("ctr" <= (100)::numeric))),
    CONSTRAINT "campaign_metrics_engagement_rate_check" CHECK ((("engagement_rate" >= (0)::numeric) AND ("engagement_rate" <= (100)::numeric))),
    CONSTRAINT "campaign_metrics_followers_gained_check" CHECK (("followers_gained" >= 0)),
    CONSTRAINT "campaign_metrics_form_fills_check" CHECK (("form_fills" >= 0)),
    CONSTRAINT "campaign_metrics_import_method_check" CHECK (("import_method" = ANY (ARRAY['manual'::"text", 'csv'::"text", 'api'::"text"]))),
    CONSTRAINT "campaign_metrics_impressions_check" CHECK (("impressions" >= 0)),
    CONSTRAINT "campaign_metrics_leads_check" CHECK (("leads" >= 0)),
    CONSTRAINT "campaign_metrics_likes_check" CHECK (("likes" >= 0)),
    CONSTRAINT "campaign_metrics_profile_visits_check" CHECK (("profile_visits" >= 0)),
    CONSTRAINT "campaign_metrics_qualified_leads_check" CHECK (("qualified_leads" >= 0)),
    CONSTRAINT "campaign_metrics_revenue_check" CHECK (("revenue" >= (0)::numeric)),
    CONSTRAINT "campaign_metrics_saves_check" CHECK (("saves" >= 0)),
    CONSTRAINT "campaign_metrics_shares_check" CHECK (("shares" >= 0)),
    CONSTRAINT "campaign_metrics_source_check" CHECK (("source" = ANY (ARRAY['google_ads'::"text", 'meta_ads'::"text", 'linkedin_ads'::"text", 'manual'::"text", 'other'::"text"]))),
    CONSTRAINT "campaign_metrics_spend_check" CHECK (("spend" >= (0)::numeric)),
    CONSTRAINT "campaign_metrics_video_views_check" CHECK (("video_views" >= 0)),
    CONSTRAINT "campaign_metrics_watch_time_seconds_check" CHECK (("watch_time_seconds" >= 0))
);


ALTER TABLE "public"."campaign_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."campaign_metrics" IS 'Enhanced to support three-tier funnel: Engagement (video views, likes, shares) → Conversions (leads, calls) → Revenue. 90% of SMEs use social/video where engagement precedes conversions.';



COMMENT ON COLUMN "public"."campaign_metrics"."spend" IS 'Total campaign spend (required, must be >= 0)';



COMMENT ON COLUMN "public"."campaign_metrics"."revenue" IS 'Total revenue generated (optional, must be >= 0)';



COMMENT ON COLUMN "public"."campaign_metrics"."source" IS 'Data source: google_ads, meta_ads, linkedin_ads, manual, other';



COMMENT ON COLUMN "public"."campaign_metrics"."import_method" IS 'How data was imported: manual, csv, api';



COMMENT ON COLUMN "public"."campaign_metrics"."raw_data" IS 'Original CSV/API data for reference (JSONB)';



COMMENT ON COLUMN "public"."campaign_metrics"."conversion_goal" IS 'Primary optimization goal: revenue (tracked sales), leads (form fills/calls), calls, appointments, etc.';



COMMENT ON COLUMN "public"."campaign_metrics"."conversion_value" IS 'Estimated value per conversion. E.g., avg deal value = $5000, so each lead = $5000 estimated revenue';



COMMENT ON COLUMN "public"."campaign_metrics"."leads" IS 'Total leads generated (form fills, contact requests, downloads)';



COMMENT ON COLUMN "public"."campaign_metrics"."qualified_leads" IS 'Subset of leads that meet qualification criteria (SQL/MQL)';



COMMENT ON COLUMN "public"."campaign_metrics"."calls" IS 'Phone calls generated from campaign (tracked via call tracking)';



COMMENT ON COLUMN "public"."campaign_metrics"."appointments" IS 'Booked appointments/demos from campaign';



COMMENT ON COLUMN "public"."campaign_metrics"."form_fills" IS 'Contact form submissions';



COMMENT ON COLUMN "public"."campaign_metrics"."cost_per_lead" IS 'Spend / Leads (auto-calculated or manual)';



COMMENT ON COLUMN "public"."campaign_metrics"."cost_per_acquisition" IS 'Spend / Conversions (qualified leads or customers)';



COMMENT ON COLUMN "public"."campaign_metrics"."estimated_revenue" IS 'Conversions × Conversion Value (when actual revenue unknown)';



COMMENT ON COLUMN "public"."campaign_metrics"."video_views" IS 'Total video views (YouTube, TikTok, Instagram Reels, LinkedIn videos)';



COMMENT ON COLUMN "public"."campaign_metrics"."likes" IS 'Total likes/reactions on content';



COMMENT ON COLUMN "public"."campaign_metrics"."shares" IS 'Total shares/reposts/retweets';



COMMENT ON COLUMN "public"."campaign_metrics"."comments" IS 'Total comments on content';



COMMENT ON COLUMN "public"."campaign_metrics"."saves" IS 'Total saves/bookmarks (strong intent signal)';



COMMENT ON COLUMN "public"."campaign_metrics"."followers_gained" IS 'Net new followers from campaign';



COMMENT ON COLUMN "public"."campaign_metrics"."engagement_rate" IS 'Percentage engagement (likes + shares + comments) / impressions × 100';



COMMENT ON COLUMN "public"."campaign_metrics"."watch_time_seconds" IS 'Total watch time in seconds for video content';



COMMENT ON COLUMN "public"."campaign_metrics"."profile_visits" IS 'Profile visits generated from content';



COMMENT ON COLUMN "public"."campaign_metrics"."cost_per_view" IS 'Spend / Video Views (auto-calculated)';



COMMENT ON COLUMN "public"."campaign_metrics"."cost_per_engagement" IS 'Spend / (Likes + Shares + Comments) (auto-calculated)';



COMMENT ON COLUMN "public"."campaign_metrics"."cost_per_follower" IS 'Spend / Followers Gained (auto-calculated)';



CREATE TABLE IF NOT EXISTS "public"."campaign_plan_prerequisites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prerequisite_text" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_plan_prerequisites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "client_id" "uuid",
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "budget_cents" integer DEFAULT 0,
    "spent_cents" integer DEFAULT 0,
    "objectives" "jsonb" DEFAULT '{}'::"jsonb",
    "metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "start_date" "date",
    "end_date" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "target_audience" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "updated_by" "uuid",
    "campaign_type" "text",
    "marketing_channels" "jsonb" DEFAULT '[]'::"jsonb",
    "content_pillars" "jsonb" DEFAULT '[]'::"jsonb",
    "target_personas" "jsonb" DEFAULT '[]'::"jsonb",
    "success_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "competitor_context" "text",
    "geographic_target" "text",
    "priority_level" "text" DEFAULT 'medium'::"text",
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "campaign_template_id" "uuid",
    "budget" numeric GENERATED ALWAYS AS ((("budget_cents")::numeric / (100)::numeric)) STORED,
    "spent" numeric GENERATED ALWAYS AS ((("spent_cents")::numeric / (100)::numeric)) STORED,
    "conversions" integer DEFAULT 0,
    "reach" integer DEFAULT 0,
    "impressions" integer DEFAULT 0,
    "click_through_rate" numeric DEFAULT 0,
    "cost_per_click" numeric DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "campaigns_budget_cents_check" CHECK (("budget_cents" >= 0)),
    CONSTRAINT "campaigns_priority_level_check" CHECK (("priority_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "campaigns_spent_cents_check" CHECK (("spent_cents" >= 0)),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'planned'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaigns"."status" IS 'Campaign lifecycle status: draft, active, paused, completed';



COMMENT ON COLUMN "public"."campaigns"."objectives" IS 'Campaign objectives, KPIs, and additional metadata stored as JSONB';



COMMENT ON COLUMN "public"."campaigns"."description" IS 'Brief description of campaign goals and approach';



COMMENT ON COLUMN "public"."campaigns"."target_audience" IS 'Target audience demographics, interests, and behaviors';



COMMENT ON COLUMN "public"."campaigns"."archived_at" IS 'Timestamp when the resource was archived (soft deleted)';



COMMENT ON COLUMN "public"."campaigns"."archived_by" IS 'User who archived the resource';



COMMENT ON COLUMN "public"."campaigns"."archive_reason" IS 'Reason for archiving the resource';



COMMENT ON COLUMN "public"."campaigns"."is_archived" IS 'Computed field indicating if resource is archived';



COMMENT ON COLUMN "public"."campaigns"."campaign_type" IS 'AI-generated campaign type - no constraints to allow flexibility in LLM outputs. Common values include: awareness, consideration, conversion, retention, brand_awareness, lead_generation, etc.';



COMMENT ON COLUMN "public"."campaigns"."marketing_channels" IS 'JSONB array of marketing channels to be used';



COMMENT ON COLUMN "public"."campaigns"."content_pillars" IS 'Key content themes for Content Agent';



COMMENT ON COLUMN "public"."campaigns"."target_personas" IS 'Array of persona IDs this campaign targets';



COMMENT ON COLUMN "public"."campaigns"."success_metrics" IS 'KPIs and success criteria: {"primary_kpi": "leads", "target_value": 100, "secondary_kpis": [...]}';



COMMENT ON COLUMN "public"."campaigns"."competitor_context" IS 'Competitive landscape information';



COMMENT ON COLUMN "public"."campaigns"."geographic_target" IS 'JSONB object with countries, regions, cities arrays';



COMMENT ON COLUMN "public"."campaigns"."priority_level" IS 'Priority from 1 (lowest) to 5 (highest) for sorting and resource allocation';



COMMENT ON COLUMN "public"."campaigns"."tags" IS 'Flexible tags for categorization';



COMMENT ON COLUMN "public"."campaigns"."metadata" IS 'Stores full campaign plan data including ICE scores, prerequisites, risk factors, deployment frameworks, and A/B testing recommendations. Used for AI-generated plans with status="planned".';



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "industry" "text",
    "website" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "status" "text" DEFAULT 'active'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON TABLE "public"."clients" IS 'Agency clients with RLS policies for org-based access control';



COMMENT ON COLUMN "public"."clients"."slug" IS 'URL-safe identifier auto-generated from name. Enforces uniqueness per organization.';



CREATE TABLE IF NOT EXISTS "public"."content_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "session_id" "uuid",
    "title" "text" NOT NULL,
    "executive_summary" "text",
    "content_pillars" "jsonb" DEFAULT '[]'::"jsonb",
    "content_calendar" "jsonb" DEFAULT '{}'::"jsonb",
    "channel_distribution" "jsonb" DEFAULT '{}'::"jsonb",
    "content_types" "jsonb" DEFAULT '{}'::"jsonb",
    "target_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archive_reason" "text",
    "archived_by" "uuid",
    CONSTRAINT "content_plans_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."content_plans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content_plans"."archived_at" IS 'Timestamp when record was archived. NULL = active, NOT NULL = archived. Standardized pattern as of migration 091.';



CREATE TABLE IF NOT EXISTS "public"."core_business_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "company_name" character varying(255) NOT NULL,
    "website" character varying(255),
    "industry" "public"."industry_enum",
    "company_size" "public"."company_size_enum",
    "geography" "text"[],
    "business_model" "public"."business_model_enum",
    "company_stage" "public"."company_stage_enum",
    "funding_status" "public"."funding_status_enum",
    "target_market" "text"[],
    "main_products" "text"[],
    "key_competitors" "text"[],
    "tech_stack" "text"[],
    "annual_revenue" character varying(50),
    "marketing_budget" character varying(50),
    "data_completeness_score" integer DEFAULT 0,
    "last_manual_update" timestamp with time zone,
    "last_ai_update" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "learning_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "business_metrics" "jsonb" DEFAULT '{"product": {}, "financial": {}, "marketing": {}, "operational": {}}'::"jsonb",
    "client_id" "uuid",
    CONSTRAINT "core_business_data_data_completeness_score_check" CHECK ((("data_completeness_score" >= 0) AND ("data_completeness_score" <= 100)))
);


ALTER TABLE "public"."core_business_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."core_business_data" IS 'RLS optimized in Migration 139 (2025-10-24): Auth functions wrapped in SELECT, policies targeted to specific roles';



COMMENT ON COLUMN "public"."core_business_data"."geography" IS 'Array of ISO country codes or region names';



COMMENT ON COLUMN "public"."core_business_data"."data_completeness_score" IS 'Percentage of core fields filled (0-100)';



COMMENT ON COLUMN "public"."core_business_data"."learning_metadata" IS 'Tracks which agent learned each field, when, and with what confidence. Structure: {"field_name": {"learned_by": "agent_type", "learned_at": "timestamp", "confidence": 0.9}}';



COMMENT ON COLUMN "public"."core_business_data"."business_metrics" IS 'Categorized business metrics storage with LLM-guided normalization.

Structure:
{
  "financial": {
    "churn_rate": {
      "value": "14%",
      "numeric_value": 14.0,
      "value_type": "percentage",
      "unit": "%",
      "current": "14%",
      "previous": "8%",
      "trend": "increasing",
      "context": "increased over last year",
      "aliases": ["churn", "customer_churn", "churnrate"],
      "confidence": 1.0,
      "learned_by": "strategy",
      "learned_at": "2025-10-23T15:22:39+00:00",
      "version": 1
    }
  },
  "marketing": {
    "email_open_rate": {
      "value": "22%",
      "numeric_value": 22.0,
      "value_type": "percentage",
      "unit": "%",
      "confidence": 1.0,
      "learned_by": "content",
      "learned_at": "2025-10-24T10:00:00+00:00",
      "version": 1
    }
  },
  "product": {},
  "operational": {}
}

Categories:
- financial: Revenue, costs, churn, profitability, runway, burn rate, ARR/MRR
- marketing: Engagement, reach, conversion, awareness, open rates, CTR
- product: Adoption, satisfaction, retention, NPS, feature usage
- operational: Efficiency, velocity, quality, capacity, uptime, response time

Normalization: LLM normalizes metric names to snake_case (churn → churn_rate)
Deduplication: Aliases array enables search/merging of similar metrics
';



COMMENT ON COLUMN "public"."core_business_data"."client_id" IS 'Optional: NULL for SME users, specific client UUID for agency users managing multiple clients';



CREATE TABLE IF NOT EXISTS "public"."customer_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "personas" "jsonb" DEFAULT '[]'::"jsonb",
    "pain_points" "jsonb" DEFAULT '[]'::"jsonb",
    "jobs_to_be_done" "jsonb" DEFAULT '[]'::"jsonb",
    "customer_journey" "jsonb" DEFAULT '{}'::"jsonb",
    "buying_behaviors" "jsonb" DEFAULT '[]'::"jsonb",
    "decision_factors" "jsonb" DEFAULT '[]'::"jsonb",
    "objections" "jsonb" DEFAULT '[]'::"jsonb",
    "demographic_insights" "jsonb" DEFAULT '{}'::"jsonb",
    "psychographic_insights" "jsonb" DEFAULT '{}'::"jsonb",
    "confidence_score" double precision,
    "source_agent" "text",
    "extraction_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "client_id" "uuid",
    CONSTRAINT "customer_intelligence_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision)))
);


ALTER TABLE "public"."customer_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_intelligence" IS 'RLS optimized in Migration 140 (2025-10-24): Fixed legacy policy names for auth RLS initplan optimization';



COMMENT ON COLUMN "public"."customer_intelligence"."client_id" IS 'Optional: NULL for SME users, specific client UUID for agency users managing multiple clients';



CREATE TABLE IF NOT EXISTS "public"."dashboard_recommendation_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "data_hash" character varying(16) NOT NULL,
    "recommendations" "jsonb" NOT NULL,
    "overall_assessment" "text",
    "confidence" character varying(10),
    "context_summary" "jsonb",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cache_expires_at" timestamp with time zone NOT NULL,
    "generation_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dashboard_recommendation_cache_confidence_check" CHECK ((("confidence")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::"text"[])))
);


ALTER TABLE "public"."dashboard_recommendation_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."dashboard_recommendation_cache" IS 'Caches LLM-generated dashboard recommendations to reduce API latency and costs';



COMMENT ON COLUMN "public"."dashboard_recommendation_cache"."data_hash" IS 'SHA256 hash of user metrics and business context for cache invalidation';



COMMENT ON COLUMN "public"."dashboard_recommendation_cache"."recommendations" IS 'Array of personalized next-step recommendations with agent routing';



COMMENT ON COLUMN "public"."dashboard_recommendation_cache"."overall_assessment" IS 'LLM executive summary of user marketing progress';



COMMENT ON COLUMN "public"."dashboard_recommendation_cache"."generation_time_ms" IS 'LLM generation time in milliseconds for performance monitoring';



CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid",
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_size" integer,
    "mime_type" "text",
    "storage_path" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enterprise_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "strength" numeric(3,2) DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "org_id" "uuid" NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "updated_by" "uuid",
    CONSTRAINT "enterprise_relationships_relationship_type_check" CHECK (("relationship_type" = ANY (ARRAY['targets'::"text", 'uses'::"text", 'implements'::"text", 'belongs_to'::"text", 'created_by'::"text", 'derived_from'::"text", 'validates'::"text", 'conflicts_with'::"text", 'depends_on'::"text", 'informs'::"text", 'optimizes'::"text", 'measures'::"text"]))),
    CONSTRAINT "enterprise_relationships_source_type_check" CHECK (("source_type" = ANY (ARRAY['persona'::"text", 'strategy'::"text", 'campaign'::"text", 'content'::"text", 'insight'::"text", 'client'::"text", 'organization'::"text", 'user'::"text", 'marketing_strategy'::"text"]))),
    CONSTRAINT "enterprise_relationships_strength_check" CHECK ((("strength" >= (0)::numeric) AND ("strength" <= (1)::numeric))),
    CONSTRAINT "enterprise_relationships_target_type_check" CHECK (("target_type" = ANY (ARRAY['persona'::"text", 'strategy'::"text", 'campaign'::"text", 'content'::"text", 'insight'::"text", 'client'::"text", 'organization'::"text", 'user'::"text", 'marketing_strategy'::"text"])))
);


ALTER TABLE "public"."enterprise_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insight_extraction_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "agent_type" "text" NOT NULL,
    "extraction_date" "date" DEFAULT CURRENT_DATE,
    "total_extractions" integer DEFAULT 0,
    "successful_parses" integer DEFAULT 0,
    "approved_insights" integer DEFAULT 0,
    "rejected_insights" integer DEFAULT 0,
    "empty_responses" integer DEFAULT 0,
    "avg_confidence" numeric(3,2),
    "total_cost" numeric(10,4) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."insight_extraction_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."insight_extraction_metrics" IS 'Tracks quality metrics for AI insight extraction across all agents';



CREATE TABLE IF NOT EXISTS "public"."intelligence_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "conflict_values" "jsonb" NOT NULL,
    "resolution" "jsonb",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "intelligence_conflicts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."intelligence_conflicts" OWNER TO "postgres";


COMMENT ON TABLE "public"."intelligence_conflicts" IS 'RLS optimized in Migration 140 (2025-10-24): Fixed legacy policy names, removed duplicate permissive policies';



COMMENT ON COLUMN "public"."intelligence_conflicts"."conflict_values" IS 'Array of {value, source, confidence, timestamp} objects';



CREATE TABLE IF NOT EXISTS "public"."invitation_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "organization_type" "text" NOT NULL,
    "use_case" "text",
    "referral_source" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitation_requests_organization_type_check" CHECK (("organization_type" = ANY (ARRAY['SME'::"text", 'AGENCY'::"text"]))),
    CONSTRAINT "invitation_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."invitation_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."invitation_requests" IS 'Stores founding member invitation requests for manual review. Approved requests get manually added to alpha_invites table.';



CREATE TABLE IF NOT EXISTS "public"."market_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "market_trends" "jsonb" DEFAULT '[]'::"jsonb",
    "opportunities" "jsonb" DEFAULT '[]'::"jsonb",
    "threats" "jsonb" DEFAULT '[]'::"jsonb",
    "market_size_estimate" "text",
    "growth_rate_estimate" "text",
    "competitive_advantages" "jsonb" DEFAULT '[]'::"jsonb",
    "competitive_weaknesses" "jsonb" DEFAULT '[]'::"jsonb",
    "market_share_estimate" "text",
    "confidence_score" double precision,
    "source_agent" "text",
    "extraction_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "client_id" "uuid",
    CONSTRAINT "market_intelligence_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision)))
);


ALTER TABLE "public"."market_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "public"."market_intelligence" IS 'RLS optimized in Migration 140 (2025-10-24): Fixed legacy policy names for auth RLS initplan optimization';



COMMENT ON COLUMN "public"."market_intelligence"."client_id" IS 'Optional: NULL for SME users, specific client UUID for agency users managing multiple clients';



CREATE TABLE IF NOT EXISTS "public"."marketing_strategy_brand_guidelines" (
    "strategy_id" "uuid" NOT NULL,
    "brand_guidelines_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketing_strategy_brand_guidelines" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."notification_push_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "push_device_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "apns_id" "text",
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempted_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_push_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'delivered'::"text", 'failed'::"text", 'invalid_device'::"text"])))
);


ALTER TABLE "public"."notification_push_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_push_deliveries" IS 'Per-device delivery queue for remote mobile notifications. Prevents duplicate sends across retries and multiple devices.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "resource_type" "text",
    "resource_id" "uuid",
    "action_url" "text",
    "is_read" boolean DEFAULT false,
    "is_email_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    CONSTRAINT "valid_notification_type" CHECK (("type" = ANY (ARRAY['approval_request'::"text", 'approval_resolved'::"text", 'approval_changes_requested'::"text", 'comment'::"text", 'mention'::"text", 'comment_resolved'::"text", 'task_assigned'::"text", 'task_completed'::"text", 'task_due_soon'::"text", 'task_status_changed'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subscription_tier" "text" DEFAULT 'solo'::"text",
    "subscription_status" "text" DEFAULT 'active'::"text",
    "max_users" integer DEFAULT 5,
    "max_campaigns" integer DEFAULT 10,
    "max_clients" integer DEFAULT 1,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "gemini_monthly_limit" numeric(10,2) DEFAULT 50.00,
    "gemini_monthly_usage" numeric(10,2) DEFAULT 0.00,
    "gemini_usage_reset_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "trial_ends_at" timestamp with time zone,
    "subscription_period_end" timestamp with time zone,
    "grace_period_started_at" timestamp with time zone,
    "grace_period_ends_at" timestamp with time zone,
    CONSTRAINT "organizations_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'solo'::"text", 'team'::"text", 'agency'::"text", 'starter'::"text", 'professional'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "organizations_type_check" CHECK (("type" = ANY (ARRAY['SME'::"text", 'AGENCY'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."gemini_monthly_limit" IS 'Monthly spending limit for Gemini API calls in USD';



COMMENT ON COLUMN "public"."organizations"."gemini_monthly_usage" IS 'Current month Gemini API usage in USD';



COMMENT ON COLUMN "public"."organizations"."gemini_usage_reset_date" IS 'Date when monthly usage was last reset';



CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "metric_type" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "metric_unit" "text" NOT NULL,
    "execution_time_ms" numeric,
    "memory_usage_mb" numeric,
    "rows_affected" integer,
    "cache_hit" boolean,
    "error_count" integer DEFAULT 0,
    "success_count" integer DEFAULT 1,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "measured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."performance_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."performance_metrics" IS 'Performance monitoring and metrics collection for Phase 4 Database-First architecture';



CREATE TABLE IF NOT EXISTS "public"."permission_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "resource_title" "text",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."persona_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "persona_id" "uuid",
    "session_id" "text" NOT NULL,
    "org_id" "uuid",
    "interaction_type" "text",
    "context" "text",
    "messages" "jsonb" DEFAULT '[]'::"jsonb",
    "insights" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "duration_minutes" integer,
    "satisfaction_rating" integer,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "persona_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['interview'::"text", 'feedback'::"text", 'validation'::"text", 'brainstorm'::"text"]))),
    CONSTRAINT "persona_interactions_satisfaction_rating_check" CHECK ((("satisfaction_rating" >= 1) AND ("satisfaction_rating" <= 5)))
);


ALTER TABLE "public"."persona_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."persona_interactions" IS 'Records interactions and conversations with synthetic personas';



CREATE TABLE IF NOT EXISTS "public"."persona_interview_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "persona_id" "uuid",
    "conversation_id" "uuid",
    "interview_stage" "text",
    "topics_covered" "text"[],
    "insights_count" integer DEFAULT 0,
    "quality_score" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    "is_archived" boolean GENERATED ALWAYS AS (("archived_at" IS NOT NULL)) STORED,
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "persona_interview_sessions_interview_stage_check" CHECK (("interview_stage" = ANY (ARRAY['initial'::"text", 'deep_dive'::"text", 'validation'::"text"]))),
    CONSTRAINT "persona_interview_sessions_quality_score_check" CHECK ((("quality_score" >= (0)::double precision) AND ("quality_score" <= (1)::double precision)))
);


ALTER TABLE "public"."persona_interview_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."persona_interview_sessions" IS 'Tracks interview sessions with synthetic personas for insights collection';



CREATE TABLE IF NOT EXISTS "public"."push_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_token" "text" NOT NULL,
    "platform" "text" DEFAULT 'ios'::"text" NOT NULL,
    "bundle_id" "text",
    "environment" "text" DEFAULT 'development'::"text" NOT NULL,
    "authorization_status" "text" DEFAULT 'notDetermined'::"text" NOT NULL,
    "background_refresh_enabled" boolean DEFAULT false NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "disabled_at" timestamp with time zone,
    "last_error" "text",
    CONSTRAINT "push_devices_environment_check" CHECK (("environment" = ANY (ARRAY['development'::"text", 'sandbox'::"text", 'production'::"text"]))),
    CONSTRAINT "push_devices_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_devices" IS 'Stores mobile push device registrations for authenticated users. Used by native clients to persist APNs/FCM tokens and delivery readiness state.';



COMMENT ON COLUMN "public"."push_devices"."is_active" IS 'Whether the backend should still attempt remote push delivery for this device token.';



COMMENT ON COLUMN "public"."push_devices"."last_error" IS 'Last backend delivery error recorded for this device token.';



CREATE TABLE IF NOT EXISTS "public"."recommendations_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "recommendation_type" "text" NOT NULL,
    "data_hash" "text" NOT NULL,
    "recommendations" "jsonb" NOT NULL,
    "overall_assessment" "text",
    "confidence" "text",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cache_expires_at" timestamp with time zone NOT NULL,
    "refreshed_at" timestamp with time zone DEFAULT "now"(),
    "llm_tokens_used" integer DEFAULT 0,
    "generation_time_ms" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recommendations_cache_confidence_check" CHECK (("confidence" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "recommendations_cache_recommendation_type_check" CHECK (("recommendation_type" = ANY (ARRAY['content'::"text", 'roi'::"text", 'opportunity'::"text", 'campaign_plan'::"text"])))
);


ALTER TABLE "public"."recommendations_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."recommendations_cache" IS 'RLS optimized in Migration 141 (2025-10-24): Removed duplicate SELECT policy, now has single optimized policy';



COMMENT ON COLUMN "public"."recommendations_cache"."recommendation_type" IS 'Type discriminator: content, roi, opportunity, or campaign_plan';



COMMENT ON COLUMN "public"."recommendations_cache"."data_hash" IS 'SHA256 hash of business context for cache invalidation when data changes';



COMMENT ON COLUMN "public"."recommendations_cache"."recommendations" IS 'JSONB array of recommendation objects (structure varies by type)';



COMMENT ON COLUMN "public"."recommendations_cache"."cache_expires_at" IS 'TTL expiration - varies by type (content: 7d, roi: on-demand, opportunity: 24h, campaign_plan: 2h)';



CREATE TABLE IF NOT EXISTS "public"."resource_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "resource_title" "text",
    "activity_type" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "actor_name" "text",
    "actor_role" "text",
    "comment" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "resource_activity_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'archived'::"text", 'restored'::"text", 'deleted'::"text", 'approval_requested'::"text", 'approved'::"text", 'rejected'::"text", 'changes_requested'::"text", 'published'::"text", 'unpublished'::"text", 'viewed'::"text", 'exported'::"text", 'shared'::"text"])))
);


ALTER TABLE "public"."resource_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_resolved" boolean DEFAULT false,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "mentioned_users" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resource_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid",
    "permission_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_permissions" IS 'Maps roles to permissions. Updated 2025-12-03 with full permission assignments for all 15 roles.';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "org_type" "text",
    "is_system" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "roles_org_type_check" CHECK (("org_type" = ANY (ARRAY['SME'::"text", 'AGENCY'::"text", 'BOTH'::"text"])))
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."roles" IS 'System roles for RBAC. 16 roles total:
- 5 SME roles (sme_owner, sme_marketing_director, sme_marketing_manager, sme_analyst, sme_viewer)
- 11 Agency roles (agency_owner, agency_admin, agency_strategist, agency_account_manager,
  agency_campaign_manager, agency_analyst, agency_creative, agency_client_viewer,
  agency_freelancer, agency_viewer, agency_client)

agency_client is for external client contacts who review/approve work via Client View.';



CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "task_type" "text" NOT NULL,
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "assigned_by" "uuid" NOT NULL,
    "assigned_to" "uuid" NOT NULL,
    "due_date" timestamp with time zone,
    "related_resource_type" "text",
    "related_resource_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "valid_task_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "valid_task_status" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'review'::"text", 'done'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "valid_task_type" CHECK (("task_type" = ANY (ARRAY['content_creation'::"text", 'review'::"text", 'analysis'::"text", 'campaign_setup'::"text", 'strategy'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."task_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invitation_token" "text" NOT NULL,
    "client_id" "uuid",
    "status" "text" NOT NULL,
    "expires_at" timestamp without time zone NOT NULL,
    "accepted_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "client_ids" "uuid"[],
    CONSTRAINT "team_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."team_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_invitations" IS 'Team member invitations for multi-user organizations. Enables owners/admins to invite users via email with specific roles.';



COMMENT ON COLUMN "public"."team_invitations"."invitation_token" IS 'Secure random token (generated with Python secrets.token_urlsafe(32)). One-time use only.';



COMMENT ON COLUMN "public"."team_invitations"."client_id" IS 'For account managers only: UUID of client they can access. NULL for admin/owner roles.';



COMMENT ON COLUMN "public"."team_invitations"."status" IS 'Invitation lifecycle: pending (sent) → accepted (user joined) OR expired (7+ days) OR revoked (cancelled by admin)';



COMMENT ON COLUMN "public"."team_invitations"."client_ids" IS 'Array of client IDs the invited user will be assigned to. NULL or empty means all clients.';



CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "action" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "org_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "feedback_text" "text" NOT NULL,
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "assigned_to" "uuid",
    "resolution_notes" "text",
    "fixed_in_commit" "text",
    "fixed_at" timestamp with time zone,
    "fixed_by" "uuid",
    "related_feedback_ids" "uuid"[],
    CONSTRAINT "user_feedback_category_check" CHECK (("category" = ANY (ARRAY['general-feedback'::"text", 'agent-performance'::"text", 'feature-request'::"text", 'bug-report'::"text", 'user-experience'::"text", 'data-accuracy'::"text"]))),
    CONSTRAINT "user_feedback_feedback_text_check" CHECK ((("char_length"("feedback_text") >= 10) AND ("char_length"("feedback_text") <= 2000))),
    CONSTRAINT "user_feedback_org_type_check" CHECK (("org_type" = ANY (ARRAY['sme'::"text", 'agency'::"text"]))),
    CONSTRAINT "user_feedback_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "user_feedback_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'fixed'::"text", 'wont_fix'::"text", 'duplicate'::"text", 'need_more_info'::"text"])))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_feedback" IS 'User feedback and bug reports with status tracking. Use mark_feedback_fixed() to mark bugs as resolved.';



COMMENT ON COLUMN "public"."user_feedback"."org_type" IS 'Denormalized organization type for analytics (sme or agency)';



COMMENT ON COLUMN "public"."user_feedback"."metadata" IS 'Extensible JSONB field for referrer, viewport, agent context, etc.';



COMMENT ON COLUMN "public"."user_feedback"."status" IS 'Current status: pending, in_progress, fixed, wont_fix, duplicate, need_more_info';



COMMENT ON COLUMN "public"."user_feedback"."priority" IS 'Priority level: low, medium, high, critical';



COMMENT ON COLUMN "public"."user_feedback"."fixed_in_commit" IS 'Git commit SHA where the bug was fixed (e.g., 8af020f)';



CREATE TABLE IF NOT EXISTS "public"."user_role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "org_id" "uuid",
    "role_id" "uuid",
    "client_id" "uuid",
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_role_assignments" OWNER TO "postgres";



ALTER TABLE ONLY "public"."agent_context_profiles"
    ADD CONSTRAINT "agent_context_profiles_agent_name_key" UNIQUE ("agent_name");



ALTER TABLE ONLY "public"."agent_context_profiles"
    ADD CONSTRAINT "agent_context_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alpha_invites"
    ADD CONSTRAINT "alpha_invites_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."alpha_invites"
    ADD CONSTRAINT "alpha_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cache_refresh_queue"
    ADD CONSTRAINT "cache_refresh_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_alerts"
    ADD CONSTRAINT "campaign_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_org_client_key" UNIQUE ("org_id", "client_id");



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_org_id_campaign_name_metric_date_source_key" UNIQUE ("org_id", "campaign_name", "metric_date", "source");



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_plan_prerequisites"
    ADD CONSTRAINT "campaign_plan_prerequisites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_slug_key" UNIQUE ("org_id", "slug");



COMMENT ON CONSTRAINT "clients_org_id_slug_key" ON "public"."clients" IS 'Prevents duplicate client names within the same organization (case-insensitive via slug).';



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_org_client_key" UNIQUE ("org_id", "client_id");



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_org_client_key" UNIQUE ("org_id", "client_id");



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_recommendation_cache"
    ADD CONSTRAINT "dashboard_recommendation_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enterprise_relationships"
    ADD CONSTRAINT "enterprise_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enterprise_relationships"
    ADD CONSTRAINT "enterprise_relationships_source_type_source_id_target_type__key" UNIQUE ("source_type", "source_id", "target_type", "target_id", "relationship_type");



ALTER TABLE ONLY "public"."gemini_cost_tracking"
    ADD CONSTRAINT "gemini_cost_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insight_extraction_metrics"
    ADD CONSTRAINT "insight_extraction_metrics_org_id_agent_type_extraction_dat_key" UNIQUE ("org_id", "agent_type", "extraction_date");



ALTER TABLE ONLY "public"."insight_extraction_metrics"
    ADD CONSTRAINT "insight_extraction_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_requests"
    ADD CONSTRAINT "invitation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_org_client_key" UNIQUE ("org_id", "client_id");



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_strategy_brand_guidelines"
    ADD CONSTRAINT "marketing_strategy_brand_guidelines_pkey" PRIMARY KEY ("strategy_id", "brand_guidelines_id");



ALTER TABLE ONLY "public"."marketing_strategy_personas"
    ADD CONSTRAINT "marketing_strategy_personas_pkey" PRIMARY KEY ("strategy_id", "persona_id");



ALTER TABLE ONLY "public"."notification_push_deliveries"
    ADD CONSTRAINT "notification_push_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_push_deliveries"
    ADD CONSTRAINT "notification_push_deliveries_unique_notification_device" UNIQUE ("notification_id", "push_device_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



COMMENT ON CONSTRAINT "organizations_slug_key" ON "public"."organizations" IS 'UNIQUE constraint on slug - automatically indexed, no separate index needed';



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_unique_user_token" UNIQUE ("user_id", "device_token");



ALTER TABLE ONLY "public"."recommendations_cache"
    ADD CONSTRAINT "recommendations_cache_org_id_recommendation_type_data_hash_key" UNIQUE ("org_id", "recommendation_type", "data_hash");



ALTER TABLE ONLY "public"."recommendations_cache"
    ADD CONSTRAINT "recommendations_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_activity"
    ADD CONSTRAINT "resource_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invitation_token_key" UNIQUE ("invitation_token");



COMMENT ON CONSTRAINT "team_invitations_invitation_token_key" ON "public"."team_invitations" IS 'UNIQUE constraint on invitation_token - automatically indexed, no separate index needed';



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "unique_default_per_org" EXCLUDE USING "btree" ("org_id" WITH =) WHERE (("is_default" = true));



ALTER TABLE ONLY "public"."campaign_plan_prerequisites"
    ADD CONSTRAINT "unique_org_plan_prerequisite" UNIQUE ("org_id", "plan_id", "prerequisite_text");



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "unique_session_per_conversation" UNIQUE ("conversation_id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_org_id_role_id_client_id_key" UNIQUE ("user_id", "org_id", "role_id", "client_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



COMMENT ON CONSTRAINT "users_email_key" ON "public"."users" IS 'UNIQUE constraint on email - automatically indexed, no separate index needed';



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_context_profiles"
    ADD CONSTRAINT "agent_context_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_context_profiles"
    ADD CONSTRAINT "agent_context_profiles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_messages"
    ADD CONSTRAINT "agent_messages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "public"."agent_outputs"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "public"."ai_insights"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."ai_insights"
    ADD CONSTRAINT "ai_insights_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."alpha_invites"
    ADD CONSTRAINT "alpha_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_history"
    ADD CONSTRAINT "approval_history_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."brand_guidelines"("id");



ALTER TABLE ONLY "public"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cache_refresh_queue"
    ADD CONSTRAINT "cache_refresh_queue_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_alerts"
    ADD CONSTRAINT "campaign_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."campaign_alerts"
    ADD CONSTRAINT "campaign_alerts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_alerts"
    ADD CONSTRAINT "campaign_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_intelligence"
    ADD CONSTRAINT "campaign_intelligence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_metrics"
    ADD CONSTRAINT "campaign_metrics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_plan_prerequisites"
    ADD CONSTRAINT "campaign_plan_prerequisites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_plan_prerequisites"
    ADD CONSTRAINT "campaign_plan_prerequisites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."agent_conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_plans"
    ADD CONSTRAINT "content_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_business_data"
    ADD CONSTRAINT "core_business_data_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_intelligence"
    ADD CONSTRAINT "customer_intelligence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."dashboard_recommendation_cache"
    ADD CONSTRAINT "dashboard_recommendation_cache_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enterprise_relationships"
    ADD CONSTRAINT "enterprise_relationships_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enterprise_relationships"
    ADD CONSTRAINT "enterprise_relationships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."enterprise_relationships"
    ADD CONSTRAINT "enterprise_relationships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."gemini_cost_tracking"
    ADD CONSTRAINT "gemini_cost_tracking_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insight_extraction_metrics"
    ADD CONSTRAINT "insight_extraction_metrics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."intelligence_conflicts"
    ADD CONSTRAINT "intelligence_conflicts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."invitation_requests"
    ADD CONSTRAINT "invitation_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategies"
    ADD CONSTRAINT "marketing_strategies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategy_brand_guidelines"
    ADD CONSTRAINT "marketing_strategy_brand_guidelines_brand_guidelines_id_fkey" FOREIGN KEY ("brand_guidelines_id") REFERENCES "public"."brand_guidelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategy_brand_guidelines"
    ADD CONSTRAINT "marketing_strategy_brand_guidelines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategy_brand_guidelines"
    ADD CONSTRAINT "marketing_strategy_brand_guidelines_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "public"."marketing_strategies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategy_brand_guidelines"
    ADD CONSTRAINT "marketing_strategy_brand_guidelines_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategy_personas"
    ADD CONSTRAINT "marketing_strategy_personas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."marketing_strategy_personas"
    ADD CONSTRAINT "marketing_strategy_personas_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."synthetic_personas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategy_personas"
    ADD CONSTRAINT "marketing_strategy_personas_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "public"."marketing_strategies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_strategy_personas"
    ADD CONSTRAINT "marketing_strategy_personas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notification_push_deliveries"
    ADD CONSTRAINT "notification_push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_push_deliveries"
    ADD CONSTRAINT "notification_push_deliveries_push_device_id_fkey" FOREIGN KEY ("push_device_id") REFERENCES "public"."push_devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."synthetic_personas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."persona_interactions"
    ADD CONSTRAINT "persona_interactions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "public"."synthetic_personas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."persona_interview_sessions"
    ADD CONSTRAINT "persona_interview_sessions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations_cache"
    ADD CONSTRAINT "recommendations_cache_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_activity"
    ADD CONSTRAINT "resource_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."resource_activity"
    ADD CONSTRAINT "resource_activity_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_activity"
    ADD CONSTRAINT "resource_activity_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."resource_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_comments"
    ADD CONSTRAINT "resource_comments_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."synthetic_personas"
    ADD CONSTRAINT "synthetic_personas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "team_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_fixed_by_fkey" FOREIGN KEY ("fixed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");