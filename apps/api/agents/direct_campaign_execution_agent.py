"""
Direct Campaign Execution Agent with CORRECT tool implementation following Google's best practices.
Tools return data/context, not generated content.
"""
from typing import Dict, Any, List, Optional
import logging

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent
from apps.api.agents.base_gemini_agent import genai, types
from apps.api.models.agent_tools import DeploymentPlan, ABTestSuggestion
from apps.api.utils.database import get_supabase_client
from apps.api.agents.tools.campaign_tools import CampaignTools

logger = logging.getLogger(__name__)

class DirectCampaignExecutionAgent(EnterpriseBaseAgent):
    def __init__(self, org_id: str = None, user_id: str = None, campaign_id: str = None):
        """Initialize Campaign Planning Agent with enterprise context and properly implemented tools that return data, not generated content."""

        # Initialize parent with enterprise context
        super().__init__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type="campaign_planning"
        )

        # Initialize CampaignTools for data management
        self.campaign_tools = CampaignTools(org_id=org_id, user_id=user_id)

    async def get_deployment_framework(self, campaign_name: str, campaign_brief: str, channels: str = "") -> Dict[str, Any]:
        """
        Provides campaign deployment frameworks and execution templates.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering deployment framework for campaign: {campaign_name}")
        
        return {
            "campaign_name": campaign_name,
            "campaign_brief": campaign_brief,
            "target_channels": channels,
            "deployment_framework": {
                "pre_launch_phase": {
                    "timeframe": "2-4 weeks before launch",
                    "key_activities": [
                        "Campaign asset creation and approval",
                        "Channel setup and configuration", 
                        "Testing and quality assurance",
                        "Team briefing and role assignment",
                        "Tracking and measurement setup"
                    ],
                    "deliverables": [
                        "Creative assets (approved)",
                        "Channel configurations (live)",
                        "Testing results (documented)",
                        "Launch checklist (completed)",
                        "Performance dashboard (ready)"
                    ]
                },
                "launch_phase": {
                    "timeframe": "Launch day and week 1",
                    "key_activities": [
                        "Campaign activation across all channels",
                        "Real-time monitoring and issue response",
                        "Initial performance assessment",
                        "Stakeholder communication",
                        "Quick optimization adjustments"
                    ],
                    "deliverables": [
                        "Campaign go-live confirmation",
                        "Performance monitoring reports",
                        "Issue log and resolutions", 
                        "Stakeholder updates",
                        "Initial optimization changes"
                    ]
                },
                "optimization_phase": {
                    "timeframe": "Week 2 onwards",
                    "key_activities": [
                        "Performance analysis and insights",
                        "A/B test implementation and analysis",
                        "Budget reallocation based on performance",
                        "Content and creative optimization",
                        "Audience and targeting refinement"
                    ],
                    "deliverables": [
                        "Performance analysis reports",
                        "Test results and recommendations",
                        "Budget reallocation plans",
                        "Optimized creative assets",
                        "Refined targeting parameters"
                    ]
                }
            },
            "channel_specific_templates": {
                "email_marketing": {
                    "setup_requirements": [
                        "Email list segmentation and validation",
                        "Email template design and testing",
                        "Send time optimization",
                        "Deliverability configuration",
                        "Automation workflow setup"
                    ],
                    "execution_checklist": [
                        "Subject line A/B tests configured",
                        "Personalization tokens tested",
                        "Mobile responsiveness verified",
                        "Links and CTAs functioning",
                        "Unsubscribe and compliance verified"
                    ],
                    "success_metrics": [
                        "Open rate (target: 20-25%)",
                        "Click-through rate (target: 2-5%)",
                        "Conversion rate (target: 1-3%)",
                        "Unsubscribe rate (keep below 0.5%)",
                        "Deliverability rate (target: 95%+)"
                    ]
                },
                "social_media": {
                    "setup_requirements": [
                        "Content calendar creation and approval",
                        "Visual asset preparation and optimization",
                        "Hashtag research and strategy",
                        "Posting schedule optimization",
                        "Community management protocols"
                    ],
                    "execution_checklist": [
                        "Content scheduled across platforms",
                        "Visual consistency maintained",
                        "Hashtags optimized per platform",
                        "Engagement monitoring activated",
                        "Brand voice guidelines followed"
                    ],
                    "success_metrics": [
                        "Engagement rate (target: 1-3%)",
                        "Reach and impressions growth",
                        "Click-through to website",
                        "Follower growth rate",
                        "Share and save rates"
                    ]
                },
                "paid_advertising": {
                    "setup_requirements": [
                        "Campaign structure and ad groups setup",
                        "Targeting parameters configuration", 
                        "Bid strategy selection and setup",
                        "Ad creative development and testing",
                        "Conversion tracking implementation"
                    ],
                    "execution_checklist": [
                        "Budgets allocated and scheduled",
                        "Targeting refined and verified",
                        "Ad creative approved and uploaded",
                        "Tracking pixels implemented",
                        "Automated rules configured"
                    ],
                    "success_metrics": [
                        "Cost per click (CPC)",
                        "Click-through rate (CTR)",
                        "Conversion rate",
                        "Return on ad spend (ROAS)",
                        "Cost per acquisition (CPA)"
                    ]
                },
                "content_marketing": {
                    "setup_requirements": [
                        "Content calendar and publishing schedule",
                        "SEO optimization and keyword strategy",
                        "Distribution channel planning",
                        "Promotion and amplification strategy",
                        "Performance measurement setup"
                    ],
                    "execution_checklist": [
                        "Content published according to schedule",
                        "SEO elements optimized",
                        "Social sharing enabled and promoted",
                        "Email and newsletter integration",
                        "Analytics tracking configured"
                    ],
                    "success_metrics": [
                        "Organic traffic growth",
                        "Search ranking improvements",
                        "Content engagement metrics",
                        "Lead generation from content",
                        "Brand mention and backlink growth"
                    ]
                }
            },
            "risk_management": {
                "common_risks": [
                    "Creative asset delays or rejections",
                    "Technical integration issues",
                    "Budget overspend or underspend",
                    "Negative feedback or PR issues",
                    "Platform policy violations"
                ],
                "mitigation_strategies": [
                    "Build buffer time into timelines",
                    "Conduct thorough pre-launch testing",
                    "Set up automated budget controls",
                    "Prepare crisis communication plans",
                    "Review platform guidelines regularly"
                ],
                "contingency_plans": {
                    "asset_delays": "Have backup creative ready",
                    "technical_issues": "Prepare manual fallback processes",
                    "budget_issues": "Implement automated spend controls",
                    "negative_feedback": "Activate crisis communication protocol",
                    "policy_violations": "Have compliant alternative assets ready"
                }
            }
        }

    async def get_ab_testing_framework(self, element_to_test: str, kpi_to_measure: str, context: str = "") -> Dict[str, Any]:
        """
        Provides A/B testing frameworks and optimization strategies.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering A/B testing framework for: {element_to_test}")
        
        return {
            "element_to_test": element_to_test,
            "primary_kpi": kpi_to_measure,
            "context": context,
            "testing_framework": {
                "test_design_principles": {
                    "single_variable_testing": "Test one element at a time for clear attribution",
                    "statistical_significance": "Run tests until 95% confidence level achieved",
                    "sample_size_calculation": "Ensure adequate sample size for reliable results",
                    "randomization": "Split traffic randomly to eliminate bias",
                    "duration_planning": "Run tests for at least one full business cycle"
                },
                "hypothesis_formation": {
                    "structure": "If we change [X] to [Y], then [Z metric] will [increase/decrease] because [reasoning]",
                    "elements": {
                        "baseline": "Current performance benchmark",
                        "intervention": "Specific change being tested",
                        "prediction": "Expected outcome with direction and magnitude",
                        "rationale": "Why this change should improve the metric"
                    }
                },
                "test_planning_checklist": [
                    "Define primary and secondary metrics",
                    "Calculate required sample size",
                    "Determine test duration",
                    "Set up tracking and measurement",
                    "Prepare test variants",
                    "Plan results analysis approach",
                    "Define success criteria and next steps"
                ]
            },
            "common_test_categories": {
                "email_marketing": {
                    "subject_lines": {
                        "test_variations": ["Length (short vs long)", "Personalization (name vs no name)", "Urgency (urgent vs calm)", "Question vs statement", "Emoji usage"],
                        "success_metrics": ["Open rate", "Click-through rate", "Unsubscribe rate"],
                        "sample_hypotheses": [
                            "Shorter subject lines will increase open rates on mobile",
                            "Including the recipient's name will improve engagement",
                            "Questions in subject lines will drive more curiosity clicks"
                        ]
                    },
                    "call_to_action": {
                        "test_variations": ["Button text", "Button color", "Button size", "Button placement", "Number of CTAs"],
                        "success_metrics": ["Click-through rate", "Conversion rate"],
                        "sample_hypotheses": [
                            "Action-oriented button text will increase clicks",
                            "Contrasting button colors will improve visibility and clicks",
                            "Single CTA will outperform multiple CTAs"
                        ]
                    }
                },
                "landing_pages": {
                    "headlines": {
                        "test_variations": ["Value proposition focus", "Benefit vs feature", "Length and complexity", "Emotional vs rational appeal"],
                        "success_metrics": ["Conversion rate", "Time on page", "Bounce rate"],
                        "sample_hypotheses": [
                            "Benefit-focused headlines will convert better than feature-focused",
                            "Emotional headlines will drive more engagement",
                            "Shorter headlines will have higher conversion rates"
                        ]
                    },
                    "form_optimization": {
                        "test_variations": ["Number of fields", "Field labels", "Required vs optional", "Progress indicators", "Form layout"],
                        "success_metrics": ["Form completion rate", "Lead quality", "Time to complete"],
                        "sample_hypotheses": [
                            "Fewer form fields will increase completion rates",
                            "Progress indicators will reduce abandonment",
                            "Single-column layout will outperform multi-column"
                        ]
                    }
                },
                "paid_advertising": {
                    "ad_creative": {
                        "test_variations": ["Images vs video", "Product-focused vs lifestyle", "Color schemes", "Text overlay", "Call-to-action buttons"],
                        "success_metrics": ["Click-through rate", "Conversion rate", "Cost per conversion"],
                        "sample_hypotheses": [
                            "Video ads will have higher engagement than static images",
                            "Lifestyle images will resonate better than product shots",
                            "Bright colors will attract more attention and clicks"
                        ]
                    },
                    "targeting": {
                        "test_variations": ["Audience segments", "Geographic targeting", "Device targeting", "Time of day", "Interest categories"],
                        "success_metrics": ["Conversion rate", "Cost per acquisition", "Return on ad spend"],
                        "sample_hypotheses": [
                            "Lookalike audiences will perform better than interest targeting",
                            "Mobile-specific creative will improve mobile conversions",
                            "Weekday targeting will be more cost-effective than weekends"
                        ]
                    }
                }
            },
            "statistical_considerations": {
                "sample_size_calculation": {
                    "factors": ["Current conversion rate", "Minimum detectable effect", "Statistical power", "Significance level"],
                    "formula": "n = (Z_α/2 + Z_β)² × (p₁(1-p₁) + p₂(1-p₂)) / (p₂-p₁)²",
                    "tools": ["Online calculators", "Statistical software", "Platform built-in calculators"]
                },
                "result_interpretation": {
                    "statistical_significance": "p-value < 0.05 (95% confidence)",
                    "practical_significance": "Effect size meaningful for business",
                    "confidence_intervals": "Range of plausible effect sizes",
                    "winner_declaration": "Both statistical and practical significance required"
                }
            },
            "implementation_best_practices": [
                "Start with high-impact, low-effort tests",
                "Document all test details and results",
                "Share learnings across teams and campaigns",
                "Build a testing culture and calendar",
                "Validate results with follow-up tests",
                "Consider long-term effects, not just short-term gains"
            ]
        }

    async def get_execution_context(self, campaign_type: str = "", focus_area: str = "") -> Dict[str, Any]:
        """
        Retrieves existing campaign execution data and performance insights using enterprise context.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Retrieving execution context for: {campaign_type} / {focus_area}")
        
        try:
            context_data = {
                'campaign_type': campaign_type,
                'focus_area': focus_area,
                'execution_insights': [],
                'strategy_context': [],
                'campaigns': [],
                'marketing_strategies': [],
                'historical_performance': {}
            }
            
            # Use enterprise context if available
            if hasattr(self, 'context') and self.context:
                # Get AI insights related to campaigns and execution
                if self.context.get('ai_insights'):
                    execution_insights = [
                        insight for insight in self.context['ai_insights'] 
                        if any(cat in ['campaign', 'execution', 'optimization', 'testing'] 
                               for cat in insight.get('category', []))
                    ][:5]
                    
                    for insight in execution_insights:
                        context_data['execution_insights'].append({
                            'title': insight.get('title', ''),
                            'content': insight.get('content', {}),
                            'category': insight.get('category', []),
                            'confidence_score': insight.get('confidence_score', 0),
                            'impact_score': insight.get('impact_score', 0),
                            'created_at': insight.get('created_at')
                        })
                
                # Get strategy context from enterprise data
                if self.context.get('strategy_outputs'):
                    for strategy in self.context['strategy_outputs'][:3]:
                        context_data['strategy_context'].append({
                            'type': strategy.get('output_type', 'unknown'),
                            'data': strategy.get('analysis_data', {}),
                            'created_at': strategy.get('created_at')
                        })
                
                # Get active campaigns
                if self.context.get('campaigns'):
                    context_data['campaigns'] = self.context['campaigns'][:5]
                
                # Get marketing strategies
                if self.context.get('strategies'):
                    context_data['marketing_strategies'] = self.context['strategies'][:3]
                    
                logger.info(f"Retrieved execution context from enterprise data with {len(context_data['execution_insights'])} insights")
            
            # Fallback to manual database query if no enterprise context
            elif self.org_id:
                supabase = get_supabase_client()
                
                # Get AI insights related to campaigns and execution
                insights_result = supabase.table('ai_insights').select('*') \
                    .eq('org_id', self.org_id) \
                    .contains('category', ['campaign', 'execution', 'optimization', 'testing']) \
                    .order('created_at', desc=True) \
                    .limit(5) \
                    .execute()
                
                # 🚀 NUCLEAR: Get strategy context from agent_outputs table
                strategy_result = supabase.table('agent_outputs').select('*') \
                    .eq('org_id', self.org_id) \
                    .eq('agent_type', 'strategy') \
                    .order('created_at', desc=True) \
                    .limit(3) \
                    .execute()
                
                # Process execution insights
                if insights_result.data:
                    for insight in insights_result.data:
                        context_data['execution_insights'].append({
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
                
                logger.info("Retrieved execution context from database fallback")
            else:
                context_data['message'] = 'No organization context available'
                logger.warning("No org_id or enterprise context available")
            
            return context_data
                
        except Exception as e:
            logger.error(f"Failed to retrieve execution context: {str(e)}")
            return {
                'error': str(e), 
                'execution_context': [],
                'execution_insights': [],
                'strategy_context': []
            }

    def get_agent_type(self) -> str:
        """Return the agent type identifier."""
        return "campaign_planning"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt for the Campaign Execution Agent."""
        return """You are an expert campaign manager and marketing operations specialist. Your goal is to help users plan the tactical execution of their marketing campaigns.

I specialize in:

**Campaign Planning & Strategy:**
- Multi-channel campaign orchestration
- Timeline and resource planning
- Channel selection and optimization
- Budget allocation across touchpoints

**Execution Frameworks:**
- Launch sequence planning and coordination
- Quality assurance and testing protocols
- Performance monitoring and optimization
- Crisis management and contingency planning

**A/B Testing & Optimization:**
- Test design and statistical planning
- Variant creation and hypothesis formation
- Results analysis and decision frameworks
- Continuous optimization strategies

**Channel Management:**
- Email marketing execution and automation
- Social media content planning and scheduling
- Paid advertising campaign setup and optimization
- Content marketing distribution strategies

**Performance Tracking:**
- KPI definition and measurement frameworks
- Real-time monitoring and alerting systems
- Attribution modeling and reporting
- Campaign post-mortem analysis

When you share your campaign goals and requirements, I'll:
1. Use my tools to gather execution frameworks and best practices
2. Provide detailed deployment plans with timelines and responsibilities
3. Suggest A/B testing strategies for continuous optimization
4. Consider your resources, constraints, and success metrics
5. Focus on practical, actionable execution steps

I have access to 5 powerful tools:
- **`LIST_CAMPAIGNS`**: View all existing campaigns and their execution status
- **`GET_CAMPAIGN_DETAILS`**: Get detailed execution information for specific campaigns
- `get_deployment_framework`: Provides campaign deployment templates and execution frameworks
- `get_ab_testing_framework`: Returns A/B testing templates and optimization strategies
- `get_execution_context`: Retrieves existing campaign data and performance insights

What campaign are you planning to execute? I can help you create a comprehensive deployment strategy."""
    
    def _get_agent_tools(self) -> List:
        """
        Define the Campaign Execution Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        # Return raw callables - SDK automatically converts to FunctionDeclaration
        tools = [
            # Core campaign execution tools
            self.get_deployment_framework,
            self.get_ab_testing_framework,
            self.get_execution_context,
            # Resource management tools
            self.list_campaigns,
            self.get_campaign_details,
        ]

        logger.info(f"Campaign Execution agent created {len(tools)} raw callable tools successfully")
        return tools

    async def list_campaigns(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        status: Optional[str] = None,
        channel: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List campaigns using CampaignTools.

        Args:
            limit: Maximum number of items to return
            offset: Pagination offset
            include_archived: Whether to include archived items
            status: Optional filter by campaign status
            channel: Optional filter by marketing channel

        Returns:
            Dictionary with campaign list
        """
        logger.info(f"Listing campaigns with status: {status}, channel: {channel}")

        # Initialize tools if not already done
        if not self.campaign_tools:
            self.campaign_tools = CampaignTools(org_id=self.org_id, user_id=self.user_id)

        if status == "active":
            result = await self.campaign_tools.list_active_campaigns(limit=limit)
        elif channel:
            result = await self.campaign_tools.list_campaigns_by_channel(
                channel=channel,
                limit=limit
            )
        else:
            result = await self.campaign_tools.list_resources(
                limit=limit,
                offset=offset,
                include_archived=include_archived
            )

        # Transform to expected format
        if result.get("success"):
            return {
                "campaigns": result.get("resources", []),
                "total": result.get("total", 0),
                "message": result.get("message", "Campaigns retrieved")
            }
        else:
            return {
                "campaigns": [],
                "total": 0,
                "error": result.get("error", "Failed to retrieve campaigns")
            }

    async def get_campaign_details(
        self,
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed campaign information using CampaignTools.

        Args:
            campaign_id: UUID of the campaign

        Returns:
            Dictionary with campaign details
        """
        logger.info(f"Getting campaign details for: {campaign_id}")

        # Initialize tools if not already done
        if not self.campaign_tools:
            self.campaign_tools = CampaignTools(org_id=self.org_id, user_id=self.user_id)

        result = await self.campaign_tools.get_resource_details(campaign_id)

        # Transform to expected format
        if result.get("success"):
            return {
                "campaign": result.get("resource"),
                "message": result.get("message", "Campaign details retrieved")
            }
        else:
            return {
                "campaign": None,
                "error": result.get("error", "Failed to retrieve campaign details")
            }

    async def process_request(self, session_id: str, user_message: str, user_id: str) -> Dict[str, Any]:
        """
        Processes a campaign execution-related query using a conversational, tool-based approach.
        """
        logger.info(f"Campaign Execution agent processing request for session {session_id}")
        try:
            return await self.chat(session_id, user_message, user_id)
        except Exception as e:
            logger.error(f"Campaign Execution agent request failed for session {session_id}: {str(e)}")
            raise