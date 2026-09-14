"""
Smart ROI Recommendations with Contextual Business Intelligence
Enhanced version that analyzes campaign performance with full business context.
Pattern: Adapted from smart_content_recommendations.py
"""
from typing import Dict, Any, List, Optional
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def format_campaign_metrics(metrics: List[Dict[str, Any]]) -> str:
    """
    Format campaign metrics into a clear, analytical summary for the LLM.
    Handles both revenue-tracked and conversion-tracked campaigns.
    """
    if not metrics:
        return "⚠️ NO CAMPAIGN DATA AVAILABLE - Cannot provide data-driven recommendations without metrics."

    # Group by campaign
    campaigns = {}
    has_revenue = False
    has_conversions = False
    has_engagement = False

    for metric in metrics:
        campaign_name = metric.get('campaign_name', 'Unknown')
        if campaign_name not in campaigns:
            campaigns[campaign_name] = {
                'total_spend': 0,
                'total_revenue': 0,
                'total_impressions': 0,
                'total_clicks': 0,
                'total_conversions': 0,
                'total_leads': 0,
                'total_calls': 0,
                'total_appointments': 0,
                # Phase 6.5: Engagement metrics
                'total_video_views': 0,
                'total_likes': 0,
                'total_shares': 0,
                'total_comments': 0,
                'total_saves': 0,
                'total_followers_gained': 0,
                'total_watch_time_seconds': 0,
                'sources': set(),
                'date_range': {'start': None, 'end': None},
                'conversion_goal': metric.get('conversion_goal')
            }

        camp = campaigns[campaign_name]
        camp['total_spend'] += metric.get('spend', 0)
        camp['total_revenue'] += metric.get('revenue', 0) or 0
        camp['total_impressions'] += metric.get('impressions', 0) or 0
        camp['total_clicks'] += metric.get('clicks', 0) or 0
        camp['total_conversions'] += metric.get('conversions', 0) or 0
        camp['total_leads'] += metric.get('leads', 0) or 0
        camp['total_calls'] += metric.get('calls', 0) or 0
        camp['total_appointments'] += metric.get('appointments', 0) or 0
        # Phase 6.5: Aggregate engagement metrics
        camp['total_video_views'] += metric.get('video_views', 0) or 0
        camp['total_likes'] += metric.get('likes', 0) or 0
        camp['total_shares'] += metric.get('shares', 0) or 0
        camp['total_comments'] += metric.get('comments', 0) or 0
        camp['total_saves'] += metric.get('saves', 0) or 0
        camp['total_followers_gained'] += metric.get('followers_gained', 0) or 0
        camp['total_watch_time_seconds'] += metric.get('watch_time_seconds', 0) or 0

        if metric.get('revenue') and metric.get('revenue') > 0:
            has_revenue = True
        elif metric.get('leads') or metric.get('calls') or metric.get('conversions'):
            has_conversions = True
        elif metric.get('video_views') or metric.get('likes') or metric.get('shares'):
            has_engagement = True

        if metric.get('source'):
            camp['sources'].add(metric['source'])

        metric_date = metric.get('metric_date')
        if metric_date:
            if not camp['date_range']['start'] or metric_date < camp['date_range']['start']:
                camp['date_range']['start'] = metric_date
            if not camp['date_range']['end'] or metric_date > camp['date_range']['end']:
                camp['date_range']['end'] = metric_date

    # Calculate metrics and format summary
    summary = []
    total_spend = 0
    total_revenue = 0

    for campaign_name, data in sorted(campaigns.items(), key=lambda x: x[1]['total_spend'], reverse=True):
        spend = data['total_spend']
        revenue = data['total_revenue']

        total_spend += spend
        total_revenue += revenue

        # Calculate additional metrics
        ctr = (data['total_clicks'] / data['total_impressions'] * 100) if data['total_impressions'] > 0 else 0
        cpc = (spend / data['total_clicks']) if data['total_clicks'] > 0 else 0
        conversion_rate = (data['total_conversions'] / data['total_clicks'] * 100) if data['total_clicks'] > 0 else 0

        # Format differently based on metric type (Phase 6.5: added engagement)
        if revenue > 0:
            # TIER 3: Revenue-tracked campaign
            roi_pct = ((revenue - spend) / spend * 100) if spend > 0 else 0
            summary.append(f"""
**{campaign_name}** (Revenue Tracked)
  - Spend: ${spend:,.2f}
  - Revenue: ${revenue:,.2f}
  - ROI: {roi_pct:.1f}%
  - Impressions: {data['total_impressions']:,}
  - Clicks: {data['total_clicks']:,} (CTR: {ctr:.2f}%)
  - Conversions: {data['total_conversions']} (Rate: {conversion_rate:.2f}%)
  - CPC: ${cpc:.2f}
  - Sources: {', '.join(data['sources']) if data['sources'] else 'Manual entry'}
  - Date Range: {data['date_range']['start'] or 'N/A'} to {data['date_range']['end'] or 'N/A'}
""")
        elif data['total_leads'] > 0 or data['total_calls'] > 0 or data['total_conversions'] > 0:
            # TIER 2: Conversion-based campaign (no revenue tracking)
            cpl = (spend / data['total_leads']) if data['total_leads'] > 0 else 0
            cpa = (spend / data['total_conversions']) if data['total_conversions'] > 0 else 0
            goal_label = data.get('conversion_goal', 'conversions').replace('_', ' ').title()

            summary.append(f"""
**{campaign_name}** ({goal_label} Campaign - No Revenue Tracking)
  - Spend: ${spend:,.2f}
  - Goal: {goal_label}
  - Leads: {data['total_leads']:,} (CPL: ${cpl:.2f})
  - Calls: {data['total_calls']:,}
  - Appointments: {data['total_appointments']:,}
  - Conversions: {data['total_conversions']} (CPA: ${cpa:.2f})
  - Impressions: {data['total_impressions']:,}
  - Clicks: {data['total_clicks']:,} (CTR: {ctr:.2f}%)
  - Conversion Rate: {conversion_rate:.2f}%
  - CPC: ${cpc:.2f}
  - Sources: {', '.join(data['sources']) if data['sources'] else 'Manual entry'}
  - Date Range: {data['date_range']['start'] or 'N/A'} to {data['date_range']['end'] or 'N/A'}
""")
        else:
            # TIER 1: Engagement-only campaign (social/video)
            cpv = (spend / data['total_video_views']) if data['total_video_views'] > 0 else 0
            total_engagements = data['total_likes'] + data['total_shares'] + data['total_comments']
            cpe = (spend / total_engagements) if total_engagements > 0 else 0
            engagement_rate = (total_engagements / data['total_impressions'] * 100) if data['total_impressions'] > 0 else 0
            cost_per_follower = (spend / data['total_followers_gained']) if data['total_followers_gained'] > 0 else 0
            avg_watch_time_mins = (data['total_watch_time_seconds'] / 60) if data['total_watch_time_seconds'] > 0 else 0

            summary.append(f"""
**{campaign_name}** (Engagement/Social Campaign - No Conversion Tracking)
  - Spend: ${spend:,.2f}
  - Video Views: {data['total_video_views']:,} (CPV: ${cpv:.4f})
  - Likes: {data['total_likes']:,}
  - Shares: {data['total_shares']:,}
  - Comments: {data['total_comments']:,}
  - Saves: {data['total_saves']:,}
  - Total Engagements: {total_engagements:,} (CPE: ${cpe:.4f})
  - Engagement Rate: {engagement_rate:.2f}%
  - Followers Gained: {data['total_followers_gained']:,} (Cost per Follower: ${cost_per_follower:.2f})
  - Watch Time: {avg_watch_time_mins:.1f} minutes
  - Impressions: {data['total_impressions']:,}
  - Sources: {', '.join(data['sources']) if data['sources'] else 'Manual entry'}
  - Date Range: {data['date_range']['start'] or 'N/A'} to {data['date_range']['end'] or 'N/A'}
""")

    # Calculate portfolio summary based on metric type (Phase 6.5: added engagement)
    if has_revenue:
        # TIER 3: Revenue-based optimization
        overall_roi = ((total_revenue - total_spend) / total_spend * 100) if total_spend > 0 else 0
        header = f"""
📊 **PORTFOLIO SUMMARY** ({len(campaigns)} campaigns tracked)
  - Total Spend: ${total_spend:,.2f}
  - Total Revenue: ${total_revenue:,.2f}
  - Overall ROI: {overall_roi:.1f}%
  - Data Points: {len(metrics)} metric entries
  - **Optimization Mode: Revenue-Based (ROI)**
"""
    elif has_conversions:
        # TIER 2: Conversion-based optimization
        total_leads = sum(c['total_leads'] for c in campaigns.values())
        total_calls = sum(c['total_calls'] for c in campaigns.values())
        total_conversions = sum(c['total_conversions'] for c in campaigns.values())
        avg_cpl = (total_spend / total_leads) if total_leads > 0 else 0
        avg_cpa = (total_spend / total_conversions) if total_conversions > 0 else 0

        header = f"""
📊 **PORTFOLIO SUMMARY** ({len(campaigns)} campaigns tracked)
  - Total Spend: ${total_spend:,.2f}
  - Total Leads: {total_leads:,} (Avg CPL: ${avg_cpl:.2f})
  - Total Calls: {total_calls:,}
  - Total Conversions: {total_conversions:,} (Avg CPA: ${avg_cpa:.2f})
  - Data Points: {len(metrics)} metric entries
  - **Optimization Mode: Conversion-Based (CPL/CPA)**
  - ⚠️ **Note**: No revenue tracking available. Recommendations will focus on Cost Per Lead/Acquisition optimization.
"""
    else:
        # TIER 1: Engagement-based optimization (social/video)
        total_video_views = sum(c['total_video_views'] for c in campaigns.values())
        total_likes = sum(c['total_likes'] for c in campaigns.values())
        total_shares = sum(c['total_shares'] for c in campaigns.values())
        total_comments = sum(c['total_comments'] for c in campaigns.values())
        total_engagements = total_likes + total_shares + total_comments
        total_followers = sum(c['total_followers_gained'] for c in campaigns.values())
        avg_cpv = (total_spend / total_video_views) if total_video_views > 0 else 0
        avg_cpe = (total_spend / total_engagements) if total_engagements > 0 else 0
        avg_cost_per_follower = (total_spend / total_followers) if total_followers > 0 else 0

        header = f"""
📊 **PORTFOLIO SUMMARY** ({len(campaigns)} campaigns tracked)
  - Total Spend: ${total_spend:,.2f}
  - Total Video Views: {total_video_views:,} (Avg CPV: ${avg_cpv:.4f})
  - Total Engagements: {total_engagements:,} (Likes: {total_likes:,}, Shares: {total_shares:,}, Comments: {total_comments:,})
  - Avg Cost Per Engagement: ${avg_cpe:.4f}
  - Followers Gained: {total_followers:,} (Avg Cost per Follower: ${avg_cost_per_follower:.2f})
  - Data Points: {len(metrics)} metric entries
  - **Optimization Mode: Engagement-Based (CPV/CPE)**
  - ⚠️ **Note**: No conversion or revenue tracking. Recommendations will focus on engagement optimization (views, likes, shares).
"""

    return header + "\n" + "\n".join(summary)


