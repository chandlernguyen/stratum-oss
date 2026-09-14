-- ============================================================================
-- enable_rls_and_create_policies
-- Row Level Security: RLS enablement and every policy. UPDATE and ALL policies
-- state WITH CHECK explicitly; PostgreSQL would otherwise apply USING as the
-- write check implicitly, and an explicit check does not rely on that default.
-- ============================================================================





CREATE POLICY "Service role has full access to agency client intelligence" ON "agency"."client_intelligence" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to agency clients" ON "agency"."clients" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their org's agency client intelligence" ON "agency"."client_intelligence" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert their org's agency client intelligence" ON "agency"."client_intelligence" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update their org's agency client intelligence" ON "agency"."client_intelligence" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's agency client intelligence" ON "agency"."client_intelligence" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "agency_brand_delete" ON "agency"."brand_guidelines" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "agency_brand_insert" ON "agency"."brand_guidelines" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "agency_brand_select" ON "agency"."brand_guidelines" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "agency_brand_service_role" ON "agency"."brand_guidelines" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_brand_update" ON "agency"."brand_guidelines" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "agency_campaigns_delete_client_aware" ON "agency"."campaigns" FOR DELETE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_campaigns_insert_client_aware" ON "agency"."campaigns" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_campaigns_select_client_aware" ON "agency"."campaigns" FOR SELECT USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_campaigns_service_role" ON "agency"."campaigns" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_campaigns_update_client_aware" ON "agency"."campaigns" FOR UPDATE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id"))) WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_clients_delete_client_aware" ON "agency"."clients" FOR DELETE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("id")));



CREATE POLICY "agency_clients_insert_org_level" ON "agency"."clients" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "agency_clients_select_client_aware" ON "agency"."clients" FOR SELECT USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("id")));



CREATE POLICY "agency_clients_update_client_aware" ON "agency"."clients" FOR UPDATE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("id"))) WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "agency_conversations_insert" ON "agency"."agent_conversations" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "agency_conversations_select" ON "agency"."agent_conversations" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "agency_conversations_service_role" ON "agency"."agent_conversations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_messages_insert" ON "agency"."agent_messages" FOR INSERT TO "authenticated" WITH CHECK (("conversation_id" IN ( SELECT "agent_conversations"."id"
   FROM "agency"."agent_conversations"
  WHERE ("agent_conversations"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "agency_messages_select" ON "agency"."agent_messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "agent_conversations"."id"
   FROM "agency"."agent_conversations"
  WHERE ("agent_conversations"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "agency_messages_service_role" ON "agency"."agent_messages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_outputs_delete_client_aware" ON "agency"."agent_outputs" FOR DELETE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_outputs_insert_client_aware" ON "agency"."agent_outputs" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_outputs_select_client_aware" ON "agency"."agent_outputs" FOR SELECT USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_outputs_service_role" ON "agency"."agent_outputs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_outputs_update_client_aware" ON "agency"."agent_outputs" FOR UPDATE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id"))) WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_personas_delete_client_aware" ON "agency"."personas" FOR DELETE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_personas_insert_client_aware" ON "agency"."personas" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_personas_select_client_aware" ON "agency"."personas" FOR SELECT USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



CREATE POLICY "agency_personas_service_role" ON "agency"."personas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "agency_personas_update_client_aware" ON "agency"."personas" FOR UPDATE USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id"))) WITH CHECK ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND "public"."user_has_client_access"("client_id")));



ALTER TABLE "agency"."agent_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."agent_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."agent_outputs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."brand_guidelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."client_intelligence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "agency"."personas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow anonymous users to submit invitation requests" ON "public"."invitation_requests" FOR INSERT TO "anon" WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text") AND ("length"("email") <= 255) AND ("company_name" IS NOT NULL) AND ("length"("company_name") <= 255)));



COMMENT ON POLICY "Allow anonymous users to submit invitation requests" ON "public"."invitation_requests" IS 'Allows public form submissions with basic validation. Rate limiting handled at application level.';



CREATE POLICY "Authenticated users can insert feedback" ON "public"."user_feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Service role can insert alerts" ON "public"."campaign_alerts" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert alerts" ON "public"."campaign_alerts" IS 'Only service role (backend/triggers) can create alerts. Users can view/update via other policies.';



CREATE POLICY "Service role can insert dashboard recommendation cache" ON "public"."dashboard_recommendation_cache" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert dashboard recommendation cache" ON "public"."dashboard_recommendation_cache" IS 'Only service role (backend) can insert cache entries. Users can view via SELECT policy.';



