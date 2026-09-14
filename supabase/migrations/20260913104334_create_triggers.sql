-- ============================================================================
-- create_triggers
-- Table triggers (non-signup; signup provisioning lives in harden_tenant_isolation).
-- ============================================================================





CREATE OR REPLACE TRIGGER "agency_clients_set_slug_trigger" BEFORE INSERT OR UPDATE ON "agency"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_slug"();



CREATE OR REPLACE TRIGGER "ensure_single_default_agency_brand_trigger" BEFORE INSERT OR UPDATE ON "agency"."brand_guidelines" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_agency_brand_guidelines"();



CREATE OR REPLACE TRIGGER "log_agency_output_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "agency"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."log_output_activity"();



CREATE OR REPLACE TRIGGER "refresh_approved_outputs_on_agency_change" AFTER INSERT OR DELETE OR UPDATE ON "agency"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_approved_outputs"();



CREATE OR REPLACE TRIGGER "trigger_sync_agency_client_delete" AFTER UPDATE OF "archived_at" ON "agency"."clients" FOR EACH ROW WHEN ((("new"."archived_at" IS NOT NULL) AND ("old"."archived_at" IS NULL))) EXECUTE FUNCTION "agency"."sync_client_delete_to_public"();



COMMENT ON TRIGGER "trigger_sync_agency_client_delete" ON "agency"."clients" IS 'Week 1: Syncs agency client archives to public schema for existing UI queries. Migration 157.';



CREATE OR REPLACE TRIGGER "trigger_sync_agency_client_insert" AFTER INSERT ON "agency"."clients" FOR EACH ROW EXECUTE FUNCTION "agency"."sync_client_to_public"();



COMMENT ON TRIGGER "trigger_sync_agency_client_insert" ON "agency"."clients" IS 'Week 1: Syncs new agency clients to public schema for existing UI queries. Migration 157.';



CREATE OR REPLACE TRIGGER "trigger_sync_agency_client_update" AFTER UPDATE ON "agency"."clients" FOR EACH ROW EXECUTE FUNCTION "agency"."sync_client_to_public"();



COMMENT ON TRIGGER "trigger_sync_agency_client_update" ON "agency"."clients" IS 'Week 1: Syncs agency client updates to public schema for existing UI queries. Migration 157.';



CREATE OR REPLACE TRIGGER "update_agency_brand_updated_at" BEFORE UPDATE ON "agency"."brand_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_campaigns_updated_at" BEFORE UPDATE ON "agency"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_client_intelligence_updated_at" BEFORE UPDATE ON "agency"."client_intelligence" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_clients_updated_at" BEFORE UPDATE ON "agency"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_conversations_updated_at" BEFORE UPDATE ON "agency"."agent_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_outputs_updated_at" BEFORE UPDATE ON "agency"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_personas_updated_at" BEFORE UPDATE ON "agency"."personas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "agent_output_update_notify" AFTER INSERT OR DELETE OR UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."notify_agent_output_change"();



COMMENT ON TRIGGER "agent_output_update_notify" ON "public"."agent_outputs" IS 'Real-time notification trigger for agent output changes';



CREATE OR REPLACE TRIGGER "apply_approved_insights_trigger" AFTER INSERT OR UPDATE ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."apply_approved_insight_to_business_data"();



CREATE OR REPLACE TRIGGER "approval_request_notification" AFTER INSERT ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_approval_request"();



CREATE OR REPLACE TRIGGER "approval_requests_updated_at" BEFORE UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "approval_resolved_notification" AFTER UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_approval_resolved"();



CREATE OR REPLACE TRIGGER "auto_approve_insights_trigger" BEFORE INSERT OR UPDATE ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."auto_approve_high_confidence_insights"();



CREATE OR REPLACE TRIGGER "auto_link_personas_to_strategies" AFTER INSERT ON "public"."synthetic_personas" FOR EACH ROW EXECUTE FUNCTION "public"."auto_link_strategies_to_persona"();



CREATE OR REPLACE TRIGGER "cache_refresh_queue_updated_at" BEFORE UPDATE ON "public"."cache_refresh_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_cache_refresh_queue_updated_at"();



CREATE OR REPLACE TRIGGER "campaign_budget_alert_trigger" AFTER UPDATE ON "public"."campaigns" FOR EACH ROW WHEN ((("new"."spent_cents" IS DISTINCT FROM "old"."spent_cents") OR ("new"."budget_cents" IS DISTINCT FROM "old"."budget_cents"))) EXECUTE FUNCTION "public"."check_budget_alerts"();



CREATE OR REPLACE TRIGGER "campaign_metrics_updated_at" BEFORE UPDATE ON "public"."campaign_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_campaign_metrics_updated_at"();



CREATE OR REPLACE TRIGGER "campaign_update_notify" AFTER INSERT OR DELETE OR UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."notify_campaign_change"();



