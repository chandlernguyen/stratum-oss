"""
Direct Client Success Agent with CORRECT tool implementation following Google's best practices.
Tools return data/context, not generated content.
Migrated to use EnterpriseBaseAgent for unified context.
"""
from typing import Dict, Any, List, Optional
import logging

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.models.agent_tools import ClientHealthReport, RetentionStrategy
from apps.api.utils.database import get_supabase_client
from apps.api.agents.tools.client_success_tools import ClientSuccessTools

logger = logging.getLogger(__name__)

class DirectClientSuccessAgent(EnterpriseBaseAgent):
    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None, campaign_id: Optional[str] = None):
        """Initialize Client Success Agent with enterprise context."""
        # Initialize parent with enterprise context
        super().__init__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type()
        )

        # Initialize ClientSuccessTools for data management
        self.client_success_tools = ClientSuccessTools(org_id=org_id, user_id=user_id)

        # Note: self.context is now loaded with all relevant data
        # No need for separate context loading methods

    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "client_success"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """You are an expert client success manager and account strategist. Your goal is to help users retain and grow their client accounts.

I specialize in:

**Client Health Assessment:**
- Health score calculation and trend analysis
- Early warning system for churn risk identification
- Engagement and usage pattern analysis
- Satisfaction and NPS tracking

**Retention Strategy Development:**
- Proactive retention campaigns and interventions
- Customer success playbook development
- Onboarding optimization and improvement
- Value demonstration and ROI communication

**Account Growth & Expansion:**
- Upselling and cross-selling opportunity identification
- Account mapping and stakeholder analysis
- Success milestone tracking and celebration
- Reference customer and case study development

**Relationship Management:**
- Stakeholder relationship mapping and nurturing
- Executive business review (EBR) planning
- Success metrics alignment and reporting
- Communication strategy and cadence optimization

**Churn Prevention & Recovery:**
- At-risk account identification and intervention
- Win-back campaigns for churned accounts
- Exit interview analysis and improvement
- Customer feedback loops and action plans

When you share client data and challenges, I'll:
1. Use my tools to assess client health and identify risk factors
2. Provide retention frameworks and proven intervention strategies
3. Suggest growth opportunities and expansion possibilities
4. Consider industry best practices and benchmarks
5. Focus on measurable outcomes and client success metrics

I have access to 5 powerful tools:
- **`LIST_CLIENTS`**: View all existing client accounts and their health status
- **`GET_CLIENT_DETAILS`**: Get detailed health metrics and success information for specific clients
- `get_client_health_framework`: Provides health assessment templates and scoring methodologies
- `get_retention_strategy_framework`: Returns proven retention strategies and intervention tactics
- `get_client_success_context`: Retrieves existing client data and relationship insights

What client situation can I help you analyze and improve?"""
    
    def _get_agent_tools(self) -> List:
        """
        Define the Client Success Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        # Return raw callables - SDK automatically converts to FunctionDeclaration
        tools = [
            # Core client success tools
            self.get_client_health_framework,
            self.get_retention_strategy_framework,
            self.get_client_success_context,
            # Resource management tools
            self.list_clients,
            self.get_client_details,
        ]

        logger.info(f"Client Success agent created {len(tools)} raw callable tools successfully")
        return tools

    async def get_client_health_framework(self, client_name: str, client_data: str, metrics_context: str = "") -> Dict[str, Any]:
        """
        Provides client health assessment frameworks and scoring methodologies.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering client health framework for: {client_name}")
        
        return {
            "client_name": client_name,
            "client_data_context": client_data,
            "metrics_context": metrics_context,
            "health_scoring_framework": {
                "usage_engagement": {
                    "weight": 0.30,
                    "description": "Product/service usage patterns and engagement levels",
                    "scoring_criteria": {
                        "excellent": {
                            "score_range": "0.9-1.0",
                            "characteristics": ["Daily active usage", "Feature adoption >80%", "Increasing usage trends"]
                        },
                        "good": {
                            "score_range": "0.7-0.89",
                            "characteristics": ["Weekly active usage", "Feature adoption 50-80%", "Stable usage patterns"]
                        },
                        "fair": {
                            "score_range": "0.5-0.69",
                            "characteristics": ["Monthly active usage", "Feature adoption 25-50%", "Declining usage trends"]
                        },
                        "poor": {
                            "score_range": "0.0-0.49",
                            "characteristics": ["Rare or no usage", "Feature adoption <25%", "Consistent decline"]
                        }
                    },
                    "key_metrics": [
                        "Login frequency and duration",
                        "Feature utilization rate",
                        "Data/content volume processed",
                        "API calls or integrations usage",
                        "Mobile app engagement"
                    ]
                },
                "support_satisfaction": {
                    "weight": 0.20,
                    "description": "Support interaction quality and satisfaction levels",
                    "scoring_criteria": {
                        "excellent": {
                            "score_range": "0.9-1.0",
                            "characteristics": ["CSAT >4.5/5", "Low ticket volume", "Quick resolution times"]
                        },
                        "good": {
                            "score_range": "0.7-0.89",
                            "characteristics": ["CSAT 4.0-4.5/5", "Normal ticket volume", "Reasonable resolution times"]
                        },
                        "fair": {
                            "score_range": "0.5-0.69",
                            "characteristics": ["CSAT 3.0-4.0/5", "High ticket volume", "Slow resolution times"]
                        },
                        "poor": {
                            "score_range": "0.0-0.49",
                            "characteristics": ["CSAT <3.0/5", "Escalations frequent", "Unresolved issues"]
                        }
                    },
                    "key_metrics": [
                        "Support ticket volume and trends",
                        "Customer satisfaction scores",
                        "First response time",
                        "Resolution time",
                        "Escalation frequency"
                    ]
                },
                "financial_health": {
                    "weight": 0.25,
                    "description": "Payment history and financial relationship strength",
                    "scoring_criteria": {
                        "excellent": {
                            "score_range": "0.9-1.0",
                            "characteristics": ["On-time payments", "Expanding spend", "Multi-year commitments"]
                        },
                        "good": {
                            "score_range": "0.7-0.89",
                            "characteristics": ["Mostly on-time payments", "Stable spend", "Annual commitments"]
                        },
                        "fair": {
                            "score_range": "0.5-0.69",
                            "characteristics": ["Occasional late payments", "Reducing spend", "Short-term commitments"]
                        },
                        "poor": {
                            "score_range": "0.0-0.49",
                            "characteristics": ["Frequent late payments", "Significant spend reduction", "Contract disputes"]
                        }
                    },
                    "key_metrics": [
                        "Payment timeliness",
                        "Account receivable age",
                        "Revenue growth/decline",
                        "Contract value trends",
                        "Billing disputes"
                    ]
                },
                "relationship_strength": {
                    "weight": 0.25,
                    "description": "Stakeholder engagement and relationship quality",
                    "scoring_criteria": {
                        "excellent": {
                            "score_range": "0.9-1.0",
                            "characteristics": ["Executive sponsor engaged", "Multiple touchpoints", "Referrals provided"]
                        },
                        "good": {
                            "score_range": "0.7-0.89",
                            "characteristics": ["Key contacts responsive", "Regular meetings", "Positive feedback"]
                        },
                        "fair": {
                            "score_range": "0.5-0.69",
                            "characteristics": ["Limited engagement", "Infrequent contact", "Neutral sentiment"]
                        },
                        "poor": {
                            "score_range": "0.0-0.49",
                            "characteristics": ["Contacts unresponsive", "Missed meetings", "Negative feedback"]
                        }
                    },
                    "key_metrics": [
                        "Executive sponsor engagement",
                        "Meeting attendance rates",
                        "Response times to communications",
                        "Net Promoter Score (NPS)",
                        "Reference willingness"
                    ]
                }
            },
            "risk_indicators": {
                "high_risk_signals": [
                    "Significant usage decline (>50% reduction)",
                    "Multiple unresolved support tickets",
                    "Payment delays >30 days",
                    "Key contact departures",
                    "Negative feedback or complaints",
                    "Missed renewal discussions",
                    "Competitive evaluation activities"
                ],
                "medium_risk_signals": [
                    "Moderate usage decline (25-50% reduction)",
                    "Occasional support escalations",
                    "Payment delays 15-30 days",
                    "Reduced engagement in meetings",
                    "Neutral or declining NPS scores",
                    "Contract optimization requests",
                    "Feature adoption plateauing"
                ],
                "low_risk_signals": [
                    "Stable or growing usage",
                    "Positive support interactions",
                    "On-time payments",
                    "Active stakeholder participation",
                    "Positive NPS scores",
                    "Expansion discussions",
                    "Feature adoption increasing"
                ]
            },
            "health_score_calculation": {
                "formula": "Overall Health = (Usage × 0.30) + (Support × 0.20) + (Financial × 0.25) + (Relationship × 0.25)",
                "score_interpretation": {
                    "0.8-1.0": "Healthy - Strong account with growth potential",
                    "0.6-0.79": "At Risk - Requires attention and intervention",
                    "0.4-0.59": "High Risk - Immediate action needed",
                    "0.0-0.39": "Critical - Urgent intervention required"
                },
                "trending_analysis": "Track monthly changes to identify improving/declining patterns"
            }
        }

    async def get_retention_strategy_framework(self, client_health_data: str, risk_level: str = "", focus_area: str = "") -> Dict[str, Any]:
        """
        Provides retention strategy frameworks and proven intervention tactics.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering retention strategy framework for risk level: {risk_level}")
        
        return {
            "client_health_context": client_health_data,
            "risk_level": risk_level,
            "focus_area": focus_area,
            "retention_strategy_framework": {
                "proactive_strategies": {
                    "healthy_clients": {
                        "objective": "Maintain satisfaction and identify growth opportunities",
                        "strategies": [
                            {
                                "name": "Success Milestone Celebration",
                                "description": "Recognize and celebrate client achievements and ROI milestones",
                                "implementation": "Quarterly success reviews with stakeholders, case study development",
                                "expected_impact": "Strengthens relationship and creates advocacy opportunities"
                            },
                            {
                                "name": "Expansion Opportunity Assessment",
                                "description": "Identify upselling and cross-selling opportunities",
                                "implementation": "Account mapping, needs assessment, proposal development",
                                "expected_impact": "Revenue growth and deeper product integration"
                            },
                            {
                                "name": "Executive Business Reviews",
                                "description": "Regular strategic alignment meetings with executive sponsors",
                                "implementation": "Quarterly EBRs with ROI reporting and strategic roadmap discussions",
                                "expected_impact": "Executive alignment and strategic partnership development"
                            }
                        ]
                    },
                    "at_risk_clients": {
                        "objective": "Address concerns and prevent churn through targeted interventions",
                        "strategies": [
                            {
                                "name": "Usage Optimization Program",
                                "description": "Improve product adoption and feature utilization",
                                "implementation": "Training sessions, best practice sharing, usage analytics review",
                                "expected_impact": "Increased engagement and value realization"
                            },
                            {
                                "name": "Support Escalation and Resolution",
                                "description": "Fast-track resolution of outstanding issues",
                                "implementation": "Dedicated support team, executive escalation, solution roadmap",
                                "expected_impact": "Improved satisfaction and trust restoration"
                            },
                            {
                                "name": "Value Demonstration Initiative",
                                "description": "Clearly communicate ROI and business value",
                                "implementation": "Custom ROI reports, peer benchmarking, success stories",
                                "expected_impact": "Renewed appreciation for value provided"
                            }
                        ]
                    },
                    "high_risk_clients": {
                        "objective": "Emergency intervention to prevent immediate churn",
                        "strategies": [
                            {
                                "name": "Executive Intervention Program",
                                "description": "High-level engagement to address relationship issues",
                                "implementation": "C-level meetings, apology and remediation plan, relationship reset",
                                "expected_impact": "Relationship repair and churn prevention"
                            },
                            {
                                "name": "Service Recovery Plan",
                                "description": "Comprehensive plan to address all outstanding issues",
                                "implementation": "Issue audit, resolution timeline, progress tracking, compensation if needed",
                                "expected_impact": "Trust rebuilding and satisfaction recovery"
                            },
                            {
                                "name": "Contract Renegotiation",
                                "description": "Adjust contract terms to better align with client needs",
                                "implementation": "Needs assessment, proposal development, flexible terms negotiation",
                                "expected_impact": "Retention through better alignment and flexibility"
                            }
                        ]
                    }
                },
                "intervention_playbooks": {
                    "usage_decline": {
                        "assessment": "Identify reasons for decreased usage",
                        "actions": [
                            "Conduct usage analytics review",
                            "Schedule product training sessions",
                            "Provide usage best practices documentation",
                            "Assign dedicated customer success manager",
                            "Monitor usage trends weekly"
                        ],
                        "success_metrics": ["Usage frequency increase", "Feature adoption improvement", "User satisfaction scores"]
                    },
                    "support_satisfaction": {
                        "assessment": "Review support ticket history and satisfaction scores",
                        "actions": [
                            "Escalate outstanding tickets to senior support",
                            "Schedule support process review meeting",
                            "Implement dedicated support channel",
                            "Provide support best practices training",
                            "Establish regular check-ins"
                        ],
                        "success_metrics": ["Ticket resolution time", "CSAT improvement", "Escalation reduction"]
                    },
                    "financial_issues": {
                        "assessment": "Understand payment delays and budget constraints",
                        "actions": [
                            "Schedule finance team meeting",
                            "Review payment terms and options",
                            "Offer payment plan flexibility",
                            "Demonstrate clear ROI and value",
                            "Explore contract restructuring"
                        ],
                        "success_metrics": ["Payment timeliness", "AR aging improvement", "Contract compliance"]
                    },
                    "relationship_degradation": {
                        "assessment": "Analyze stakeholder engagement and satisfaction",
                        "actions": [
                            "Map current stakeholder relationships",
                            "Schedule relationship reset meetings",
                            "Implement regular communication cadence",
                            "Provide executive sponsor engagement",
                            "Gather and act on feedback"
                        ],
                        "success_metrics": ["Meeting attendance", "NPS improvement", "Stakeholder satisfaction"]
                    }
                },
                "communication_strategies": {
                    "regular_touchpoints": {
                        "weekly": "Usage monitoring and quick check-ins",
                        "monthly": "Performance review and optimization opportunities",
                        "quarterly": "Strategic business reviews and planning",
                        "annually": "Contract renewal and expansion discussions"
                    },
                    "escalation_protocols": {
                        "level_1": "Customer Success Manager handles routine issues",
                        "level_2": "Senior CSM for relationship challenges",
                        "level_3": "Director/VP for executive-level concerns",
                        "level_4": "C-Suite for critical account recovery"
                    }
                }
            },
            "success_measurement": {
                "leading_indicators": [
                    "Health score trends",
                    "Usage pattern changes",
                    "Stakeholder engagement levels",
                    "Support satisfaction scores"
                ],
                "lagging_indicators": [
                    "Renewal rates",
                    "Expansion revenue",
                    "Customer lifetime value",
                    "Net revenue retention"
                ],
                "benchmarks": {
                    "customer_health_score": ">0.8 for healthy accounts",
                    "renewal_rate": ">90% industry target",
                    "nps_score": ">50 excellent, >30 good",
                    "expansion_rate": ">110% net revenue retention"
                }
            }
        }

    async def get_client_success_context(self, client_focus: str = "", industry: str = "") -> Dict[str, Any]:
        """
        Retrieves existing client success data and relationship insights.
        Uses enterprise context from EnterpriseBaseAgent instead of manual queries.
        """
        logger.info(f"Retrieving client success context for: {client_focus} / {industry}")
        
        # Use enterprise context loaded by EnterpriseBaseAgent
        context_data = {
            'client_focus': client_focus,
            'industry': industry,
            'success_insights': [],
            'strategy_context': [],
            'relationship_data': {},
            'personas': [],
            'campaigns': [],
            'strategies': []
        }
        
        # Get AI insights from enterprise context
        if self.context and self.context.get('ai_insights'):
            # Filter for client success related insights
            client_success_insights = [
                insight for insight in self.context['ai_insights']
                if any(cat in ['client_success', 'retention', 'customer', 'relationship'] 
                      for cat in insight.get('category', []) if isinstance(insight.get('category'), list))
            ]
            
            for insight in client_success_insights[:5]:
                context_data['success_insights'].append({
                    'title': insight.get('title', ''),
                    'content': insight.get('content', {}),
                    'category': insight.get('category', []),
                    'confidence_score': insight.get('confidence_score', 0),
                    'impact_score': insight.get('impact_score', 0),
                    'created_at': insight.get('created_at')
                })
        
        # Get strategy context from enterprise context
        if self.context and self.context.get('strategy_outputs'):
            for strategy in self.context['strategy_outputs'][:3]:
                context_data['strategy_context'].append({
                    'type': strategy.get('output_type', 'unknown'),
                    'data': strategy.get('analysis_data', {}),
                    'created_at': strategy.get('created_at')
                })
        
        # Include persona data for relationship insights
        if self.context and self.context.get('personas'):
            context_data['personas'] = self.context['personas'][:5]
        
        # Include campaign data for client context
        if self.context and self.context.get('campaigns'):
            context_data['campaigns'] = self.context['campaigns'][:3]
        
        # Include marketing strategies for alignment
        if self.context and self.context.get('strategies'):
            context_data['strategies'] = self.context['strategies'][:3]
        
        return context_data

    async def list_clients(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        health_score: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List clients using ClientSuccessTools.

        Args:
            limit: Maximum number of items to return
            offset: Pagination offset
            include_archived: Whether to include archived items
            health_score: Optional filter by health score

        Returns:
            Dictionary with client list
        """
        logger.info(f"Listing clients with health score: {health_score}")

        # Initialize tools if not already done
        if not self.client_success_tools:
            self.client_success_tools = ClientSuccessTools(org_id=self.org_id, user_id=self.user_id)

        if health_score:
            result = await self.client_success_tools.list_clients_by_health(
                health_score=health_score,
                limit=limit
            )
        else:
            result = await self.client_success_tools.list_resources(
                limit=limit,
                offset=offset,
                include_archived=include_archived
            )

        # Transform to expected format
        if result.get("success"):
            return {
                "clients": result.get("resources", []),
                "total": result.get("total", 0),
                "message": result.get("message", "Clients retrieved")
            }
        else:
            return {
                "clients": [],
                "total": 0,
                "error": result.get("error", "Failed to retrieve clients")
            }

    async def get_client_details(
        self,
        client_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed client information using ClientSuccessTools.

        Args:
            client_id: UUID of the client

        Returns:
            Dictionary with client details including health metrics
        """
        logger.info(f"Getting client details for: {client_id}")

        # Initialize tools if not already done
        if not self.client_success_tools:
            self.client_success_tools = ClientSuccessTools(org_id=self.org_id, user_id=self.user_id)

        result = await self.client_success_tools.get_client_health_metrics(client_id)

        # Transform to expected format
        if result.get("success"):
            return {
                "client": result.get("metrics"),
                "message": result.get("message", "Client details retrieved")
            }
        else:
            return {
                "client": None,
                "error": result.get("error", "Failed to retrieve client details")
            }

    async def process_request(self, session_id: str, user_message: str, user_id: str) -> Dict[str, Any]:
        """
        Processes a client success-related query using a conversational, tool-based approach.
        """
        logger.info(f"Client Success agent processing request for session {session_id}")
        try:
            return await self.chat(session_id, user_message, user_id)
        except Exception as e:
            logger.error(f"Client Success agent request failed for session {session_id}: {str(e)}")
            raise