-- ============================================================================
-- create_indexes
-- Indexes.
-- ============================================================================





CREATE INDEX "idx_agency_brand_archived" ON "agency"."brand_guidelines" USING "btree" ("org_id", "archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_agency_brand_archived_by" ON "agency"."brand_guidelines" USING "btree" ("archived_by");



CREATE INDEX "idx_agency_brand_campaign" ON "agency"."brand_guidelines" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_agency_brand_client" ON "agency"."brand_guidelines" USING "btree" ("client_id");



CREATE INDEX "idx_agency_brand_created_by" ON "agency"."brand_guidelines" USING "btree" ("created_by");



CREATE INDEX "idx_agency_brand_default" ON "agency"."brand_guidelines" USING "btree" ("client_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_agency_brand_org_client" ON "agency"."brand_guidelines" USING "btree" ("org_id", "client_id");



CREATE INDEX "idx_agency_brand_parent" ON "agency"."brand_guidelines" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_agency_brand_updated_by" ON "agency"."brand_guidelines" USING "btree" ("updated_by");



CREATE INDEX "idx_agency_campaigns_active" ON "agency"."campaigns" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_campaigns_archived_by" ON "agency"."campaigns" USING "btree" ("archived_by");



COMMENT ON INDEX "agency"."idx_agency_campaigns_archived_by" IS 'Foreign key index for archived_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_campaigns_client" ON "agency"."campaigns" USING "btree" ("client_id") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_campaigns_created_by" ON "agency"."campaigns" USING "btree" ("created_by");



COMMENT ON INDEX "agency"."idx_agency_campaigns_created_by" IS 'Foreign key index for created_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_campaigns_dates" ON "agency"."campaigns" USING "btree" ("client_id", "start_date", "end_date") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_campaigns_marketing_channels" ON "agency"."campaigns" USING "gin" ("marketing_channels");



CREATE INDEX "idx_agency_campaigns_metadata" ON "agency"."campaigns" USING "gin" ("metadata");



CREATE INDEX "idx_agency_campaigns_org_client" ON "agency"."campaigns" USING "btree" ("org_id", "client_id", "archived_at");



CREATE INDEX "idx_agency_campaigns_parent" ON "agency"."campaigns" USING "btree" ("parent_campaign_id") WHERE ("parent_campaign_id" IS NOT NULL);



CREATE INDEX "idx_agency_campaigns_priority" ON "agency"."campaigns" USING "btree" ("client_id", "priority_level" DESC NULLS LAST, "created_at" DESC) WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_campaigns_status" ON "agency"."campaigns" USING "btree" ("status") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_campaigns_tags" ON "agency"."campaigns" USING "gin" ("tags");



CREATE INDEX "idx_agency_campaigns_updated_by" ON "agency"."campaigns" USING "btree" ("updated_by");



COMMENT ON INDEX "agency"."idx_agency_campaigns_updated_by" IS 'Foreign key index for updated_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_campaigns_white_label" ON "agency"."campaigns" USING "gin" ("white_label_config");



CREATE INDEX "idx_agency_client_intelligence_active" ON "agency"."client_intelligence" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_client_intelligence_archived" ON "agency"."client_intelligence" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_agency_client_intelligence_archived_by" ON "agency"."client_intelligence" USING "btree" ("archived_by");



CREATE INDEX "idx_agency_client_intelligence_client_id" ON "agency"."client_intelligence" USING "btree" ("client_id");



CREATE INDEX "idx_agency_client_intelligence_completeness" ON "agency"."client_intelligence" USING "btree" ("data_completeness_score") WHERE ("data_completeness_score" > 0);



CREATE INDEX "idx_agency_client_intelligence_created_by" ON "agency"."client_intelligence" USING "btree" ("created_by");



COMMENT ON INDEX "agency"."idx_agency_client_intelligence_created_by" IS 'Foreign key index for created_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_client_intelligence_org_id" ON "agency"."client_intelligence" USING "btree" ("org_id");



CREATE INDEX "idx_agency_client_intelligence_updated_by" ON "agency"."client_intelligence" USING "btree" ("updated_by");



COMMENT ON INDEX "agency"."idx_agency_client_intelligence_updated_by" IS 'Foreign key index for updated_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_clients_active" ON "agency"."clients" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_clients_archived" ON "agency"."clients" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_agency_clients_archived_by" ON "agency"."clients" USING "btree" ("archived_by");



CREATE INDEX "idx_agency_clients_created_by" ON "agency"."clients" USING "btree" ("created_by");



CREATE INDEX "idx_agency_clients_org_id" ON "agency"."clients" USING "btree" ("org_id");



CREATE INDEX "idx_agency_clients_org_lookup" ON "agency"."clients" USING "btree" ("org_id") WHERE (("org_id" IS NOT NULL) AND ("archived_at" IS NULL));



CREATE INDEX "idx_agency_clients_updated_by" ON "agency"."clients" USING "btree" ("updated_by");



CREATE INDEX "idx_agency_conversations_archived_by" ON "agency"."agent_conversations" USING "btree" ("archived_by");



COMMENT ON INDEX "agency"."idx_agency_conversations_archived_by" IS 'Foreign key index for archived_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_conversations_campaign_id" ON "agency"."agent_conversations" USING "btree" ("campaign_id");



COMMENT ON INDEX "agency"."idx_agency_conversations_campaign_id" IS 'Foreign key index for campaign_id. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_conversations_client" ON "agency"."agent_conversations" USING "btree" ("client_id", "agent_type");



CREATE INDEX "idx_agency_conversations_org_id" ON "agency"."agent_conversations" USING "btree" ("org_id");



COMMENT ON INDEX "agency"."idx_agency_conversations_org_id" IS 'Foreign key index for org_id. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_conversations_user" ON "agency"."agent_conversations" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_agency_messages_conversation" ON "agency"."agent_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_agency_outputs_archived_by" ON "agency"."agent_outputs" USING "btree" ("archived_by");



COMMENT ON INDEX "agency"."idx_agency_outputs_archived_by" IS 'Foreign key index for archived_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_outputs_campaign" ON "agency"."agent_outputs" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_agency_outputs_client" ON "agency"."agent_outputs" USING "btree" ("client_id", "agent_type");



CREATE INDEX "idx_agency_outputs_content" ON "agency"."agent_outputs" USING "gin" ("content");



CREATE INDEX "idx_agency_outputs_created_by" ON "agency"."agent_outputs" USING "btree" ("created_by");



COMMENT ON INDEX "agency"."idx_agency_outputs_created_by" IS 'Foreign key index for created_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_outputs_finalized" ON "agency"."agent_outputs" USING "btree" ("finalized_at") WHERE ("finalized_at" IS NOT NULL);



CREATE INDEX "idx_agency_outputs_org_id" ON "agency"."agent_outputs" USING "btree" ("org_id");



COMMENT ON INDEX "agency"."idx_agency_outputs_org_id" IS 'Foreign key index for org_id. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_outputs_output_type" ON "agency"."agent_outputs" USING "btree" ("output_type");



CREATE INDEX "idx_agency_outputs_previous_version" ON "agency"."agent_outputs" USING "btree" ("previous_version_id") WHERE ("previous_version_id" IS NOT NULL);



CREATE INDEX "idx_agency_outputs_session_id" ON "agency"."agent_outputs" USING "btree" ("session_id");



CREATE INDEX "idx_agency_outputs_type" ON "agency"."agent_outputs" USING "btree" ("agent_type", "created_at" DESC);



CREATE INDEX "idx_agency_outputs_updated_by" ON "agency"."agent_outputs" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "idx_agency_outputs_user_id" ON "agency"."agent_outputs" USING "btree" ("user_id");



CREATE INDEX "idx_agency_outputs_validated_by" ON "agency"."agent_outputs" USING "btree" ("validated_by") WHERE ("validated_by" IS NOT NULL);



CREATE INDEX "idx_agency_outputs_validation_status" ON "agency"."agent_outputs" USING "btree" ("validation_status");



CREATE INDEX "idx_agency_outputs_version" ON "agency"."agent_outputs" USING "btree" ("id", "version");



CREATE INDEX "idx_agency_personas_archived_by" ON "agency"."personas" USING "btree" ("archived_by");



COMMENT ON INDEX "agency"."idx_agency_personas_archived_by" IS 'Foreign key index for archived_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_personas_campaign" ON "agency"."personas" USING "btree" ("campaign_id") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_personas_client" ON "agency"."personas" USING "btree" ("client_id") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agency_personas_created_by" ON "agency"."personas" USING "btree" ("created_by");



COMMENT ON INDEX "agency"."idx_agency_personas_created_by" IS 'Foreign key index for created_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_personas_org_id" ON "agency"."personas" USING "btree" ("org_id");



COMMENT ON INDEX "agency"."idx_agency_personas_org_id" IS 'Foreign key index for org_id. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_agency_personas_primary" ON "agency"."personas" USING "btree" ("client_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_agency_personas_tags" ON "agency"."personas" USING "gin" ("tags");



CREATE INDEX "idx_agency_personas_updated_by" ON "agency"."personas" USING "btree" ("updated_by");



COMMENT ON INDEX "agency"."idx_agency_personas_updated_by" IS 'Foreign key index for updated_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_business_metrics_agency_gin" ON "agency"."client_intelligence" USING "gin" ("business_metrics");



CREATE UNIQUE INDEX "unique_agency_brand_default_per_client" ON "agency"."brand_guidelines" USING "btree" ("org_id", "client_id") WHERE (("is_default" = true) AND ("campaign_id" IS NULL) AND ("archived_at" IS NULL));



CREATE UNIQUE INDEX "cache_metrics_summary_org_idx" ON "public"."cache_metrics_summary" USING "btree" ("org_id");



CREATE UNIQUE INDEX "campaign_intelligence_org_null_client_idx" ON "public"."campaign_intelligence" USING "btree" ("org_id") WHERE ("client_id" IS NULL);



CREATE UNIQUE INDEX "core_business_data_org_null_client_idx" ON "public"."core_business_data" USING "btree" ("org_id") WHERE ("client_id" IS NULL);



CREATE UNIQUE INDEX "customer_intelligence_org_null_client_idx" ON "public"."customer_intelligence" USING "btree" ("org_id") WHERE ("client_id" IS NULL);



CREATE INDEX "idx_activity_actor" ON "public"."resource_activity" USING "btree" ("actor_id");



CREATE INDEX "idx_activity_client" ON "public"."resource_activity" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_activity_created" ON "public"."resource_activity" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_org" ON "public"."resource_activity" USING "btree" ("org_id");



CREATE INDEX "idx_activity_resource" ON "public"."resource_activity" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_activity_resource_created" ON "public"."resource_activity" USING "btree" ("resource_type", "resource_id", "created_at" DESC);



CREATE INDEX "idx_activity_type" ON "public"."resource_activity" USING "btree" ("activity_type");



CREATE INDEX "idx_agent_context_profiles_created_by" ON "public"."agent_context_profiles" USING "btree" ("created_by");



CREATE INDEX "idx_agent_context_profiles_updated_by" ON "public"."agent_context_profiles" USING "btree" ("updated_by");



CREATE INDEX "idx_agent_conversations_active" ON "public"."agent_conversations" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_conversations_agent_type_user" ON "public"."agent_conversations" USING "btree" ("agent_type", "user_id");



CREATE INDEX "idx_agent_conversations_archived" ON "public"."agent_conversations" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_agent_conversations_archived_by" ON "public"."agent_conversations" USING "btree" ("archived_by");



CREATE INDEX "idx_agent_conversations_client_id" ON "public"."agent_conversations" USING "btree" ("client_id");



CREATE INDEX "idx_agent_conversations_created_by" ON "public"."agent_conversations" USING "btree" ("created_by");



CREATE INDEX "idx_agent_conversations_org_client" ON "public"."agent_conversations" USING "btree" ("org_id", "client_id");



CREATE INDEX "idx_agent_conversations_org_id" ON "public"."agent_conversations" USING "btree" ("org_id");



CREATE INDEX "idx_agent_conversations_session_data" ON "public"."agent_conversations" USING "gin" ("session_data");



CREATE INDEX "idx_agent_conversations_updated_at" ON "public"."agent_conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_agent_conversations_updated_by" ON "public"."agent_conversations" USING "btree" ("updated_by");



CREATE INDEX "idx_agent_conversations_user_id" ON "public"."agent_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_agent_messages_active" ON "public"."agent_messages" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_messages_archived" ON "public"."agent_messages" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_agent_messages_archived_by" ON "public"."agent_messages" USING "btree" ("archived_by");



CREATE INDEX "idx_agent_messages_conversation_id" ON "public"."agent_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_agent_messages_created_by" ON "public"."agent_messages" USING "btree" ("created_by");



CREATE INDEX "idx_agent_messages_updated_by" ON "public"."agent_messages" USING "btree" ("updated_by");



CREATE INDEX "idx_agent_outputs_active" ON "public"."agent_outputs" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_outputs_agent_type" ON "public"."agent_outputs" USING "btree" ("agent_type");



CREATE INDEX "idx_agent_outputs_approved_by" ON "public"."agent_outputs" USING "btree" ("approved_by") WHERE ("approved_by" IS NOT NULL);



CREATE INDEX "idx_agent_outputs_archived_by" ON "public"."agent_outputs" USING "btree" ("archived_by");



CREATE INDEX "idx_agent_outputs_campaign_id" ON "public"."agent_outputs" USING "btree" ("campaign_id");



CREATE INDEX "idx_agent_outputs_client_type" ON "public"."agent_outputs" USING "btree" ("client_id", "agent_type", "output_type") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_agent_outputs_content_gin" ON "public"."agent_outputs" USING "gin" ("content");



CREATE INDEX "idx_agent_outputs_created_at" ON "public"."agent_outputs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_agent_outputs_created_by" ON "public"."agent_outputs" USING "btree" ("created_by");



CREATE INDEX "idx_agent_outputs_org_agent_created" ON "public"."agent_outputs" USING "btree" ("org_id", "agent_type", "created_at" DESC);



CREATE INDEX "idx_agent_outputs_org_campaign" ON "public"."agent_outputs" USING "btree" ("org_id", "campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_agent_outputs_org_client" ON "public"."agent_outputs" USING "btree" ("org_id", "client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_agent_outputs_org_created" ON "public"."agent_outputs" USING "btree" ("org_id", "created_at" DESC) WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_outputs_org_id" ON "public"."agent_outputs" USING "btree" ("org_id");



CREATE INDEX "idx_agent_outputs_org_status_active" ON "public"."agent_outputs" USING "btree" ("org_id", "status") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_outputs_output_type" ON "public"."agent_outputs" USING "btree" ("output_type");



CREATE INDEX "idx_agent_outputs_performance_intelligence" ON "public"."agent_outputs" USING "btree" ("org_id", "output_type", "created_at" DESC) WHERE (("agent_type" = 'performance_intelligence'::"text") AND ("archived_at" IS NULL));



CREATE INDEX "idx_agent_outputs_previous_version" ON "public"."agent_outputs" USING "btree" ("previous_version_id");



CREATE INDEX "idx_agent_outputs_quick_wins_area" ON "public"."agent_outputs" USING "btree" ((("content" ->> 'challenge_area'::"text"))) WHERE (("agent_type" = 'performance_intelligence'::"text") AND ("output_type" = 'quick_wins'::"text"));



CREATE INDEX "idx_agent_outputs_quick_wins_category" ON "public"."agent_outputs" USING "btree" ("org_id", "category") WHERE (("agent_type" = 'quick_wins'::"text") AND ("archived_at" IS NULL));



CREATE INDEX "idx_agent_outputs_quick_wins_composite" ON "public"."agent_outputs" USING "btree" ("org_id", "agent_type", "priority", "category", "status", "created_at" DESC) WHERE (("agent_type" = 'quick_wins'::"text") AND ("archived_at" IS NULL));



COMMENT ON INDEX "public"."idx_agent_outputs_quick_wins_composite" IS 'Optimizes common query pattern: filtering by org + agent_type + priority/category/status + ordering by created_at';



CREATE INDEX "idx_agent_outputs_quick_wins_priority" ON "public"."agent_outputs" USING "btree" ("org_id", "priority") WHERE (("agent_type" = 'quick_wins'::"text") AND ("archived_at" IS NULL));



CREATE INDEX "idx_agent_outputs_quick_wins_status" ON "public"."agent_outputs" USING "btree" ("org_id", "status") WHERE (("agent_type" = 'quick_wins'::"text") AND ("archived_at" IS NULL));



CREATE INDEX "idx_agent_outputs_roi_campaign_name" ON "public"."agent_outputs" USING "btree" ((("content" ->> 'campaign_name'::"text"))) WHERE (("agent_type" = 'performance_intelligence'::"text") AND ("output_type" = 'roi_calculation'::"text"));



CREATE INDEX "idx_agent_outputs_search" ON "public"."agent_outputs" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("summary", ''::"text"))));



CREATE INDEX "idx_agent_outputs_session_id" ON "public"."agent_outputs" USING "btree" ("session_id");



CREATE INDEX "idx_agent_outputs_status" ON "public"."agent_outputs" USING "btree" ("status");



CREATE INDEX "idx_agent_outputs_text_search" ON "public"."agent_outputs" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || "summary"))) WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_agent_outputs_updated_by" ON "public"."agent_outputs" USING "btree" ("updated_by");



