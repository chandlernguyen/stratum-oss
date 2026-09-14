"""Strategic analytical tools extracted from DirectStrategyAgent.

This module contains the analytical frameworks for strategic analysis:
- SWOT Analysis
- Porter's Five Forces
- VRIO Analysis

Each tool maintains its original functionality and data structures.
"""

from typing import Dict, Any, List
import logging
from datetime import datetime, timezone

from .base import StrategyToolBase
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)


class StrategyAnalyticalTools(StrategyToolBase):
    """Analytical tools for strategic framework analysis."""

    async def get_swot_analysis(self, business_context: str) -> Dict[str, Any]:
        """
        Provides SWOT analysis templates and retrieves existing analysis data.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering SWOT analysis data for: {business_context[:50]}...")

        # Get existing SWOT analyses if any
        existing_swot = await self._fetch_existing_swot()

        return {
            "business_context": business_context,
            "existing_analyses": existing_swot,
            "swot_template": {
                "strengths": {
                    "description": "Internal positive attributes and advantages",
                    "examples": ["Strong brand recognition", "Skilled workforce", "Patents/IP", "Cost advantages", "Market position"]
                },
                "weaknesses": {
                    "description": "Internal negative factors that need improvement",
                    "examples": ["Limited resources", "Skill gaps", "Poor location", "High costs", "Quality issues"]
                },
                "opportunities": {
                    "description": "External positive factors that could be leveraged",
                    "examples": ["Market growth", "New technologies", "Regulatory changes", "Partnership potential"]
                },
                "threats": {
                    "description": "External challenges or risks to the business",
                    "examples": ["New competitors", "Economic downturn", "Changing regulations", "Technology disruption"]
                }
            },
            "analysis_guidelines": [
                "Be specific and quantify where possible",
                "Focus on factors that directly impact competitive advantage",
                "Consider both current state and future trends",
                "Prioritize factors by their significance to the business"
            ],
            "framework_best_practices": {
                "strengths_focus": "What do you do better than anyone else?",
                "weaknesses_honesty": "What areas need improvement to remain competitive?",
                "opportunities_vision": "What external trends could accelerate growth?",
                "threats_preparation": "What could derail your strategy?"
            }
        }

    async def get_porters_five_forces(self, industry_context: str) -> Dict[str, Any]:
        """
        Provides Porter's Five Forces templates and industry analysis data.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering Porter's Five Forces data for: {industry_context[:50]}...")

        return {
            "industry_context": industry_context,
            "five_forces_template": {
                "competitive_rivalry": {
                    "description": "Intensity of competition among existing players",
                    "factors": ["Number of competitors", "Industry growth", "Switching costs", "Product differentiation"]
                },
                "supplier_power": {
                    "description": "Bargaining power of suppliers",
                    "factors": ["Number of suppliers", "Supplier concentration", "Switching costs", "Forward integration threat"]
                },
                "buyer_power": {
                    "description": "Bargaining power of customers",
                    "factors": ["Customer concentration", "Price sensitivity", "Switching costs", "Backward integration threat"]
                },
                "threat_of_substitutes": {
                    "description": "Threat from alternative products or services",
                    "factors": ["Substitute availability", "Relative price", "Performance comparison", "Switching ease"]
                },
                "threat_of_new_entrants": {
                    "description": "Ease of new competitors entering the market",
                    "factors": ["Entry barriers", "Capital requirements", "Brand loyalty", "Government regulation"]
                }
            },
            "industry_benchmarks": await self._get_industry_benchmarks(industry_context),
            "competitive_assessment_guide": {
                "high_intensity": "Multiple strong competitors, low switching costs",
                "medium_intensity": "Moderate competition with some differentiation",
                "low_intensity": "Few competitors or high switching costs"
            }
        }

    async def get_vrio_analysis(self, business_context: str, resources_capabilities: str) -> Dict[str, Any]:
        """
        Provides VRIO analysis templates and competitive advantage frameworks.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering VRIO analysis data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "resources_capabilities": resources_capabilities,
            "vrio_framework": {
                "valuable": {
                    "question": "Does this resource enable the firm to exploit opportunities or neutralize threats?",
                    "examples": ["Customer relationships", "Brand reputation", "Proprietary technology", "Cost advantages"]
                },
                "rare": {
                    "question": "Is this resource controlled by only a few competing firms?",
                    "threshold": "< 20% of competitors have this resource"
                },
                "imitable": {
                    "question": "Is it difficult or costly for other firms to obtain or develop this resource?",
                    "barriers": ["Causal ambiguity", "Social complexity", "Path dependence", "Patents"]
                },
                "organized": {
                    "question": "Is the firm organized to capture value from this resource?",
                    "requirements": ["Appropriate structure", "Management systems", "Compensation policies"]
                }
            },
            "competitive_implications": {
                "V=No": "Competitive disadvantage - eliminate or improve",
                "V=Yes, R=No": "Competitive parity - table stakes",
                "V=Yes, R=Yes, I=No": "Temporary competitive advantage - exploit quickly",
                "V=Yes, R=Yes, I=Yes, O=No": "Unused competitive advantage - organize to capture value",
                "V=Yes, R=Yes, I=Yes, O=Yes": "Sustainable competitive advantage - protect and leverage"
            },
            "resource_categories": [
                "Physical resources (facilities, equipment, location)",
                "Human resources (skills, knowledge, experience)",
                "Organizational resources (culture, processes, systems)",
                "Financial resources (cash, access to capital)",
                "Technological resources (patents, know-how, R&D)",
                "Reputational resources (brand, customer loyalty)"
            ]
        }

    # Helper methods

    async def _fetch_existing_swot(self) -> List[Dict[str, Any]]:
        """Fetch existing SWOT analyses from the database."""
        try:
            # Use enterprise context if available
            if self.context and self.context.get('strategy_outputs'):
                swot_outputs = [
                    output for output in self.context['strategy_outputs']
                    if output.get('output_type') == 'swot'
                ]
                return swot_outputs[:3]

            # Fallback to direct database query
            if not self.org_id:
                return []

            supabase = get_supabase_client()
            # 🚀 NUCLEAR: Query agent_outputs table instead of strategy_outputs
            result = supabase.table('agent_outputs') \
                .select('content, created_at') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'strategy') \
                .eq('output_type', 'swot') \
                .order('created_at', desc=True) \
                .limit(3) \
                .execute()

            # 🚀 NUCLEAR: Extract SWOT data from content field
            if result.data:
                return [
                    {
                        'strengths': item['content'].get('strengths', []),
                        'weaknesses': item['content'].get('weaknesses', []),
                        'opportunities': item['content'].get('opportunities', []),
                        'threats': item['content'].get('threats', []),
                        'created_at': item['created_at']
                    }
                    for item in result.data
                    if item.get('content')
                ]
            return []
        except Exception as e:
            logger.error(f"Failed to fetch existing SWOT analyses: {e}")
            return []

    async def _get_industry_benchmarks(self, industry_context: str) -> Dict[str, Any]:
        """Get industry-specific benchmarks and insights."""
        # This would ideally query a database of industry data
        # For now, return general benchmarks
        return {
            "average_market_concentration": "Top 4 players control 40-60% of market",
            "typical_profit_margins": "10-15% net margin",
            "innovation_cycle": "18-24 months for new product development",
            "customer_acquisition_cost": "15-25% of first-year revenue",
            "churn_rate": "5-15% annually for B2B, 20-40% for B2C"
        }