CREATE POLICY "Service role full access" ON "public"."alpha_invites" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Service role full access" ON "public"."alpha_invites" IS 'Only service role (backend) can manage alpha invites. Frontend uses RPC functions.';



CREATE POLICY "Service role full access" ON "public"."invitation_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."agent_context_profiles" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."ai_insights" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."brand_guidelines" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."campaign_intelligence" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."campaigns" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."clients" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."content_plans" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."customer_intelligence" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."documents" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."gemini_cost_tracking" TO "service_role" USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")) WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."insight_extraction_metrics" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."intelligence_conflicts" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."market_intelligence" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role has full access" ON "public"."marketing_strategies" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."recommendations_cache" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."synthetic_personas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to business data" ON "public"."core_business_data" TO "service_role" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Users can create conflicts for their org" ON "public"."intelligence_conflicts" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create insights for their org" ON "public"."ai_insights" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create interactions for their org" ON "public"."persona_interactions" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create interview sessions for their org" ON "public"."persona_interview_sessions" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create org relationships" ON "public"."enterprise_relationships" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create outputs for their org" ON "public"."agent_outputs" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete campaigns in their org" ON "public"."campaigns" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("client_id" IS NULL)) OR ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))));



CREATE POLICY "Users can delete org relationships" ON "public"."enterprise_relationships" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete own conversations" ON "public"."agent_conversations" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can delete own prerequisites" ON "public"."campaign_plan_prerequisites" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their org draft outputs" ON "public"."agent_outputs" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("status" = 'draft'::"text")));



CREATE POLICY "Users can delete their org's brand guidelines" ON "public"."brand_guidelines" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's clients" ON "public"."clients" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's content plans" ON "public"."content_plans" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's documents" ON "public"."documents" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's insights" ON "public"."ai_insights" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's personas" ON "public"."synthetic_personas" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their org's strategies" ON "public"."marketing_strategies" FOR DELETE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert campaigns in their org" ON "public"."campaigns" FOR INSERT TO "authenticated" WITH CHECK (((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("client_id" IS NULL)) OR ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can insert messages" ON "public"."agent_messages" FOR INSERT TO "authenticated" WITH CHECK (("conversation_id" IN ( SELECT "agent_conversations"."id"
   FROM "public"."agent_conversations"
  WHERE ("agent_conversations"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own conversations" ON "public"."agent_conversations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own org's plan prerequisites" ON "public"."campaign_plan_prerequisites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their org's brand guidelines" ON "public"."brand_guidelines" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their org's clients" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their org's content plans" ON "public"."content_plans" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their org's documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their org's personas" ON "public"."synthetic_personas" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their org's strategies" ON "public"."marketing_strategies" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can manage strategy personas" ON "public"."marketing_strategy_personas" TO "authenticated" USING (("strategy_id" IN ( SELECT "marketing_strategies"."id"
   FROM "public"."marketing_strategies"
  WHERE ("marketing_strategies"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (("strategy_id" IN ( SELECT "marketing_strategies"."id"
   FROM "public"."marketing_strategies"
  WHERE ("marketing_strategies"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can update alerts for their organization" ON "public"."campaign_alerts" FOR UPDATE TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update campaigns in their org" ON "public"."campaigns" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("client_id" IS NULL)) OR ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))))) WITH CHECK ((("archived_at" IS NULL) AND ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("client_id" IS NULL)) OR ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))));



CREATE POLICY "Users can update own conversations" ON "public"."agent_conversations" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("archived_at" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can update own prerequisites" ON "public"."campaign_plan_prerequisites" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own relationships" ON "public"."enterprise_relationships" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org outputs" ON "public"."agent_outputs" FOR UPDATE TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



COMMENT ON POLICY "Users can update their org outputs" ON "public"."agent_outputs" IS 'Allows users to update agent outputs in their organization, including archiving.
Migration 249: Removed archived_at IS NULL restriction to allow archiving.
Migration 251: Optimized auth.uid() caching for performance (USING + WITH CHECK).';



CREATE POLICY "Users can update their org's brand guidelines" ON "public"."brand_guidelines" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's clients" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's conflicts" ON "public"."intelligence_conflicts" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's content plans" ON "public"."content_plans" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's documents" ON "public"."documents" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's insights" ON "public"."ai_insights" FOR UPDATE TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



COMMENT ON POLICY "Users can update their org's insights" ON "public"."ai_insights" IS 'Allows users to update insights in their organization, including archiving.
Migration 248: Removed archived_at IS NULL restriction to allow archiving.
Migration 251: Optimized auth.uid() caching for performance (USING + WITH CHECK).';



CREATE POLICY "Users can update their org's interview sessions" ON "public"."persona_interview_sessions" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's personas" ON "public"."synthetic_personas" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their org's strategies" ON "public"."marketing_strategies" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("archived_at" IS NULL) AND ("id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("archived_at" IS NULL) AND ("id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("archived_at" IS NULL) AND ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view alerts for their organization" ON "public"."campaign_alerts" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view campaigns in their org" ON "public"."campaigns" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ((("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("client_id" IS NULL)) OR ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))));