COMMENT ON TRIGGER "campaign_update_notify" ON "public"."campaigns" IS 'Real-time notification trigger for campaign changes';



CREATE OR REPLACE TRIGGER "campaigns_metrics_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_org_metrics_cache"();



COMMENT ON TRIGGER "campaigns_metrics_refresh_trigger" ON "public"."campaigns" IS 'Auto-refresh org_metrics_cache when campaigns change. Restored in migration 150 after being dropped in migration 050.';



CREATE OR REPLACE TRIGGER "client_update_notify" AFTER INSERT OR DELETE OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."notify_client_change"();



COMMENT ON TRIGGER "client_update_notify" ON "public"."clients" IS 'Real-time notification trigger for client changes';



CREATE OR REPLACE TRIGGER "clients_metrics_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_org_metrics_cache"();



COMMENT ON TRIGGER "clients_metrics_refresh_trigger" ON "public"."clients" IS 'Auto-refresh org_metrics_cache when clients change. Restored in migration 150 after being dropped in migration 050.';



CREATE OR REPLACE TRIGGER "clients_set_slug_trigger" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_client_slug"();



CREATE OR REPLACE TRIGGER "comment_mention_notification" AFTER INSERT ON "public"."resource_comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_comment_mention"();



CREATE OR REPLACE TRIGGER "ensure_single_active_content_plan_trigger" BEFORE INSERT OR UPDATE ON "public"."content_plans" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_active_content_plan"();



CREATE OR REPLACE TRIGGER "ensure_single_default_brand_guidelines_trigger" BEFORE INSERT OR UPDATE ON "public"."brand_guidelines" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_brand_guidelines"();



CREATE OR REPLACE TRIGGER "invitation_requests_updated_at" BEFORE UPDATE ON "public"."invitation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_invitation_requests_updated_at"();



CREATE OR REPLACE TRIGGER "link_personas_on_strategy_create" AFTER INSERT ON "public"."marketing_strategies" FOR EACH ROW EXECUTE FUNCTION "public"."auto_link_personas_to_strategy"();



CREATE OR REPLACE TRIGGER "link_strategies_on_persona_create" AFTER INSERT ON "public"."synthetic_personas" FOR EACH ROW EXECUTE FUNCTION "public"."auto_link_strategies_to_persona"();



CREATE OR REPLACE TRIGGER "log_output_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."log_output_activity"();



CREATE OR REPLACE TRIGGER "organizations_metrics_refresh_trigger" AFTER UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_org_metrics_cache"();



COMMENT ON TRIGGER "organizations_metrics_refresh_trigger" ON "public"."organizations" IS 'Auto-refresh org_metrics_cache when organizations change. Restored in migration 150 after being dropped in migration 050.';



CREATE OR REPLACE TRIGGER "permissions_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_user_roles_cache"();



CREATE OR REPLACE TRIGGER "refresh_approval_cache_on_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."approval_requests" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_approval_requests_cache"();



CREATE OR REPLACE TRIGGER "refresh_approval_cache_on_user_change" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"();



CREATE OR REPLACE TRIGGER "refresh_approved_outputs_on_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_approved_outputs"();



CREATE OR REPLACE TRIGGER "refresh_metrics_on_campaign_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."campaigns" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_client_metrics_cache"();



CREATE OR REPLACE TRIGGER "resource_comments_updated_at" BEFORE UPDATE ON "public"."resource_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "role_permissions_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."role_permissions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"();



CREATE OR REPLACE TRIGGER "roles_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."roles" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_user_roles_cache_for_roles"();



CREATE OR REPLACE TRIGGER "set_draft_expiry" BEFORE INSERT OR UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."set_draft_expiry"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_feedback" BEFORE UPDATE ON "public"."user_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sync_output_on_approval_insert" AFTER INSERT ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."sync_output_approval_status"();



CREATE OR REPLACE TRIGGER "sync_output_on_approval_update" AFTER UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."sync_output_approval_status"();



CREATE OR REPLACE TRIGGER "task_assigned_notification" AFTER INSERT ON "public"."task_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_task_assigned"();



CREATE OR REPLACE TRIGGER "task_assignments_updated_at" BEFORE UPDATE ON "public"."task_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "task_status_change_notification" AFTER UPDATE ON "public"."task_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_task_status_change"();



CREATE OR REPLACE TRIGGER "trg_ensure_single_primary_persona" BEFORE INSERT OR UPDATE OF "is_primary" ON "public"."synthetic_personas" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_primary_persona"();



CREATE OR REPLACE TRIGGER "trigger_agent_outputs_summary_refresh" AFTER INSERT OR DELETE OR UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_output_hub_summary"();



CREATE OR REPLACE TRIGGER "trigger_calculate_campaign_metrics" BEFORE INSERT OR UPDATE ON "public"."campaign_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_campaign_derived_metrics"();