CREATE INDEX "idx_agent_outputs_user_id" ON "public"."agent_outputs" USING "btree" ("user_id");



CREATE INDEX "idx_agent_outputs_validated_by" ON "public"."agent_outputs" USING "btree" ("validated_by");



CREATE INDEX "idx_agent_outputs_validation_status" ON "public"."agent_outputs" USING "btree" ("validation_status");



CREATE INDEX "idx_ai_insights_active" ON "public"."ai_insights" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_ai_insights_archived" ON "public"."ai_insights" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_ai_insights_archived_by" ON "public"."ai_insights" USING "btree" ("archived_by");



CREATE INDEX "idx_ai_insights_campaign_id" ON "public"."ai_insights" USING "btree" ("campaign_id");



CREATE INDEX "idx_ai_insights_category_gin" ON "public"."ai_insights" USING "gin" ("category");



CREATE INDEX "idx_ai_insights_confidence" ON "public"."ai_insights" USING "btree" ("confidence_score" DESC);



CREATE INDEX "idx_ai_insights_contains_pii" ON "public"."ai_insights" USING "btree" ("contains_pii");



CREATE INDEX "idx_ai_insights_content_gin" ON "public"."ai_insights" USING "gin" ("content");



CREATE INDEX "idx_ai_insights_created_at" ON "public"."ai_insights" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_insights_created_by" ON "public"."ai_insights" USING "btree" ("created_by");



