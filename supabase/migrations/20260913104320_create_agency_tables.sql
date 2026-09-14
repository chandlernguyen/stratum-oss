-- ============================================================================
-- create_agency_tables
-- Tables, columns and constraints for the agency schema (`agency`).
-- ============================================================================




ALTER TABLE "agency"."agent_conversations" OWNER TO "postgres";


COMMENT ON TABLE "agency"."agent_conversations" IS 'Client-scoped agent conversation sessions. Week 2. Migration 159.';


ALTER TABLE "agency"."agent_messages" OWNER TO "postgres";


COMMENT ON TABLE "agency"."agent_messages" IS 'Client-scoped agent conversation messages. Week 2. Migration 159.';


ALTER TABLE "agency"."agent_outputs" OWNER TO "postgres";


COMMENT ON TABLE "agency"."agent_outputs" IS 'Agency client-scoped agent outputs. Schema synced with public.agent_outputs on 2025-12-06.';


ALTER TABLE "agency"."brand_guidelines" OWNER TO "postgres";


COMMENT ON TABLE "agency"."brand_guidelines" IS 'Client-scoped brand guidelines for agency users. Each client has isolated brand identity (voice, messaging, visual standards). Mirrors public.brand_guidelines structure but with required client_id for multi-client isolation. Part of separate schema architecture (Week 6 pattern).';



COMMENT ON COLUMN "agency"."brand_guidelines"."client_id" IS 'Required foreign key to agency.clients. Ensures brand guidelines are isolated per client. Cannot be NULL (unlike public.brand_guidelines which has no client_id).';



COMMENT ON COLUMN "agency"."brand_guidelines"."is_default" IS 'One default guideline per client (when campaign_id is NULL). Campaign-specific guidelines do not participate in default constraint.';



COMMENT ON COLUMN "agency"."brand_guidelines"."guidelines" IS 'JSONB containing brand guidelines structure: brand_voice, messaging_framework, visual_identity, content_guidelines, tone_examples. Matches public.brand_guidelines format for consistency.';


ALTER TABLE "agency"."campaigns" OWNER TO "postgres";


COMMENT ON TABLE "agency"."campaigns" IS 'Agency-scoped campaigns with required client_id, white-label config, and template support. Week 2. Migration 158.';



COMMENT ON COLUMN "agency"."campaigns"."client_id" IS 'REQUIRED for agency campaigns - always client-specific';



COMMENT ON COLUMN "agency"."campaigns"."white_label_config" IS 'Client branding, custom domain, email from name, report template';



COMMENT ON COLUMN "agency"."campaigns"."parent_campaign_id" IS 'Reference to parent campaign if created from template';



COMMENT ON COLUMN "agency"."campaigns"."campaign_template_id" IS 'Reference to shared template library';


ALTER TABLE "agency"."client_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "agency"."client_intelligence" IS 'Dynamic business context and AI-generated insights for agency clients. Progressive learning data accumulates through agent conversations.';



COMMENT ON COLUMN "agency"."client_intelligence"."geography" IS 'Geographic regions where the client operates (text array)';



COMMENT ON COLUMN "agency"."client_intelligence"."funding_status" IS 'Client funding stage (bootstrapped, seed, series_a, etc.)';



COMMENT ON COLUMN "agency"."client_intelligence"."main_products" IS 'Primary products or services offered';



COMMENT ON COLUMN "agency"."client_intelligence"."tech_stack" IS 'Technology stack used by the client';



COMMENT ON COLUMN "agency"."client_intelligence"."annual_revenue" IS 'Annual revenue range';



COMMENT ON COLUMN "agency"."client_intelligence"."last_manual_update" IS 'Last manual update to business data';



COMMENT ON COLUMN "agency"."client_intelligence"."last_ai_update" IS 'Last AI-powered update to business data';



COMMENT ON COLUMN "agency"."client_intelligence"."learning_metadata" IS 'Metadata about AI learning and enrichment';



COMMENT ON COLUMN "agency"."client_intelligence"."business_metrics" IS 'Business performance metrics (product, financial, marketing, operational)';



COMMENT ON COLUMN "agency"."client_intelligence"."archived_at" IS 'Soft delete timestamp';



COMMENT ON COLUMN "agency"."client_intelligence"."archived_by" IS 'User who archived this record';



COMMENT ON COLUMN "agency"."client_intelligence"."archive_reason" IS 'Reason for archiving';


ALTER TABLE "agency"."clients" OWNER TO "postgres";


COMMENT ON TABLE "agency"."clients" IS 'Static client information for agency organizations. Business intelligence stored separately in agency.client_intelligence.';


ALTER TABLE "agency"."personas" OWNER TO "postgres";


COMMENT ON TABLE "agency"."personas" IS 'Client-scoped buyer personas. Week 2. Migration 159.';



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "agency_client_intelligence_unique" UNIQUE ("org_id", "client_id");



COMMENT ON CONSTRAINT "agency_client_intelligence_unique" ON "agency"."client_intelligence" IS 'UNIQUE constraint on (org_id, client_id) - automatically indexed, no separate index needed';



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "agency_clients_org_slug_unique" UNIQUE ("org_id", "slug");



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."agent_messages"
    ADD CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "agency"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."agent_messages"
    ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agency"."agent_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "agency"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "agency"."agent_outputs"("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "agency"."agent_outputs"
    ADD CONSTRAINT "agent_outputs_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "agency"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "agency"."brand_guidelines"("id");



ALTER TABLE ONLY "agency"."brand_guidelines"
    ADD CONSTRAINT "brand_guidelines_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_parent_campaign_id_fkey" FOREIGN KEY ("parent_campaign_id") REFERENCES "agency"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "agency"."campaigns"
    ADD CONSTRAINT "campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."client_intelligence"
    ADD CONSTRAINT "client_intelligence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "clients_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."clients"
    ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "agency"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "agency"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "agency"."personas"
    ADD CONSTRAINT "personas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");