"""
Smart Content Recommendations with Contextual Reasoning Gates
Enhanced version that checks business capabilities and detects conflicts before making suggestions.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
import logging

logger = logging.getLogger(__name__)

def format_existing_content(existing_content: List[Dict[str, Any]]) -> str:
    """Format existing content into a summary for the LLM."""
    if not existing_content:
        return "No content created yet - this is a fresh start!"

    content_summary = []
    for content in existing_content[:10]:  # Limit to 10 most recent
        title = content.get("title", "Untitled")
        output_type = content.get("output_type", "unknown")
        created_at = content.get("created_at", "")

        # Map output types to human-readable names
        type_labels = {
            "usp_content": "USP-Focused Content",
            "blog_post": "Blog Post",
            "case_study": "Case Study",
            "email_sequence": "Email Campaign",
            "social_content": "Social Media Content",
            "thought_leadership_content": "Thought Leadership",
            "content_intelligence": "Content Strategy"
        }

        type_label = type_labels.get(output_type, output_type)
        content_summary.append(f"- {type_label}: \"{title}\"")

    summary_text = "\n".join(content_summary)
    return f"""The following content has already been created ({len(existing_content)} total):
{summary_text}

⚠️ IMPORTANT: Do NOT recommend creating content that is already listed above. Focus on NEW content opportunities that complement what already exists."""

def build_smart_recommendation_prompt(
    business_data: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    existing_content: List[Dict[str, Any]] = []  # NEW: Add existing content parameter
) -> str:
    """Build intelligent prompt with contextual reasoning gates."""

    # Step 1: Extract and validate business capabilities
    capabilities = analyze_business_capabilities(business_data)

    # Step 2: Detect conflicts in business data
    conflicts = detect_business_conflicts(business_data, personas, strategies)

    # Step 3: Build contextual analysis sections
    company_name = business_data.get("company_name", "Your company")
    industry = business_data.get("industry", "")

    # Step 4: Format existing content to help LLM avoid duplicates
    existing_content_summary = format_existing_content(existing_content)

    return f"""You are an intelligent content marketing strategist. Your job is to make SMART recommendations based on actual business capabilities, not generic suggestions.

BUSINESS CONTEXT:
Company: {company_name} ({industry})
Products: {', '.join(business_data.get('main_products', [])[:3])}
Target Markets: {', '.join(business_data.get('target_market', [])[:3])}
Budget: {business_data.get('marketing_budget', 'Not specified')}

BUSINESS CAPABILITIES ANALYSIS:
{format_capabilities_analysis(capabilities)}

PERSONAS ANALYSIS:
{format_personas_analysis(personas)}

STRATEGY ANALYSIS:
{format_strategy_analysis(strategies)}

EXISTING CONTENT ALREADY CREATED:
{existing_content_summary}

CONFLICT DETECTION:
{format_conflicts_analysis(conflicts) if conflicts else "✅ No conflicts detected in business context"}

INTELLIGENCE INSTRUCTIONS:
1. **Check Prerequisites**: Before suggesting content creation, verify the business has the necessary infrastructure (website, social accounts, email system)
2. **Conflict Resolution**: If you detect conflicting information, request clarification instead of making assumptions
3. **Context-Aware Suggestions**: Only suggest content that aligns with verified business capabilities
4. **Avoid Duplicates**: DO NOT recommend content types that have already been created (see EXISTING CONTENT section above)
5. **Smart Uncertainty**: If missing critical information, ask specific questions instead of generic recommendations

RESPONSE FORMAT:
If you can make confident, contextual recommendations based on verified business capabilities, return:
{{
  "type": "recommendations",
  "recommendations": [/* ContentRecommendation objects */],
  "confidence": "high|medium|low"
}}

If you need clarification due to missing information or conflicts, return:
{{
  "type": "clarification_needed",
  "questions": [
    {{
      "question": "Specific question about missing capability or conflict",
      "reason": "Why this information is needed for smart recommendations",
      "category": "infrastructure|strategy|personas|conflicts"
    }}
  ],
  "message": "I need to understand your business better before making recommendations"
}}

Focus on being HELPFUL by asking smart questions rather than making potentially irrelevant suggestions."""

def analyze_business_capabilities(business_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze what business capabilities are verified vs missing."""
    capabilities = {
        "website": {
            "verified": bool(business_data.get("website_url") or business_data.get("has_website")),
            "confidence": "high" if business_data.get("website_url") else "unknown"
        },
        "social_media": {
            "platforms": business_data.get("social_media_platforms", []),
            "verified": len(business_data.get("social_media_platforms", [])) > 0,
            "confidence": "medium"
        },
        "email_marketing": {
            "verified": bool(business_data.get("email_platform") or business_data.get("has_email_marketing")),
            "confidence": "unknown"
        },
        "content_distribution": {
            "blog": bool(business_data.get("has_blog")),
            "newsletter": bool(business_data.get("has_newsletter")),
            "verified": any([
                business_data.get("has_blog"),
                business_data.get("has_newsletter"),
                business_data.get("website_url")
            ])
        },
        "team_capacity": {
            "marketing_team_size": business_data.get("marketing_team_size", "unknown"),
            "content_creation_capacity": business_data.get("content_frequency", "unknown"),
            "verified": bool(business_data.get("marketing_team_size"))
        }
    }

    return capabilities