CREATE INDEX "idx_ai_insights_extraction" ON "public"."ai_insights" USING "btree" ("org_id", "source_agent", "validation_status", "created_at" DESC);



CREATE INDEX "idx_ai_insights_impact" ON "public"."ai_insights" USING "btree" ("impact_score" DESC);



CREATE INDEX "idx_ai_insights_learning" ON "public"."ai_insights" USING "btree" ("org_id", "insight_type", "created_at" DESC) WHERE ("insight_type" = 'learning'::"text");



CREATE INDEX "idx_ai_insights_org_id" ON "public"."ai_insights" USING "btree" ("org_id");



CREATE INDEX "idx_ai_insights_previous_version" ON "public"."ai_insights" USING "btree" ("previous_version_id");



CREATE INDEX "idx_ai_insights_session_id" ON "public"."ai_insights" USING "btree" ("session_id");



CREATE INDEX "idx_ai_insights_source_agent" ON "public"."ai_insights" USING "btree" ("source_agent");



CREATE INDEX "idx_ai_insights_updated_by" ON "public"."ai_insights" USING "btree" ("updated_by");



CREATE INDEX "idx_ai_insights_user_id" ON "public"."ai_insights" USING "btree" ("user_id");



CREATE INDEX "idx_ai_insights_validated_by" ON "public"."ai_insights" USING "btree" ("validated_by");



CREATE INDEX "idx_ai_insights_validation_status" ON "public"."ai_insights" USING "btree" ("validation_status");



CREATE INDEX "idx_alpha_invites_email_lower" ON "public"."alpha_invites" USING "btree" ("lower"("email"));



