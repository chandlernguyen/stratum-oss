"""
Cross-Agent Intelligence Service

Analyzes patterns and connections across existing agent data to generate meta-insights.
Integrates with the existing cross-agent data sharing system to find strategic gaps,
alignment issues, and optimization opportunities.

This complements the existing domain-specific data sharing (strategy_outputs, customer_personas)
by providing higher-level intelligence synthesis across all agent outputs.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import json

from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.services.intelligence_storage import IntelligenceStorageService
from apps.api.models.agent_intelligence import IntelligenceType
from apps.api.services.enhanced_context_intelligence import EnhancedContextIntelligenceService
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)


class CrossAgentInsight(BaseModel):
    """Cross-agent insight combining multiple intelligence types"""
    insight_type: str = Field(description="Type of cross-agent insight (e.g., 'strategy_persona_alignment')")
    title: str = Field(description="Title of the insight")
    description: str = Field(description="Detailed description of the insight")
    contributing_agents: List[str] = Field(description="Agents that contributed to this insight")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence in the insight")
    actionable_recommendations: List[str] = Field(default_factory=list, description="Specific actions recommended")
    potential_impact: str = Field(description="Expected impact of acting on this insight")
    priority: str = Field(description="Priority level: high, medium, low")


class PersonaInterviewInsight(BaseModel):
    """Real-time insight extracted from persona interview"""
    persona_id: str = Field(description="ID of the persona being interviewed")
    session_id: str = Field(description="Interview session ID")
    insight_category: str = Field(
        description="Category: pain_point, goal, objection, preference, quote, budget, timeline, decision_criteria"
    )
    raw_text: str = Field(description="Original statement from the interview")
    actionable_recommendations: List[str] = Field(description="Marketing recommendations based on this insight")
    importance: float = Field(ge=0.0, le=1.0, description="Importance score for prioritization")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the extraction")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    themes: List[str] = Field(default_factory=list, description="High-level themes")
    context: str = Field(description="Surrounding conversation context")


class CrossAgentIntelligenceService:
    """Service for merging intelligence across multiple agents"""
    
    def __init__(self):
        self.intelligence_storage = IntelligenceStorageService()
        self.enhanced_intelligence = EnhancedContextIntelligenceService()
        self.supabase = get_supabase_client()
        
    async def generate_cross_agent_insights(
        self,
        org_id: str,
        campaign_id: Optional[str] = None,
        lookback_days: int = 30
    ) -> List[CrossAgentInsight]:
        """
        Generate cross-agent insights by analyzing existing domain-specific data.
        Works with the established cross-agent data sharing system.
        """
        try:
            # Get data from existing domain tables
            domain_data = await self._get_domain_specific_data(org_id, campaign_id, lookback_days)

            if not domain_data:
                logger.debug(f"No domain data found for org {org_id}")
                return []

            # 🚀 NUCLEAR: Get all intelligence from agent_outputs table
            cutoff_date = (datetime.now() - timedelta(days=lookback_days)).isoformat()
            intelligence_result = self.supabase.table("agent_outputs").select("*").eq(
                "org_id", org_id
            ).gte("created_at", cutoff_date).execute()

            # Combine both data sources for comprehensive analysis
            combined_data = {
                **domain_data,
                "specialized_intelligence": intelligence_result.data if intelligence_result.data else []
            }
            
            # Use LLM to identify cross-agent patterns
            cross_agent_insights = await self._identify_cross_agent_patterns(
                combined_data,
                org_id
            )
            
            # Store insights in database
            await self._store_cross_agent_insights(cross_agent_insights, org_id)
            
            return cross_agent_insights
            
        except Exception as e:
            logger.error(f"Error generating cross-agent insights for org {org_id}: {e}")
            return []
    
    async def _get_domain_specific_data(
        self,
        org_id: str,
        campaign_id: Optional[str] = None,
        lookback_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get data from existing domain-specific tables in the cross-agent sharing system
        """
        cutoff_date = (datetime.now() - timedelta(days=lookback_days)).isoformat()
        
        domain_data = {}
        
        try:
            # 🚀 NUCLEAR: Get strategy outputs from agent_outputs table
            strategy_query = self.supabase.table("agent_outputs").select("*").eq(
                "org_id", org_id
            ).eq("agent_type", "strategy").gte("created_at", cutoff_date)

            if campaign_id:
                strategy_query = strategy_query.contains("metadata", {"campaign_id": campaign_id})

            strategy_result = strategy_query.execute()
            domain_data["strategy_outputs"] = strategy_result.data
            
            # Get customer personas
            personas_query = self.supabase.table("customer_personas").select("*").eq(
                "org_id", org_id
            ).gte("created_at", cutoff_date)
            
            if campaign_id:
                personas_query = personas_query.eq("campaign_id", campaign_id)
            
            personas_result = personas_query.execute()
            domain_data["customer_personas"] = personas_result.data
            
            # 🚀 NUCLEAR: Get content outputs from agent_outputs table
            content_query = self.supabase.table("agent_outputs").select("*").eq(
                "org_id", org_id
            ).eq("agent_type", "content").gte("created_at", cutoff_date)
            
            if campaign_id:
                content_query = content_query.contains("metadata", {"campaign_id": campaign_id})
            
            content_result = content_query.execute()
            domain_data["content_outputs"] = content_result.data
            
            # Get marketing campaigns
            campaigns_result = self.supabase.table("marketing_campaigns").select("*").eq(
                "org_id", org_id
            ).gte("created_at", cutoff_date).execute()
            domain_data["marketing_campaigns"] = campaigns_result.data
            
            logger.info(f"Retrieved domain data for org {org_id}: {len(domain_data)} tables")
            return domain_data
            
        except Exception as e:
            logger.error(f"Error fetching domain-specific data: {e}")
            return {}
    
    async def _identify_cross_agent_patterns(
        self,
        combined_data: Dict[str, Any],
        org_id: str
    ) -> List[CrossAgentInsight]:
        """Use LLM to identify patterns and connections across existing domain data + specialized intelligence"""
        
        # Prepare summary for LLM analysis
        data_summary = self._prepare_combined_data_summary(combined_data)
        
        # Enhanced analysis prompt that works with both domain tables and specialized intelligence
        analysis_prompt = f"""
        Analyze business intelligence from multiple agents and identify strategic meta-insights.

        Available Data Sources:
        {data_summary}

        Focus on identifying these types of cross-agent insights:

        1. **Strategic Alignment Issues**
           - Do customer personas match strategic opportunities?
           - Is content aligned with SWOT analysis findings?
           - Are campaign themes consistent with strategic direction?

        2. **Execution Gaps**
           - What strategic recommendations lack supporting content?
           - Which personas have insufficient content targeting them?
           - What campaign opportunities are being missed?

        3. **Performance Optimization**
           - Which content types match highest-performing personas?
           - What strategic pivots are supported by campaign data?
           - Where should budget be reallocated based on insights?

        4. **Risk Assessment**
           - What strategic threats lack mitigation content?
           - Which customer segments are under-served?
           - What competitive gaps need immediate attention?

        5. **Quick Win Opportunities**
           - What content can be repurposed for new personas?
           - Which strategic opportunities have fastest execution path?
           - What campaign optimizations offer immediate ROI?

        For each insight found:
        - Title: Clear, action-oriented
        - Description: Specific finding with data points
        - Recommendations: 2-3 concrete next steps
        - Contributing agents: Which data sources support this insight
        - Confidence: 0.0-1.0 based on data quality/completeness
        - Priority: high/medium/low based on impact and urgency

        Only return insights with confidence > 0.6. Focus on actionable findings that bridge multiple agents.
        """
        
        try:
            # Use the enhanced intelligence service's LLM capabilities
            response = await self.enhanced_intelligence.client.aio.models.generate_content(
                model=DEFAULT_MODEL,
                contents=analysis_prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": List[CrossAgentInsight]
                }
            )
            
            insights_response = response.parsed if response.parsed else []
            return insights_response if insights_response else []
            
        except Exception as e:
            logger.error(f"Error identifying cross-agent patterns: {e}")
            return []
    
    def _prepare_combined_data_summary(self, combined_data: Dict[str, Any]) -> str:
        """Prepare a summary of both domain-specific tables and specialized intelligence"""
        summary_parts = []
        
        # Process domain-specific data (from existing cross-agent system)
        domain_tables = ["strategy_outputs", "customer_personas", "content_outputs", "marketing_campaigns"]
        
        for table_name in domain_tables:
            table_data = combined_data.get(table_name, [])
            if not table_data:
                continue
                
            table_summary = f"\n=== {table_name.replace('_', ' ').title()} ({len(table_data)} records) ===\n"
            
            # Get sample of key fields for each table type
            sample_data = table_data[:3]  # First 3 records
            for record in sample_data:
                key_info = self._extract_key_info_from_record(table_name, record)
                if key_info:
                    table_summary += f"- {key_info}\n"
            
            if len(table_data) > 3:
                table_summary += f"... and {len(table_data) - 3} more records\n"
            
            summary_parts.append(table_summary)
        
        # Process specialized intelligence data
        specialized = combined_data.get("specialized_intelligence", {})
        if specialized:
            intel_summary = f"\n=== Specialized Agent Intelligence ===\n"
            for agent_type, data in specialized.items():
                if data:
                    intel_summary += f"- {agent_type.title()}: Available\n"
            summary_parts.append(intel_summary)
        
        return "\n".join(summary_parts)
    
    def _extract_key_info_from_record(self, table_name: str, record: Dict[str, Any]) -> str:
        """Extract key information from domain table records"""
        if table_name == "strategy_outputs":
            output_type = record.get("output_type", "unknown")
            strengths = record.get("strengths", [])
            opportunities = record.get("opportunities", [])
            if strengths or opportunities:
                return f"{output_type}: {len(strengths)} strengths, {len(opportunities)} opportunities"
        
        elif table_name == "customer_personas":
            name = record.get("name", "Unnamed Persona")
            demographics = record.get("demographics", {})
            pain_points = record.get("pain_points", [])
            return f"Persona '{name}': {len(pain_points)} pain points identified"
        
        elif table_name == "content_outputs":
            title = record.get("title", "Untitled")
            content_type = record.get("type", "unknown")
            return f"Content: '{title}' ({content_type})"
        
        elif table_name == "marketing_campaigns":
            name = record.get("name", "Unnamed Campaign")
            status = record.get("status", "unknown")
            return f"Campaign: '{name}' (status: {status})"
        
        return f"Record from {table_name}"
    
    def _get_key_fields_for_agent(self, agent_type: str) -> List[str]:
        """Get key fields to extract for each agent type"""
        key_fields_map = {
            'strategy': ['vision_statement', 'strategic_goals', 'competitive_advantages', 'market_opportunities'],
            'personas': ['primary_personas', 'buyer_journey_stages', 'pain_points', 'preferred_channels'],
            'content': ['content_themes', 'content_gaps', 'top_performing_content', 'content_calendar'],
            'analytics': ['key_metrics', 'performance_trends', 'conversion_funnel_analysis', 'attribution_insights'],
            'roi_budget': ['budget_allocation', 'roi_projections', 'cost_optimization_opportunities'],
            'campaign_planning': ['active_campaigns', 'campaign_performance', 'optimization_recommendations'],
            'quick_wins': ['identified_opportunities', 'implementation_timeline', 'expected_impact'],
            'competitive': ['key_competitors', 'competitive_gaps', 'differentiation_opportunities'],
            'client_success': ['health_score_factors', 'retention_strategies', 'expansion_opportunities']
        }
        
        return key_fields_map.get(agent_type, ['title', 'description', 'recommendations'])
    
    async def _store_cross_agent_insights(
        self,
        insights: List[CrossAgentInsight],
        org_id: str
    ):
        """Store cross-agent insights in the ai_insights table"""
        try:
            for insight in insights:
                insight_data = {
                    "org_id": org_id,
                    "insight_type": "cross_agent",
                    "source_type": "intelligence_analysis",
                    "source_agent": "cross_agent_service",
                    "title": insight.title,
                    "content": {
                        "description": insight.description,
                        "contributing_agents": insight.contributing_agents,
                        "actionable_recommendations": insight.actionable_recommendations,
                        "potential_impact": insight.potential_impact,
                        "priority": insight.priority,
                        "insight_type": insight.insight_type
                    },
                    "confidence_score": insight.confidence_score,
                    "validation_status": "pending",
                    "created_at": datetime.now().isoformat()
                }
                
                self.supabase.table("ai_insights").insert(insight_data).execute()
            
            logger.info(f"Stored {len(insights)} cross-agent insights for org {org_id}")
            
        except Exception as e:
            logger.error(f"Error storing cross-agent insights: {e}")
    
    async def get_latest_cross_agent_insights(
        self,
        org_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get the latest cross-agent insights for an organization"""
        try:
            result = self.supabase.table("ai_insights").select("*").eq(
                "org_id", org_id
            ).eq(
                "insight_type", "cross_agent"
            ).order(
                "created_at", desc=True
            ).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching cross-agent insights: {e}")
            return []
    
    async def trigger_periodic_analysis(self, org_id: str):
        """
        Trigger periodic cross-agent analysis (to be called by scheduled job)
        """
        try:
            # Check when last analysis was performed
            last_analysis = self.supabase.table("ai_insights").select("created_at").eq(
                "org_id", org_id
            ).eq(
                "insight_type", "cross_agent"
            ).order(
                "created_at", desc=True
            ).limit(1).execute()
            
            # Only run analysis if it's been more than 24 hours since last analysis
            should_analyze = True
            if last_analysis.data:
                last_analysis_time = datetime.fromisoformat(last_analysis.data[0]['created_at'])
                hours_since_last = (datetime.now() - last_analysis_time).total_seconds() / 3600
                should_analyze = hours_since_last > 24
            
            if should_analyze:
                insights = await self.generate_cross_agent_insights(org_id)
                logger.info(f"Generated {len(insights)} cross-agent insights for org {org_id}")
                return insights
            else:
                logger.debug(f"Skipping analysis for org {org_id} - too recent")
                return []
                
        except Exception as e:
            logger.error(f"Error in periodic analysis for org {org_id}: {e}")
            return []
    
    async def extract_interview_insight(
        self,
        conversation_chunk: str,
        persona_id: str,
        org_id: str,
        session_id: str
    ) -> PersonaInterviewInsight:
        """Extract insights from interview conversation in real-time"""
        try:
            # Get persona context from agent_outputs (nuclear migration)
            persona_result = self.supabase.table("agent_outputs").select("*").eq(
                "id", persona_id
            ).eq("agent_type", "persona").eq("output_type", "persona").single().execute()

            if not persona_result.data:
                logger.error(f"Persona {persona_id} not found")
                return None

            # Extract persona data from JSONB content
            content = persona_result.data.get('content', {})
            persona_data = {
                'name': content.get('name'),
                'title': content.get('title'),
                'company_name': content.get('company_name'),
                'goals': content.get('goals', []),
                'pain_points': content.get('pain_points', [])
            }

            prompt = f"""
            Analyze this persona interview excerpt for valuable marketing insights.

            Persona: {persona_data['name']} - {persona_data.get('title', 'Unknown Role')} at {persona_data.get('company_name', 'Unknown Company')}
            Current Goals: {json.dumps(persona_data.get('goals', []))}
            Current Pain Points: {json.dumps(persona_data.get('pain_points', []))}
            
            Interview Excerpt: {conversation_chunk}
            
            Extract ANY valuable insight from this conversation. Look for:
            - Specific tools, platforms, or channels mentioned (e.g., LinkedIn, webinars, specific websites)
            - Media consumption habits (where they get information)
            - Decision-making process or criteria
            - Pain points or frustrations (even if subtle)
            - Goals or aspirations (even if implied)
            - Budget indicators or spending patterns
            - Preferences for content types or formats
            - Objections or concerns about solutions
            - Quotes that reveal mindset or priorities
            
            IMPORTANT: Even seemingly mundane information like "I use LinkedIn" or "I read VnExpress" is valuable for marketing targeting.
            
            Extract the insight with:
            1. Category (pain_point, goal, objection, preference, quote, budget, timeline, decision_criteria)
            2. The specific finding (include exact names/brands/channels mentioned)
            3. 2-3 actionable marketing recommendations
            4. Importance (0.3-1.0) - rate 0.5+ for channel preferences, 0.7+ for pain points
            5. Confidence (0.7-1.0) - be confident when specific details are mentioned
            6. Relevant tags (include specific platform/channel names as tags)
            7. High-level themes
            
            Be inclusive - extract insights even from casual mentions. Marketing teams need to know WHERE to reach personas and WHAT content they consume.
            """
            
            response = await self.enhanced_intelligence.client.aio.models.generate_content(
                model=DEFAULT_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": PersonaInterviewInsight
                }
            )
            
            insight = response.parsed if response.parsed else None
            
            logger.info(f"Gemini extracted insight: {insight}")
            
            if insight:
                # Add required fields
                insight.persona_id = persona_id
                insight.session_id = session_id
                insight.context = conversation_chunk[:200]  # Store first 200 chars as context
                
                logger.info(f"Insight details - Category: {insight.insight_category}, Importance: {insight.importance}, Raw text: {insight.raw_text[:100]}")
                
                # Save to database
                await self._save_interview_insight(insight, org_id)
            else:
                logger.warning(f"No insight extracted from conversation chunk: {conversation_chunk[:100]}...")
            
            return insight
            
        except Exception as e:
            logger.error(f"Error extracting interview insight: {e}")
            return None
    
    async def _save_interview_insight(
        self,
        insight: PersonaInterviewInsight,
        org_id: str
    ):
        """Save interview insight to ai_insights table"""
        try:
            insight_data = {
                "org_id": org_id,
                "insight_type": "observation",
                "source_type": "agent_conversation",
                "source_agent": "persona_agent",
                "title": f"{insight.insight_category.replace('_', ' ').title()}: {insight.raw_text[:50]}...",
                "content": {
                    "persona_id": insight.persona_id,
                    "session_id": insight.session_id,
                    "insight_category": insight.insight_category,
                    "raw_text": insight.raw_text,
                    "actionable_recommendations": insight.actionable_recommendations,
                    "tags": insight.tags,
                    "themes": insight.themes,
                    "importance": insight.importance,
                    "context": insight.context
                },
                "confidence_score": insight.confidence,
                "validation_status": "pending",
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("ai_insights").insert(insight_data).execute()
            logger.info(f"Saved interview insight for persona {insight.persona_id}")
            
        except Exception as e:
            logger.error(f"Error saving interview insight: {e}")
    
    async def find_patterns_across_personas(
        self,
        org_id: str,
        min_personas: int = 3
    ) -> Dict[str, Any]:
        """Find patterns across multiple persona interviews"""
        try:
            # Get all persona interview insights
            insights = self.supabase.table("ai_insights").select("*").eq(
                "org_id", org_id
            ).eq(
                "insight_type", "persona_interview"
            ).execute()
            
            if not insights.data or len(insights.data) < min_personas * 3:
                return {"status": "insufficient_data", "message": f"Need at least {min_personas * 3} insights"}
            
            # Group by category
            insights_by_category = {}
            for insight in insights.data:
                category = insight['content'].get('insight_category', 'uncategorized')
                if category not in insights_by_category:
                    insights_by_category[category] = []
                insights_by_category[category].append(insight['content'])
            
            prompt = f"""
            Analyze patterns across {len(insights.data)} insights from persona interviews.
            
            Insights by Category:
            {json.dumps(insights_by_category, indent=2)}
            
            Identify:
            1. Common pain points (frequency, severity, impact)
            2. Shared goals and aspirations
            3. Budget patterns and willingness to pay
            4. Decision-making criteria patterns
            5. Objection patterns and how to address them
            6. Channel and content preferences
            7. Market segments emerging from data
            
            Provide:
            - Top 5 actionable insights for marketing strategy
            - Persona clustering recommendations
            - Content themes that resonate
            - Messaging frameworks
            - Priority ranking of opportunities
            
            Return as a structured analysis with specific recommendations.
            """
            
            response = await self.enhanced_intelligence.client.aio.models.generate_content(
                model=DEFAULT_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": CrossAgentInsight
                }
            )
            
            patterns = response.parsed if response.parsed else None
            
            if patterns:
                # Save pattern analysis as cross-agent insight
                await self._store_cross_agent_insights([patterns], org_id)
                
                return {
                    "status": "success",
                    "patterns": patterns.dict() if hasattr(patterns, 'dict') else patterns,
                    "insights_analyzed": len(insights.data),
                    "categories": list(insights_by_category.keys())
                }
            
            return {"status": "no_patterns_found"}
            
        except Exception as e:
            logger.error(f"Error finding patterns across personas: {e}")
            return {"status": "error", "message": str(e)}


# Global instance for easy access
cross_agent_intelligence_service = CrossAgentIntelligenceService()