def detect_business_conflicts(
    business_data: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]]
) -> List[Dict[str, str]]:
    """Detect conflicts in business context that need clarification."""
    conflicts = []

    # Budget vs Strategy Conflicts
    budget = business_data.get("marketing_budget", "")
    if budget.lower() in ["minimal", "very low", "bootstrap"] and strategies:
        strategy_content = strategies[0].get("content", {})
        if isinstance(strategy_content, str):
            try:
                strategy_content = json.loads(strategy_content)
            except:
                strategy_content = {}

        # Check for expensive strategy recommendations
        channels = strategy_content.get("recommended_channels", [])
        expensive_channels = ["paid-advertising", "influencer-marketing", "events"]
        if any(channel in str(channels).lower() for channel in expensive_channels):
            conflicts.append({
                "type": "budget_strategy_mismatch",
                "description": f"Marketing strategy suggests expensive channels but budget is '{budget}'",
                "question": "How do you plan to execute paid marketing strategies with a minimal budget?"
            })

    # Persona vs Target Market Conflicts
    target_markets = business_data.get("target_market", [])
    if target_markets and personas:
        persona_markets = []
        for persona in personas:
            content = persona.get("content", {})
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except:
                    content = {}

            company = content.get("company_type", "")
            if company:
                persona_markets.append(company)

        # Check for market misalignment
        if persona_markets and not any(market.lower() in " ".join(persona_markets).lower() for market in target_markets):
            conflicts.append({
                "type": "persona_market_mismatch",
                "description": f"Target markets ({target_markets}) don't align with persona companies ({persona_markets})",
                "question": "Should your personas reflect your target markets more closely?"
            })

    # Industry vs Products Conflicts
    industry = business_data.get("industry", "")
    products = business_data.get("main_products", [])
    if industry.lower() in ["saas", "software"] and not any("software" in product.lower() or "saas" in product.lower() for product in products):
        conflicts.append({
            "type": "industry_product_mismatch",
            "description": f"Industry is '{industry}' but products don't mention software/SaaS",
            "question": "Are your main products actually software-based or is your industry classification different?"
        })

    return conflicts

def format_capabilities_analysis(capabilities: Dict[str, Any]) -> str:
    """Format capabilities analysis for LLM prompt."""
    analysis = []

    for capability, data in capabilities.items():
        if isinstance(data, dict):
            verified = data.get("verified", False)
            confidence = data.get("confidence", "unknown")
            status = "✅ VERIFIED" if verified else f"❓ UNKNOWN ({confidence} confidence)"

            if capability == "website":
                analysis.append(f"Website/Blog Platform: {status}")
            elif capability == "social_media":
                platforms = data.get("platforms", [])
                platform_list = ", ".join(platforms) if platforms else "None specified"
                analysis.append(f"Social Media: {status} - Platforms: {platform_list}")
            elif capability == "email_marketing":
                analysis.append(f"Email Marketing System: {status}")
            elif capability == "content_distribution":
                blog = "✅" if data.get("blog") else "❓"
                newsletter = "✅" if data.get("newsletter") else "❓"
                analysis.append(f"Content Distribution: Blog {blog} Newsletter {newsletter}")
            elif capability == "team_capacity":
                team_size = data.get("marketing_team_size", "unknown")
                analysis.append(f"Marketing Team: {team_size}")

    return "\n".join(analysis)

def format_personas_analysis(personas: List[Dict[str, Any]]) -> str:
    """Format personas analysis for LLM prompt."""
    if not personas:
        return "❓ No personas defined - need to understand target audience"

    analysis = []
    for i, persona in enumerate(personas[:2]):
        content = persona.get("content", {})
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except:
                content = {}

        name = content.get("name", persona.get("title", f"Persona {i+1}"))
        pain_points = content.get("pain_points", [])
        goals = content.get("goals", [])

        analysis.append(f"• {name}: Pain Points - {', '.join(pain_points[:2])}; Goals - {', '.join(goals[:2])}")

    return "\n".join(analysis) if analysis else "❓ Persona data incomplete"

def format_strategy_analysis(strategies: List[Dict[str, Any]]) -> str:
    """Format strategy analysis for LLM prompt."""
    if not strategies:
        return "❓ No marketing strategy defined"

    strategy = strategies[0]
    content = strategy.get("content", {})
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except:
            content = {}

    messaging = content.get("messaging_framework", {})
    if not messaging:
        return "❓ Marketing strategy lacks clear messaging framework"

    value_prop = messaging.get("value_proposition", "Not defined")
    channels = messaging.get("recommended_channels", [])

    return f"Value Proposition: {value_prop}\nRecommended Channels: {', '.join(channels[:3])}"

def format_conflicts_analysis(conflicts: List[Dict[str, str]]) -> str:
    """Format conflicts analysis for LLM prompt."""
    if not conflicts:
        return "✅ No conflicts detected"

    analysis = []
    for conflict in conflicts:
        analysis.append(f"⚠️ {conflict['type'].replace('_', ' ').title()}: {conflict['description']}")

    return "\n".join(analysis)

def parse_smart_recommendations_response(response_text: str) -> Tuple[str, Any]:
    """Parse smart recommendations response and determine type."""
    try:
        # Extract JSON from response
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1

        if start_idx == -1 or end_idx == 0:
            logger.warning("No JSON found in smart recommendations response")
            return "error", {"message": "Invalid response format"}

        json_text = response_text[start_idx:end_idx]
        response_data = json.loads(json_text)

        response_type = response_data.get("type", "unknown")

        if response_type == "recommendations":
            return "recommendations", response_data.get("recommendations", [])
        elif response_type == "clarification_needed":
            return "clarification", {
                "questions": response_data.get("questions", []),
                "message": response_data.get("message", "Need more information")
            }
        else:
            return "error", {"message": "Unknown response type"}

    except Exception as e:
        logger.error(f"Failed to parse smart recommendations: {e}")
        return "error", {"message": "Failed to parse response"}