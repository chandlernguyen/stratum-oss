"""Portfolio Management and Business Model Tools for Strategy Agent.

This module contains tools for portfolio analysis and business model design:
- BCG Matrix for portfolio analysis
- Business Model Canvas for business model design
- Three Horizons for growth planning

These tools provide structured frameworks and templates for strategic analysis.
"""

from typing import Dict, Any, List
import logging

from .base import StrategyToolBase

logger = logging.getLogger(__name__)


class StrategyPortfolioTools(StrategyToolBase):
    """Portfolio management and business model tools for strategic analysis.

    This class provides tools for:
    - Portfolio analysis using BCG Matrix
    - Business model design using Business Model Canvas
    - Growth planning using Three Horizons framework
    """

    async def get_bcg_matrix(self, business_context: str, products_or_units: str) -> Dict[str, Any]:
        """
        Provides BCG Matrix templates and portfolio analysis frameworks.
        Returns data for the model to use, not generated content.
        """
        self.logger.info(f"Gathering BCG Matrix data for: {products_or_units[:50]}...")

        return {
            "business_context": business_context,
            "products_or_units": products_or_units,
            "bcg_categories": {
                "stars": {
                    "definition": "High market growth, high relative market share",
                    "characteristics": ["Market leaders in growing markets", "Require investment to maintain position"],
                    "strategy": "Invest to maintain market leadership"
                },
                "cash_cows": {
                    "definition": "Low market growth, high relative market share",
                    "characteristics": ["Generate cash with little investment", "Mature, stable markets"],
                    "strategy": "Harvest cash to fund other opportunities"
                },
                "question_marks": {
                    "definition": "High market growth, low relative market share",
                    "characteristics": ["High investment needs", "Uncertain market position"],
                    "strategy": "Invest to become Stars or divest"
                },
                "dogs": {
                    "definition": "Low market growth, low relative market share",
                    "characteristics": ["Poor cash generation", "Declining markets"],
                    "strategy": "Harvest or divest"
                }
            },
            "assessment_criteria": {
                "market_growth_rate": {
                    "high_threshold": "> 10% annual growth",
                    "measurement": "Industry growth rate vs GDP growth"
                },
                "relative_market_share": {
                    "high_threshold": "> 1.5x largest competitor",
                    "measurement": "Your market share ÷ Largest competitor's share"
                }
            },
            "portfolio_balance_principles": [
                "Balanced portfolio includes all four categories",
                "Stars should be the future Cash Cows",
                "Cash Cows fund Stars and promising Question Marks",
                "Dogs drain resources without strategic value"
            ]
        }

    async def get_business_model_canvas(self, business_description: str) -> Dict[str, Any]:
        """
        Provides Business Model Canvas templates and business model examples.
        Returns data for the model to use, not generated content.
        """
        self.logger.info(f"Gathering Business Model Canvas data for: {business_description[:50]}...")

        return {
            "business_description": business_description,
            "canvas_components": {
                "key_partners": {
                    "description": "Network of suppliers and partners",
                    "examples": ["Suppliers", "Strategic alliances", "Joint ventures", "Key distributors"]
                },
                "key_activities": {
                    "description": "Most important activities for success",
                    "examples": ["Production", "Problem solving", "Platform/network management"]
                },
                "key_resources": {
                    "description": "Most important assets required",
                    "examples": ["Physical", "Intellectual", "Human", "Financial resources"]
                },
                "value_propositions": {
                    "description": "Bundle of products/services creating value",
                    "examples": ["Newness", "Performance", "Customization", "Design", "Brand", "Price", "Cost reduction"]
                },
                "customer_relationships": {
                    "description": "Types of relationships with customer segments",
                    "examples": ["Personal assistance", "Dedicated support", "Self-service", "Communities", "Co-creation"]
                },
                "channels": {
                    "description": "How to reach and deliver to customers",
                    "examples": ["Web sales", "Own stores", "Partner stores", "Wholesaler"]
                },
                "customer_segments": {
                    "description": "Different groups of people or organizations",
                    "examples": ["Mass market", "Niche market", "Segmented", "Diversified", "Multi-sided platforms"]
                },
                "cost_structure": {
                    "description": "All costs incurred to operate the business model",
                    "examples": ["Fixed costs", "Variable costs", "Economies of scale", "Economies of scope"]
                },
                "revenue_streams": {
                    "description": "Cash generated from each customer segment",
                    "examples": ["Asset sale", "Usage fee", "Subscription", "Lending", "Licensing", "Advertising"]
                }
            },
            "business_model_types": [
                "B2B (Business-to-Business)",
                "B2C (Business-to-Consumer)",
                "B2B2C (Business-to-Business-to-Consumer)",
                "Marketplace/Platform",
                "Subscription",
                "Freemium",
                "SaaS (Software as a Service)"
            ]
        }

    async def get_three_horizons(self, business_context: str, growth_objectives: str) -> Dict[str, Any]:
        """
        Provides Three Horizons growth planning templates and frameworks.
        Returns data for the model to use, not generated content.
        """
        self.logger.info(f"Gathering Three Horizons data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "growth_objectives": growth_objectives,
            "horizon_definitions": {
                "horizon_1": {
                    "timeframe": "0-18 months",
                    "resource_allocation": "70-80% of resources",
                    "description": "Defend and extend core business",
                    "characteristics": ["Incremental innovations", "Market penetration", "Operational excellence"],
                    "examples": ["Product improvements", "Geographic expansion", "Customer acquisition"],
                    "risk_level": "Low",
                    "returns": "Predictable, near-term"
                },
                "horizon_2": {
                    "timeframe": "18 months - 3 years",
                    "resource_allocation": "15-25% of resources",
                    "description": "Build emerging businesses",
                    "characteristics": ["Adjacent opportunities", "New capabilities", "Market development"],
                    "examples": ["New customer segments", "Adjacent markets", "Platform extensions"],
                    "risk_level": "Medium",
                    "returns": "Moderate uncertainty, medium-term"
                },
                "horizon_3": {
                    "timeframe": "3-10 years",
                    "resource_allocation": "5-15% of resources",
                    "description": "Create transformational opportunities",
                    "characteristics": ["Disruptive innovation", "New business models", "Breakthrough technologies"],
                    "examples": ["Emerging technologies", "New industries", "Revolutionary products"],
                    "risk_level": "High",
                    "returns": "High uncertainty, long-term potential"
                }
            },
            "balancing_principles": [
                "All three horizons should operate simultaneously",
                "H1 funds H2 and H3 investments",
                "Different management approaches for each horizon",
                "Success metrics vary by horizon",
                "Portfolio approach to risk management"
            ],
            "common_pitfalls": [
                "Over-investing in H1 at expense of future",
                "Under-investing in H3 innovation",
                "Applying H1 metrics to H2/H3 initiatives",
                "Lack of clear resource allocation",
                "Insufficient separation of horizon management"
            ]
        }