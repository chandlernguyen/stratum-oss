"""Strategy framework tools - ICE scoring, Blue Ocean, and McKinsey 7S frameworks."""

from typing import Dict, Any
import logging

from .base import StrategyToolBase

logger = logging.getLogger(__name__)


class StrategyFrameworkTools(StrategyToolBase):
    """Strategic framework and evaluation tools for the Strategy Agent.

    This module contains:
    - ICE Scoring (Impact, Confidence, Ease prioritization)
    - Blue Ocean Strategy (ERRC framework)
    - McKinsey 7S (Organizational alignment)
    """

    async def get_ice_scoring(self, decision_context: str, options: str) -> Dict[str, Any]:
        """
        Provides ICE scoring templates and prioritization frameworks.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering ICE scoring data for: {decision_context[:50]}...")

        return {
            "decision_context": decision_context,
            "options_to_evaluate": options,
            "ice_framework": {
                "impact": {
                    "description": "How much positive effect will this have?",
                    "scale": "1-10 (10 = transformational impact)",
                    "questions": [
                        "How many customers/users will this affect?",
                        "How significantly will it improve key metrics?",
                        "What's the potential revenue/cost impact?"
                    ]
                },
                "confidence": {
                    "description": "How confident are we in achieving the expected impact?",
                    "scale": "1-10 (10 = certain success)",
                    "questions": [
                        "How much data supports this assumption?",
                        "Have we done something similar before?",
                        "What's the risk of failure?"
                    ]
                },
                "ease": {
                    "description": "How easy is this to implement?",
                    "scale": "1-10 (10 = very easy)",
                    "questions": [
                        "What resources are required?",
                        "How complex is the implementation?",
                        "What dependencies exist?"
                    ]
                }
            },
            "scoring_calculation": "Total Score = (Impact × Confidence × Ease) ÷ 100",
            "interpretation_guide": {
                "high_priority": "Score > 7.0 - Implement immediately",
                "medium_priority": "Score 4.0-7.0 - Consider for next phase",
                "low_priority": "Score < 4.0 - Defer or revisit assumptions"
            },
            "common_biases_to_avoid": [
                "Overestimating ease due to optimism bias",
                "Underestimating impact due to status quo bias",
                "Inflating confidence due to overconfidence bias"
            ]
        }

    async def get_blue_ocean_strategy(self, business_context: str, industry_description: str) -> Dict[str, Any]:
        """
        Provides Blue Ocean Strategy templates and value innovation frameworks.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering Blue Ocean Strategy data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "industry_description": industry_description,
            "errc_framework": {
                "eliminate": {
                    "question": "Which factors that the industry takes for granted should be eliminated?",
                    "purpose": "Remove factors that add cost but little value",
                    "examples": ["Unnecessary features", "Complex processes", "Traditional assumptions"]
                },
                "reduce": {
                    "question": "Which factors should be reduced well below the industry standard?",
                    "purpose": "Minimize factors that create little differentiation",
                    "examples": ["Over-engineered features", "Excessive service levels", "Premium materials"]
                },
                "raise": {
                    "question": "Which factors should be raised well above the industry standard?",
                    "purpose": "Enhance factors that create strong differentiation",
                    "examples": ["User experience", "Convenience", "Speed", "Simplicity"]
                },
                "create": {
                    "question": "Which factors should be created that the industry has never offered?",
                    "purpose": "Discover new sources of value",
                    "examples": ["New features", "Service models", "Experience elements"]
                }
            },
            "value_innovation_principles": {
                "definition": "Simultaneous pursuit of differentiation AND low cost",
                "key_insight": "Competition is irrelevant when you create new market space",
                "focus": "Value innovation, not competition",
                "strategic_logic": "Break the value-cost trade-off"
            },
            "blue_ocean_characteristics": [
                "Uncontested market space",
                "Make competition irrelevant",
                "Create and capture new demand",
                "Break the value/cost trade-off",
                "Align whole system with strategic choice"
            ],
            "red_ocean_vs_blue_ocean": {
                "red_ocean": "Compete in existing market space, beat competition, exploit existing demand",
                "blue_ocean": "Create uncontested market space, make competition irrelevant, create new demand"
            }
        }

    async def get_mckinsey_7s(self, business_context: str, organizational_challenge: str) -> Dict[str, Any]:
        """
        Provides McKinsey 7S framework templates and organizational analysis tools.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering McKinsey 7S data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "organizational_challenge": organizational_challenge,
            "seven_s_elements": {
                "hard_elements": {
                    "strategy": {
                        "description": "Plan to achieve competitive advantage",
                        "questions": ["What is our strategy?", "How do we compete?", "What are our priorities?"]
                    },
                    "structure": {
                        "description": "How the organization is organized",
                        "questions": ["How are we structured?", "Who reports to whom?", "How are decisions made?"]
                    },
                    "systems": {
                        "description": "Daily activities and procedures",
                        "questions": ["What systems run the organization?", "How do we measure performance?", "What processes do we use?"]
                    }
                },
                "soft_elements": {
                    "shared_values": {
                        "description": "Core beliefs and attitudes",
                        "questions": ["What do we believe in?", "What drives our culture?", "What are our core values?"]
                    },
                    "skills": {
                        "description": "Capabilities and competencies",
                        "questions": ["What are our distinctive capabilities?", "What skills do we need?", "Where are our skill gaps?"]
                    },
                    "staff": {
                        "description": "Human resources and talent",
                        "questions": ["Who are our people?", "How do we develop talent?", "What's our succession planning?"]
                    },
                    "style": {
                        "description": "Leadership approach and culture",
                        "questions": ["What's our leadership style?", "How do we make decisions?", "What's our management approach?"]
                    }
                }
            },
            "analysis_framework": {
                "current_state": "Assess each element as it exists today",
                "desired_state": "Define how each element should look",
                "gap_analysis": "Identify differences between current and desired",
                "action_planning": "Define steps to close gaps"
            },
            "alignment_principles": [
                "All seven elements must be aligned and mutually reinforcing",
                "Changes in one element affect all others",
                "Soft elements are often harder to change but more important",
                "Shared values are at the center of the model"
            ]
        }