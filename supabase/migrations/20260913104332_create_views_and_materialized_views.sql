-- ============================================================================
-- create_views_and_materialized_views
-- Views and materialised views. Materialised views cannot use RLS, so their browser-role grants are revoked in grant_data_api_access.
-- ============================================================================





CREATE OR REPLACE VIEW "public"."active_insights" WITH ("security_invoker"='on') AS
 SELECT "id",
    "org_id",
    "user_id",
    "insight_type",
    "source_type",
    "source_agent",
    "session_id",
    "campaign_id",
    "title",
    "content",
    "category",
    "contains_pii",
    "pii_types",
    "pii_confidence",
    "pii_masked_content",
    "confidence_score",
    "validation_status",
    "validated_by",
    "validated_at",
    "rejection_reason",
    "impact_score",
    "usage_count",
    "last_used_at",
    "used_by_agents",
    "created_at",
    "updated_at",
    "expires_at",
    "version",
    "previous_version_id",
    "metadata",
    "archived_at",
    "archived_by",
    "archive_reason",
    "is_archived",
    "created_by",
    "updated_by",
    "extraction_model",
    "extraction_cost"
   FROM "public"."ai_insights"
  WHERE ("archived_at" IS NULL);


ALTER VIEW "public"."active_insights" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_insights" IS 'Active (non-archived) AI insights. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';



CREATE OR REPLACE VIEW "public"."active_marketing_strategies" WITH ("security_invoker"='on') AS
 SELECT "id",
    "campaign_id",
    "value_propositions",
    "key_messages",
    "differentiation_points",
    "elevator_pitches",
    "tone_of_voice",
    "brand_personality",
    "positioning_statement",
    "channel_mix",
    "budget_allocation",
    "content_pillars",
    "estimated_reach",
    "estimated_cost",
    "priority_score",
    "created_at",
    "updated_at",
    "created_by",
    "org_id",
    "metadata",
    "strategy_type",
    "status",
    "title",
    "archived_at",
    "archived_by",
    "archive_reason",
    "is_archived",
    "updated_by"
   FROM "public"."marketing_strategies"
  WHERE ("archived_at" IS NULL);


ALTER VIEW "public"."active_marketing_strategies" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_marketing_strategies" IS 'Active (non-archived) marketing strategies. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';



CREATE OR REPLACE VIEW "public"."active_persona_strategies" WITH ("security_invoker"='on') AS
 SELECT "sp"."id" AS "persona_id",
    "sp"."name" AS "persona_name",
    "sp"."title" AS "persona_title",
    "ms"."id" AS "strategy_id",
    "ms"."title" AS "strategy_title",
    "ms"."status" AS "strategy_status",
    "msp"."is_primary",
    "msp"."messaging_variation"
   FROM (("public"."marketing_strategy_personas" "msp"
     JOIN "public"."synthetic_personas" "sp" ON (("sp"."id" = "msp"."persona_id")))
     JOIN "public"."marketing_strategies" "ms" ON (("ms"."id" = "msp"."strategy_id")))
  WHERE (("sp"."archived_at" IS NULL) AND (("ms"."status")::"text" = 'active'::"text"));


ALTER VIEW "public"."active_persona_strategies" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_persona_strategies" IS 'Links between active personas and strategies. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';



CREATE OR REPLACE VIEW "public"."active_personas" WITH ("security_invoker"='on') AS
 SELECT "id",
    "org_id",
    "name",
    "title",
    "company_name",
    "industry",
    "vertical",
    "company_size",
    "annual_revenue",
    "demographics",
    "goals",
    "pain_points",
    "jobs_to_be_done",
    "current_tools",
    "decision_criteria",
    "objections",
    "preferred_channels",
    "personality_traits",
    "customer_status",
    "satisfaction_score",
    "background_story",
    "key_quote",
    "interaction_history",
    "created_at",
    "updated_at",
    "created_by",
    "tags",
    "ai_personality_prompt",
    "response_style",
    "domain_expertise",
    "buyer_journey",
    "location",
    "insights_summary",
    "archived_at",
    "archived_by",
    "archive_reason",
    "is_archived",
    "updated_by",
    "campaign_id",
    "is_primary"
   FROM "public"."synthetic_personas"
  WHERE ("archived_at" IS NULL);