CREATE POLICY "Users can view feedback from their organization" ON "public"."user_feedback" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view messages" ON "public"."agent_messages" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("conversation_id" IN ( SELECT "agent_conversations"."id"
   FROM "public"."agent_conversations"
  WHERE ("agent_conversations"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view org relationships" ON "public"."enterprise_relationships" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own org costs" ON "public"."gemini_cost_tracking" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view own org's plan prerequisites" ON "public"."campaign_plan_prerequisites" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view strategy brand guidelines links" ON "public"."marketing_strategy_brand_guidelines" FOR SELECT TO "authenticated" USING (("strategy_id" IN ( SELECT "marketing_strategies"."id"
   FROM "public"."marketing_strategies"
  WHERE ("marketing_strategies"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view their conversations" ON "public"."agent_conversations" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view their org outputs" ON "public"."agent_outputs" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's brand guidelines" ON "public"."brand_guidelines" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's clients" ON "public"."clients" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's conflicts" ON "public"."intelligence_conflicts" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's content plans" ON "public"."content_plans" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's documents" ON "public"."documents" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's insights" ON "public"."ai_insights" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's interactions" ON "public"."persona_interactions" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's interview sessions" ON "public"."persona_interview_sessions" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's metrics" ON "public"."insight_extraction_metrics" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view their org's personas" ON "public"."synthetic_personas" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their org's recommendations" ON "public"."recommendations_cache" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view their org's strategies" ON "public"."marketing_strategies" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND ("id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their organization's cached dashboard recommenda" ON "public"."dashboard_recommendation_cache" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view users in their organization" ON "public"."users" FOR SELECT TO "authenticated" USING ((("archived_at" IS NULL) AND (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id")) OR ("id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."agent_context_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_outputs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alpha_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approval_history_org_isolation" ON "public"."approval_history" USING (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approval_requests_org_isolation" ON "public"."approval_requests" USING (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "audit_logs_insert" ON "public"."permission_audit_log" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "audit_logs_select" ON "public"."permission_audit_log" FOR SELECT USING (("org_id" IN ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."brand_guidelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cache_refresh_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cache_refresh_queue_org_isolation" ON "public"."cache_refresh_queue" TO "authenticated" USING (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id"))) WITH CHECK (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id")));



CREATE POLICY "cache_refresh_queue_service_role" ON "public"."cache_refresh_queue" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."campaign_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_intelligence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_intelligence_client_isolation" ON "public"."campaign_intelligence" TO "authenticated" USING (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "campaign_intelligence_service_role" ON "public"."campaign_intelligence" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."campaign_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_metrics_delete" ON "public"."campaign_metrics" FOR DELETE TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campaign_metrics_insert" ON "public"."campaign_metrics" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campaign_metrics_select" ON "public"."campaign_metrics" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campaign_metrics_update" ON "public"."campaign_metrics" FOR UPDATE TO "authenticated" USING (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."campaign_plan_prerequisites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_org_and_client_isolation" ON "public"."resource_comments" USING ((("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ((EXISTS ( SELECT 1
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NULL)))) OR ("client_id" IS NULL) OR ("client_id" IN ( SELECT "ura"."client_id"
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NOT NULL))))))) WITH CHECK ((("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ((EXISTS ( SELECT 1
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NULL)))) OR ("client_id" IS NULL) OR ("client_id" IN ( SELECT "ura"."client_id"
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NOT NULL)))))));



