"""Objectives and goal-setting tools for Strategy Agent."""

from typing import Dict, Any
import logging
from .base import StrategyToolBase

logger = logging.getLogger(__name__)


class StrategyObjectivesTools(StrategyToolBase):
    """Objectives and goal-setting tools including OKRs and Jobs to Be Done."""

    async def get_okr_framework(self, business_context: str, strategic_goals: str, time_horizon: str = "quarterly") -> Dict[str, Any]:
        """
        Provides OKR framework templates and goal-setting best practices.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering OKR framework data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "strategic_goals": strategic_goals,
            "time_horizon": time_horizon,
            "okr_structure": {
                "objectives": {
                    "definition": "Qualitative, inspirational, time-bound goals",
                    "characteristics": ["Memorable", "Audacious", "Inspirational"],
                    "good_example": "Become the #1 customer-rated platform in our industry",
                    "bad_example": "Increase revenue by 20%"
                },
                "key_results": {
                    "definition": "Measurable outcomes that achieve the objective",
                    "characteristics": ["Specific", "Time-bound", "Aggressive but achievable"],
                    "good_example": "Achieve Net Promoter Score of 70+",
                    "bad_example": "Improve customer satisfaction"
                }
            },
            "okr_levels": {
                "company_okrs": {
                    "purpose": "Set overall direction and priorities",
                    "typical_number": "3-5 OKRs",
                    "ownership": "CEO and executive team"
                },
                "team_okrs": {
                    "purpose": "Support company objectives with specific contributions",
                    "typical_number": "2-3 OKRs per team",
                    "ownership": "Department heads and team leads"
                },
                "individual_okrs": {
                    "purpose": "Personal contribution to team/company success",
                    "typical_number": "1-2 OKRs per person",
                    "ownership": "Individual contributors"
                }
            },
            "best_practices": [
                "Set ambitious goals (60-70% achievement is excellent)",
                "Keep it simple - fewer, better OKRs",
                "Make key results measurable and specific",
                "Align team OKRs with company objectives",
                "Review progress weekly, grade quarterly",
                "Separate OKRs from performance reviews"
            ],
            "common_mistakes": [
                "Too many OKRs (causes lack of focus)",
                "Sandbagging (setting easy targets)",
                "Lack of alignment between levels",
                "Confusing OKRs with business-as-usual tasks",
                "Not updating or reviewing regularly"
            ],
            "grading_system": {
                "0.0-0.3": "Failed to make meaningful progress",
                "0.4-0.6": "Made progress but fell short of target",
                "0.7-1.0": "Delivered on target (may have been too easy)"
            }
        }

    async def get_jobs_to_be_done(self, business_context: str, target_customers: str, product_category: str) -> Dict[str, Any]:
        """
        Provides Jobs to Be Done framework templates and customer analysis tools.
        Returns data for the model to use, not generated content.
        """
        logger.info(f"Gathering Jobs to Be Done data for: {business_context[:50]}...")

        return {
            "business_context": business_context,
            "target_customers": target_customers,
            "product_category": product_category,
            "jtbd_framework": {
                "job_statement_template": "When [situation], I want to [motivation], so I can [outcome]",
                "job_components": {
                    "functional_job": {
                        "description": "The practical task the customer wants to accomplish",
                        "examples": ["Get from point A to point B", "Clean my house", "Learn a new skill"]
                    },
                    "emotional_job": {
                        "description": "How the customer wants to feel or avoid feeling",
                        "examples": ["Feel confident", "Avoid embarrassment", "Feel in control"]
                    },
                    "social_job": {
                        "description": "How the customer wants to be perceived by others",
                        "examples": ["Be seen as successful", "Fit in with peers", "Stand out as unique"]
                    }
                }
            },
            "job_analysis_dimensions": {
                "importance": {
                    "question": "How important is this job to the customer?",
                    "scale": "1-10 (10 = extremely important)"
                },
                "satisfaction": {
                    "question": "How satisfied are customers with current solutions?",
                    "scale": "1-10 (10 = completely satisfied)"
                },
                "opportunity_score": {
                    "formula": "Importance + Max(Importance - Satisfaction, 0)",
                    "interpretation": "Higher scores indicate bigger opportunities"
                }
            },
            "customer_journey_context": {
                "job_executor": "The person doing the job",
                "purchase_decision_maker": "Who decides what to buy",
                "financial_buyer": "Who pays for the solution",
                "end_user": "Who uses the final solution"
            },
            "innovation_opportunities": {
                "undershot_jobs": "Jobs where no solution adequately addresses the need",
                "overshot_jobs": "Jobs where solutions are too complex/expensive",
                "non_consumption": "Situations where people can't access any solution"
            },
            "research_methods": [
                "Customer interviews focusing on job context",
                "Observational studies of job execution",
                "Survey customers on importance vs satisfaction",
                "Analyze switching behavior and triggers",
                "Map the full job ecosystem"
            ]
        }