def format_business_identity(request: Dict[str, Any]) -> str:
    """Format business identity and positioning."""
    company = request.get('company_name', 'Your company')
    industry = request.get('industry', 'Not specified')
    products = request.get('main_products', [])
    markets = request.get('target_market', [])
    uvp = request.get('unique_value_proposition', '')

    return f"""
**COMPANY**: {company}
**INDUSTRY**: {industry}
**PRODUCTS/SERVICES**: {', '.join(products[:3]) if products else 'Not specified'}
**TARGET MARKETS**: {', '.join(markets[:3]) if markets else 'Not specified'}
**UNIQUE VALUE PROPOSITION**: {uvp if uvp else 'Not defined'}
"""


def format_competitive_landscape(competitors: List[str], uvp: Optional[str]) -> str:
    """Format competitive context."""
    if not competitors:
        return "⚠️ NO COMPETITIVE INTELLIGENCE - Recommendations will be generic without competitive context"

    return f"""
**KEY COMPETITORS**: {', '.join(competitors[:3])}
**DIFFERENTIATION OPPORTUNITY**: {uvp if uvp else 'Not defined - need to clarify positioning vs competitors'}
"""


def format_financial_constraints(request: Dict[str, Any]) -> str:
    """Format budget and financial context."""
    budget = request.get('marketing_budget', 'Not specified')
    revenue = request.get('revenue_range', 'Not specified')
    team_size = request.get('marketing_team_size', 'Not specified')

    constraints = []

    if 'minimal' in budget.lower() or 'under' in budget.lower():
        constraints.append("⚠️ LIMITED BUDGET - Focus on high-ROI channels only")
    elif 'bootstrap' in budget.lower():
        constraints.append("⚠️ BOOTSTRAP MODE - Recommend $0 or low-cost tactics")

    return f"""
**MARKETING BUDGET**: {budget}
**ANNUAL REVENUE**: {revenue}
**TEAM SIZE**: {team_size}
{chr(10).join(constraints) if constraints else ''}
"""


