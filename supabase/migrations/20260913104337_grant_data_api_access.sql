-- ============================================================================
-- grant_data_api_access
-- Data API grants: which roles may read/write which tables and call which functions.
-- ============================================================================




GRANT USAGE ON SCHEMA "agency" TO "authenticated";
GRANT USAGE ON SCHEMA "agency" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "agency"."archive_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."create_client"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."delete_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."get_agent_context"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "agency"."get_agent_context"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "agency"."get_campaigns_by_client"("p_client_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "agency"."get_client_context"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."get_client_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "agency"."get_client_personas"("p_client_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "agency"."restore_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "agency"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."acknowledge_alert"("p_alert_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_alert"("p_alert_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_alert"("p_alert_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_alpha_invite"("p_email" "text", "p_invited_by" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_cache_to_refresh_queue"("p_org_id" "uuid", "p_agent_type" "text", "p_cache_name" "text", "p_context_data" "jsonb", "p_ttl_type" "text", "p_ttl_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_approved_insight_to_business_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_approved_insight_to_business_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_approved_insight_to_business_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_conversation_routed"("p_conversation_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_clients_to_user"("p_target_user_id" "uuid", "p_client_ids" "uuid"[], "p_all_clients" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_user_to_organization"("user_id" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_approve_high_confidence_insights"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_approve_high_confidence_insights"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_approve_high_confidence_insights"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_link_personas_to_strategy"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_link_personas_to_strategy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_link_personas_to_strategy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_link_strategies_to_persona"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_link_strategies_to_persona"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_link_strategies_to_persona"() TO "service_role";



GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_resource_action_url"("p_resource_type" "text", "p_resource_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_archive_records"("p_table_name" "text", "p_record_ids" "uuid"[], "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_finalize_outputs"("output_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_finalize_outputs"("output_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_finalize_outputs"("output_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_campaign_derived_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_campaign_derived_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_campaign_derived_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_client_health_score"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_client_health_score"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_client_health_score"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_data_completeness"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_data_completeness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_data_completeness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_extraction_quality"("p_org_id" "uuid", "p_agent_type" "text", "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_extraction_quality"("p_org_id" "uuid", "p_agent_type" "text", "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_extraction_quality"("p_org_id" "uuid", "p_agent_type" "text", "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_roi"("p_spend" numeric, "p_revenue" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_edit_output"("p_output_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_output"("p_output_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_output"("p_output_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_resubmit_for_approval"("p_resource_type" "text", "p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_resubmit_for_approval"("p_resource_type" "text", "p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_resubmit_for_approval"("p_resource_type" "text", "p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_reset_monthly_usage"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_reset_monthly_usage"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_reset_monthly_usage"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_budget_alerts"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_budget_alerts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_budget_alerts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_onboarding_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_exists"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_exists"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_exists"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_mfa_enrolled"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_recommendations_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_recommendations_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_recommendations_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_caches"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_caches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_caches"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_dashboard_recommendation_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_dashboard_recommendation_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_dashboard_recommendation_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_user_onboarding"("p_user_id" "uuid", "p_invitation_token" "text", "p_full_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_active_clients"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_active_clients"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_active_clients"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text", "p_initial_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text", "p_initial_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_agent_session"("p_org_id" "uuid", "p_agent_type" "text", "p_session_title" "text", "p_initial_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_campaign_id" "uuid", "p_session_name" "text", "p_mode" "text", "p_session_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_campaign_id" "uuid", "p_session_name" "text", "p_mode" "text", "p_session_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_agent_session_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_campaign_id" "uuid", "p_session_name" "text", "p_mode" "text", "p_session_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_approval_request"("p_resource_type" "text", "p_resource_id" "uuid", "p_assigned_to" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_approval_request"("p_resource_type" "text", "p_resource_id" "uuid", "p_assigned_to" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_approval_request"("p_resource_type" "text", "p_resource_id" "uuid", "p_assigned_to" "uuid", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_auth_user_direct"("user_id" "uuid", "user_email" "text", "user_password" "text", "user_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid", "p_description" "text", "p_objectives" "jsonb", "p_target_audience" "text", "p_budget_cents" integer, "p_start_date" "date", "p_end_date" "date", "p_status" "text", "p_success_metrics" "jsonb", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid", "p_description" "text", "p_objectives" "jsonb", "p_target_audience" "text", "p_budget_cents" integer, "p_start_date" "date", "p_end_date" "date", "p_status" "text", "p_success_metrics" "jsonb", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_campaign_routed"("p_org_id" "uuid", "p_name" "text", "p_client_id" "uuid", "p_description" "text", "p_objectives" "jsonb", "p_target_audience" "text", "p_budget_cents" integer, "p_start_date" "date", "p_end_date" "date", "p_status" "text", "p_success_metrics" "jsonb", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client"("p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client_routed"("p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_comment"("p_resource_type" "text", "p_resource_id" "uuid", "p_content" "text", "p_parent_id" "uuid", "p_mentioned_users" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_comment"("p_resource_type" "text", "p_resource_id" "uuid", "p_content" "text", "p_parent_id" "uuid", "p_mentioned_users" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_comment"("p_resource_type" "text", "p_resource_id" "uuid", "p_content" "text", "p_parent_id" "uuid", "p_mentioned_users" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_session_data" "jsonb", "p_campaign_id" "uuid", "p_title" "text", "p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_session_data" "jsonb", "p_campaign_id" "uuid", "p_title" "text", "p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_conversation_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_session_data" "jsonb", "p_campaign_id" "uuid", "p_title" "text", "p_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_marketing_strategy"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_persona"("p_org_id" "uuid", "p_campaign_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_task"("p_title" "text", "p_assigned_to" "uuid", "p_task_type" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid", "p_related_resource_type" "text", "p_related_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_task"("p_title" "text", "p_assigned_to" "uuid", "p_task_type" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid", "p_related_resource_type" "text", "p_related_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_task"("p_title" "text", "p_assigned_to" "uuid", "p_task_type" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone, "p_client_id" "uuid", "p_related_resource_type" "text", "p_related_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_invitation"("p_org_id" "uuid", "p_email" "text", "p_role_id" "uuid", "p_invited_by" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_campaign_id" "uuid", "p_severity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_campaign_id" "uuid", "p_severity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_campaign_id" "uuid", "p_severity" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_budget_alert"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_comment"("p_comment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_comment"("p_comment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_comment"("p_comment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_session_schema"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_active_content_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_active_content_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_active_content_plan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_agency_brand_guidelines"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_brand_guidelines"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_brand_guidelines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_brand_guidelines"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary_persona"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_persona"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_persona"() TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_cache_warming"() TO "anon";
GRANT ALL ON FUNCTION "public"."execute_cache_warming"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_cache_warming"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_agent_output"("output_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_agent_output"("output_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_agent_output"("output_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slug"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slug"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slug"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_slug"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_slug"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_brand_guidelines"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_brand_guidelines"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_brand_guidelines"("p_org_id" "uuid", "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_campaigns"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_campaigns_routed"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_personas"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_personas"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_personas"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_quick_wins"("p_org_id" "uuid", "p_challenge_area" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_context"("p_org_id" "uuid", "p_agent_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_context_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_sessions"("p_org_id" "uuid", "p_agent_type" "text", "p_user_id" "uuid", "p_client_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_approval_history"("p_resource_type" "text", "p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_approval_history"("p_resource_type" "text", "p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approval_history"("p_resource_type" "text", "p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_approval_request"("p_approval_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_approval_request"("p_approval_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approval_request"("p_approval_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approved_insights"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_approved_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_approved_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approved_outputs"("p_client_id" "uuid", "p_agent_type" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_approved_outputs_for_user"("p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_approved_outputs_for_user"("p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_approved_outputs_for_user"("p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_assignable_team_members"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_assignable_team_members"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assignable_team_members"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_guidelines_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_optimization_data"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_context"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_insight_details"("p_insight_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_validation_status" "text", "p_insight_type" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_validation_status" "text", "p_insight_type" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_insights_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_validation_status" "text", "p_insight_type" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_intelligence_performance"("p_org_id" "uuid", "p_period_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_intelligence_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cache_cost_metrics"("p_org_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cache_cron_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cache_cron_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cache_cron_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cache_refresh_stats"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cache_refresh_stats"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cache_refresh_stats"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_campaign_plan_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_content_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_opportunity_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_recommendations"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cached_roi_recommendations"("p_org_id" "uuid", "p_data_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_caches_due_for_refresh"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_basic"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_details"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_details_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_metrics_summary"("p_org_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_performance"("p_org_id" "uuid", "p_period_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_period_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_period_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_period_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_summary_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_realtime_metrics"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_realtime_metrics"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_realtime_metrics"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaigns_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaigns_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_client_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaigns_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_basic_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_branding_routed"("p_org_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_by_slug_routed"("p_org_id" "uuid", "p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_dashboard"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_dashboard_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_details_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_performance"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clients_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clients_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_history_routed"("p_session_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversations_routed"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cross_agent_context"("p_org_id" "uuid", "p_exclude_agent" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cross_agent_context"("p_org_id" "uuid", "p_exclude_agent" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cross_agent_context"("p_org_id" "uuid", "p_exclude_agent" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cross_agent_intelligence"("p_org_id" "uuid", "p_current_agent" "text", "p_query_context" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cross_client_analytics"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_with_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_with_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_with_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_campaigns_routed"("p_org_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer, "p_include_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer, "p_include_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_clients"("p_org_id" "uuid", "p_limit" integer, "p_include_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics_cached"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_relationships"("p_entity_type" "text", "p_entity_id" "uuid", "p_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_relationships"("p_entity_type" "text", "p_entity_id" "uuid", "p_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_relationships"("p_entity_type" "text", "p_entity_id" "uuid", "p_direction" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_estimated_monthly_savings"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_form_prefill_data"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_intelligence_readiness"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_roi_by_campaign"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_learning_history_intelligence"("p_org_id" "uuid", "p_agent_type" "text", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_strategies_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_strategies_performance"("p_org_id" "uuid", "p_period_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_strategy_details"("p_strategy_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_materialized_view_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_materialized_view_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_materialized_view_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_org_id" "uuid", "p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_opportunity_summary"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_intelligence"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_output_detail_routed"("p_output_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_output_hub_summary"("p_org_id" "uuid", "p_include_archived" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_output_hub_summary_cached"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_approvals_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_approvals_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_approvals_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_tasks_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_tasks_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_tasks_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_performance_dashboard"("p_org_id" "uuid", "p_time_range_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_performance_dashboard_data"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_performance_intelligence_summary"("p_org_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_persona_details"("p_persona_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_persona_details_routed"("p_persona_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personas_list"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personas_list_routed"("p_org_id" "uuid", "p_include_archived" boolean, "p_campaign_id" "uuid", "p_client_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personas_performance"("p_org_id" "uuid", "p_period_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_phase_4_performance_summary"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_plan_readiness_score"("p_org_id" "uuid", "p_plan_id" "text", "p_base_score" integer, "p_total_prerequisites" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_plan_readiness_score"("p_org_id" "uuid", "p_plan_id" "text", "p_base_score" integer, "p_total_prerequisites" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plan_readiness_score"("p_org_id" "uuid", "p_plan_id" "text", "p_base_score" integer, "p_total_prerequisites" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_progressive_business_context"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommendations_cache_metrics"("p_org_id" "uuid", "p_recommendation_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_roi_dashboard_metrics"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_roi_dashboard_metrics"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_roi_dashboard_metrics"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_roi_intelligent_display"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_roi_recommendations"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_session_routed"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_session_routed"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_session_routed"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_task"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_task"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_task"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members_with_invitations"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_organizations"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_organizations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_organizations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text", "p_metric" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text", "p_metric" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_performing_outputs"("p_org_id" "uuid", "p_agent_type" "text", "p_metric" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unacknowledged_alerts"("p_org_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unacknowledged_alerts"("p_org_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unacknowledged_alerts"("p_org_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unified_outputs_hub"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text", "p_campaign_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unified_outputs_hub"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text", "p_campaign_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unified_outputs_hub"("p_org_id" "uuid", "p_client_id" "uuid", "p_agent_type" "text", "p_campaign_id" "uuid", "p_include_archived" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_client_assignments"("p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_context"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_context"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_context"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles_cached"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_pending_invitation_request"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_pending_invitation_request"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_pending_invitation_request"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_field"("p_table_name" "text", "p_field_name" "text", "p_increment_by" numeric, "p_row_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_field"("p_table_name" "text", "p_field_name" "text", "p_increment_by" numeric, "p_row_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_field"("p_table_name" "text", "p_field_name" "text", "p_increment_by" numeric, "p_row_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_insight_usage"("insight_id" "uuid", "agent_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_insight_usage"("insight_id" "uuid", "agent_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_insight_usage"("insight_id" "uuid", "agent_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_email_invited"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_invited"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_invited"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_approval_requests"("p_status" "text", "p_assigned_to_me" boolean, "p_requested_by_me" boolean, "p_resource_type" "text", "p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_approval_requests"("p_status" "text", "p_assigned_to_me" boolean, "p_requested_by_me" boolean, "p_resource_type" "text", "p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_approval_requests"("p_status" "text", "p_assigned_to_me" boolean, "p_requested_by_me" boolean, "p_resource_type" "text", "p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_comments"("p_resource_type" "text", "p_resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_comments"("p_resource_type" "text", "p_resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_comments"("p_resource_type" "text", "p_resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_notifications"("p_unread_only" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_notifications"("p_unread_only" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_notifications"("p_unread_only" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."list_tasks"("p_status" "text", "p_assigned_to_me" boolean, "p_assigned_by_me" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."list_tasks"("p_status" "text", "p_assigned_to_me" boolean, "p_assigned_by_me" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_tasks"("p_status" "text", "p_assigned_to_me" boolean, "p_assigned_by_me" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_event"("p_resource_type" "text", "p_resource_id" "uuid", "p_action" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_resource_type" "text", "p_resource_id" "uuid", "p_action" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_resource_type" "text", "p_resource_id" "uuid", "p_action" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_output_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_output_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_output_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric, "p_memory_usage_mb" numeric, "p_rows_affected" integer, "p_cache_hit" boolean, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric, "p_memory_usage_mb" numeric, "p_rows_affected" integer, "p_cache_hit" boolean, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_performance_metric"("p_org_id" "uuid", "p_metric_type" "text", "p_metric_name" "text", "p_metric_value" numeric, "p_metric_unit" "text", "p_execution_time_ms" numeric, "p_memory_usage_mb" numeric, "p_rows_affected" integer, "p_cache_hit" boolean, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_resource_title" "text", "p_activity_type" "text", "p_comment" "text", "p_details" "jsonb", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_resource_title" "text", "p_activity_type" "text", "p_comment" "text", "p_details" "jsonb", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_resource_activity"("p_resource_type" "text", "p_resource_id" "uuid", "p_resource_title" "text", "p_activity_type" "text", "p_comment" "text", "p_details" "jsonb", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_cache_refresh_complete"("p_cache_id" "uuid", "p_new_cache_name" "text", "p_new_ttl_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_cache_refresh_complete"("p_cache_id" "uuid", "p_new_cache_name" "text", "p_new_ttl_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_cache_refresh_complete"("p_cache_id" "uuid", "p_new_cache_name" "text", "p_new_ttl_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_cache_refresh_failed"("p_cache_id" "uuid", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_cache_refresh_failed"("p_cache_id" "uuid", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_cache_refresh_failed"("p_cache_id" "uuid", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_cache_refreshing"("p_cache_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_cache_refreshing"("p_cache_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_cache_refreshing"("p_cache_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text", "p_fixed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text", "p_fixed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_feedback_fixed"("p_feedback_id" "uuid", "p_commit_sha" "text", "p_resolution_notes" "text", "p_fixed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_invite_used"("p_email" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_notification_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_agent_output_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_agent_output_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_agent_output_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_campaign_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_campaign_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_campaign_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_client_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_client_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_client_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_approval_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_approval_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_approval_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_approval_resolved"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_approval_resolved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_approval_resolved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_comment_mention"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_comment_mention"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_comment_mention"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_task_assigned"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_task_assigned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_task_assigned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_task_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_task_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_task_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_approval_requests_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_approval_requests_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_approval_requests_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_approved_outputs_library"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_approved_outputs_library"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_approved_outputs_library"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_cache_metrics_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_cache_metrics_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_cache_metrics_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_client_metrics_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_client_metrics_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_client_metrics_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_org_metrics_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_org_metrics_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_org_metrics_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_output_hub_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_output_hub_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_output_hub_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_role_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_user_roles_cache_for_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_push_device"("p_device_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_push_device"("p_device_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_push_device"("p_device_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_approval_request"("p_approval_id" "uuid", "p_status" "text", "p_resolution_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_approval_request"("p_approval_id" "uuid", "p_status" "text", "p_resolution_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_approval_request"("p_approval_id" "uuid", "p_status" "text", "p_resolution_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_agent_session"("p_session_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_client_routed"("p_client_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_record"("p_table_name" "text", "p_record_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resubmit_for_approval"("p_approval_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resubmit_for_approval"("p_approval_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resubmit_for_approval"("p_approval_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_alpha_invite"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_alpha_invite"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_alpha_invite"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_team_invitation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_agent_message_routed"("p_session_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid", "p_summary" "text", "p_session_id" "text", "p_campaign_id" "uuid", "p_category" "text", "p_metadata" "jsonb", "p_confidence_score" double precision, "p_source_type" "text", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid", "p_summary" "text", "p_session_id" "text", "p_campaign_id" "uuid", "p_category" "text", "p_metadata" "jsonb", "p_confidence_score" double precision, "p_source_type" "text", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_agent_output_routed"("p_org_id" "uuid", "p_user_id" "uuid", "p_agent_type" "text", "p_output_type" "text", "p_title" "text", "p_content" "jsonb", "p_client_id" "uuid", "p_summary" "text", "p_session_id" "text", "p_campaign_id" "uuid", "p_category" "text", "p_metadata" "jsonb", "p_confidence_score" double precision, "p_source_type" "text", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_campaign_plan_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_plans" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_content_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb", "p_importance" double precision, "p_confidence" double precision, "p_tags" "text"[], "p_themes" "text"[], "p_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb", "p_importance" double precision, "p_confidence" double precision, "p_tags" "text"[], "p_themes" "text"[], "p_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_interview_insight"("p_org_id" "uuid", "p_persona_id" "uuid", "p_session_id" "text", "p_insight_category" "text", "p_raw_text" "text", "p_actionable_recommendations" "jsonb", "p_importance" double precision, "p_confidence" double precision, "p_tags" "text"[], "p_themes" "text"[], "p_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_message_routed"("p_conversation_id" "uuid", "p_role" "text", "p_content" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_opportunity_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_opportunities" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_recommendations_cache"("p_org_id" "uuid", "p_recommendation_type" "text", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_roi_recommendations_cache"("p_org_id" "uuid", "p_data_hash" "text", "p_recommendations" "jsonb", "p_cache_duration_hours" integer, "p_generation_time_ms" integer, "p_llm_tokens_used" integer, "p_overall_assessment" "text", "p_confidence" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_cache_cleanup_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_cache_cleanup_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_cache_cleanup_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_cache_warming_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_cache_warming_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_cache_warming_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_personas_by_location"("p_country" "text", "p_state" "text", "p_city" "text", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."search_personas_by_location"("p_country" "text", "p_state" "text", "p_city" "text", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_personas_by_location"("p_country" "text", "p_state" "text", "p_city" "text", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[], "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[], "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_unified_outputs"("p_org_id" "uuid", "p_search_query" "text", "p_agent_types" "text"[], "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_client_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_client_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_client_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_draft_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_draft_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_draft_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_output_approval_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_output_approval_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_output_approval_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_cache_on_user_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_requests_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_requests_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approval_requests_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_approved_outputs"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approved_outputs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_approved_outputs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_output_hub_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_output_hub_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_output_hub_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_output_id" "uuid", "p_org_id" "uuid", "p_archive_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_archive_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_delete_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_output_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_restore_output"("p_id" "uuid", "p_org_id" "uuid", "p_table_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unified_update_output"("p_id" "uuid", "p_table_source" "text", "p_org_id" "uuid", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_outputs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_outputs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_outputs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text", "p_session_data" "jsonb", "p_merge_data" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text", "p_session_data" "jsonb", "p_merge_data" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_session"("p_session_id" "uuid", "p_org_id" "uuid", "p_session_title" "text", "p_session_data" "jsonb", "p_merge_data" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_insights_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_insights_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_insights_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_guideline_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_guideline_id" "uuid", "p_name" "text", "p_description" "text", "p_guidelines" "jsonb", "p_is_default" boolean, "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_guidelines_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_guidelines_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_guidelines_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_learning"("p_org_id" "uuid", "p_field" "text", "p_value" "text"[], "p_source_agent" "text", "p_confidence" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cache_refresh_queue_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cache_refresh_queue_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cache_refresh_queue_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign_metrics_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign_metrics_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign_metrics_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign_plan_prerequisites_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign_routed"("p_campaign_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_description" "text", "p_objectives" "jsonb", "p_budget_cents" integer, "p_status" "text", "p_target_audience" "text", "p_campaign_type" "text", "p_marketing_channels" "jsonb", "p_content_pillars" "jsonb", "p_target_personas" "jsonb", "p_success_metrics" "jsonb", "p_competitor_context" "text", "p_geographic_target" "text", "p_priority_level" "text", "p_tags" "jsonb", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_slug" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_slug" "text", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_slug" "text", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_routed"("p_client_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_industry" "text", "p_website" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_status" "text", "p_company_size" "public"."company_size_enum", "p_company_stage" "public"."company_stage_enum", "p_business_model" "public"."business_model_enum", "p_target_market" "text"[], "p_key_competitors" "text"[], "p_unique_value_proposition" "text", "p_marketing_budget" "text", "p_current_marketing_channels" "text"[], "p_marketing_goals" "text"[], "p_slug" "text", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment"("p_comment_id" "uuid", "p_content" "text", "p_is_resolved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment"("p_comment_id" "uuid", "p_content" "text", "p_is_resolved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment"("p_comment_id" "uuid", "p_content" "text", "p_is_resolved" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_extraction_metrics"("p_org_id" "uuid", "p_agent_type" "text", "p_success" boolean, "p_confidence" numeric, "p_is_empty" boolean, "p_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_extraction_metrics"("p_org_id" "uuid", "p_agent_type" "text", "p_success" boolean, "p_confidence" numeric, "p_is_empty" boolean, "p_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_extraction_metrics"("p_org_id" "uuid", "p_agent_type" "text", "p_success" boolean, "p_confidence" numeric, "p_is_empty" boolean, "p_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text", "p_assigned_to" "uuid", "p_resolution_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text", "p_assigned_to" "uuid", "p_resolution_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_status"("p_feedback_id" "uuid", "p_status" "text", "p_priority" "text", "p_assigned_to" "uuid", "p_resolution_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_interview_insights_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_interview_insights_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_interview_insights_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invitation_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invitation_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invitation_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_marketing_strategy"("p_strategy_id" "uuid", "p_org_id" "uuid", "p_title" "text", "p_strategy_type" "text", "p_positioning_statement" "text", "p_value_propositions" "jsonb", "p_key_messages" "jsonb", "p_differentiation_points" "text"[], "p_elevator_pitches" "jsonb", "p_tone_of_voice" "jsonb", "p_brand_personality" "jsonb", "p_channel_mix" "jsonb", "p_budget_allocation" "jsonb", "p_content_pillars" "text"[], "p_metadata" "jsonb", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_marketing_strategy_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_marketing_strategy_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_marketing_strategy_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_persona"("p_persona_id" "uuid", "p_org_id" "uuid", "p_name" "text", "p_title" "text", "p_persona_type" "text", "p_age_range" "text", "p_location" "jsonb", "p_pain_points" "jsonb", "p_goals" "jsonb", "p_preferred_channels" "jsonb", "p_content_preferences" "jsonb", "p_objections" "jsonb", "p_buying_stage" "text", "p_decision_making_role" "text", "p_budget_authority" "text", "p_tech_savviness" "text", "p_information_sources" "jsonb", "p_social_media_habits" "jsonb", "p_typical_day" "text", "p_frustrations" "jsonb", "p_motivations" "jsonb", "p_quotes" "jsonb", "p_success_metrics" "jsonb", "p_buying_triggers" "jsonb", "p_demographics" "jsonb", "p_psychographics" "jsonb", "p_behavioral_traits" "jsonb", "p_customer_journey" "jsonb", "p_interaction_history" "jsonb", "p_background_story" "text", "p_key_quote" "text", "p_is_primary" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_persona_insights_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_persona_insights_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_persona_insights_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_title_routed"("p_session_id" "uuid", "p_new_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_status" "text", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_status" "text", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_status" "text", "p_title" "text", "p_description" "text", "p_priority" "text", "p_due_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_user_id" "uuid", "p_target_user_id" "uuid", "p_new_role_id" "uuid", "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_feedback_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_business_metrics_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_business_profile_data"("p_org_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_business_profile_data_routed"("p_org_id" "uuid", "p_client_id" "uuid", "p_data" "jsonb", "p_metrics" "jsonb", "p_source_agent" "text", "p_confidence" double precision, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_enterprise_relationship"("p_source_type" "text", "p_source_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_relationship_type" "text", "p_metadata" "jsonb", "p_strength" numeric, "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_enterprise_relationship"("p_source_type" "text", "p_source_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_relationship_type" "text", "p_metadata" "jsonb", "p_strength" numeric, "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_enterprise_relationship"("p_source_type" "text", "p_source_id" "uuid", "p_target_type" "text", "p_target_id" "uuid", "p_relationship_type" "text", "p_metadata" "jsonb", "p_strength" numeric, "p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text", "p_bundle_id" "text", "p_environment" "text", "p_authorization_status" "text", "p_background_refresh_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text", "p_bundle_id" "text", "p_environment" "text", "p_authorization_status" "text", "p_background_refresh_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_push_device"("p_device_token" "text", "p_platform" "text", "p_bundle_id" "text", "p_environment" "text", "p_authorization_status" "text", "p_background_refresh_enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_client_access"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_org_id" "uuid", "p_permission_name" "text", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_org_id" "uuid", "p_permission_name" "text", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("p_user_id" "uuid", "p_org_id" "uuid", "p_permission_name" "text", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_agent_output"("output_id" "uuid", "new_status" "text", "validator_id" "uuid", "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_agent_output"("output_id" "uuid", "new_status" "text", "validator_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_agent_output"("output_id" "uuid", "new_status" "text", "validator_id" "uuid", "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_brand_guidelines"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_brand_guidelines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_brand_guidelines"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_persona_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_persona_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_persona_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_structured_brand_guidelines"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_structured_brand_guidelines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_structured_brand_guidelines"() TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "agency"."client_intelligence" TO "authenticated";
GRANT ALL ON TABLE "agency"."client_intelligence" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "agency"."clients" TO "authenticated";
GRANT ALL ON TABLE "agency"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights" TO "service_role";



GRANT ALL ON TABLE "public"."active_insights" TO "anon";
GRANT ALL ON TABLE "public"."active_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."active_insights" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_strategies" TO "anon";
GRANT ALL ON TABLE "public"."marketing_strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_strategies" TO "service_role";



GRANT ALL ON TABLE "public"."active_marketing_strategies" TO "anon";
GRANT ALL ON TABLE "public"."active_marketing_strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."active_marketing_strategies" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_strategy_personas" TO "anon";
GRANT ALL ON TABLE "public"."marketing_strategy_personas" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_strategy_personas" TO "service_role";



GRANT ALL ON TABLE "public"."synthetic_personas" TO "anon";
GRANT ALL ON TABLE "public"."synthetic_personas" TO "authenticated";
GRANT ALL ON TABLE "public"."synthetic_personas" TO "service_role";



GRANT ALL ON TABLE "public"."active_persona_strategies" TO "anon";
GRANT ALL ON TABLE "public"."active_persona_strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."active_persona_strategies" TO "service_role";



GRANT ALL ON TABLE "public"."active_personas" TO "anon";
GRANT ALL ON TABLE "public"."active_personas" TO "authenticated";
GRANT ALL ON TABLE "public"."active_personas" TO "service_role";



GRANT ALL ON TABLE "public"."agent_context_profiles" TO "anon";
GRANT ALL ON TABLE "public"."agent_context_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_context_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."agent_conversations" TO "anon";
GRANT ALL ON TABLE "public"."agent_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."agent_messages" TO "anon";
GRANT ALL ON TABLE "public"."agent_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_messages" TO "service_role";



GRANT ALL ON TABLE "public"."agent_outputs" TO "anon";
GRANT ALL ON TABLE "public"."agent_outputs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_outputs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_insights_stats" TO "anon";
GRANT ALL ON TABLE "public"."ai_insights_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_insights_stats" TO "service_role";



GRANT ALL ON TABLE "public"."alpha_invites" TO "anon";
GRANT ALL ON TABLE "public"."alpha_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."alpha_invites" TO "service_role";



GRANT ALL ON TABLE "public"."approval_history" TO "anon";
GRANT ALL ON TABLE "public"."approval_history" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_history" TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."approval_requests_enriched" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."approval_requests_enriched" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests_enriched" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."approved_outputs_library" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."approved_outputs_library" TO "authenticated";
GRANT ALL ON TABLE "public"."approved_outputs_library" TO "service_role";



GRANT ALL ON TABLE "public"."brand_guidelines" TO "anon";
GRANT ALL ON TABLE "public"."brand_guidelines" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_guidelines" TO "service_role";



GRANT ALL ON TABLE "public"."gemini_cost_tracking" TO "anon";
GRANT ALL ON TABLE "public"."gemini_cost_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."gemini_cost_tracking" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."cache_metrics_summary" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."cache_metrics_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_metrics_summary" TO "service_role";



GRANT ALL ON TABLE "public"."cache_refresh_queue" TO "anon";
GRANT ALL ON TABLE "public"."cache_refresh_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."cache_refresh_queue" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_alerts" TO "anon";
GRANT ALL ON TABLE "public"."campaign_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."campaign_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_metrics" TO "anon";
GRANT ALL ON TABLE "public"."campaign_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_plan_prerequisites" TO "anon";
GRANT ALL ON TABLE "public"."campaign_plan_prerequisites" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_plan_prerequisites" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."client_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."client_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."client_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."client_metrics_cache" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."client_metrics_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."client_metrics_cache" TO "service_role";



GRANT ALL ON TABLE "public"."content_plans" TO "anon";
GRANT ALL ON TABLE "public"."content_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."content_plans" TO "service_role";



GRANT ALL ON TABLE "public"."core_business_data" TO "anon";
GRANT ALL ON TABLE "public"."core_business_data" TO "authenticated";
GRANT ALL ON TABLE "public"."core_business_data" TO "service_role";



GRANT ALL ON TABLE "public"."customer_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."customer_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."daily_gemini_costs" TO "anon";
GRANT ALL ON TABLE "public"."daily_gemini_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_gemini_costs" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_recommendation_cache" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_recommendation_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_recommendation_cache" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."enterprise_relationships" TO "anon";
GRANT ALL ON TABLE "public"."enterprise_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."enterprise_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."insight_extraction_metrics" TO "anon";
GRANT ALL ON TABLE "public"."insight_extraction_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."insight_extraction_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."intelligence_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."intelligence_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."intelligence_conflicts" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_requests" TO "anon";
GRANT ALL ON TABLE "public"."invitation_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_requests" TO "service_role";



GRANT ALL ON TABLE "public"."market_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."market_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."market_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_strategy_brand_guidelines" TO "anon";
GRANT ALL ON TABLE "public"."marketing_strategy_brand_guidelines" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_strategy_brand_guidelines" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_output_hub_summary" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_output_hub_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_output_hub_summary" TO "service_role";



GRANT ALL ON TABLE "public"."notification_push_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."notification_push_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_push_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."org_metrics_cache" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."org_metrics_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."org_metrics_cache" TO "service_role";



GRANT ALL ON TABLE "public"."performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."permission_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."persona_interactions" TO "anon";
GRANT ALL ON TABLE "public"."persona_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."persona_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."persona_interview_sessions" TO "anon";
GRANT ALL ON TABLE "public"."persona_interview_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."persona_interview_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."push_devices" TO "anon";
GRANT ALL ON TABLE "public"."push_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."push_devices" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations_cache" TO "anon";
GRANT ALL ON TABLE "public"."recommendations_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations_cache" TO "service_role";



GRANT ALL ON TABLE "public"."resource_activity" TO "anon";
GRANT ALL ON TABLE "public"."resource_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_activity" TO "service_role";



GRANT ALL ON TABLE "public"."resource_comments" TO "anon";
GRANT ALL ON TABLE "public"."resource_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_comments" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."user_roles_cache" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."user_roles_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles_cache" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Defence in depth: also remove the browser-facing grants, so the table is not
-- reachable even if a future policy is added carelessly.
REVOKE ALL ON TABLE "public"."notification_push_deliveries" FROM "anon", "authenticated";

-- ---------------------------------------------------------------------------
-- 9. Security: materialized views must not be readable by browser roles
--
-- Supabase advisor `materialized_view_in_api`: all seven matviews were
-- selectable by anon AND authenticated.
--
-- This is qualitatively worse than the same grant on a table. Tables have RLS,
-- so a SELECT grant still yields only the rows a policy allows. Materialized
-- views CANNOT have Row Level Security, so the grant is unrestricted read
-- access to every tenant's rows.
--
-- All seven carry org_id / client_id / user_id. The anon key ships in the
-- browser bundle, and a client-side .eq('org_id', ...) filter is not a security
-- boundary. This was cross-tenant data exposure.
--
-- Access is unaffected for legitimate callers: the backend reads these views
-- from SQL functions that run as their owner, and the service role bypasses
-- grants. The one frontend consumer (useCostMetrics) was verified to be unused
-- dead code.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    mv record;
BEGIN
    FOR mv IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'm'
    LOOP
        EXECUTE format(
            'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
            mv.relname
        );
    END LOOP;
END $$;