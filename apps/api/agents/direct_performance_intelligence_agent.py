"""
Direct Performance Intelligence Agent - Unified performance analysis and optimization.

Consolidates functionality from:
- ROI & Budget Agent: ROI calculations, budget optimization, financial benchmarks
- Quick Wins Agent: Immediate opportunity identification, low-effort/high-impact tactics
- Analytics Agent: Performance analysis, data interpretation, forecasting

This agent provides comprehensive performance intelligence through:
1. Unified performance analysis (metrics, trends, attribution)
2. ROI and budget optimization
3. Quick win identification
4. Forecasting and predictive analytics
5. Actionable recommendations with prioritization

Version: 1.0.0
Created: 2025-10-11
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import json

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.utils.database import get_supabase_client
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models for Tool Schemas
# ============================================================================

class PerformanceAnalysisInput(BaseModel):
    """Input for comprehensive performance analysis."""
    campaign_metrics: str = Field(description="Current campaign performance metrics (JSON or text)")
    analysis_focus: str = Field(default="comprehensive", description="Focus area: comprehensive, roi, conversion, engagement, or attribution")
    time_period: str = Field(default="last_30_days", description="Time period for analysis")
    include_benchmarks: bool = Field(default=True, description="Include industry benchmarks")


class ROICalculationInput(BaseModel):
    """Input for ROI calculation and optimization."""
    campaign_name: str = Field(description="Name of the campaign to analyze")
    total_spend: float = Field(description="Total campaign spend in dollars")
    total_revenue: float = Field(description="Total revenue generated in dollars")
    additional_metrics: Optional[str] = Field(default=None, description="Additional metrics like conversions, leads, etc.")


class QuickWinsInput(BaseModel):
    """Input for quick win opportunity identification."""
    business_context: str = Field(description="Current business situation and challenges")
    challenge_area: str = Field(default="general", description="Specific area: content, conversion, seo, social, email, or general")
    current_resources: str = Field(default="limited", description="Available resources: minimal, limited, moderate, or substantial")


class BudgetOptimizationInput(BaseModel):
    """Input for budget allocation optimization."""
    total_budget: float = Field(description="Total marketing budget available")
    current_allocation: str = Field(description="Current budget allocation across channels (JSON or text)")
    performance_data: Optional[str] = Field(default=None, description="Historical performance data by channel")
    business_goals: str = Field(default="balanced_growth", description="Primary goals: awareness, leads, revenue, or balanced_growth")


class ForecastingInput(BaseModel):
    """Input for predictive analytics and forecasting."""
    historical_data: str = Field(description="Historical performance data (JSON or text)")
    forecast_period: str = Field(default="next_quarter", description="Period to forecast: next_month, next_quarter, or next_year")
    confidence_level: float = Field(default=0.95, description="Statistical confidence level (0.90, 0.95, or 0.99)")


class OpportunityDetectionInput(BaseModel):
    """Input for automated opportunity detection across all performance data."""
    scope: str = Field(default="all", description="Detection scope: all, underperforming, high_potential, or budget_waste")


# ============================================================================
# DirectPerformanceIntelligenceAgent
# ============================================================================

class DirectPerformanceIntelligenceAgent(EnterpriseBaseAgent):
    """
    Unified Performance Intelligence Agent combining ROI analysis, quick wins, and analytics.

    Provides comprehensive performance optimization through:
    - Real-time ROI tracking and budget optimization
    - Quick win identification for immediate impact
    - Advanced analytics with forecasting
    - Actionable recommendations prioritized by impact
    """

    def get_agent_type(self) -> str:
        """Return the agent type identifier."""
        return "performance_intelligence"

    def get_base_prompt(self) -> str:
        """Return the base system prompt for this agent."""
        return """You are the Performance Intelligence Agent, a unified analytics and optimization specialist combining expertise in ROI analysis, quick wins identification, and advanced performance analytics.

Your role is to provide comprehensive, actionable performance intelligence that drives measurable business results. You have access to enterprise context including campaigns, marketing strategies, past performance data, and AI insights.

Core capabilities:
1. **Performance Analysis**: Deep dive into metrics, trends, attribution modeling, and statistical analysis
2. **ROI & Budget Optimization**: Calculate ROI, optimize budget allocation, provide financial benchmarks
3. **Quick Wins**: Identify immediate, high-impact opportunities requiring minimal resources
4. **Forecasting**: Predictive analytics for future performance estimation
5. **Opportunity Detection**: Automated identification of optimization opportunities across all data