def format_strategic_context(strategies: List[Dict], personas: List[Dict]) -> str:
    """Format marketing strategy and persona insights."""
    strategy_text = "⚠️ NO MARKETING STRATEGY DEFINED"
    if strategies:
        strategy = strategies[0].get('content', {})
        if isinstance(strategy, str):
            try:
                strategy = json.loads(strategy)
            except:
                strategy = {}

        messaging = strategy.get('messaging_framework', {})
        channels = messaging.get('recommended_channels', [])
        value_prop = messaging.get('value_proposition', '')

        strategy_text = f"""
**VALUE PROPOSITION**: {value_prop if value_prop else 'Not defined'}
**RECOMMENDED CHANNELS**: {', '.join(channels[:5]) if channels else 'Not specified'}
**CONTENT PILLARS**: {', '.join(strategy.get('content_pillars', [])[:3])}
"""

    persona_text = "⚠️ NO PERSONAS DEFINED"
    if personas:
        persona_summaries = []
        for persona in personas[:2]:
            content = persona.get('content', {})
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except:
                    content = {}

            name = content.get('name', persona.get('title', 'Unknown'))
            pain_points = content.get('pain_points', [])
            goals = content.get('goals', [])

            persona_summaries.append(f"  • {name}: Pain - {', '.join(pain_points[:2])}; Goals - {', '.join(goals[:2])}")

        persona_text = "\n".join(persona_summaries)

    return f"""
**MARKETING STRATEGY**:
{strategy_text}

**TARGET PERSONAS**:
{persona_text}
"""


