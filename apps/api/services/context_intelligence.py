"""
Context Intelligence Service
Handles LLM-powered extraction and enhancement of business context
"""
from typing import Dict, Any, Optional, List
import json
import logging
import os
from datetime import datetime

from google import genai
from pydantic import BaseModel, Field

from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

class ExtractedContext(BaseModel):
    """Model for extracted business context"""
    companyName: Optional[str] = None
    industry: Optional[str] = None
    companySize: Optional[str] = None
    geography: Optional[List[str]] = None  # Added geography field
    targetMarket: Optional[str] = None
    competitors: Optional[List[str]] = None
    priceRange: Optional[str] = None
    technologyStack: Optional[List[str]] = None
    revenue: Optional[str] = None
    businessModel: Optional[str] = None
    uniqueValue: Optional[str] = None
    confidence_score: float = 0.0


class ConversationRelevance(BaseModel):
    """Model for conversation relevance analysis"""
    should_extract: bool = Field(description="Whether the conversation contains valuable business context worth extracting")
    reason: str = Field(description="Explanation of why extraction is or isn't needed")
    detected_topics: List[str] = Field(default_factory=list, description="Business topics detected in the conversation")
    value_score: float = Field(description="Score from 0-1 indicating the value of extractable information")

class ContextIntelligenceService:
    """Service for intelligent context extraction and enhancement"""
    
    def __init__(self):
        self._client = None
        self.model = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)
        self.supabase = get_supabase_client()

    @property
    def client(self) -> genai.Client:
        """
        Lazily create the Gemini client.

        Building this in __init__ meant the module-level singleton below
        constructed a client at import time, so importing the application
        required GOOGLE_API_KEY — a missing key surfaced as an import-time crash
        rather than an actionable error. Importing is free; the key is required
        when a client is actually used.
        """
        if self._client is None:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError(
                    "GOOGLE_API_KEY environment variable is not set; "
                    "cannot create a Gemini client."
                )
            self._client = genai.Client(api_key=api_key)
        return self._client

    async def extract_business_context(
        self,
        conversation_text: str,
        existing_context: Optional[Dict[str, Any]] = None
    ) -> ExtractedContext:
        """
        Extract business context from conversation text using LLM
        
        Args:
            conversation_text: The conversation to analyze
            existing_context: Any existing context to merge with
            
        Returns:
            ExtractedContext with confidence score
        """
        try:
            existing_info = ""
            if existing_context:
                existing_info = f"Existing context: {json.dumps(existing_context, indent=2)}"
            
            prompt = f"""
            You are a business intelligence analyst. Extract business context from this conversation.
            
            {existing_info}
            
            Conversation:
            {conversation_text}
            
            Extract the following business information if mentioned:
            - Company name (exact name mentioned)
            - Industry (categorize into: SaaS/Software, E-commerce, Professional Services, Manufacturing, Healthcare, Retail, Financial Services, Education, Non-profit, Other)
            - Company size (categorize into: 1-10 employees, 11-50 employees, 51-200 employees, 201-500 employees, 500+ employees)
            - Geography (extract all locations mentioned - countries, regions, cities where company is based or operates. Examples: ["China", "Beijing"], ["United States", "California"], ["Europe"], ["Asia-Pacific"])
            - Target market (who are their customers)
            - Competitors (list of competitor names mentioned)
            - Price range (pricing information mentioned)
            - Technology stack (technologies, platforms, tools mentioned)
            - Revenue (revenue figures or ranges mentioned)
            - Business model (how they make money)
            - Unique value proposition (what makes them special)
            
            Also calculate a confidence_score from 0.0 to 1.0 based on:
            - How explicit the information is (0.2)
            - How much context was extracted (0.3) 
            - How consistent it is with existing context (0.3)
            - Quality and clarity of information (0.2)
            
            Return ONLY a JSON object with the extracted information. Use null for missing information.
            Do not include explanations or additional text.
            
            Example format:
            {{
                "companyName": "Acme Corp",
                "industry": "SaaS/Software",
                "companySize": "11-50 employees",
                "targetMarket": "Small businesses",
                "competitors": ["CompetitorA", "CompetitorB"],
                "priceRange": "$99-299/month",
                "technologyStack": ["React", "Python"],
                "revenue": "$1M-5M annually",
                "businessModel": "SaaS subscription",
                "uniqueValue": "AI-powered automation",
                "confidence_score": 0.75
            }}
            """
            
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ExtractedContext
                }
            )
            
            if not response.text:
                logger.warning("No response from LLM for context extraction")
                return ExtractedContext(confidence_score=0.0)
            
            # Use structured output with response parsing
            try:
                if response.parsed:
                    return response.parsed
                else:
                    logger.warning("No structured response parsed from LLM")
                    return ExtractedContext(confidence_score=0.0)
            except Exception as e:
                logger.error(f"Failed to parse structured response: {e}")
                logger.error(f"LLM response: {response.text}")
                return ExtractedContext(confidence_score=0.0)
                
        except Exception as e:
            logger.error(f"Error extracting business context: {e}")
            return ExtractedContext(confidence_score=0.0)
    
    async def analyze_conversation_relevance(
        self,
        user_message: str,
        assistant_response: str,
        organization_id: str,
        client_id: str = None
    ) -> Dict[str, Any]:
        """
        Use LLM to analyze if a conversation contains valuable business context.

        Args:
            user_message: The user's message
            assistant_response: The assistant's response
            organization_id: The organization ID for context
            client_id: Client ID for agency organizations (enables schema routing)

        Returns:
            Dictionary with analysis results including should_extract boolean
        """
        try:
            # Get existing context to understand what we already know
            # Multi-tenant routing: SME uses public.core_business_data, Agency uses agency.client_intelligence
            existing_context = None
            try:
                if client_id:
                    # Agency: Query agency.client_intelligence filtered by client_id
                    existing_context = self.supabase.schema("agency").table("client_intelligence").select("*").eq("client_id", client_id).limit(1).execute()
                else:
                    # SME: Query public.core_business_data filtered by org_id
                    existing_context = self.supabase.table("core_business_data").select("*").eq("org_id", organization_id).limit(1).execute()
            except Exception as e:
                # No existing context found - this is OK for new clients
                logger.debug(f"No existing context found (expected for new clients): {e}")
                existing_context = None

            existing_info = ""
            if existing_context and existing_context.data and len(existing_context.data) > 0:
                # List what we already know (data is a list, get first item)
                context_record = existing_context.data[0]
                known_fields = []
                for field, value in context_record.items():
                    if value and field not in ['id', 'org_id', 'client_id', 'created_at', 'updated_at', 'updated_by', 'created_by']:
                        known_fields.append(field)
                existing_info = f"We already know: {', '.join(known_fields)}" if known_fields else "We have no existing business context"
            else:
                existing_info = "We have no existing business context"
            
            prompt = f"""
            You are an intelligent business context analyzer. Analyze this conversation to determine if it contains valuable business information worth extracting.
            
            {existing_info}
            
            User Message: {user_message}
            
            Assistant Response: {assistant_response}
            
            Analyze the conversation and determine:
            1. Does it contain NEW or UPDATED business information worth extracting?
            2. What specific business topics are discussed?
            3. How valuable is this information on a scale of 0-1?
            
            Consider extracting if the conversation contains:
            - Company details (name, size, industry, location/geography)
            - Business model or strategy information
            - Target market or customer information
            - Competitive landscape details
            - Financial information (revenue, budget, pricing)
            - Technology stack or product details
            - Goals, challenges, or opportunities
            - Any other strategic business information
            
            DO extract even if we have existing context, if:
            - The information is more detailed or specific
            - The information contradicts or updates what we know
            - New aspects are revealed (e.g., new geography, new product line)
            
            DON'T extract if:
            - The conversation is purely tactical or operational
            - It's just casual chat without business substance
            - The information is too vague or generic
            - It's purely about using the tool interface
            
            Return a JSON object with your analysis.
            """
            
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ConversationRelevance
                }
            )
            
            if response.parsed:
                return response.parsed.model_dump()
            else:
                logger.warning("No structured response from LLM for relevance analysis")
                return {"should_extract": False, "reason": "Failed to analyze", "value_score": 0.0}
                
        except Exception as e:
            logger.error(f"Error analyzing conversation relevance: {e}")
            # Default to not extracting on error
            return {"should_extract": False, "reason": f"Analysis error: {str(e)}", "value_score": 0.0}
    
    async def enhance_cross_agent_prompt(
        self,
        base_prompt: str,
        campaign_id: str,
        agent_type: str
    ) -> str:
        """
        Intelligently enhance an agent prompt with relevant business context and cross-agent insights.
        
        Args:
            base_prompt: The original agent prompt
            campaign_id: ID of the current campaign  
            agent_type: Type of agent (strategy, persona, content, analytics, etc.)
            
        Returns:
            Enhanced prompt with business context, cross-agent insights, and agent-specific guidance
        """
        try:
            # Get comprehensive campaign context
            campaign_context = await self._get_campaign_context(campaign_id)
            
            if not campaign_context:
                logger.debug(f"No campaign context found for {campaign_id}")
                return base_prompt
            
            # Get context from other agents in this campaign
            cross_agent_insights = await self._get_cross_agent_insights(campaign_id, agent_type)
            
            # Generate intelligent context summary tailored to agent type
            context_summary = self._format_intelligent_context_for_agent(
                campaign_context, agent_type, cross_agent_insights
            )
            
            if not context_summary:
                return base_prompt
            
            # Create agent-specific enhanced prompt with strategic guidance
            enhanced_prompt = self._build_enhanced_prompt(
                base_prompt, context_summary, agent_type, cross_agent_insights
            )
            
            logger.debug(f"Enhanced {agent_type} prompt with {len(context_summary)} chars of context")
            return enhanced_prompt
            
        except Exception as e:
            logger.error(f"Error enhancing {agent_type} prompt with context: {e}")
            return base_prompt
    
    async def update_context_from_session(
        self,
        session_id: str,
        agent_type: str,
        conversation_text: str
    ) -> Optional[str]:
        """
        Extract context from a session and save for user approval
        
        Args:
            session_id: The agent session ID
            agent_type: Type of agent that generated the conversation
            conversation_text: The conversation text to analyze
            
        Returns:
            ID of the context history entry if created, None otherwise
        """
        try:
            # Get existing context for this campaign
            existing_context = await self._get_session_campaign_context(session_id)
            
            # Extract new context
            extracted = await self.extract_business_context(
                conversation_text,
                existing_context
            )
            
            # Only save if confidence is high enough and we extracted something useful
            if extracted.confidence_score < 0.3:
                logger.info(f"Context confidence too low ({extracted.confidence_score}) for session {session_id}")
                return None
            
            # Check if we have meaningful new information
            extracted_dict = extracted.dict(exclude_none=True, exclude={'confidence_score'})
            if not extracted_dict:
                logger.info(f"No meaningful context extracted from session {session_id}")
                return None
            
            # Save to context history for user approval
            response = self.supabase.table("agent_context_history").insert({
                "session_id": session_id,
                "agent_type": agent_type,
                "extracted_context": extracted_dict,
                "confidence_score": extracted.confidence_score,
                "user_approved": False
            }).execute()
            
            if response.data:
                logger.info(f"Saved context history for session {session_id} with confidence {extracted.confidence_score}")
                return response.data[0]["id"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating context from session {session_id}: {e}")
            return None
    
    async def _get_campaign_context(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """Get full context for a campaign"""
        try:
            # Get campaign with organization context
            response = self.supabase.table("campaigns").select(
                "id, name, campaign_context, agent_learnings, organization_id, organizations!inner(organization_context(business_info))"
            ).eq("id", campaign_id).single().execute()
            
            if not response.data:
                return None
            
            campaign = response.data
            org_context = {}
            
            # Extract organization context
            if campaign.get("organizations") and campaign["organizations"].get("organization_context"):
                org_context = campaign["organizations"]["organization_context"].get("business_info", {})
            
            return {
                "organization": org_context,
                "campaign": campaign.get("campaign_context", {}),
                "agent_learnings": campaign.get("agent_learnings", {}),
                "campaign_name": campaign.get("name")
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign context: {e}")
            return None
    
    async def _get_session_campaign_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get existing context for a session's campaign"""
        try:
            # Get session with campaign info
            response = self.supabase.table("agent_conversations").select(
                "campaign_id"
            ).eq("id", session_id).single().execute()
            
            if not response.data or not response.data.get("campaign_id"):
                return None
            
            return await self._get_campaign_context(response.data["campaign_id"])
            
        except Exception as e:
            logger.error(f"Error getting session campaign context: {e}")
            return None
    
    def _format_context_for_prompt(self, context: Dict[str, Any], agent_type: str) -> str:
        """Format context information for agent prompts"""
        try:
            org_info = context.get("organization", {})
            campaign_info = context.get("campaign", {})
            agent_learnings = context.get("agent_learnings", {})
            
            formatted_parts = []
            
            # Company basics
            if org_info.get("companyName"):
                formatted_parts.append(f"Company: {org_info['companyName']}")
            
            if org_info.get("industry"):
                formatted_parts.append(f"Industry: {org_info['industry']}")
            
            if org_info.get("companySize"):
                formatted_parts.append(f"Size: {org_info['companySize']}")
            
            if org_info.get("targetMarket"):
                formatted_parts.append(f"Target Market: {org_info['targetMarket']}")
            
            # Business specifics
            if org_info.get("competitors"):
                competitors = org_info["competitors"]
                if isinstance(competitors, list):
                    formatted_parts.append(f"Competitors: {', '.join(competitors)}")
            
            if org_info.get("priceRange"):
                formatted_parts.append(f"Pricing: {org_info['priceRange']}")
            
            if org_info.get("businessModel"):
                formatted_parts.append(f"Business Model: {org_info['businessModel']}")
            
            if org_info.get("uniqueValue"):
                formatted_parts.append(f"Unique Value: {org_info['uniqueValue']}")
            
            # Campaign specific context
            campaign_name = context.get("campaign_name")
            if campaign_name:
                formatted_parts.append(f"Campaign: {campaign_name}")
            
            # Agent-specific learnings
            agent_learning = agent_learnings.get(agent_type, {})
            if agent_learning:
                formatted_parts.append(f"Previous {agent_type} insights: {json.dumps(agent_learning)}")
            
            return "\n".join(formatted_parts) if formatted_parts else ""
            
        except Exception as e:
            logger.error(f"Error formatting context for prompt: {e}")
            return ""
    
    async def _get_cross_agent_insights(self, campaign_id: str, current_agent_type: str) -> Dict[str, Any]:
        """
        Get insights from other agents in this campaign for cross-agent intelligence.
        """
        try:
            # Get recent sessions from other agents in this campaign
            other_agents_sessions = self.supabase.table("agent_conversations").select(
                "id, agent_type, created_at"
            ).eq("campaign_id", campaign_id).neq(
                "agent_type", current_agent_type
            ).order("created_at", desc=True).limit(10).execute()
            
            if not other_agents_sessions.data:
                return {}
            
            insights = {}
            
            # Get key outputs from strategy outputs table (structured data)
            for session in other_agents_sessions.data:
                agent_type = session["agent_type"]
                session_id = session["id"]
                
                # 🚀 NUCLEAR: Get structured outputs from agent_outputs table
                outputs = self.supabase.table("agent_outputs").select(
                    "output_type, content"
                ).eq("session_id", session_id).eq("agent_type", "strategy").limit(3).execute()
                
                if outputs.data:
                    if agent_type not in insights:
                        insights[agent_type] = []
                    
                    for output in outputs.data:
                        insights[agent_type].append({
                            "type": output["output_type"],
                            "data": output["content"]
                        })
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting cross-agent insights: {e}")
            return {}
    
    def _format_intelligent_context_for_agent(
        self, 
        context: Dict[str, Any], 
        agent_type: str, 
        cross_agent_insights: Dict[str, Any]
    ) -> str:
        """
        Format context information intelligently based on agent type and cross-agent insights.
        """
        try:
            org_info = context.get("organization", {})
            campaign_info = context.get("campaign", {})
            
            # Start with core business context
            core_context = self._format_core_business_context(org_info)
            
            # Add agent-specific context emphasis
            agent_specific_context = self._format_agent_specific_context(org_info, campaign_info, agent_type)
            
            # Add relevant cross-agent insights
            cross_insights_text = self._format_cross_agent_insights(cross_agent_insights, agent_type)
            
            # Combine all context parts
            context_parts = [part for part in [core_context, agent_specific_context, cross_insights_text] if part]
            
            return "\n\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            logger.error(f"Error formatting intelligent context: {e}")
            return ""
    
    def _format_core_business_context(self, org_info: Dict[str, Any]) -> str:
        """Format core business information that's relevant to all agents."""
        parts = []
        
        if org_info.get("companyName"):
            parts.append(f"Company: {org_info['companyName']}")
        
        if org_info.get("industry"):
            parts.append(f"Industry: {org_info['industry']}")
        
        if org_info.get("companySize"):
            parts.append(f"Company Size: {org_info['companySize']}")
        
        if org_info.get("targetMarket"):
            parts.append(f"Target Market: {org_info['targetMarket']}")
        
        return "BUSINESS OVERVIEW:\n" + "\n".join(parts) if parts else ""
    
    def _format_agent_specific_context(self, org_info: Dict[str, Any], campaign_info: Dict[str, Any], agent_type: str) -> str:
        """Format context information specific to the agent type."""
        parts = []
        
        if agent_type == "strategy":
            # Strategy agent needs competitive and business model info
            if org_info.get("competitors"):
                competitors = org_info["competitors"]
                if isinstance(competitors, list):
                    parts.append(f"Key Competitors: {', '.join(competitors)}")
            
            if org_info.get("businessModel"):
                parts.append(f"Business Model: {org_info['businessModel']}")
            
            if org_info.get("priceRange"):
                parts.append(f"Pricing Strategy: {org_info['priceRange']}")
                
        elif agent_type == "persona":
            # Persona agent needs target market and customer info
            if org_info.get("targetMarket"):
                parts.append(f"Primary Target Market: {org_info['targetMarket']}")
            
            if org_info.get("customerSegments"):
                parts.append(f"Customer Segments: {', '.join(org_info['customerSegments'])}")
                
        elif agent_type == "content":
            # Content agent needs brand and messaging info
            if org_info.get("uniqueValue"):
                parts.append(f"Unique Value Proposition: {org_info['uniqueValue']}")
            
            if org_info.get("brandVoice"):
                parts.append(f"Brand Voice: {org_info['brandVoice']}")
                
        elif agent_type == "analytics":
            # Analytics agent needs business metrics and goals
            if org_info.get("businessModel"):
                parts.append(f"Business Model: {org_info['businessModel']}")
            
            if campaign_info.get("kpis"):
                parts.append(f"Campaign KPIs: {', '.join(campaign_info['kpis'])}")
        
        return f"{agent_type.upper()}-SPECIFIC CONTEXT:\n" + "\n".join(parts) if parts else ""
    
    def _format_cross_agent_insights(self, cross_agent_insights: Dict[str, Any], current_agent_type: str) -> str:
        """Format insights from other agents that are relevant to the current agent."""
        if not cross_agent_insights:
            return ""
        
        relevant_insights = []
        
        for agent_type, insights in cross_agent_insights.items():
            if not insights:
                continue
                
            # Map cross-agent relevance
            if current_agent_type == "strategy" and agent_type in ["persona", "analytics"]:
                # Strategy benefits from persona and analytics insights
                relevant_insights.append(f"From {agent_type} agent: {self._summarize_insights(insights)}")
                
            elif current_agent_type == "persona" and agent_type == "strategy":
                # Persona benefits from strategy insights
                relevant_insights.append(f"Strategic context: {self._summarize_insights(insights)}")
                
            elif current_agent_type == "content" and agent_type in ["strategy", "persona"]:
                # Content benefits from strategy and persona insights
                relevant_insights.append(f"From {agent_type}: {self._summarize_insights(insights)}")
                
            elif current_agent_type == "analytics" and agent_type in ["strategy", "content"]:
                # Analytics benefits from strategy and content insights
                relevant_insights.append(f"From {agent_type}: {self._summarize_insights(insights)}")
        
        return "CROSS-AGENT INSIGHTS:\n" + "\n".join(relevant_insights) if relevant_insights else ""
    
    def _summarize_insights(self, insights: List[Dict[str, Any]]) -> str:
        """Summarize insights from another agent into a concise format."""
        if not insights:
            return "No insights available"
        
        summaries = []
        for insight in insights[:2]:  # Limit to top 2 insights to avoid prompt bloat
            insight_type = insight.get("type", "analysis")
            data = insight.get("data", {})
            
            if isinstance(data, dict) and data:
                # Extract key findings from structured data
                key_items = list(data.keys())[:3]  # Top 3 keys
                summary = f"{insight_type}: {', '.join(key_items)}"
                summaries.append(summary)
        
        return "; ".join(summaries) if summaries else "Analysis completed"
    
    def _build_enhanced_prompt(
        self, 
        base_prompt: str, 
        context_summary: str, 
        agent_type: str,
        cross_agent_insights: Dict[str, Any]
    ) -> str:
        """
        Build an enhanced prompt with agent-specific guidance and context integration.
        """
        # Agent-specific guidance
        guidance_map = {
            "strategy": "Focus on strategic frameworks, competitive analysis, and business model implications. Use the business context to provide industry-specific recommendations.",
            "persona": "Develop detailed customer personas based on the target market and industry context. Consider the competitive landscape when defining user pain points.",
            "content": "Create content strategies that align with the company's unique value proposition and target market. Reference competitive positioning when appropriate.", 
            "analytics": "Analyze performance metrics in the context of the industry and business model. Provide benchmarks relevant to the company size and market."
        }
        
        agent_guidance = guidance_map.get(agent_type, "Incorporate the business context into your analysis and provide specific, actionable recommendations.")
        
        # Build the enhanced prompt
        enhanced_prompt = f"""
{context_summary}

AGENT GUIDANCE:
{agent_guidance}

TASK:
{base_prompt}

IMPORTANT: Use the above business context throughout your analysis. Make all recommendations specific to this company's industry, size, competitive position, and unique situation. Reference the business context directly in your reasoning.
"""
        
        return enhanced_prompt.strip()

# Singleton instance
context_intelligence = ContextIntelligenceService()