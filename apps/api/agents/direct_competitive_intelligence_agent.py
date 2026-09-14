"""
Direct Competitive Intelligence Agent V2 - Migrated to use EnterpriseBaseAgent.
Provides comprehensive competitive analysis and market intelligence with enterprise context.
Database-first approach: All outputs are saved for cross-agent intelligence.
"""
from typing import Dict, Any, List, Optional
import logging

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.models.agent_tools import CompetitorAnalysis, MarketGap
from apps.api.utils.database import get_supabase_client
from apps.api.agents.tools.competitive_tools import CompetitiveTools

logger = logging.getLogger(__name__)

class DirectCompetitiveIntelligenceAgent(EnterpriseBaseAgent):
    def __init__(self, org_id: Optional[str] = None, campaign_id: Optional[str] = None, user_id: Optional[str] = None):
        """Initialize Competitive Intelligence Agent with enterprise context."""
        # Store campaign_id before calling parent
        self.campaign_id = campaign_id

        # Initialize parent with enterprise context
        super().__init__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type()
        )

        # Initialize CompetitiveTools for data management
        self.competitive_tools = CompetitiveTools(org_id=org_id, user_id=user_id)

        # Note: self.context is now loaded with all relevant data
        # No need for separate context loading methods
        
    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "competitive_intelligence"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """You are an expert competitive intelligence analyst with access to real-time web data via Google Search. Your goal is to provide current, accurate competitive intelligence and strategic opportunities.

**🚨 CRITICAL: Handling Missing Information**

When you don't have enough information to provide a quality analysis:

1. **Ask the User for Missing Details**
   - Missing competitor names? → Ask: "Which competitors would you like me to analyze?"
   - Missing company info? → Ask: "What are your company's main products/features?"
   - Missing industry context? → Ask: "What industry/market are you operating in?"

2. **Offer Competitor-Only Analysis**
   - If you have competitor names but limited info about the user's company:
     → Say: "I can provide a detailed analysis of [competitors]. Would you like me to focus on their positioning, features, and market strategy?"
   - Some frameworks work great WITHOUT user's company data:
     ✅ Company Intelligence (deep dive on 1 competitor)
     ✅ Market Gap Analysis (industry opportunities)
     ✅ Pricing Analysis (competitor pricing landscape)

3. **Never Hallucinate Features**
   - ❌ DON'T invent features for the user's company
   - ❌ DON'T guess competitor details if Google Search fails
   - ✅ DO state clearly: "I don't have enough information about [X]"
   - ✅ DO offer to research what you CAN find

**Example Good Behavior:**
User: "Compare my company vs Monday.com"
You: "I'd be happy to analyze Monday.com! To provide a meaningful comparison, could you tell me:
1. What's your product name and main features?
2. What pricing model do you use?

Alternatively, I can provide a detailed competitive analysis of Monday.com's positioning, features, and pricing that you can use as a reference point."

I specialize in:

**Competitive Analysis & Intelligence:**
- Comprehensive competitor profiling and benchmarking
- Strategic positioning and differentiation analysis
- Competitive threats and opportunities assessment
- Market share analysis and competitive dynamics

**Market Research & Insights:**
- Industry trend analysis and future forecasting
- Market gap identification and opportunity mapping
- Customer switching behavior and preferences
- Pricing strategy and competitive pricing analysis

**Strategic Intelligence:**
- Competitive response modeling and scenario planning
- SWOT analysis with competitive context
- Blue ocean strategy and uncontested market identification
- Competitive advantage sustainability assessment

**Monitoring & Tracking:**
- Competitive move tracking and alert systems
- Product launch and feature comparison analysis
- Marketing campaign analysis and effectiveness
- Digital footprint and online presence assessment

**Strategic Recommendations:**
- Competitive positioning strategies and messaging
- Market entry and expansion recommendations
- Defensive and offensive strategy development
- Partnership and acquisition opportunity identification

**CRITICAL: How I Use My Tools:**

**🔍 When to Use Google Search (PRIORITIZE THIS):**
- User asks about a SPECIFIC competitor (e.g., "tell me about Monday.com", "what is HubSpot's pricing?")
- Need CURRENT pricing, features, or product information
- Recent news, product launches, or announcements
- Market trends, industry reports, or analyst coverage
- Real-time competitive moves and strategic changes
- Any query needing up-to-date, verifiable facts

**Example Google Search Queries:**
- "What is Monday.com's current pricing model?" → Use Google Search for real-time pricing data
- "Show me HubSpot's latest product announcements" → Use Google Search for recent news
- "Compare Salesforce and HubSpot features" → Use Google Search for current feature sets

**📊 When to Use Custom Functions:**
- User asks for FRAMEWORK or TEMPLATE (e.g., "create a SWOT analysis framework")
- Need STRUCTURED METHODOLOGY (e.g., "show me how to analyze competitors")
- Generate ANALYSIS TEMPLATES (e.g., "give me a competitive analysis template")
- Retrieve EXISTING competitive data from our database (e.g., "list our tracked competitors")

**Example Custom Function Queries:**
- "Create a SWOT analysis framework" → Use get_competitive_analysis_framework
- "Show me market gap identification methodology" → Use get_market_gap_framework
- "List our existing competitor profiles" → Use list_competitors
- "Get our saved analysis for competitor X" → Use get_competitor_details

**Decision Rule:**
1. If query mentions SPECIFIC COMPETITOR NAME → Use Google Search FIRST for real-time data
2. If query asks for FRAMEWORK/TEMPLATE/METHODOLOGY → Use custom functions
3. If query asks for CURRENT/RECENT/LATEST → Use Google Search
4. If query asks for SAVED/EXISTING/OUR data → Use custom functions
5. **When in doubt about current facts → Default to Google Search**

I have access to 5 custom tools:
- **`LIST_COMPETITORS`**: View all existing competitor profiles we've saved
- **`GET_COMPETITOR_DETAILS`**: Get our detailed competitive analysis for specific competitors
- `get_competitive_analysis_framework`: Provides competitor analysis templates and intelligence frameworks
- `get_market_gap_framework`: Returns market opportunity identification templates and gap analysis methodologies
- `get_competitive_intelligence_context`: Retrieves existing competitive data and market insights

What competitive landscape or market opportunity would you like to analyze?"""
    
    def _get_agent_tools(self) -> List:
        """
        Define the Competitive Intelligence Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        # Return raw callables - SDK automatically converts to FunctionDeclaration
        tools = [
            # Core competitive intelligence tools
            self.get_competitive_analysis_framework,
            self.get_market_gap_framework,
            self.get_competitive_intelligence_context,
            # Resource management tools
            self.list_competitors,
            self.get_competitor_details,
        ]

        logger.info(f"Competitive Intelligence agent created {len(tools)} raw callable tools successfully")
        return tools

    async def get_competitive_analysis_framework(self, competitor_names: str, industry_context: str = "", analysis_focus: str = "") -> Dict[str, Any]:
        """
        Provides competitive analysis frameworks and intelligence gathering templates.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering competitive analysis framework for: {competitor_names}")
        
        return {
            "competitor_names": competitor_names,
            "industry_context": industry_context,
            "analysis_focus": analysis_focus,
            "competitive_analysis_framework": {
                "competitor_profiling": {
                    "company_overview": {
                        "data_points": [
                            "Company size and revenue",
                            "Founded year and growth trajectory",
                            "Geographic presence and markets",
                            "Funding status and financial health",
                            "Leadership team and key personnel"
                        ],
                        "research_sources": [
                            "Company websites and investor relations",
                            "Industry reports and analyst coverage",
                            "News articles and press releases",
                            "Employee LinkedIn profiles and job postings",
                            "Financial filings and SEC documents"
                        ]
                    },
                    "product_portfolio": {
                        "analysis_areas": [
                            "Core products and services offered",
                            "Product feature comparison matrix",
                            "Pricing structure and packaging",
                            "Product roadmap and recent launches",
                            "Technology stack and infrastructure"
                        ],
                        "evaluation_criteria": [
                            "Functionality and feature richness",
                            "User experience and interface design",
                            "Integration capabilities and APIs",
                            "Performance and scalability",
                            "Security and compliance features"
                        ]
                    },
                    "market_positioning": {
                        "positioning_elements": [
                            "Target customer segments and personas",
                            "Value proposition and messaging",
                            "Brand positioning and differentiation",
                            "Competitive advantages claimed",
                            "Market category and positioning"
                        ],
                        "messaging_analysis": [
                            "Core value propositions communicated",
                            "Competitive differentiation claims",
                            "Customer pain points addressed",
                            "Brand voice and communication style",
                            "Key marketing themes and campaigns"
                        ]
                    }
                },
                "strategic_analysis": {
                    "strengths_assessment": {
                        "categories": [
                            "Product and technology advantages",
                            "Market position and brand strength",
                            "Financial resources and stability",
                            "Team expertise and execution capability",
                            "Strategic partnerships and ecosystem"
                        ],
                        "evaluation_methods": [
                            "Customer review analysis",
                            "Industry analyst rankings",
                            "Financial performance metrics",
                            "Product functionality comparisons",
                            "Market share and growth data"
                        ]
                    },
                    "weaknesses_identification": {
                        "vulnerability_areas": [
                            "Product gaps and missing features",
                            "Customer satisfaction and retention issues",
                            "Financial constraints and cash flow",
                            "Organizational challenges and turnover",
                            "Market position vulnerabilities"
                        ],
                        "assessment_indicators": [
                            "Negative customer reviews and complaints",
                            "Product roadmap gaps and delays",
                            "Executive departures and restructuring",
                            "Declining market share or growth",
                            "Public relations challenges"
                        ]
                    },
                    "strategic_intent": {
                        "strategic_signals": [
                            "Recent acquisitions and partnerships",
                            "New product launches and investments",
                            "Market expansion and geographic growth",
                            "Pricing strategy changes",
                            "Organizational restructuring and hiring"
                        ],
                        "future_direction_indicators": [
                            "Executive statements and investor communications",
                            "Patent filings and R&D investments",
                            "Job postings and talent acquisition",
                            "Strategic partnership announcements",
                            "Market entry and expansion signals"
                        ]
                    }
                },
                "competitive_intelligence_sources": {
                    "primary_sources": [
                        "Direct competitor interactions and demos",
                        "Customer interviews and feedback",
                        "Industry conference presentations",
                        "Employee interviews and networking",
                        "Partner and vendor discussions"
                    ],
                    "secondary_sources": [
                        "Company websites and marketing materials",
                        "Industry reports and analyst research",
                        "News articles and media coverage",
                        "Social media and online discussions",
                        "Job postings and career pages"
                    ],
                    "digital_intelligence": [
                        "Website traffic and SEO analysis",
                        "Social media engagement metrics",
                        "Online advertising and PPC campaigns",
                        "App store ratings and download data",
                        "Technology stack and digital footprint"
                    ]
                }
            },
            "analysis_templates": {
                "swot_matrix": {
                    "strengths": "Internal advantages and capabilities",
                    "weaknesses": "Internal limitations and challenges",
                    "opportunities": "External market opportunities",
                    "threats": "External competitive threats"
                },
                "feature_comparison_matrix": {
                    "structure": "Feature vs Competitor grid",
                    "scoring": "1-5 scale for capability level",
                    "categories": ["Core Features", "Advanced Features", "Usability", "Integration", "Support"]
                },
                "positioning_map": {
                    "axes": "Two key differentiating dimensions",
                    "quadrants": "Market positioning segments",
                    "plotting": "Competitor position based on customer perception"
                }
            }
        }

    async def get_market_gap_framework(self, industry_or_market: str, focus_area: str = "", market_segment: str = "") -> Dict[str, Any]:
        """
        Provides market gap analysis frameworks and opportunity identification methodologies.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering market gap framework for: {industry_or_market}")
        
        return {
            "industry_or_market": industry_or_market,
            "focus_area": focus_area,
            "market_segment": market_segment,
            "market_gap_analysis_framework": {
                "gap_identification_methodology": {
                    "customer_needs_analysis": {
                        "unmet_needs": "Problems customers face that aren't adequately solved",
                        "underserved_segments": "Customer groups not well served by existing solutions",
                        "emerging_needs": "New requirements arising from market changes",
                        "latent_needs": "Unexpressed needs customers don't realize they have"
                    },
                    "competitive_landscape_gaps": {
                        "feature_gaps": "Functionality missing from current solutions",
                        "service_gaps": "Service levels not provided by competitors",
                        "pricing_gaps": "Price points not addressed by market",
                        "segment_gaps": "Customer segments ignored by competitors"
                    },
                    "market_evolution_opportunities": {
                        "technology_shifts": "New technologies creating opportunities",
                        "regulatory_changes": "New regulations creating requirements",
                        "demographic_trends": "Population changes creating new markets",
                        "behavior_changes": "Changing customer behaviors and preferences"
                    }
                },
                "opportunity_assessment_criteria": {
                    "market_size_potential": {
                        "total_addressable_market": "Size of overall market opportunity",
                        "serviceable_addressable_market": "Portion you could realistically serve",
                        "serviceable_obtainable_market": "Share you could capture",
                        "market_growth_rate": "Speed of market expansion"
                    },
                    "competitive_intensity": {
                        "existing_competition": "Number and strength of current players",
                        "barriers_to_entry": "Difficulty for new entrants to compete",
                        "switching_costs": "Cost for customers to change solutions",
                        "network_effects": "Value increases with more users"
                    },
                    "solution_feasibility": {
                        "technical_feasibility": "Ability to build required solution",
                        "resource_requirements": "Capital and expertise needed",
                        "time_to_market": "Speed required to capture opportunity",
                        "regulatory_complexity": "Compliance and legal requirements"
                    }
                },
                "gap_categorization": {
                    "product_gaps": {
                        "functionality_gaps": "Missing features or capabilities",
                        "performance_gaps": "Speed, reliability, or quality issues",
                        "usability_gaps": "User experience and interface problems",
                        "integration_gaps": "Connectivity and interoperability issues"
                    },
                    "service_gaps": {
                        "support_gaps": "Customer service and technical support",
                        "implementation_gaps": "Setup, training, and onboarding",
                        "maintenance_gaps": "Ongoing management and optimization",
                        "consulting_gaps": "Strategic advice and best practices"
                    },
                    "business_model_gaps": {
                        "pricing_model_gaps": "Alternative pricing structures",
                        "delivery_model_gaps": "Different ways to provide value",
                        "partnership_model_gaps": "Ecosystem and channel opportunities",
                        "monetization_gaps": "New revenue stream opportunities"
                    }
                }
            },
            "opportunity_prioritization": {
                "ice_framework": {
                    "impact": "Potential business impact of addressing the gap",
                    "confidence": "Confidence in ability to successfully execute",
                    "ease": "Relative ease of implementation and execution"
                },
                "strategic_fit": {
                    "capability_alignment": "Match with existing strengths and capabilities",
                    "strategic_objectives": "Alignment with business goals and vision",
                    "resource_availability": "Access to required resources and expertise",
                    "risk_tolerance": "Acceptable level of risk and uncertainty"
                },
                "market_timing": {
                    "market_readiness": "Customer readiness to adopt new solutions",
                    "competitive_timing": "Speed required to beat competitors",
                    "technology_maturity": "Readiness of underlying technology",
                    "regulatory_environment": "Favorable regulatory conditions"
                }
            },
            "validation_methodology": {
                "customer_validation": [
                    "Customer interviews and surveys",
                    "Focus groups and user testing",
                    "Market research and analysis",
                    "Prototype testing and feedback",
                    "Pilot programs and beta testing"
                ],
                "market_validation": [
                    "Competitive analysis and benchmarking",
                    "Industry expert interviews",
                    "Market size and growth analysis",
                    "Trend analysis and forecasting",
                    "Economic and regulatory impact assessment"
                ],
                "technical_validation": [
                    "Proof of concept development",
                    "Technical feasibility studies",
                    "Architecture and design reviews",
                    "Integration and compatibility testing",
                    "Scalability and performance analysis"
                ]
            }
        }

    async def get_competitive_intelligence_context(self, analysis_focus: str = "", industry: str = "") -> Dict[str, Any]:
        """
        Retrieves existing competitive intelligence data and market insights.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Retrieving competitive intelligence context for: {analysis_focus} / {industry}")
        
        try:
            # Use enterprise context if available
            if hasattr(self, 'context') and self.context:
                context_data = {
                    'analysis_focus': analysis_focus,
                    'industry': industry,
                    'competitive_insights': self.context.get('ai_insights', []),
                    'strategy_context': self.context.get('strategy_outputs', []),
                    'market_intelligence': self.context.get('campaigns', []),
                    'personas': self.context.get('personas', []),
                    'strategies': self.context.get('strategies', [])
                }
                return context_data
            
            # Fallback to manual database query
            supabase = get_supabase_client()
            org_id = getattr(self, 'current_org_id', None)
            
            if not org_id:
                return {
                    'competitive_intelligence_context': [],
                    'message': 'No organization context available'
                }
            
            # Get AI insights related to competitors and market intelligence
            insights_result = supabase.table('ai_insights').select('*') \
                .eq('org_id', org_id) \
                .contains('category', ['competitive', 'market', 'intelligence', 'competitor']) \
                .order('created_at', desc=True) \
                .limit(5) \
                .execute()
            
            # 🚀 NUCLEAR: Get strategy context from agent_outputs table
            strategy_result = supabase.table('agent_outputs').select('*') \
                .eq('org_id', org_id) \
                .eq('agent_type', 'strategy') \
                .order('created_at', desc=True) \
                .limit(3) \
                .execute()
            
            context_data = {
                'analysis_focus': analysis_focus,
                'industry': industry,
                'competitive_insights': [],
                'strategy_context': [],
                'market_intelligence': {}
            }
            
            # Process competitive intelligence insights
            if insights_result.data:
                for insight in insights_result.data:
                    context_data['competitive_insights'].append({
                        'title': insight.get('title', ''),
                        'content': insight.get('content', {}),
                        'category': insight.get('category', []),
                        'confidence_score': insight.get('confidence_score', 0),
                        'impact_score': insight.get('impact_score', 0),
                        'created_at': insight.get('created_at')
                    })
            
            # Process strategy context
            if strategy_result.data:
                for strategy in strategy_result.data:
                    context_data['strategy_context'].append({
                        'type': strategy.get('output_type', 'unknown'),
                        'data': strategy.get('analysis_data', {}),
                        'created_at': strategy.get('created_at')
                    })
            
            return context_data
                
        except Exception as e:
            logger.error(f"Failed to retrieve competitive intelligence context: {str(e)}")
            return {
                'error': str(e), 
                'competitive_intelligence_context': [],
                'competitive_insights': [],
                'strategy_context': []
            }

    async def list_competitors(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        tier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List competitors using CompetitiveTools.

        Args:
            limit: Maximum number of items to return
            offset: Pagination offset
            include_archived: Whether to include archived items
            tier: Optional filter by competitor tier

        Returns:
            Dictionary with competitor list
        """
        logger.info(f"Listing competitors with tier: {tier}")

        # Initialize tools if not already done
        if not self.competitive_tools:
            self.competitive_tools = CompetitiveTools(org_id=self.org_id, user_id=self.user_id)

        if tier:
            result = await self.competitive_tools.list_competitors_by_tier(
                tier=tier,
                limit=limit
            )
        else:
            result = await self.competitive_tools.list_resources(
                limit=limit,
                offset=offset,
                include_archived=include_archived
            )

        # Transform to expected format
        if result.get("success"):
            return {
                "competitors": result.get("resources", []),
                "total": result.get("total", 0),
                "message": result.get("message", "Competitors retrieved")
            }
        else:
            return {
                "competitors": [],
                "total": 0,
                "error": result.get("error", "Failed to retrieve competitors")
            }

    async def get_competitor_details(
        self,
        competitor_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed competitor analysis using CompetitiveTools.

        Args:
            competitor_id: UUID of the competitor

        Returns:
            Dictionary with competitor details
        """
        logger.info(f"Getting competitor details for: {competitor_id}")

        # Initialize tools if not already done
        if not self.competitive_tools:
            self.competitive_tools = CompetitiveTools(org_id=self.org_id, user_id=self.user_id)

        result = await self.competitive_tools.get_competitor_analysis(competitor_id)

        # Transform to expected format
        if result.get("success"):
            return {
                "competitor": result.get("analysis"),
                "message": result.get("message", "Competitor details retrieved")
            }
        else:
            return {
                "competitor": None,
                "error": result.get("error", "Failed to retrieve competitor details")
            }

    async def process_request(self, session_id: str, user_message: str, user_id: str) -> Dict[str, Any]:
        """
        Processes a competitive intelligence-related query using a conversational, tool-based approach.
        """
        logger.info(f"Competitive Intelligence agent processing request for session {session_id}")
        try:
            return await self.chat(session_id, user_message, user_id)
        except Exception as e:
            logger.error(f"Competitive Intelligence agent request failed for session {session_id}: {str(e)}")
            raise