ALTER VIEW "public"."active_personas" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_personas" IS 'Active (non-archived) personas. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';



CREATE OR REPLACE VIEW "public"."ai_insights_stats" WITH ("security_invoker"='on') AS
 SELECT "org_id",
    "count"(*) AS "total_insights",
    "count"(*) FILTER (WHERE ("validation_status" = 'approved'::"text")) AS "approved_insights",
    "count"(*) FILTER (WHERE ("validation_status" = 'pending'::"text")) AS "pending_insights",
    "count"(*) FILTER (WHERE ("archived_at" IS NULL)) AS "active_insights",
    "count"(*) FILTER (WHERE ("archived_at" IS NOT NULL)) AS "archived_insights"
   FROM "public"."ai_insights"
  GROUP BY "org_id";


ALTER VIEW "public"."ai_insights_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."ai_insights_stats" IS 'Aggregated AI insights statistics by organization. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';



CREATE MATERIALIZED VIEW "public"."approval_requests_enriched" AS
 SELECT "ar"."id",
    "ar"."org_id",
    "ar"."client_id",
    "ar"."resource_type",
    "ar"."resource_id",
    "ar"."status",
    "ar"."requested_by",
    "ar"."assigned_to",
    "ar"."title",
    "ar"."description",
    "ar"."priority",
    "ar"."due_date",
    "ar"."created_at",
    "ar"."updated_at",
    "ar"."resolved_at",
    "ar"."resolved_by",
    "ar"."resolution_note",
    "req"."full_name" AS "requester_name",
    "asg"."full_name" AS "assignee_name",
    "res"."full_name" AS "resolver_name"
   FROM ((("public"."approval_requests" "ar"
     LEFT JOIN "public"."users" "req" ON (("ar"."requested_by" = "req"."id")))
     LEFT JOIN "public"."users" "asg" ON (("ar"."assigned_to" = "asg"."id")))
     LEFT JOIN "public"."users" "res" ON (("ar"."resolved_by" = "res"."id")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."approval_requests_enriched" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."approved_outputs_library" AS
 SELECT "ao"."id",
    "ao"."org_id",
    "ao"."client_id",
    "ao"."agent_type",
    "ao"."output_type",
    "ao"."title",
    "ao"."summary",
    "ao"."content",
    "ao"."version",
    "ao"."approval_status",
    "ao"."approved_at",
    "ao"."approved_by",
    "u"."full_name" AS "approved_by_name",
    "ao"."campaign_id",
    "ao"."confidence_score",
    "ao"."impact_score",
    "ao"."category",
    "ao"."created_at",
    "ao"."updated_at",
    'public'::"text" AS "schema_source"
   FROM ("public"."agent_outputs" "ao"
     LEFT JOIN "public"."users" "u" ON (("ao"."approved_by" = "u"."id")))
  WHERE (("ao"."approval_status" = 'approved'::"text") AND ("ao"."is_archived" = false))
UNION ALL
 SELECT "ao"."id",
    "ao"."org_id",
    "ao"."client_id",
    "ao"."agent_type",
    "ao"."output_type",
    "ao"."title",
    "ao"."summary",
    "ao"."content",
    "ao"."version",
    "ao"."approval_status",
    "ao"."approved_at",
    "ao"."approved_by",
    "u"."full_name" AS "approved_by_name",
    "ao"."campaign_id",
    "ao"."confidence_score",
    "ao"."impact_score",
    "ao"."category",
    "ao"."created_at",
    "ao"."updated_at",
    'agency'::"text" AS "schema_source"
   FROM ("agency"."agent_outputs" "ao"
     LEFT JOIN "public"."users" "u" ON (("ao"."approved_by" = "u"."id")))
  WHERE (("ao"."approval_status" = 'approved'::"text") AND ("ao"."is_archived" = false))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."approved_outputs_library" OWNER TO "postgres";



CREATE MATERIALIZED VIEW "public"."cache_metrics_summary" AS
 SELECT "org_id",
    "count"(*) AS "total_requests",
    "count"(*) FILTER (WHERE ("cached_tokens" > 0)) AS "cached_requests",
    "round"(((("count"(*) FILTER (WHERE ("cached_tokens" > 0)))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "cache_hit_rate_pct",
    "sum"("input_tokens") AS "total_input_tokens",
    "sum"("cached_tokens") AS "total_cached_tokens",
    "sum"("total_cost_usd") AS "total_cost_usd",
    "sum"("cache_savings_usd") AS "total_savings_usd",
    "max"("timestamp") AS "last_request_at"
   FROM "public"."gemini_cost_tracking"
  WHERE ("timestamp" >= ("now"() - '30 days'::interval))
  GROUP BY "org_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."cache_metrics_summary" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."cache_metrics_summary" IS 'Materialized view for cache metrics. Direct API access removed - access via get_cache_cost_metrics() function with RLS enforcement.';



CREATE OR REPLACE VIEW "public"."client_intelligence" WITH ("security_invoker"='on') AS
 SELECT "ci"."id",
    "ci"."org_id",
    "ci"."client_id",
    "c"."name" AS "company_name",
    "c"."slug",
    "c"."industry",
    "c"."website",
    "c"."contact_email",
    "c"."contact_phone",
    "c"."status",
    "c"."settings",
    "ci"."company_size",
    "ci"."company_stage",
    "ci"."business_model",
    "ci"."funding_status",
    "ci"."geography",
    "ci"."target_market",
    "ci"."main_products",
    "ci"."key_competitors",
    "ci"."tech_stack",
    "ci"."current_marketing_channels",
    "ci"."marketing_goals",
    "ci"."annual_revenue",
    "ci"."unique_value_proposition",
    "ci"."marketing_budget",
    "ci"."ai_insights",
    "ci"."persona_patterns",
    "ci"."content_themes",
    "ci"."campaign_preferences",
    "ci"."business_metrics",
    "ci"."learning_metadata",
    "ci"."data_completeness_score",
    "ci"."last_manual_update",
    "ci"."last_ai_update",
    "ci"."last_enriched_at",
    "ci"."conversation_count",
    "ci"."last_interaction_at",
    "ci"."learning_milestones",
    "ci"."created_at",
    "ci"."updated_at",
    "ci"."created_by",
    "ci"."updated_by",
    "ci"."archived_at",
    "ci"."archived_by",
    "ci"."archive_reason",
    "ci"."is_archived"
   FROM ("agency"."client_intelligence" "ci"
     JOIN "agency"."clients" "c" ON (("c"."id" = "ci"."client_id")));


ALTER VIEW "public"."client_intelligence" OWNER TO "postgres";


COMMENT ON VIEW "public"."client_intelligence" IS 'Complete public view of agency client intelligence with all fields from both agency.clients and agency.client_intelligence tables.
Uses security_invoker to respect RLS policies.
Migration 247: Created with all fields.
Migration 250: Added security_invoker to prevent RLS bypass (CRITICAL FIX).';



CREATE MATERIALIZED VIEW "public"."client_metrics_cache" AS
 SELECT "c"."id" AS "client_id",
    "c"."org_id",
    "c"."name" AS "client_name",
    "count"("ca"."id") AS "campaign_count",
    COALESCE("sum"("ca"."spent"), (0)::numeric) AS "total_spend",
    COALESCE("sum"("ca"."budget"), (0)::numeric) AS "total_budget",
    COALESCE("sum"("ca"."conversions"), (0)::bigint) AS "total_conversions",
    "count"(*) FILTER (WHERE ("ca"."status" = 'active'::"text")) AS "active_campaign_count",
    "max"("ca"."updated_at") AS "last_activity",
    "now"() AS "cache_updated_at"
   FROM ("public"."clients" "c"
     LEFT JOIN "public"."campaigns" "ca" ON ((("ca"."client_id" = "c"."id") AND ("ca"."archived_at" IS NULL))))
  WHERE ("c"."archived_at" IS NULL)
  GROUP BY "c"."id", "c"."org_id", "c"."name"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."client_metrics_cache" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."client_metrics_cache" IS 'Materialized view for client metrics. Direct API access removed - access via get_client_dashboard() and related functions with RLS enforcement.';



CREATE OR REPLACE VIEW "public"."daily_gemini_costs" WITH ("security_invoker"='on') AS
 SELECT "date"("timestamp") AS "date",
    "org_id",
    "agent_type",
    "model_name",
    "query_complexity",
    "count"(*) AS "request_count",
    "sum"("input_tokens") AS "total_input_tokens",
    "sum"("output_tokens") AS "total_output_tokens",
    "sum"("cached_tokens") AS "total_cached_tokens",
    "sum"("total_cost_usd") AS "total_cost_usd",
    "sum"("cache_savings_usd") AS "total_savings_usd",
    "avg"("total_cost_usd") AS "avg_cost_per_request"
   FROM "public"."gemini_cost_tracking"
  GROUP BY ("date"("timestamp")), "org_id", "agent_type", "model_name", "query_complexity"
  ORDER BY ("date"("timestamp")) DESC;


ALTER VIEW "public"."daily_gemini_costs" OWNER TO "postgres";


COMMENT ON VIEW "public"."daily_gemini_costs" IS 'Daily aggregated Gemini API costs by organization. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';


CREATE MATERIALIZED VIEW "public"."mv_output_hub_summary" AS
 WITH "agent_output_stats" AS (
         SELECT "agent_outputs"."org_id",
            "agent_outputs"."agent_type",
            "agent_outputs"."status",
            'agent_outputs'::"text" AS "source_table",
            "count"(*) AS "count",
            "avg"("agent_outputs"."confidence_score") AS "avg_confidence",
            "avg"("agent_outputs"."impact_score") AS "avg_impact",
            "max"("agent_outputs"."created_at") AS "latest_created"
           FROM "public"."agent_outputs"
          WHERE ("agent_outputs"."archived_at" IS NULL)
          GROUP BY "agent_outputs"."org_id", "agent_outputs"."agent_type", "agent_outputs"."status"
        )
 SELECT "org_id",
    "jsonb_object_agg"("agent_type", "count") FILTER (WHERE ("agent_type" IS NOT NULL)) AS "by_agent",
    "jsonb_object_agg"("status", "count") FILTER (WHERE ("status" IS NOT NULL)) AS "by_status",
    "jsonb_object_agg"("source_table", "count") FILTER (WHERE ("source_table" IS NOT NULL)) AS "by_source",
    ("sum"("count"))::integer AS "total_count",
    "round"(("avg"("avg_confidence"))::numeric, 3) AS "overall_avg_confidence",
    "round"("avg"("avg_impact"), 1) AS "overall_avg_impact",
    "max"("latest_created") AS "last_activity_at",
    "now"() AS "refreshed_at"
   FROM "agent_output_stats"
  GROUP BY "org_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_output_hub_summary" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_output_hub_summary" IS 'Materialized view for output hub summary. Direct API access removed - access via get_output_hub_summary_cached() function with RLS enforcement.';



CREATE MATERIALIZED VIEW "public"."org_metrics_cache" AS
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."type" AS "organization_type",
    (COALESCE("count"(DISTINCT "c"."id"), (0)::bigint))::integer AS "campaign_count",
    (COALESCE("count"(DISTINCT "c"."id") FILTER (WHERE ("c"."status" = 'active'::"text")), (0)::bigint))::integer AS "active_campaigns",
    (COALESCE("count"(DISTINCT "c"."id") FILTER (WHERE ("c"."status" = 'completed'::"text")), (0)::bigint))::integer AS "completed_campaigns",
    (COALESCE("sum"("c"."budget_cents"), (0)::bigint))::numeric AS "total_budget_cents",
    (COALESCE("sum"("c"."spent_cents"), (0)::bigint))::numeric AS "total_spent_cents",
    0 AS "client_count",
    0 AS "active_clients",
    (COALESCE("count"(DISTINCT "u"."id"), (0)::bigint))::integer AS "team_member_count",
    (COALESCE("count"(DISTINCT "u"."id") FILTER (WHERE ("u"."created_at" >= ("now"() - '30 days'::interval))), (0)::bigint))::integer AS "new_members_30d",
    GREATEST("max"("c"."updated_at"), "max"("u"."updated_at"), "max"("o"."updated_at")) AS "last_activity",
    "max"("c"."created_at") AS "last_campaign_created",
    NULL::timestamp with time zone AS "last_client_created",
        CASE
            WHEN ("count"(DISTINCT "c"."id") > 0) THEN "round"(((("sum"("c"."spent_cents"))::numeric / NULLIF(("sum"("c"."budget_cents"))::numeric, (0)::numeric)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "budget_utilization_percentage",
    "now"() AS "cached_at"
   FROM (("public"."organizations" "o"
     LEFT JOIN "public"."campaigns" "c" ON ((("o"."id" = "c"."org_id") AND ("c"."archived_at" IS NULL))))
     LEFT JOIN "public"."users" "u" ON (("o"."id" = "u"."org_id")))
  WHERE (("o"."archived_at" IS NULL) AND ("o"."type" = 'SME'::"text"))
  GROUP BY "o"."id", "o"."name", "o"."type"
UNION ALL
 SELECT "o"."id" AS "org_id",
    "o"."name" AS "org_name",
    "o"."type" AS "organization_type",
    (COALESCE("count"(DISTINCT "ac"."id"), (0)::bigint))::integer AS "campaign_count",
    (COALESCE("count"(DISTINCT "ac"."id") FILTER (WHERE ("ac"."status" = 'active'::"text")), (0)::bigint))::integer AS "active_campaigns",
    (COALESCE("count"(DISTINCT "ac"."id") FILTER (WHERE ("ac"."status" = 'completed'::"text")), (0)::bigint))::integer AS "completed_campaigns",
    (COALESCE("sum"("ac"."budget_cents"), (0)::bigint))::numeric AS "total_budget_cents",
    (COALESCE("sum"("ac"."spent_cents"), (0)::bigint))::numeric AS "total_spent_cents",
    (COALESCE("count"(DISTINCT "acl"."id"), (0)::bigint))::integer AS "client_count",
    (COALESCE("count"(DISTINCT "acl"."id") FILTER (WHERE ("acl"."status" = 'active'::"text")), (0)::bigint))::integer AS "active_clients",
    (COALESCE("count"(DISTINCT "u"."id"), (0)::bigint))::integer AS "team_member_count",
    (COALESCE("count"(DISTINCT "u"."id") FILTER (WHERE ("u"."created_at" >= ("now"() - '30 days'::interval))), (0)::bigint))::integer AS "new_members_30d",
    GREATEST("max"("ac"."updated_at"), "max"("acl"."updated_at"), "max"("u"."updated_at"), "max"("o"."updated_at")) AS "last_activity",
    "max"("ac"."created_at") AS "last_campaign_created",
    "max"("acl"."created_at") AS "last_client_created",
        CASE
            WHEN ("count"(DISTINCT "ac"."id") > 0) THEN "round"(((("sum"("ac"."spent_cents"))::numeric / NULLIF(("sum"("ac"."budget_cents"))::numeric, (0)::numeric)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "budget_utilization_percentage",
    "now"() AS "cached_at"
   FROM ((("public"."organizations" "o"
     LEFT JOIN "agency"."campaigns" "ac" ON ((("o"."id" = "ac"."org_id") AND ("ac"."archived_at" IS NULL))))
     LEFT JOIN "agency"."clients" "acl" ON ((("o"."id" = "acl"."org_id") AND ("acl"."archived_at" IS NULL))))
     LEFT JOIN "public"."users" "u" ON (("o"."id" = "u"."org_id")))
  WHERE (("o"."archived_at" IS NULL) AND ("o"."type" = 'AGENCY'::"text"))
  GROUP BY "o"."id", "o"."name", "o"."type"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."org_metrics_cache" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."org_metrics_cache" IS 'Cached organization metrics for dashboard performance.
NOT directly accessible via API - use get_dashboard_metrics() function instead.
Migration 269: Secured from direct API access.';



CREATE OR REPLACE VIEW "public"."user_feedback_summary" WITH ("security_invoker"='on') AS
 SELECT "category",
    "status",
    "priority",
    "count"(*) AS "count",
    "count"(*) FILTER (WHERE ("created_at" > ("now"() - '7 days'::interval))) AS "count_last_7_days",
    "count"(*) FILTER (WHERE ("created_at" > ("now"() - '30 days'::interval))) AS "count_last_30_days"
   FROM "public"."user_feedback"
  GROUP BY "category", "status", "priority"
  ORDER BY "category", "priority" DESC, "status";


ALTER VIEW "public"."user_feedback_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_feedback_summary" IS 'Aggregated user feedback statistics. WITH security_invoker ensures RLS policies are respected.
Migration 250: Added security_invoker to prevent RLS bypass.';


CREATE MATERIALIZED VIEW "public"."user_roles_cache" AS
 SELECT "ura"."user_id",
    "ura"."org_id",
    "r"."name" AS "role_name",
    "array_agg"(DISTINCT "p"."name" ORDER BY "p"."name") AS "permissions",
    "ura"."client_id",
    "c"."name" AS "client_name",
        CASE
            WHEN ("ura"."client_id" IS NULL) THEN true
            ELSE false
        END AS "is_org_role",
    "r"."id" AS "role_id",
    "now"() AS "cached_at"
   FROM (((("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("ura"."role_id" = "r"."id")))
     LEFT JOIN "public"."role_permissions" "rp" ON (("r"."id" = "rp"."role_id")))
     LEFT JOIN "public"."permissions" "p" ON (("rp"."permission_id" = "p"."id")))
     LEFT JOIN "public"."clients" "c" ON (("ura"."client_id" = "c"."id")))
  GROUP BY "ura"."user_id", "ura"."org_id", "r"."name", "ura"."client_id", "c"."name", "r"."id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."user_roles_cache" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."user_roles_cache" IS 'Materialized view for user roles. Direct API access removed - access via get_user_roles_cached() function with RLS enforcement.';

-- ---------------------------------------------------------------------------
-- 5. Populate materialized views
--    pg_dump emits CREATE MATERIALIZED VIEW ... WITH NO DATA, so the views
--    exist but are unpopulated. Application code and seed.sql refresh them
--    with REFRESH ... CONCURRENTLY, which errors on an unpopulated view.
-- ---------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW "public"."approval_requests_enriched";
REFRESH MATERIALIZED VIEW "public"."approved_outputs_library";
REFRESH MATERIALIZED VIEW "public"."cache_metrics_summary";
REFRESH MATERIALIZED VIEW "public"."client_metrics_cache";
REFRESH MATERIALIZED VIEW "public"."mv_output_hub_summary";
REFRESH MATERIALIZED VIEW "public"."org_metrics_cache";
REFRESH MATERIALIZED VIEW "public"."user_roles_cache";