CREATE OR REPLACE TRIGGER "trigger_refresh_cache_metrics" AFTER INSERT OR UPDATE ON "public"."gemini_cost_tracking" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_cache_metrics_summary"();



CREATE OR REPLACE TRIGGER "trigger_update_campaign_plan_prerequisites_updated_at" BEFORE UPDATE ON "public"."campaign_plan_prerequisites" FOR EACH ROW EXECUTE FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_user_feedback_updated_at" BEFORE UPDATE ON "public"."user_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_feedback_updated_at"();



CREATE OR REPLACE TRIGGER "update_agent_context_profiles_updated_at" BEFORE UPDATE ON "public"."agent_context_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agent_conversations_updated_at" BEFORE UPDATE ON "public"."agent_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agent_messages_updated_at" BEFORE UPDATE ON "public"."agent_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agent_outputs_updated_at" BEFORE UPDATE ON "public"."agent_outputs" FOR EACH ROW EXECUTE FUNCTION "public"."update_agent_outputs_updated_at"();



CREATE OR REPLACE TRIGGER "update_ai_insights_updated_at" BEFORE UPDATE ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ai_insights_updated_at_trigger" BEFORE UPDATE ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_insights_updated_at"();



CREATE OR REPLACE TRIGGER "update_brand_guidelines_updated_at" BEFORE UPDATE ON "public"."brand_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_intelligence_updated_at" BEFORE UPDATE ON "public"."campaign_intelligence" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_content_plans_updated_at" BEFORE UPDATE ON "public"."content_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_core_business_data_updated_at" BEFORE UPDATE ON "public"."core_business_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_core_business_updated_at" BEFORE UPDATE ON "public"."core_business_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_customer_intelligence_updated_at" BEFORE UPDATE ON "public"."customer_intelligence" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_data_completeness" BEFORE INSERT OR UPDATE ON "public"."core_business_data" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_data_completeness"();



CREATE OR REPLACE TRIGGER "update_document_chunks_updated_at" BEFORE UPDATE ON "public"."document_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_enterprise_relationships_updated_at" BEFORE UPDATE ON "public"."enterprise_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_intelligence_conflicts_updated_at" BEFORE UPDATE ON "public"."intelligence_conflicts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interview_insights_count_trigger" AFTER INSERT ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_interview_insights_count"();



CREATE OR REPLACE TRIGGER "update_market_intelligence_updated_at" BEFORE UPDATE ON "public"."market_intelligence" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marketing_strategies_updated_at" BEFORE UPDATE ON "public"."marketing_strategies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marketing_strategy_brand_guidelines_updated_at" BEFORE UPDATE ON "public"."marketing_strategy_brand_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marketing_strategy_personas_updated_at" BEFORE UPDATE ON "public"."marketing_strategy_personas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_persona_insights_summary_trigger" AFTER INSERT OR UPDATE ON "public"."ai_insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_persona_insights_summary"();



CREATE OR REPLACE TRIGGER "update_persona_interactions_updated_at" BEFORE UPDATE ON "public"."persona_interactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_persona_interview_sessions_updated_at" BEFORE UPDATE ON "public"."persona_interview_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_synthetic_personas_updated_at" BEFORE UPDATE ON "public"."synthetic_personas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usage_tracking_updated_at" BEFORE UPDATE ON "public"."usage_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_roles_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_role_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_user_roles_cache"();



CREATE OR REPLACE TRIGGER "users_metrics_refresh_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_org_metrics_cache"();



COMMENT ON TRIGGER "users_metrics_refresh_trigger" ON "public"."users" IS 'Auto-refresh org_metrics_cache when users change. Restored in migration 150 after being dropped in migration 050.';



CREATE OR REPLACE TRIGGER "validate_persona_location_trigger" BEFORE INSERT OR UPDATE ON "public"."synthetic_personas" FOR EACH ROW EXECUTE FUNCTION "public"."validate_persona_location"();



CREATE OR REPLACE TRIGGER "validate_structured_brand_guidelines_trigger" BEFORE INSERT OR UPDATE ON "public"."brand_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."validate_structured_brand_guidelines"();

DROP TRIGGER IF EXISTS "permissions_refresh_trigger" ON "public"."permissions";
CREATE TRIGGER "permissions_refresh_trigger"
    AFTER INSERT OR DELETE OR UPDATE ON "public"."permissions"
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."refresh_user_roles_cache_for_global_change"();

DROP TRIGGER IF EXISTS "role_permissions_refresh_trigger" ON "public"."role_permissions";
CREATE TRIGGER "role_permissions_refresh_trigger"
    AFTER INSERT OR DELETE OR UPDATE ON "public"."role_permissions"
    FOR EACH STATEMENT
    EXECUTE FUNCTION "public"."refresh_user_roles_cache_for_global_change"();