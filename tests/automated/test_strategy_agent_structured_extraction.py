#!/usr/bin/env python3
"""
Strategy Agent Structured Extraction Test
Tests the extraction capability specifically for Strategy Agent outputs.
"""
import asyncio
import sys
import os
import json
from pathlib import Path

# Add project root to path for imports
sys.path.append(str(Path(__file__).resolve().parents[2]))

from apps.api.services.structured_extractor import create_structured_extractor

async def test_strategy_agent_extraction():
    """Test the structured extractor for Strategy Agent responses."""

    print("🧪 Testing Strategy Agent Structured Extraction")
    print("=" * 60)

    # Sample strategy response with SWOT analysis and frameworks
    sample_response = """
    # Comprehensive Strategic Analysis for TaskFlow Solutions

    ## Executive Summary
    After conducting a thorough strategic analysis using multiple frameworks, TaskFlow Solutions faces a critical juncture. Our analysis reveals both significant opportunities and mounting challenges that require immediate strategic action.

    ## Analysis Framework Applied
    **Primary Frameworks Used:**
    - SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
    - Porter's Five Forces Analysis
    - ICE Prioritization Matrix (Impact, Confidence, Ease)
    - Business Model Canvas assessment

    ## Business Context
    **Company Profile:**
    - Industry: Project Management SaaS
    - Annual Recurring Revenue: $12M
    - Employee Count: 85 people
    - Market Position: SME-focused with construction/manufacturing strength
    - Runway: 18 months

    **Current Challenges:**
    - Customer churn increased from 8% to 14% annually
    - Customer acquisition costs up 40%
    - Increasing competition from well-funded players (Asana, Monday.com)

    ## SWOT Analysis

    ### Strengths
    1. **Strong Vertical Expertise**: Deep domain knowledge in construction and manufacturing verticals
    2. **Established Customer Base**: $12M ARR indicates solid product-market fit
    3. **Lean Operations**: 85 employees managing $12M ARR shows operational efficiency
    4. **Industry-Specific Features**: Tailored functionality for construction project management

    ### Weaknesses
    1. **Rising Churn Rate**: 14% annual churn indicates customer satisfaction issues
    2. **Inefficient Acquisition**: 40% increase in CAC suggests marketing/sales challenges
    3. **Limited Brand Recognition**: Competing against well-known enterprise players
    4. **Resource Constraints**: 18-month runway limits strategic flexibility

    ### Opportunities
    1. **Niche Specialization**: Double down on construction/manufacturing verticals
    2. **Enterprise Expansion**: Leverage vertical expertise to move upmarket
    3. **Integration Partnerships**: Partner with industry-specific software providers
    4. **Product Innovation**: Add AI-powered project insights and automation

    ### Threats
    1. **Well-Funded Competition**: Asana and Monday.com have significant war chests
    2. **Market Commoditization**: Risk of project management becoming a commodity
    3. **Economic Downturn**: Construction industry sensitive to economic cycles
    4. **Talent Competition**: Difficulty attracting top talent against bigger players

    ## Porter's Five Forces Analysis

    **Competitive Rivalry: HIGH**
    - Numerous established players with significant funding
    - Low switching costs for customers
    - Market growth slowing as it matures

    **Supplier Power: LOW**
    - Cloud infrastructure commoditized
    - Multiple technology vendors available

    **Buyer Power: MEDIUM-HIGH**
    - Customers have multiple alternatives
    - Price sensitivity in SME market
    - Low switching costs

    **Threat of Substitutes: MEDIUM**
    - Generic project management tools
    - Industry-specific alternatives
    - Internal spreadsheet solutions

    **Barriers to Entry: MEDIUM**
    - Technology barriers relatively low
    - Brand and customer acquisition more challenging
    - Vertical expertise provides some protection

    ## Strategic Recommendations

    ### Primary Strategic Option: Vertical Specialization (Recommended)
    **Rationale:** Leverage existing strength in construction/manufacturing while creating defensible moats

    **Key Action Items:**
    1. **Product Specialization** (Immediate - 0-3 months)
       - Add construction-specific features: permit tracking, safety compliance, material management
       - Develop manufacturing workflow templates
       - Build industry-specific reporting dashboards

    2. **Market Positioning** (Short-term - 3-6 months)
       - Rebrand as "The Construction Project Management Platform"
       - Develop case studies showcasing construction ROI
       - Target industry publications and trade shows

    3. **Partnership Strategy** (Medium-term - 6-12 months)
       - Partner with construction software providers (estimating, CAD, etc.)
       - Integrate with industry-specific tools
       - Develop construction technology ecosystem

    ### Secondary Strategic Options

    **Option B: Acquisition Target** (6-12 months)
    - Position for acquisition by larger construction technology company
    - Focus on maximizing valuation through growth metrics
    - Maintain lean operations and strong unit economics

    **Option C: Enterprise Pivot** (12-18 months)
    - Leverage construction expertise to target enterprise construction firms
    - Develop enterprise-grade security and compliance features
    - Higher ACV to justify increased sales costs

    ## Implementation Timeline

    **Immediate Actions (0-30 days):**
    1. Conduct customer interviews to validate churn causes
    2. Analyze competitor positioning in construction vertical
    3. Assess product development resources for vertical features

    **Short-term Initiatives (1-3 months):**
    1. Launch construction-specific feature development
    2. Hire construction industry marketing specialist
    3. Develop vertical-specific pricing strategy

    **Medium-term Goals (3-6 months):**
    1. Release construction-focused product version
    2. Launch targeted marketing campaigns in construction trade media
    3. Establish 3-5 strategic partnerships

    **Long-term Objectives (6-18 months):**
    1. Achieve market leadership in construction project management
    2. Reduce churn to <8% through better product-market fit
    3. Improve unit economics through higher willingness to pay in specialized market

    ## Success Metrics and KPIs

    **Financial Metrics:**
    - Reduce annual churn from 14% to <8% within 12 months
    - Improve CAC by 25% through better targeting
    - Increase ARR to $20M within 18 months
    - Achieve positive cash flow within 12 months

    **Product Metrics:**
    - Launch 5 construction-specific features within 6 months
    - Achieve 90%+ feature adoption among construction customers
    - Net Promoter Score >50 in construction vertical

    **Market Metrics:**
    - Capture 15% market share in SME construction project management
    - Establish partnerships with 10+ construction technology vendors
    - Generate 50% of new revenue from construction vertical

    ## Risk Mitigation

    **Primary Risks and Mitigation Strategies:**
    1. **Construction Market Downturn:** Diversify within construction (residential, commercial, infrastructure)
    2. **Competition:** Build deep vertical moats through specialized features and partnerships
    3. **Resource Constraints:** Prioritize highest-impact initiatives using ICE framework
    4. **Execution Risk:** Hire construction industry experts for product and marketing

    ## Conclusion

    The strategic recommendation is clear: **double down on vertical specialization in construction and manufacturing**. This approach leverages existing strengths, creates defensible competitive advantages, and addresses current challenges through better product-market fit.

    The key to success will be disciplined execution of the vertical specialization strategy while maintaining financial discipline to extend runway and achieve profitability within the 18-month window.
    """

    try:
        # Get GOOGLE_API_KEY from environment
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            print("❌ ERROR: GOOGLE_API_KEY not found in environment")
            return False

        print(f"✅ Using GOOGLE_API_KEY: {api_key[:10]}...")

        # Create structured extractor
        print("🚀 Initializing StructuredExtractor...")
        extractor = create_structured_extractor(api_key)
        print("✅ StructuredExtractor created successfully")

        # Test extraction for strategy agent
        print("🎯 Extracting structured data from strategy response...")
        print(f"📝 Sample response length: {len(sample_response)} characters")

        structured_result = await extractor.extract(
            agent_type="strategy",
            raw_content=sample_response
        )

        print("✅ Extraction completed!")

        # Verify the result structure
        print("\n📊 EXTRACTION RESULTS:")
        print("=" * 40)

        print(f"🔑 Top-level keys: {list(structured_result.keys())}")

        # Check for raw response
        if 'response' in structured_result:
            original_length = len(structured_result['response'])
            print(f"📄 Original response preserved: {original_length} chars")
        else:
            print("❌ Original response not preserved")

        # Check for structured data
        if 'structured_data' in structured_result:
            structured_data = structured_result['structured_data']
            print("🎊 STRUCTURED DATA FOUND!")
            print(f"📋 Structured data keys: {list(structured_data.keys())}")

            # Check specific strategy fields
            expected_fields = ['analysis_type', 'frameworks_used', 'business_context', 'strategic_insights', 'action_items']
            found_fields = []

            for field in expected_fields:
                if field in structured_data:
                    found_fields.append(field)
                    field_data = structured_data[field]
                    print(f"✅ {field}: {type(field_data).__name__}")

                    # Show sample data
                    if isinstance(field_data, dict) and field_data:
                        sample_keys = list(field_data.keys())[:3]
                        print(f"   Sample keys: {sample_keys}")
                    elif isinstance(field_data, list) and field_data:
                        print(f"   List length: {len(field_data)}")
                    elif isinstance(field_data, str) and field_data:
                        print(f"   Content preview: {field_data[:100]}...")

            print(f"\n📈 Success Rate: {len(found_fields)}/{len(expected_fields)} expected fields found")

            # Show detailed extraction for key fields
            if 'frameworks_used' in structured_data:
                frameworks = structured_data['frameworks_used']
                print(f"\n🔧 Frameworks Used:")
                if isinstance(frameworks, list):
                    for fw in frameworks[:5]:  # Show first 5
                        print(f"   - {fw}")
                else:
                    print(f"   {frameworks}")

            if 'strategic_insights' in structured_data:
                insights = structured_data['strategic_insights']
                print(f"\n💡 Strategic Insights Overview:")
                if isinstance(insights, dict):
                    for key, value in list(insights.items())[:3]:  # Show first 3
                        preview = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                        print(f"   {key}: {preview}")

            if 'action_items' in structured_data:
                action_items = structured_data['action_items']
                print(f"\n⚡ Action Items:")
                if isinstance(action_items, list):
                    for i, item in enumerate(action_items[:3]):  # Show first 3
                        if isinstance(item, dict):
                            title = item.get('title', item.get('action', 'Unknown'))
                            print(f"   {i+1}. {title}")
                        else:
                            print(f"   {i+1}. {str(item)[:100]}...")

        else:
            print("❌ No structured data found in result")

        # Check extraction metadata
        extraction_status = structured_result.get('extraction_status', 'unknown')
        extraction_model = structured_result.get('extraction_model', 'unknown')
        extraction_timestamp = structured_result.get('extraction_timestamp', 'unknown')

        print(f"\n🔍 Extraction Metadata:")
        print(f"   Status: {extraction_status}")
        print(f"   Model: {extraction_model}")
        print(f"   Timestamp: {extraction_timestamp}")

        # Determine test success
        success = (
            'structured_data' in structured_result and
            extraction_status == 'success' and
            len(structured_result['structured_data']) > 0
        )

        return success

    except Exception as e:
        print(f"💥 ERROR during extraction test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test runner."""
    success = await test_strategy_agent_extraction()

    print("\n" + "=" * 60)
    if success:
        print("🎉 STRATEGY AGENT EXTRACTION TEST PASSED!")
        print("✅ StructuredExtractor service is working correctly")
        print("✅ Strategy agent schema extraction successful")
    else:
        print("❌ STRATEGY AGENT EXTRACTION TEST FAILED!")
        print("🔧 Check the logs above for debugging information")

    print("=" * 60)
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)