def build_roi_recommendation_prompt(
    campaign_metrics: List[Dict[str, Any]],
    request: Dict[str, Any]
) -> str:
    """
    Build comprehensive prompt with full business context for intelligent ROI analysis.
    Follows pattern from smart_content_recommendations.py but adapted for ROI optimization.
    """

    # Get current date for seasonal context
    today = datetime.now()
    month_name = today.strftime("%B")
    quarter = f"Q{(today.month-1)//3 + 1}"

    # Extract business context
    industry = request.get('industry', '')
    competitors = request.get('competitors', [])
    marketing_budget = request.get('marketing_budget', '')
    strategies = request.get('strategies', [])
    personas = request.get('personas', [])
    business_goals = request.get('business_goals', [])
    seasonal_factors = request.get('seasonal_factors', '')
    growth_stage = request.get('growth_stage', '')

    return f"""You are an elite ROI optimization consultant with deep expertise in data-driven marketing strategy. Your job is to analyze campaign performance within the FULL business context and provide STRATEGIC, ACTIONABLE recommendations - not generic advice.

🎯 **CRITICAL INSTRUCTIONS**:
1. **Context-Driven Analysis**: Every recommendation MUST reference specific business context (industry, competitors, seasonality, budget constraints)
2. **Strategic Reasoning**: Explain WHY each recommendation matters for THIS specific business
3. **Data-Backed**: Support recommendations with actual campaign metrics
4. **Actionable Specificity**: No generic advice - provide exact actions with numbers
5. **Competitive Awareness**: Consider how competitors would respond to each action
6. **Metric Adaptation**: If campaigns track conversions/leads instead of revenue, optimize for CPL (Cost Per Lead) or CPA (Cost Per Acquisition) - not all SMEs have revenue attribution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **CAMPAIGN PERFORMANCE DATA**:
{format_campaign_metrics(campaign_metrics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 **BUSINESS IDENTITY & POSITIONING**:
{format_business_identity(request)}

🎯 **COMPETITIVE LANDSCAPE**:
{format_competitive_landscape(competitors, request.get('unique_value_proposition'))}

💰 **FINANCIAL CONTEXT**:
{format_financial_constraints(request)}

📈 **STRATEGIC CONTEXT**:
{format_strategic_context(strategies, personas)}

🎯 **BUSINESS GOALS**: {', '.join(business_goals) if business_goals else 'Not specified'}

🌍 **MARKET CONTEXT**:
  - Current Period: {month_name} {today.year} ({quarter})
  - Growth Stage: {growth_stage if growth_stage else 'Not specified'}
  - Seasonal Factors: {seasonal_factors if seasonal_factors else 'Not specified - consider industry-specific patterns'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 **ANALYSIS FRAMEWORK** (Apply ALL of these):

1. **Industry-Specific Benchmarks**:
   - How does performance compare to {industry if industry else 'industry'} standards?
   - What are typical ROI ranges for {industry if industry else 'this sector'}?
   - Are there industry-specific optimization opportunities?

2. **Seasonal & Temporal Factors**:
   - How does {month_name} historically perform in {industry if industry else 'this industry'}?
   - Is {quarter} a strong or weak period for the target market?
   - Should budget shift based on upcoming seasonal trends?

3. **Competitive Positioning**:
   - Given competitors: {', '.join(competitors[:2]) if competitors else 'not specified'}, what channels/tactics offer differentiation?
   - Where can we outmaneuver competition with better ROI?
   - What are competitive blind spots we can exploit?

4. **Channel Performance Analysis**:
   - FOR REVENUE-TRACKED CAMPAIGNS: Which channels show diminishing returns (spend up, ROI down)?
   - FOR CONVERSION-TRACKED CAMPAIGNS: Which channels have lowest CPL/CPA and best lead quality?
   - Which channels are under-invested relative to performance?
   - Are there cross-channel synergies being missed?
   - Consider: Not all conversions are equal - prioritize channels delivering qualified leads/appointments

5. **Budget Optimization**:
   - Given budget constraint: "{marketing_budget}", what's the optimal allocation?
   - Should we consolidate or diversify spend?
   - What's the marginal ROI of increasing spend by 10%, 25%, 50%?

6. **Persona Alignment**:
   - Do channel choices align with target persona behavior?
   - Are high-performing channels reaching the right personas?
   - Should we shift to persona-preferred channels even if current data is limited?

7. **Strategic Goal Alignment**:
   - Business goals: {', '.join(business_goals[:3]) if business_goals else 'growth'}
   - Do campaigns support these objectives?
   - Should tactics shift to better align with strategic priorities?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **RESPONSE FORMAT**:

{{
  "type": "recommendations",
  "recommendations": [
    {{
      "task": "SPECIFIC ACTION (e.g., 'Reduce Facebook ad spend from $5,000 to $3,000/month')",
      "reason": "STRATEGIC REASONING with business context (e.g., 'Facebook CPCs have increased 40% in {month_name} for {industry}, while LinkedIn shows 30% lower CPC for B2B targeting. Your target persona (CFOs at mid-market companies) engages 3x more on LinkedIn based on industry benchmarks.')",
      "priority": "high|medium|low",
      "category": "channel_optimization|budget_reallocation|scale_opportunity|pause_campaign|investigate_decline|data_collection",
      "estimated_impact": "QUANTIFIED IMPACT - adapt based on available data:
        - FOR REVENUE CAMPAIGNS: 'Save $2,000/month while maintaining 80% of conversions, improving net ROI from 120% to 180%'
        - FOR CONVERSION CAMPAIGNS: 'Reduce CPL from $85 to $45 while increasing qualified lead rate by 30%, saving $1,500/month'",
      "confidence": "high|medium|low (based on data quality and recency)",
      "data_supporting": "SPECIFIC METRICS - adapt based on available data:
        - FOR REVENUE CAMPAIGNS: 'Facebook ROI: -15%, CPC: $8.50, Conversion rate: 0.8% vs LinkedIn: ROI: +180%, CPC: $5.20, Conversion rate: 2.4%'
        - FOR CONVERSION CAMPAIGNS: 'Facebook CPL: $85, Call volume: 12, Appointments: 3 vs LinkedIn: CPL: $45, Call volume: 28, Appointments: 14'"
    }}
  ],
  "overall_assessment": "1-2 sentence executive summary of campaign portfolio health in business context",
  "confidence": "high|medium|low (based on data completeness, recency, and sample size)"
}}

**OR** if critical information is missing:

{{
  "type": "clarification_needed",
  "questions": [
    {{
      "question": "What is your target Customer Acquisition Cost (CAC) for {industry}?",
      "reason": "Need to determine if current spend levels are sustainable relative to customer lifetime value",
      "category": "data_quality"
    }}
  ],
  "message": "I need more context to provide strategic recommendations rather than generic advice"
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ **QUALITY STANDARDS** (Every recommendation must meet these):
- ✅ References specific metrics from campaign data (ROI, CPL, CPA, conversion rates - whatever is available)
- ✅ Adapts optimization approach based on available metrics (ROI vs CPL/CPA)
- ✅ Considers {industry if industry else 'industry'} context and benchmarks
- ✅ Addresses {month_name}/{quarter} seasonal factors
- ✅ Aware of competitive dynamics ({', '.join(competitors[:2]) if competitors else 'market'})
- ✅ Aligns with budget constraint: {marketing_budget}
- ✅ Supports business goals: {', '.join(business_goals[:2]) if business_goals else 'growth and profitability'}
- ✅ Provides SPECIFIC numbers (dollar amounts, percentages, timeframes)
- ✅ Explains WHY the recommendation works for THIS business (not generic)
- ✅ For conversion campaigns: Considers lead quality, not just volume (qualified leads, appointments, calls)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now analyze the data and provide 3-5 strategic, context-aware optimization recommendations.

⚠️ **IMPORTANT**: Check the "Optimization Mode" in the portfolio summary above:
- If "Revenue-Based (ROI)": Focus on maximizing ROI, profit margins, and revenue growth
- If "Conversion-Based (CPL/CPA)": Focus on reducing Cost Per Lead/Acquisition and improving lead quality (qualified leads, appointments, calls)
"""


def parse_llm_roi_response(response_text: str) -> Dict[str, Any]:
    """
    Parse LLM response for ROI recommendations.
    Returns structured dict matching ROIRecommendationsResponse schema.
    """
    try:
        # Extract JSON from response
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1

        if start_idx == -1 or end_idx == 0:
            logger.warning("No JSON found in LLM ROI response")
            return {"type": "error", "message": "Invalid response format"}

        json_text = response_text[start_idx:end_idx]
        response_data = json.loads(json_text)

        response_type = response_data.get("type", "unknown")

        if response_type == "recommendations":
            return {
                "type": "recommendations",
                "recommendations": response_data.get("recommendations", []),
                "overall_assessment": response_data.get("overall_assessment"),
                "confidence": response_data.get("confidence", "medium")
            }
        elif response_type == "clarification_needed":
            return {
                "type": "clarification_needed",
                "questions": response_data.get("questions", []),
                "message": response_data.get("message", "Need more information")
            }
        else:
            return {"type": "error", "message": "Unknown response type"}

    except Exception as e:
        logger.error(f"Failed to parse LLM ROI response: {e}")
        return {"type": "error", "message": f"Parse error: {str(e)}"}