Communication style:
- Start with executive summary (2-3 key insights)
- Provide data-driven recommendations with clear ROI impact
- Prioritize actions by effort/impact ratio (quick wins first)
- Use clear metrics and benchmarks for context
- Balance strategic vision with tactical execution

When analyzing performance:
1. Always calculate or estimate ROI when revenue/spend data is available
2. Compare current performance to industry benchmarks
3. Identify both immediate quick wins AND strategic opportunities
4. Provide specific, actionable next steps
5. Quantify expected impact whenever possible

Your output should enable users to make confident, data-driven decisions that improve marketing performance."""

    def _get_agent_tools(self) -> List:
        """
        Define the Performance Intelligence Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.

        Note: Converted from manual FunctionDeclaration to raw callables for hybrid streaming.
        """
        # Return raw callables - SDK automatically converts to FunctionDeclaration
        # This enables hybrid streaming (raw callables + AFC disabled + manual multi-turn)
        tools = [
            # Core performance analysis tools
            self.analyze_performance,
            self.calculate_roi,
            self.identify_quick_wins,
            self.optimize_budget,
            self.forecast_performance,
            self.detect_opportunities,
            # Resource management tools
            self.list_performance_analyses,
            self.get_performance_analysis,
        ]

        logger.info(f"Performance Intelligence agent created {len(tools)} raw callable tools successfully")
        return tools


    # ============================================================================
    # Tool Implementation Methods
    # ============================================================================

    async def analyze_performance(
        self,
        campaign_metrics: str,
        analysis_focus: str = "comprehensive",
        time_period: str = "last_30_days",
        include_benchmarks: bool = True
    ) -> Dict[str, Any]:
        """
        Comprehensive performance analysis framework.

        Combines analytics capabilities with ROI insights and quick win identification.
        """
        logger.info(f"[PerformanceIntelligence] Analyzing performance: focus={analysis_focus}, period={time_period}")

        try:
            # Parse metrics if JSON string
            try:
                metrics = json.loads(campaign_metrics) if isinstance(campaign_metrics, str) else campaign_metrics
            except json.JSONDecodeError:
                metrics = {"raw_data": campaign_metrics}

            analysis = {
                "analysis_type": "performance_analysis",
                "focus": analysis_focus,
                "time_period": time_period,
                "timestamp": datetime.utcnow().isoformat(),
                "metrics_summary": self._summarize_metrics(metrics),
                "key_findings": [],
                "recommendations": []
            }

            # Add focus-specific analysis
            if analysis_focus in ["comprehensive", "roi"]:
                analysis["roi_analysis"] = self._analyze_roi(metrics)

            if analysis_focus in ["comprehensive", "conversion"]:
                analysis["conversion_analysis"] = self._analyze_conversions(metrics)

            if analysis_focus in ["comprehensive", "engagement"]:
                analysis["engagement_analysis"] = self._analyze_engagement(metrics)

            if analysis_focus in ["comprehensive", "attribution"]:
                analysis["attribution_analysis"] = self._analyze_attribution(metrics)

            # Include industry benchmarks if requested
            if include_benchmarks:
                analysis["benchmarks"] = self._get_industry_benchmarks(metrics)

            # Identify quick wins from performance data
            analysis["quick_wins"] = self._extract_quick_wins_from_metrics(metrics)

            return {
                "success": True,
                "analysis": analysis,
                "message": f"Completed {analysis_focus} performance analysis for {time_period}"
            }

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in analyze_performance: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to complete performance analysis"
            }

    async def calculate_roi(
        self,
        campaign_name: str,
        total_spend: float,
        total_revenue: float,
        additional_metrics: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate campaign ROI and provide optimization recommendations.

        Returns comprehensive ROI metrics including:
        - ROI percentage
        - ROAS (Return on Ad Spend)
        - Cost per acquisition (if conversion data provided)
        - Profitability assessment
        - Optimization recommendations
        """
        logger.info(f"[PerformanceIntelligence] Calculating ROI for: {campaign_name}")

        try:
            # Calculate core ROI metrics
            roi_percentage = ((total_revenue - total_spend) / total_spend * 100) if total_spend > 0 else 0
            roas = (total_revenue / total_spend) if total_spend > 0 else 0
            profit = total_revenue - total_spend

            # Parse additional metrics if provided
            extra_metrics = {}
            if additional_metrics:
                try:
                    extra_metrics = json.loads(additional_metrics) if isinstance(additional_metrics, str) else additional_metrics
                except json.JSONDecodeError:
                    pass

            # Calculate CPA if conversions provided
            cpa = None
            if extra_metrics.get("conversions"):
                cpa = total_spend / extra_metrics["conversions"]

            # Assess performance level
            if roi_percentage >= 400:
                performance_level = "exceptional"
                assessment = "Outstanding performance - scale immediately"
            elif roi_percentage >= 200:
                performance_level = "excellent"
                assessment = "Strong performance - increase budget allocation"
            elif roi_percentage >= 100:
                performance_level = "good"
                assessment = "Profitable - optimize and scale gradually"
            elif roi_percentage >= 0:
                performance_level = "break_even"
                assessment = "Breaking even - requires optimization"
            else:
                performance_level = "unprofitable"
                assessment = "Unprofitable - immediate action required"

            result = {
                "success": True,
                "campaign_name": campaign_name,
                "roi_metrics": {
                    "roi_percentage": round(roi_percentage, 2),
                    "roas": round(roas, 2),
                    "total_spend": total_spend,
                    "total_revenue": total_revenue,
                    "profit": round(profit, 2),
                    "performance_level": performance_level
                },
                "assessment": assessment,
                "recommendations": self._generate_roi_recommendations(roi_percentage, roas, extra_metrics),
                "timestamp": datetime.utcnow().isoformat()
            }

            if cpa:
                result["roi_metrics"]["cost_per_acquisition"] = round(cpa, 2)

            return result

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in calculate_roi: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to calculate ROI"
            }

    async def identify_quick_wins(
        self,
        business_context: str,
        challenge_area: str = "general",
        current_resources: str = "limited"
    ) -> Dict[str, Any]:
        """
        Identify immediate, high-impact opportunities requiring minimal resources.

        Returns prioritized list of quick wins tailored to business context and resources.
        """
        logger.info(f"[PerformanceIntelligence] Identifying quick wins: area={challenge_area}, resources={current_resources}")

        try:
            quick_wins = {
                "success": True,
                "challenge_area": challenge_area,
                "resource_level": current_resources,
                "opportunities": self._get_quick_wins_by_area(challenge_area, current_resources),
                "implementation_priority": "Sort by effort/impact ratio",
                "timestamp": datetime.utcnow().isoformat()
            }

            return quick_wins

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in identify_quick_wins: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to identify quick wins"
            }

    async def optimize_budget(
        self,
        total_budget: float,
        current_allocation: str,
        performance_data: Optional[str] = None,
        business_goals: str = "balanced_growth"
    ) -> Dict[str, Any]:
        """
        Optimize budget allocation across channels based on performance and goals.
        """
        logger.info(f"[PerformanceIntelligence] Optimizing budget: ${total_budget:,.2f}, goal={business_goals}")

        try:
            # Parse current allocation
            try:
                allocation = json.loads(current_allocation) if isinstance(current_allocation, str) else current_allocation
            except json.JSONDecodeError:
                allocation = {"description": current_allocation}

            # Parse performance data if provided
            performance = {}
            if performance_data:
                try:
                    performance = json.loads(performance_data) if isinstance(performance_data, str) else performance_data
                except json.JSONDecodeError:
                    pass

            # Generate optimized allocation based on goals
            optimized_allocation = self._calculate_optimal_allocation(
                total_budget,
                allocation,
                performance,
                business_goals
            )

            return {
                "success": True,
                "total_budget": total_budget,
                "business_goals": business_goals,
                "current_allocation": allocation,
                "recommended_allocation": optimized_allocation,
                "expected_impact": self._estimate_budget_impact(optimized_allocation, performance),
                "implementation_notes": self._generate_budget_notes(business_goals),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in optimize_budget: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to optimize budget"
            }

    async def forecast_performance(
        self,
        historical_data: str,
        forecast_period: str = "next_quarter",
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Generate predictive analytics and performance forecasts.
        """
        logger.info(f"[PerformanceIntelligence] Forecasting: period={forecast_period}, confidence={confidence_level}")

        try:
            # Parse historical data
            try:
                history = json.loads(historical_data) if isinstance(historical_data, str) else historical_data
            except json.JSONDecodeError:
                history = {"raw_data": historical_data}

            # Generate forecast
            forecast = self._generate_forecast(history, forecast_period, confidence_level)

            return {
                "success": True,
                "forecast_period": forecast_period,
                "confidence_level": confidence_level,
                "forecast": forecast,
                "assumptions": self._get_forecast_assumptions(history),
                "risk_factors": self._identify_forecast_risks(history),
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in forecast_performance: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to generate forecast"
            }

    async def detect_opportunities(
        self,
        scope: str = "all"
    ) -> Dict[str, Any]:
        """
        Automatically detect optimization opportunities across all performance data.
        """
        logger.info(f"[PerformanceIntelligence] Detecting opportunities: scope={scope}")

        try:
            # Load enterprise context for comprehensive analysis
            opportunities = {
                "success": True,
                "scope": scope,
                "detected_opportunities": [],
                "timestamp": datetime.utcnow().isoformat()
            }

            # Analyze enterprise context for opportunities
            if self.context:
                if scope in ["all", "underperforming"]:
                    opportunities["detected_opportunities"].extend(
                        self._detect_underperforming_assets()
                    )

                if scope in ["all", "high_potential"]:
                    opportunities["detected_opportunities"].extend(
                        self._detect_high_potential_assets()
                    )

                if scope in ["all", "budget_waste"]:
                    opportunities["detected_opportunities"].extend(
                        self._detect_budget_waste()
                    )

            # Sort by impact score
            opportunities["detected_opportunities"].sort(
                key=lambda x: x.get("impact_score", 0),
                reverse=True
            )

            return opportunities

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in detect_opportunities: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to detect opportunities"
            }

    async def list_performance_analyses(
        self,
        limit: int = 10,
        analysis_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List previous performance analyses for this organization.
        """
        logger.info(f"[PerformanceIntelligence] Listing analyses: limit={limit}, type={analysis_type}")

        try:
            supabase = get_supabase_client()

            query = supabase.table("agent_outputs") \
                .select("id, title, summary, output_type, created_at, metadata") \
                .eq("org_id", self.org_id) \
                .eq("agent_type", "performance_intelligence") \
                .order("created_at", desc=True) \
                .limit(limit)

            if analysis_type:
                query = query.eq("output_type", analysis_type)

            response = query.execute()

            return {
                "success": True,
                "analyses": response.data,
                "count": len(response.data)
            }

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in list_performance_analyses: {e}")
            return {
                "success": False,
                "error": str(e),
                "analyses": []
            }

    async def get_performance_analysis(
        self,
        analysis_id: str
    ) -> Dict[str, Any]:
        """
        Retrieve a specific performance analysis by ID.
        """
        logger.info(f"[PerformanceIntelligence] Getting analysis: {analysis_id}")

        try:
            supabase = get_supabase_client()

            response = supabase.table("agent_outputs") \
                .select("*") \
                .eq("id", analysis_id) \
                .eq("org_id", self.org_id) \
                .single() \
                .execute()

            if response.data:
                return {
                    "success": True,
                    "analysis": response.data
                }
            else:
                return {
                    "success": False,
                    "error": "Analysis not found"
                }

        except Exception as e:
            logger.error(f"[PerformanceIntelligence] Error in get_performance_analysis: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _summarize_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and summarize key metrics."""
        summary = {}

        # Common metric extraction
        if "impressions" in metrics:
            summary["impressions"] = metrics["impressions"]
        if "clicks" in metrics:
            summary["clicks"] = metrics["clicks"]
            if "impressions" in metrics:
                summary["ctr"] = round((metrics["clicks"] / metrics["impressions"]) * 100, 2)
        if "conversions" in metrics:
            summary["conversions"] = metrics["conversions"]
        if "spend" in metrics:
            summary["spend"] = metrics["spend"]
        if "revenue" in metrics:
            summary["revenue"] = metrics["revenue"]
            if "spend" in metrics:
                summary["roi"] = round(((metrics["revenue"] - metrics["spend"]) / metrics["spend"]) * 100, 2)

        return summary

    def _analyze_roi(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze ROI from metrics."""
        if "spend" in metrics and "revenue" in metrics:
            spend = float(metrics["spend"])
            revenue = float(metrics["revenue"])
            roi = ((revenue - spend) / spend * 100) if spend > 0 else 0

            return {
                "roi_percentage": round(roi, 2),
                "roas": round(revenue / spend, 2) if spend > 0 else 0,
                "profit": round(revenue - spend, 2)
            }
        return {"status": "insufficient_data"}

    def _analyze_conversions(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze conversion metrics."""
        analysis = {}

        if "clicks" in metrics and "conversions" in metrics:
            clicks = float(metrics["clicks"])
            conversions = float(metrics["conversions"])
            analysis["conversion_rate"] = round((conversions / clicks) * 100, 2) if clicks > 0 else 0

        if "spend" in metrics and "conversions" in metrics:
            spend = float(metrics["spend"])
            conversions = float(metrics["conversions"])
            analysis["cost_per_conversion"] = round(spend / conversions, 2) if conversions > 0 else 0

        return analysis if analysis else {"status": "insufficient_data"}

    def _analyze_engagement(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze engagement metrics."""
        analysis = {}

        if "impressions" in metrics and "clicks" in metrics:
            impressions = float(metrics["impressions"])
            clicks = float(metrics["clicks"])
            analysis["ctr"] = round((clicks / impressions) * 100, 2) if impressions > 0 else 0

        if "engagement_rate" in metrics:
            analysis["engagement_rate"] = float(metrics["engagement_rate"])

        return analysis if analysis else {"status": "insufficient_data"}

    def _analyze_attribution(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze attribution data."""
        return {
            "model": "multi_touch",
            "note": "Attribution analysis requires historical touchpoint data"
        }

    def _get_industry_benchmarks(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Get relevant industry benchmarks."""
        return {
            "ctr_benchmark": {"low": 1.0, "avg": 2.5, "high": 5.0},
            "conversion_rate_benchmark": {"low": 1.0, "avg": 2.5, "high": 5.0},
            "roi_benchmark": {"low": 100, "avg": 200, "high": 400},
            "note": "Benchmarks vary by industry - use context-specific data when available"
        }

    def _extract_quick_wins_from_metrics(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify quick wins from performance metrics."""
        wins = []

        # Example: Low CTR suggests copy/creative optimization opportunity
        if "clicks" in metrics and "impressions" in metrics:
            ctr = (metrics["clicks"] / metrics["impressions"]) * 100 if metrics["impressions"] > 0 else 0
            if ctr < 1.5:
                wins.append({
                    "opportunity": "Improve ad copy and creative",
                    "reason": f"Current CTR of {ctr:.2f}% is below 1.5% benchmark",
                    "effort": "low",
                    "impact": "medium"
                })

        return wins

    def _generate_roi_recommendations(self, roi: float, roas: float, extra_metrics: Dict[str, Any]) -> List[str]:
        """Generate ROI-based recommendations."""
        recommendations = []

        if roi < 0:
            recommendations.append("URGENT: Campaign is unprofitable - pause and analyze before spending more")
            recommendations.append("Review targeting, creative, and landing page optimization")
        elif roi < 100:
            recommendations.append("Campaign is break-even - focus on conversion rate optimization")
            recommendations.append("Test new ad creative and audience segments")
        elif roi >= 200:
            recommendations.append("Strong performance - increase budget allocation to this campaign")
            recommendations.append("Document winning strategies for replication")

        return recommendations

    def _get_quick_wins_by_area(self, area: str, resources: str) -> List[Dict[str, Any]]:
        """Get quick wins tailored to specific area and resources."""
        quick_wins_db = {
            "content": [
                {
                    "title": "Repurpose top-performing content",
                    "description": "Turn blog posts into social media threads, infographics, or short videos",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "1-2 days"
                },
                {
                    "title": "Update and republish old content",
                    "description": "Refresh dates, stats, and screenshots in high-traffic posts",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "2-3 hours per post"
                }
            ],
            "conversion": [
                {
                    "title": "Add clear CTAs to high-traffic pages",
                    "description": "Review top 10 pages without CTAs and add relevant calls-to-action",
                    "effort": "low",
                    "impact": "high",
                    "timeline": "1 day"
                },
                {
                    "title": "Implement exit-intent popups",
                    "description": "Capture abandoning visitors with targeted offers",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "2-3 hours"
                }
            ],
            "seo": [
                {
                    "title": "Fix broken internal links",
                    "description": "Audit and repair broken links affecting SEO",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "Half day"
                },
                {
                    "title": "Optimize meta descriptions",
                    "description": "Update meta descriptions for top 20 pages to improve CTR",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "1-2 days"
                }
            ],
            "general": [
                {
                    "title": "Set up basic email automation",
                    "description": "Welcome series and abandoned cart emails",
                    "effort": "medium",
                    "impact": "high",
                    "timeline": "1 week"
                },
                {
                    "title": "Claim and optimize Google Business Profile",
                    "description": "Ensure accurate information and regular updates",
                    "effort": "low",
                    "impact": "medium",
                    "timeline": "2-3 hours"
                }
            ]
        }

        return quick_wins_db.get(area, quick_wins_db["general"])

    def _calculate_optimal_allocation(
        self,
        budget: float,
        current: Dict[str, Any],
        performance: Dict[str, Any],
        goals: str
    ) -> Dict[str, Any]:
        """Calculate optimal budget allocation."""
        # Simplified allocation model based on goals
        if goals == "awareness":
            return {
                "paid_social": budget * 0.40,
                "display_ads": budget * 0.30,
                "content_marketing": budget * 0.20,
                "seo": budget * 0.10
            }
        elif goals == "leads":
            return {
                "paid_search": budget * 0.35,
                "linkedin_ads": budget * 0.25,
                "content_marketing": budget * 0.20,
                "email_marketing": budget * 0.20
            }
        elif goals == "revenue":
            return {
                "paid_search": budget * 0.40,
                "retargeting": budget * 0.25,
                "email_marketing": budget * 0.20,
                "affiliate": budget * 0.15
            }
        else:  # balanced_growth
            return {
                "paid_search": budget * 0.30,
                "paid_social": budget * 0.25,
                "content_marketing": budget * 0.20,
                "seo": budget * 0.15,
                "email_marketing": budget * 0.10
            }

    def _estimate_budget_impact(self, allocation: Dict[str, Any], performance: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate impact of new budget allocation."""
        return {
            "estimated_roi_improvement": "15-25%",
            "confidence": "medium",
            "note": "Actual results depend on execution quality and market conditions"
        }

    def _generate_budget_notes(self, goals: str) -> List[str]:
        """Generate implementation notes for budget optimization."""
        return [
            f"Allocation optimized for {goals.replace('_', ' ')} objective",
            "Monitor performance weekly and adjust if channels underperform",
            "Test new channels with 10% of budget before major allocation",
            "Reserve 15-20% for testing and optimization"
        ]

    def _generate_forecast(
        self,
        history: Dict[str, Any],
        period: str,
        confidence: float
    ) -> Dict[str, Any]:
        """Generate performance forecast."""
        return {
            "methodology": "trend_analysis",
            "forecast_range": {
                "low": "Conservative estimate based on historical minimum",
                "mid": "Expected outcome based on trend",
                "high": "Optimistic estimate based on historical maximum"
            },
            "note": "Forecast assumes consistent market conditions and marketing spend"
        }

    def _get_forecast_assumptions(self, history: Dict[str, Any]) -> List[str]:
        """Get forecast assumptions."""
        return [
            "Consistent marketing budget and strategy",
            "Stable market conditions",
            "No major competitive disruptions",
            "Similar seasonal patterns to historical data"
        ]

    def _identify_forecast_risks(self, history: Dict[str, Any]) -> List[str]:
        """Identify forecast risk factors."""
        return [
            "Market volatility may impact actual results",
            "New competitors or market entrants",
            "Seasonal variations not captured in limited historical data",
            "Changes in consumer behavior or preferences"
        ]

    def _detect_underperforming_assets(self) -> List[Dict[str, Any]]:
        """Detect underperforming campaigns, content, or channels."""
        opportunities = []

        # Example: Analyze campaigns in context
        if self.context.get("campaigns"):
            for campaign in self.context["campaigns"][:5]:
                # Simplified logic - in production, analyze actual metrics
                if campaign.get("status") == "active":
                    opportunities.append({
                        "type": "underperforming_campaign",
                        "title": f"Review performance of {campaign.get('name')}",
                        "description": "Campaign may benefit from optimization",
                        "impact_score": 7,
                        "effort": "medium"
                    })

        return opportunities

    def _detect_high_potential_assets(self) -> List[Dict[str, Any]]:
        """Detect high-potential opportunities for scaling."""
        opportunities = []

        # Example: Look for successful personas that could be targeted more (nuclear migration)
        if self.context.get("personas"):
            for persona in self.context["personas"][:3]:
                opportunities.append({
                    "type": "scale_persona_targeting",
                    "title": f"Scale campaigns targeting {persona.get('name')}",
                    "description": "Persona shows strong engagement - opportunity to scale",
                    "impact_score": 8,
                    "effort": "medium"
                })

        return opportunities

    def _detect_budget_waste(self) -> List[Dict[str, Any]]:
        """Detect potential budget waste opportunities."""
        return [
            {
                "type": "budget_waste",
                "title": "Review low-performing ad placements",
                "description": "Identify and pause underperforming ad placements",
                "impact_score": 9,
                "effort": "low"
            }
        ]