ALTER TABLE "public"."content_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_business_data" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "core_business_data_client_isolation" ON "public"."core_business_data" TO "authenticated" USING ((("archived_at" IS NULL) AND ((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))))) WITH CHECK (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "core_business_data_service_role" ON "public"."core_business_data" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."customer_intelligence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_intelligence_client_isolation" ON "public"."customer_intelligence" TO "authenticated" USING (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "customer_intelligence_service_role" ON "public"."customer_intelligence" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."dashboard_recommendation_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_chunks_org_isolation" ON "public"."document_chunks" TO "authenticated" USING ((("archived_at" IS NULL) AND ("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents"
  WHERE ("documents"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (("document_id" IN ( SELECT "documents"."id"
   FROM "public"."documents"
  WHERE ("documents"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "document_chunks_service_role" ON "public"."document_chunks" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enterprise_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gemini_cost_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insight_extraction_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."intelligence_conflicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_intelligence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "market_intelligence_client_isolation" ON "public"."market_intelligence" TO "authenticated" USING (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (((("client_id" IS NULL) AND ("org_id" IN ( SELECT "users"."org_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."org_id" IN ( SELECT "users"."org_id"
           FROM "public"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "market_intelligence_service_role" ON "public"."market_intelligence" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."marketing_strategies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_strategy_brand_guidelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_strategy_personas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_user_only" ON "public"."notifications" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "performance_metrics_org_isolation" ON "public"."performance_metrics" TO "authenticated" USING (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id"))) WITH CHECK (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id")));



CREATE POLICY "performance_metrics_service_role" ON "public"."performance_metrics" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."permission_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_read_all" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "permissions_read_all" ON "public"."permissions" IS 'All authenticated users can read permission definitions. No org isolation needed.';



CREATE POLICY "permissions_service_role" ON "public"."permissions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."persona_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."persona_interview_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_devices_user_only" ON "public"."push_devices" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."recommendations_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "resource_activity_insert" ON "public"."resource_activity" FOR INSERT WITH CHECK (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "resource_activity_select_org" ON "public"."resource_activity" FOR SELECT USING (("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."resource_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_read_all" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "role_permissions_read_all" ON "public"."role_permissions" IS 'All authenticated users can read role-permission mappings. No org isolation needed.';



CREATE POLICY "role_permissions_service_role" ON "public"."role_permissions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_read_all" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "roles_read_all" ON "public"."roles" IS 'All authenticated users can read role definitions. No org isolation needed.';



CREATE POLICY "roles_service_role" ON "public"."roles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."synthetic_personas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_org_isolation" ON "public"."task_assignments" USING ((("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("assigned_to" = ( SELECT "auth"."uid"() AS "uid")) OR ("assigned_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NULL)))) OR (("client_id" IS NOT NULL) AND ("client_id" IN ( SELECT "ura"."client_id"
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NOT NULL)))))))) WITH CHECK ((("org_id" = ( SELECT "u"."org_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND (("assigned_to" = ( SELECT "auth"."uid"() AS "uid")) OR ("assigned_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NULL)))) OR (("client_id" IS NOT NULL) AND ("client_id" IN ( SELECT "ura"."client_id"
   FROM "public"."user_role_assignments" "ura"
  WHERE (("ura"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ura"."client_id" IS NOT NULL))))))));



ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_invitations_org_isolation" ON "public"."team_invitations" TO "authenticated" USING (("org_id" = "public"."get_user_org_id"())) WITH CHECK (("org_id" = "public"."get_user_org_id"()));



CREATE POLICY "team_invitations_service_role" ON "public"."team_invitations" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."usage_tracking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usage_tracking_org_isolation" ON "public"."usage_tracking" TO "authenticated" USING (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id"))) WITH CHECK (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id")));



CREATE POLICY "usage_tracking_service_role" ON "public"."usage_tracking" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_role_assignments_org_isolation" ON "public"."user_role_assignments" TO "authenticated" USING (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id"))) WITH CHECK (("org_id" = ( SELECT "public"."get_user_org_id"() AS "get_user_org_id")));



CREATE POLICY "user_role_assignments_service_role" ON "public"."user_role_assignments" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. Security: Row Level Security on the internal push-delivery queue
--
-- public.notification_push_deliveries was created without ENABLE ROW LEVEL
-- SECURITY and granted to anon and authenticated with full privileges,
-- including TRUNCATE, with no policies defined.
--
-- Because it lives in the exposed `public` schema, anyone holding the
-- publishable anon key — which ships in the browser bundle — could read,
-- modify and wipe the push delivery queue through the Data API. The table
-- carries push_device_id and apns_id, so this was both a data-exposure and a
-- denial-of-service issue.
--
-- The table is used only by the backend dispatch service
-- (apps/api/services/push_notifications.py), which authenticates with the
-- service role and therefore bypasses RLS. Enabling RLS with NO policies denies
-- anon and authenticated entirely, which is the intended access model.
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."notification_push_deliveries" ENABLE ROW LEVEL SECURITY;