CREATE INDEX "idx_alpha_invites_status" ON "public"."alpha_invites" USING "btree" ("status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_alpha_invites_used_by" ON "public"."alpha_invites" USING "btree" ("used_by");



CREATE INDEX "idx_approval_history_approval_request_id" ON "public"."approval_history" USING "btree" ("approval_request_id");



CREATE INDEX "idx_approval_history_assigned_to" ON "public"."approval_history" USING "btree" ("assigned_to");



CREATE INDEX "idx_approval_history_client_id" ON "public"."approval_history" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_approval_history_org" ON "public"."approval_history" USING "btree" ("org_id");



CREATE INDEX "idx_approval_history_requested_by" ON "public"."approval_history" USING "btree" ("requested_by");



CREATE INDEX "idx_approval_history_resolved_by" ON "public"."approval_history" USING "btree" ("resolved_by") WHERE ("resolved_by" IS NOT NULL);



CREATE INDEX "idx_approval_history_resource" ON "public"."approval_history" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_approval_history_round" ON "public"."approval_history" USING "btree" ("resource_id", "round_number");



CREATE INDEX "idx_approval_requests_assigned" ON "public"."approval_requests" USING "btree" ("assigned_to", "status");



CREATE INDEX "idx_approval_requests_client" ON "public"."approval_requests" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_approval_requests_enriched_assigned_to" ON "public"."approval_requests_enriched" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_approval_requests_enriched_created_at" ON "public"."approval_requests_enriched" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_approval_requests_enriched_id" ON "public"."approval_requests_enriched" USING "btree" ("id");



CREATE INDEX "idx_approval_requests_enriched_org_status" ON "public"."approval_requests_enriched" USING "btree" ("org_id", "status");



CREATE INDEX "idx_approval_requests_enriched_requested_by" ON "public"."approval_requests_enriched" USING "btree" ("requested_by");



CREATE INDEX "idx_approval_requests_org" ON "public"."approval_requests" USING "btree" ("org_id");



CREATE INDEX "idx_approval_requests_requested" ON "public"."approval_requests" USING "btree" ("requested_by", "status");



CREATE INDEX "idx_approval_requests_resolved_by" ON "public"."approval_requests" USING "btree" ("resolved_by") WHERE ("resolved_by" IS NOT NULL);



CREATE INDEX "idx_approval_requests_resource" ON "public"."approval_requests" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_approved_outputs_approved_at" ON "public"."approved_outputs_library" USING "btree" ("approved_at" DESC);



CREATE INDEX "idx_approved_outputs_campaign" ON "public"."approved_outputs_library" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_approved_outputs_client" ON "public"."approved_outputs_library" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_approved_outputs_id_source" ON "public"."approved_outputs_library" USING "btree" ("id", "schema_source");



CREATE INDEX "idx_approved_outputs_org_type" ON "public"."approved_outputs_library" USING "btree" ("org_id", "agent_type");



CREATE INDEX "idx_audit_log_action" ON "public"."permission_audit_log" USING "btree" ("action");



CREATE INDEX "idx_audit_log_created_at" ON "public"."permission_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_org_id" ON "public"."permission_audit_log" USING "btree" ("org_id");



CREATE INDEX "idx_audit_log_resource" ON "public"."permission_audit_log" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_audit_log_user_id" ON "public"."permission_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_brand_guidelines_archived" ON "public"."brand_guidelines" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_brand_guidelines_archived_by" ON "public"."brand_guidelines" USING "btree" ("archived_by");



CREATE INDEX "idx_brand_guidelines_brand_voice" ON "public"."brand_guidelines" USING "gin" ((("guidelines" -> 'brand_voice'::"text")));



CREATE INDEX "idx_brand_guidelines_campaign" ON "public"."brand_guidelines" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_brand_guidelines_created_by" ON "public"."brand_guidelines" USING "btree" ("created_by");



CREATE INDEX "idx_brand_guidelines_default" ON "public"."brand_guidelines" USING "btree" ("org_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_brand_guidelines_guidelines" ON "public"."brand_guidelines" USING "gin" ("guidelines");



CREATE INDEX "idx_brand_guidelines_messaging" ON "public"."brand_guidelines" USING "gin" ((("guidelines" -> 'messaging'::"text")));



CREATE INDEX "idx_brand_guidelines_org" ON "public"."brand_guidelines" USING "btree" ("org_id");



CREATE INDEX "idx_brand_guidelines_parent_id" ON "public"."brand_guidelines" USING "btree" ("parent_id");



CREATE INDEX "idx_brand_guidelines_updated_by" ON "public"."brand_guidelines" USING "btree" ("updated_by");



CREATE INDEX "idx_business_metrics_gin" ON "public"."core_business_data" USING "gin" ("business_metrics");



COMMENT ON INDEX "public"."idx_business_metrics_gin" IS 'GIN index for fast JSONB queries on business_metrics column.
Enables efficient queries like:
- Find all orgs with churn_rate metric
- Query metrics by category
- Search by metric aliases
Expected performance: <5ms for 100+ metrics per org';



CREATE INDEX "idx_cache_refresh_queue_expires_at" ON "public"."cache_refresh_queue" USING "btree" ("expires_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_cache_refresh_queue_org_agent" ON "public"."cache_refresh_queue" USING "btree" ("org_id", "agent_type");



CREATE INDEX "idx_cache_refresh_queue_refresh_scheduled" ON "public"."cache_refresh_queue" USING "btree" ("refresh_scheduled_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_campaign_alerts_acknowledged" ON "public"."campaign_alerts" USING "btree" ("acknowledged");



CREATE INDEX "idx_campaign_alerts_acknowledged_by" ON "public"."campaign_alerts" USING "btree" ("acknowledged_by");



CREATE INDEX "idx_campaign_alerts_campaign_id" ON "public"."campaign_alerts" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_alerts_created_at" ON "public"."campaign_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_campaign_alerts_org_id" ON "public"."campaign_alerts" USING "btree" ("org_id");



CREATE INDEX "idx_campaign_alerts_severity" ON "public"."campaign_alerts" USING "btree" ("severity");



CREATE INDEX "idx_campaign_intelligence_campaign_id" ON "public"."campaign_intelligence" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_intelligence_client_id" ON "public"."campaign_intelligence" USING "btree" ("client_id");



COMMENT ON INDEX "public"."idx_campaign_intelligence_client_id" IS 'Foreign key index for client_id. Improves multi-tenant queries and CASCADE performance. Migration 176.';



CREATE INDEX "idx_campaign_intelligence_created_by" ON "public"."campaign_intelligence" USING "btree" ("created_by");



CREATE INDEX "idx_campaign_intelligence_org_id" ON "public"."campaign_intelligence" USING "btree" ("org_id");



CREATE INDEX "idx_campaign_intelligence_updated_by" ON "public"."campaign_intelligence" USING "btree" ("updated_by");



CREATE INDEX "idx_campaign_metrics_campaign" ON "public"."campaign_metrics" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_campaign_metrics_campaign_name" ON "public"."campaign_metrics" USING "gin" ("to_tsvector"('"english"'::"regconfig", "campaign_name"));



CREATE INDEX "idx_campaign_metrics_conversion_goal" ON "public"."campaign_metrics" USING "btree" ("org_id", "conversion_goal") WHERE ("conversion_goal" IS NOT NULL);



CREATE INDEX "idx_campaign_metrics_created_by" ON "public"."campaign_metrics" USING "btree" ("created_by");



CREATE INDEX "idx_campaign_metrics_date_range" ON "public"."campaign_metrics" USING "btree" ("metric_date" DESC);



CREATE INDEX "idx_campaign_metrics_engagement" ON "public"."campaign_metrics" USING "btree" ("org_id", "likes", "shares", "comments") WHERE (("likes" > 0) OR ("shares" > 0) OR ("comments" > 0));



CREATE INDEX "idx_campaign_metrics_org_date" ON "public"."campaign_metrics" USING "btree" ("org_id", "metric_date" DESC);



CREATE INDEX "idx_campaign_metrics_source" ON "public"."campaign_metrics" USING "btree" ("org_id", "source") WHERE ("source" IS NOT NULL);



CREATE INDEX "idx_campaign_metrics_updated_by" ON "public"."campaign_metrics" USING "btree" ("updated_by");



CREATE INDEX "idx_campaign_metrics_video_views" ON "public"."campaign_metrics" USING "btree" ("org_id", "video_views") WHERE (("video_views" IS NOT NULL) AND ("video_views" > 0));



CREATE INDEX "idx_campaigns_active" ON "public"."campaigns" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_campaigns_archived" ON "public"."campaigns" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_campaigns_archived_by" ON "public"."campaigns" USING "btree" ("archived_by");



CREATE INDEX "idx_campaigns_campaign_type" ON "public"."campaigns" USING "btree" ("campaign_type") WHERE ("campaign_type" IS NOT NULL);



CREATE INDEX "idx_campaigns_client" ON "public"."campaigns" USING "btree" ("client_id", "org_id", "archived_at") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_campaigns_client_id" ON "public"."campaigns" USING "btree" ("client_id");



CREATE INDEX "idx_campaigns_created_by" ON "public"."campaigns" USING "btree" ("created_by");



CREATE INDEX "idx_campaigns_dates" ON "public"."campaigns" USING "btree" ("org_id", "start_date", "end_date") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_campaigns_marketing_channels" ON "public"."campaigns" USING "gin" ("marketing_channels");



CREATE INDEX "idx_campaigns_metadata" ON "public"."campaigns" USING "gin" ("metadata");



CREATE INDEX "idx_campaigns_org_id" ON "public"."campaigns" USING "btree" ("org_id");



CREATE INDEX "idx_campaigns_org_priority_archived" ON "public"."campaigns" USING "btree" ("org_id", "priority_level" DESC NULLS LAST, "created_at" DESC) WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_campaigns_org_status_lookup" ON "public"."campaigns" USING "btree" ("org_id", "status") WHERE (("org_id" IS NOT NULL) AND ("archived_at" IS NULL));



CREATE INDEX "idx_campaigns_planned" ON "public"."campaigns" USING "btree" ("org_id", "created_at" DESC) WHERE (("status" = 'planned'::"text") AND ("archived_at" IS NULL));



COMMENT ON INDEX "public"."idx_campaigns_planned" IS 'Optimizes queries for planned campaigns in campaigns list and sidebar';



CREATE INDEX "idx_campaigns_priority_level" ON "public"."campaigns" USING "btree" ("priority_level");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_campaigns_tags" ON "public"."campaigns" USING "gin" ("tags");



CREATE INDEX "idx_campaigns_updated_by" ON "public"."campaigns" USING "btree" ("updated_by");



CREATE UNIQUE INDEX "idx_client_metrics_cache_client" ON "public"."client_metrics_cache" USING "btree" ("client_id");



CREATE INDEX "idx_clients_active" ON "public"."clients" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_clients_archived" ON "public"."clients" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_clients_archived_by" ON "public"."clients" USING "btree" ("archived_by");



CREATE INDEX "idx_clients_created_by" ON "public"."clients" USING "btree" ("created_by");



CREATE INDEX "idx_clients_org_id" ON "public"."clients" USING "btree" ("org_id");



CREATE INDEX "idx_clients_org_lookup" ON "public"."clients" USING "btree" ("org_id") WHERE (("org_id" IS NOT NULL) AND ("archived_at" IS NULL));



CREATE INDEX "idx_clients_updated_by" ON "public"."clients" USING "btree" ("updated_by");



CREATE INDEX "idx_comments_author" ON "public"."resource_comments" USING "btree" ("author_id");



CREATE INDEX "idx_comments_client" ON "public"."resource_comments" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_comments_mentions" ON "public"."resource_comments" USING "gin" ("mentioned_users") WHERE ("mentioned_users" IS NOT NULL);



CREATE INDEX "idx_comments_org" ON "public"."resource_comments" USING "btree" ("org_id");



CREATE INDEX "idx_comments_parent" ON "public"."resource_comments" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_comments_resource" ON "public"."resource_comments" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_conflicts_org_id" ON "public"."intelligence_conflicts" USING "btree" ("org_id");



CREATE INDEX "idx_conflicts_status" ON "public"."intelligence_conflicts" USING "btree" ("status");



CREATE INDEX "idx_content_plans_archived_at" ON "public"."content_plans" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_content_plans_archived_by" ON "public"."content_plans" USING "btree" ("archived_by");



CREATE INDEX "idx_content_plans_campaign_id" ON "public"."content_plans" USING "btree" ("campaign_id");



CREATE INDEX "idx_content_plans_org_id" ON "public"."content_plans" USING "btree" ("org_id");



CREATE INDEX "idx_content_plans_session_id" ON "public"."content_plans" USING "btree" ("session_id");



CREATE INDEX "idx_content_plans_user_id" ON "public"."content_plans" USING "btree" ("user_id");



CREATE INDEX "idx_core_business_data_active" ON "public"."core_business_data" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_core_business_data_archived" ON "public"."core_business_data" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_core_business_data_archived_by" ON "public"."core_business_data" USING "btree" ("archived_by");



CREATE INDEX "idx_core_business_data_client_id" ON "public"."core_business_data" USING "btree" ("client_id");



COMMENT ON INDEX "public"."idx_core_business_data_client_id" IS 'Foreign key index for client_id. Improves multi-tenant queries and CASCADE performance. Migration 176.';



CREATE INDEX "idx_core_business_data_created_by" ON "public"."core_business_data" USING "btree" ("created_by");



CREATE INDEX "idx_core_business_data_updated_by" ON "public"."core_business_data" USING "btree" ("updated_by");



CREATE INDEX "idx_core_business_org_id" ON "public"."core_business_data" USING "btree" ("org_id");



CREATE INDEX "idx_core_business_org_updated" ON "public"."core_business_data" USING "btree" ("org_id", "updated_at" DESC);



CREATE INDEX "idx_cost_tracking_agent_type" ON "public"."gemini_cost_tracking" USING "btree" ("agent_type", "timestamp" DESC);



CREATE INDEX "idx_cost_tracking_complexity" ON "public"."gemini_cost_tracking" USING "btree" ("query_complexity");



CREATE INDEX "idx_cost_tracking_org_timestamp" ON "public"."gemini_cost_tracking" USING "btree" ("org_id", "timestamp" DESC);



CREATE INDEX "idx_customer_intelligence_client_id" ON "public"."customer_intelligence" USING "btree" ("client_id");



COMMENT ON INDEX "public"."idx_customer_intelligence_client_id" IS 'Foreign key index for client_id. Improves multi-tenant queries and CASCADE performance. Migration 176.';



CREATE INDEX "idx_customer_intelligence_created_by" ON "public"."customer_intelligence" USING "btree" ("created_by");



CREATE INDEX "idx_customer_intelligence_org_id" ON "public"."customer_intelligence" USING "btree" ("org_id");



CREATE INDEX "idx_customer_intelligence_updated_by" ON "public"."customer_intelligence" USING "btree" ("updated_by");



CREATE INDEX "idx_dashboard_recommendation_cache_expires" ON "public"."dashboard_recommendation_cache" USING "btree" ("cache_expires_at");



CREATE INDEX "idx_dashboard_recommendation_cache_org_hash" ON "public"."dashboard_recommendation_cache" USING "btree" ("org_id", "data_hash");



CREATE INDEX "idx_document_chunks_active" ON "public"."document_chunks" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_document_chunks_archived" ON "public"."document_chunks" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_document_chunks_archived_by" ON "public"."document_chunks" USING "btree" ("archived_by");



CREATE INDEX "idx_document_chunks_created_by" ON "public"."document_chunks" USING "btree" ("created_by");



CREATE INDEX "idx_document_chunks_document_id" ON "public"."document_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_document_chunks_updated_by" ON "public"."document_chunks" USING "btree" ("updated_by");



CREATE INDEX "idx_documents_active" ON "public"."documents" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_documents_archived" ON "public"."documents" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_documents_archived_by" ON "public"."documents" USING "btree" ("archived_by");



CREATE INDEX "idx_documents_created_by" ON "public"."documents" USING "btree" ("created_by");



CREATE INDEX "idx_documents_org_id" ON "public"."documents" USING "btree" ("org_id");



CREATE INDEX "idx_documents_updated_by" ON "public"."documents" USING "btree" ("updated_by");



CREATE INDEX "idx_documents_user_id" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_enterprise_rel_org" ON "public"."enterprise_relationships" USING "btree" ("org_id");



CREATE INDEX "idx_enterprise_rel_source" ON "public"."enterprise_relationships" USING "btree" ("source_type", "source_id");



CREATE INDEX "idx_enterprise_rel_target" ON "public"."enterprise_relationships" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_enterprise_rel_type" ON "public"."enterprise_relationships" USING "btree" ("relationship_type");



CREATE INDEX "idx_enterprise_relationships_active" ON "public"."enterprise_relationships" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_enterprise_relationships_archived" ON "public"."enterprise_relationships" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_enterprise_relationships_archived_by" ON "public"."enterprise_relationships" USING "btree" ("archived_by");



CREATE INDEX "idx_enterprise_relationships_created_by" ON "public"."enterprise_relationships" USING "btree" ("created_by");



CREATE INDEX "idx_enterprise_relationships_updated_by" ON "public"."enterprise_relationships" USING "btree" ("updated_by");



CREATE INDEX "idx_extraction_metrics_org_date" ON "public"."insight_extraction_metrics" USING "btree" ("org_id", "extraction_date" DESC);



CREATE INDEX "idx_intelligence_conflicts_active" ON "public"."intelligence_conflicts" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_intelligence_conflicts_archived" ON "public"."intelligence_conflicts" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_intelligence_conflicts_archived_by" ON "public"."intelligence_conflicts" USING "btree" ("archived_by");



CREATE INDEX "idx_intelligence_conflicts_created_by" ON "public"."intelligence_conflicts" USING "btree" ("created_by");



CREATE INDEX "idx_intelligence_conflicts_resolved_by" ON "public"."intelligence_conflicts" USING "btree" ("resolved_by");



CREATE INDEX "idx_intelligence_conflicts_updated_by" ON "public"."intelligence_conflicts" USING "btree" ("updated_by");



CREATE INDEX "idx_interview_sessions_created" ON "public"."persona_interview_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_interview_sessions_org" ON "public"."persona_interview_sessions" USING "btree" ("org_id");



CREATE INDEX "idx_interview_sessions_persona" ON "public"."persona_interview_sessions" USING "btree" ("persona_id");



CREATE INDEX "idx_invitation_requests_email_lower" ON "public"."invitation_requests" USING "btree" ("lower"("email"));



CREATE INDEX "idx_invitation_requests_requested_at" ON "public"."invitation_requests" USING "btree" ("requested_at" DESC);



CREATE INDEX "idx_invitation_requests_reviewed_by" ON "public"."invitation_requests" USING "btree" ("reviewed_by");



CREATE INDEX "idx_invitation_requests_status" ON "public"."invitation_requests" USING "btree" ("status");



CREATE INDEX "idx_market_intelligence_client_id" ON "public"."market_intelligence" USING "btree" ("client_id");



COMMENT ON INDEX "public"."idx_market_intelligence_client_id" IS 'Foreign key index for client_id. Improves multi-tenant queries and CASCADE performance. Migration 176.';



CREATE INDEX "idx_market_intelligence_created_by" ON "public"."market_intelligence" USING "btree" ("created_by");



CREATE INDEX "idx_market_intelligence_org_id" ON "public"."market_intelligence" USING "btree" ("org_id");



CREATE INDEX "idx_market_intelligence_updated_by" ON "public"."market_intelligence" USING "btree" ("updated_by");



CREATE INDEX "idx_marketing_strategies_active" ON "public"."marketing_strategies" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_marketing_strategies_archived" ON "public"."marketing_strategies" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_marketing_strategies_archived_by" ON "public"."marketing_strategies" USING "btree" ("archived_by");



CREATE INDEX "idx_marketing_strategies_campaign_id" ON "public"."marketing_strategies" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_marketing_strategies_created_by" ON "public"."marketing_strategies" USING "btree" ("created_by");



CREATE INDEX "idx_marketing_strategies_metadata" ON "public"."marketing_strategies" USING "gin" ("metadata");



CREATE INDEX "idx_marketing_strategies_org_archived" ON "public"."marketing_strategies" USING "btree" ("org_id", "archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_marketing_strategies_org_campaign" ON "public"."marketing_strategies" USING "btree" ("org_id", "campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_marketing_strategies_org_id" ON "public"."marketing_strategies" USING "btree" ("org_id");



CREATE INDEX "idx_marketing_strategies_org_no_campaign" ON "public"."marketing_strategies" USING "btree" ("org_id", "created_at" DESC) WHERE ("campaign_id" IS NULL);



CREATE INDEX "idx_marketing_strategies_status" ON "public"."marketing_strategies" USING "btree" ("status");



CREATE INDEX "idx_marketing_strategies_title" ON "public"."marketing_strategies" USING "btree" ("title");



CREATE INDEX "idx_marketing_strategies_type" ON "public"."marketing_strategies" USING "btree" ("strategy_type");



CREATE INDEX "idx_marketing_strategies_updated_by" ON "public"."marketing_strategies" USING "btree" ("updated_by");



CREATE INDEX "idx_marketing_strategy_brand_guidelines_brand_id" ON "public"."marketing_strategy_brand_guidelines" USING "btree" ("brand_guidelines_id");



CREATE INDEX "idx_marketing_strategy_brand_guidelines_created_by" ON "public"."marketing_strategy_brand_guidelines" USING "btree" ("created_by");



CREATE INDEX "idx_marketing_strategy_brand_guidelines_updated_by" ON "public"."marketing_strategy_brand_guidelines" USING "btree" ("updated_by");



CREATE INDEX "idx_marketing_strategy_personas_created_by" ON "public"."marketing_strategy_personas" USING "btree" ("created_by");



CREATE INDEX "idx_marketing_strategy_personas_persona" ON "public"."marketing_strategy_personas" USING "btree" ("persona_id");



CREATE INDEX "idx_marketing_strategy_personas_strategy" ON "public"."marketing_strategy_personas" USING "btree" ("strategy_id");



CREATE INDEX "idx_marketing_strategy_personas_updated_by" ON "public"."marketing_strategy_personas" USING "btree" ("updated_by");



CREATE UNIQUE INDEX "idx_mv_output_hub_summary_org" ON "public"."mv_output_hub_summary" USING "btree" ("org_id");



CREATE INDEX "idx_notification_push_deliveries_device" ON "public"."notification_push_deliveries" USING "btree" ("push_device_id", "created_at" DESC);



CREATE INDEX "idx_notification_push_deliveries_notification" ON "public"."notification_push_deliveries" USING "btree" ("notification_id", "created_at" DESC);



CREATE INDEX "idx_notification_push_deliveries_status" ON "public"."notification_push_deliveries" USING "btree" ("status", "last_attempted_at", "created_at");



CREATE INDEX "idx_notifications_org" ON "public"."notifications" USING "btree" ("org_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_organizations_active" ON "public"."organizations" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_organizations_archived" ON "public"."organizations" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_organizations_archived_by" ON "public"."organizations" USING "btree" ("archived_by");



CREATE INDEX "idx_organizations_created_by" ON "public"."organizations" USING "btree" ("created_by");



CREATE INDEX "idx_organizations_grace_period" ON "public"."organizations" USING "btree" ("grace_period_ends_at") WHERE ("grace_period_ends_at" IS NOT NULL);



CREATE INDEX "idx_organizations_stripe_customer_id" ON "public"."organizations" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_organizations_stripe_subscription_id" ON "public"."organizations" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "idx_organizations_updated_by" ON "public"."organizations" USING "btree" ("updated_by");



CREATE INDEX "idx_performance_metrics_name_time" ON "public"."performance_metrics" USING "btree" ("metric_name", "measured_at" DESC);



CREATE INDEX "idx_performance_metrics_org_type_time" ON "public"."performance_metrics" USING "btree" ("org_id", "metric_type", "measured_at" DESC);



CREATE INDEX "idx_performance_metrics_recent" ON "public"."performance_metrics" USING "btree" ("measured_at" DESC) WHERE ("measured_at" > '2025-01-01 00:00:00+00'::timestamp with time zone);



CREATE INDEX "idx_persona_interactions_active" ON "public"."persona_interactions" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_persona_interactions_archived" ON "public"."persona_interactions" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_persona_interactions_archived_by" ON "public"."persona_interactions" USING "btree" ("archived_by");



CREATE INDEX "idx_persona_interactions_created_by" ON "public"."persona_interactions" USING "btree" ("created_by");



CREATE INDEX "idx_persona_interactions_org_id" ON "public"."persona_interactions" USING "btree" ("org_id");



CREATE INDEX "idx_persona_interactions_persona_id" ON "public"."persona_interactions" USING "btree" ("persona_id");



CREATE INDEX "idx_persona_interactions_session_id" ON "public"."persona_interactions" USING "btree" ("session_id");



CREATE INDEX "idx_persona_interactions_updated_by" ON "public"."persona_interactions" USING "btree" ("updated_by");



CREATE INDEX "idx_persona_interview_sessions_active" ON "public"."persona_interview_sessions" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_persona_interview_sessions_archived" ON "public"."persona_interview_sessions" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_persona_interview_sessions_archived_by" ON "public"."persona_interview_sessions" USING "btree" ("archived_by");



CREATE INDEX "idx_persona_interview_sessions_created_by" ON "public"."persona_interview_sessions" USING "btree" ("created_by");



CREATE INDEX "idx_persona_interview_sessions_updated_by" ON "public"."persona_interview_sessions" USING "btree" ("updated_by");



CREATE INDEX "idx_prerequisites_completed" ON "public"."campaign_plan_prerequisites" USING "btree" ("org_id", "plan_id", "completed") WHERE ("completed" = true);



CREATE INDEX "idx_prerequisites_org_plan" ON "public"."campaign_plan_prerequisites" USING "btree" ("org_id", "plan_id");



CREATE INDEX "idx_prerequisites_user" ON "public"."campaign_plan_prerequisites" USING "btree" ("user_id");



CREATE INDEX "idx_push_devices_dispatch_ready" ON "public"."push_devices" USING "btree" ("platform", "environment", "updated_at" DESC) WHERE (("is_active" = true) AND ("authorization_status" = ANY (ARRAY['authorized'::"text", 'provisional'::"text", 'ephemeral'::"text"])));



CREATE INDEX "idx_push_devices_last_seen_at" ON "public"."push_devices" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_push_devices_user_id" ON "public"."push_devices" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_recommendations_cache_expires" ON "public"."recommendations_cache" USING "btree" ("cache_expires_at");



CREATE INDEX "idx_recommendations_cache_org_type" ON "public"."recommendations_cache" USING "btree" ("org_id", "recommendation_type");



CREATE INDEX "idx_resource_comments_resolved_by" ON "public"."resource_comments" USING "btree" ("resolved_by") WHERE ("resolved_by" IS NOT NULL);



CREATE INDEX "idx_role_permissions_permission_id" ON "public"."role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_role_permissions_role_lookup" ON "public"."role_permissions" USING "btree" ("role_id") WHERE ("role_id" IS NOT NULL);



CREATE INDEX "idx_synthetic_personas_active" ON "public"."synthetic_personas" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_synthetic_personas_archived" ON "public"."synthetic_personas" USING "btree" ("org_id", "archived_at");



CREATE INDEX "idx_synthetic_personas_archived_by" ON "public"."synthetic_personas" USING "btree" ("archived_by");



CREATE INDEX "idx_synthetic_personas_buyer_journey" ON "public"."synthetic_personas" USING "gin" ("buyer_journey");



CREATE INDEX "idx_synthetic_personas_campaign" ON "public"."synthetic_personas" USING "btree" ("campaign_id", "org_id", "archived_at") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_synthetic_personas_campaign_primary" ON "public"."synthetic_personas" USING "btree" ("campaign_id", "is_primary", "org_id") WHERE (("is_primary" = true) AND ("campaign_id" IS NOT NULL));



CREATE INDEX "idx_synthetic_personas_created_by" ON "public"."synthetic_personas" USING "btree" ("created_by");



CREATE INDEX "idx_synthetic_personas_customer_status" ON "public"."synthetic_personas" USING "btree" ("customer_status");



CREATE INDEX "idx_synthetic_personas_location" ON "public"."synthetic_personas" USING "gin" ("location");



CREATE INDEX "idx_synthetic_personas_location_city" ON "public"."synthetic_personas" USING "btree" ((("location" ->> 'city'::"text")));



CREATE INDEX "idx_synthetic_personas_location_country" ON "public"."synthetic_personas" USING "btree" ((("location" ->> 'country'::"text")));



CREATE INDEX "idx_synthetic_personas_location_state" ON "public"."synthetic_personas" USING "btree" ((("location" ->> 'state_province'::"text")));



CREATE INDEX "idx_synthetic_personas_org_archived" ON "public"."synthetic_personas" USING "btree" ("org_id", "archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_synthetic_personas_org_id" ON "public"."synthetic_personas" USING "btree" ("org_id");



CREATE INDEX "idx_synthetic_personas_primary" ON "public"."synthetic_personas" USING "btree" ("is_primary", "org_id", "archived_at") WHERE ("is_primary" = true);



CREATE INDEX "idx_synthetic_personas_tags" ON "public"."synthetic_personas" USING "gin" ("tags");



CREATE INDEX "idx_synthetic_personas_updated_by" ON "public"."synthetic_personas" USING "btree" ("updated_by");



CREATE INDEX "idx_synthetic_personas_vertical" ON "public"."synthetic_personas" USING "btree" ("vertical");



CREATE INDEX "idx_tasks_assigned_by" ON "public"."task_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."task_assignments" USING "btree" ("assigned_to", "status");



CREATE INDEX "idx_tasks_client" ON "public"."task_assignments" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_tasks_due_date" ON "public"."task_assignments" USING "btree" ("due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_tasks_org" ON "public"."task_assignments" USING "btree" ("org_id");



CREATE INDEX "idx_tasks_resource" ON "public"."task_assignments" USING "btree" ("related_resource_type", "related_resource_id") WHERE ("related_resource_type" IS NOT NULL);



CREATE INDEX "idx_team_invitations_email" ON "public"."team_invitations" USING "btree" ("email");



CREATE INDEX "idx_team_invitations_expires_at" ON "public"."team_invitations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_team_invitations_invited_by" ON "public"."team_invitations" USING "btree" ("invited_by");



COMMENT ON INDEX "public"."idx_team_invitations_invited_by" IS 'Foreign key index for invited_by. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_team_invitations_org_id" ON "public"."team_invitations" USING "btree" ("org_id");



CREATE INDEX "idx_team_invitations_role_id" ON "public"."team_invitations" USING "btree" ("role_id");



COMMENT ON INDEX "public"."idx_team_invitations_role_id" IS 'Foreign key index for role_id. Improves JOIN and CASCADE performance. Migration 176.';



CREATE INDEX "idx_team_invitations_status" ON "public"."team_invitations" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_team_invitations_unique_pending" ON "public"."team_invitations" USING "btree" ("org_id", "email") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_usage_tracking_created_by" ON "public"."usage_tracking" USING "btree" ("created_by");



CREATE INDEX "idx_usage_tracking_org_id" ON "public"."usage_tracking" USING "btree" ("org_id");



CREATE INDEX "idx_usage_tracking_updated_by" ON "public"."usage_tracking" USING "btree" ("updated_by");



CREATE INDEX "idx_usage_tracking_user_id" ON "public"."usage_tracking" USING "btree" ("user_id");



CREATE INDEX "idx_user_feedback_assigned_to" ON "public"."user_feedback" USING "btree" ("assigned_to");



CREATE INDEX "idx_user_feedback_category" ON "public"."user_feedback" USING "btree" ("category");



CREATE INDEX "idx_user_feedback_category_status" ON "public"."user_feedback" USING "btree" ("category", "status");



CREATE INDEX "idx_user_feedback_created_at" ON "public"."user_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_feedback_fixed_by" ON "public"."user_feedback" USING "btree" ("fixed_by") WHERE ("fixed_by" IS NOT NULL);



CREATE INDEX "idx_user_feedback_org_id" ON "public"."user_feedback" USING "btree" ("org_id");



CREATE INDEX "idx_user_feedback_priority" ON "public"."user_feedback" USING "btree" ("priority");



CREATE INDEX "idx_user_feedback_status" ON "public"."user_feedback" USING "btree" ("status");



CREATE INDEX "idx_user_feedback_user_id" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_user_role_assignments_assigned_by" ON "public"."user_role_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_user_role_assignments_client_id" ON "public"."user_role_assignments" USING "btree" ("client_id");



CREATE INDEX "idx_user_role_assignments_org_id" ON "public"."user_role_assignments" USING "btree" ("org_id");



CREATE INDEX "idx_user_role_assignments_role_id" ON "public"."user_role_assignments" USING "btree" ("role_id");



CREATE INDEX "idx_user_role_assignments_user_id" ON "public"."user_role_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_user_role_assignments_user_org_lookup" ON "public"."user_role_assignments" USING "btree" ("user_id", "org_id") WHERE (("user_id" IS NOT NULL) AND ("org_id" IS NOT NULL));



CREATE INDEX "idx_user_roles_cache_org_roles" ON "public"."user_roles_cache" USING "btree" ("org_id") WHERE ("is_org_role" = true);



CREATE INDEX "idx_user_roles_cache_permissions" ON "public"."user_roles_cache" USING "gin" ("permissions");



CREATE INDEX "idx_user_roles_cache_user_org" ON "public"."user_roles_cache" USING "btree" ("user_id", "org_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_users_archived" ON "public"."users" USING "btree" ("archived_at") WHERE ("archived_at" IS NOT NULL);



CREATE INDEX "idx_users_archived_by" ON "public"."users" USING "btree" ("archived_by");



CREATE INDEX "idx_users_created_by" ON "public"."users" USING "btree" ("created_by");



CREATE INDEX "idx_users_locale" ON "public"."users" USING "btree" ("locale");



CREATE INDEX "idx_users_org_id" ON "public"."users" USING "btree" ("org_id");



CREATE INDEX "idx_users_org_lookup" ON "public"."users" USING "btree" ("org_id") WHERE ("org_id" IS NOT NULL);



CREATE INDEX "idx_users_updated_by" ON "public"."users" USING "btree" ("updated_by");



CREATE UNIQUE INDEX "market_intelligence_org_null_client_idx" ON "public"."market_intelligence" USING "btree" ("org_id") WHERE ("client_id" IS NULL);



CREATE UNIQUE INDEX "org_metrics_cache_org_id_idx" ON "public"."org_metrics_cache" USING "btree" ("org_id");



CREATE UNIQUE INDEX "user_roles_cache_unique_idx" ON "public"."user_roles_cache" USING "btree" ("user_id", "org_id", "role_name", COALESCE("client_id", '00000000-0000-0000-0000-000000000000'::"uuid"));