#!/usr/bin/env python3
"""
Persona Agent Structured Extraction Test
Tests the extraction capability specifically for Persona Agent outputs.
"""
import asyncio
import sys
import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).resolve().parents[2] / 'tests/.env')

# Add project root to path for imports
sys.path.append(str(Path(__file__).resolve().parents[2]))

from apps.api.services.structured_extractor import create_structured_extractor

async def test_persona_agent_extraction():
    """Test the structured extractor for Persona Agent responses."""

    print("🧪 Testing Persona Agent Structured Extraction")
    print("=" * 60)

    # Sample persona response with detailed customer profiles
    sample_response = """
    # Construction Project Manager Personas for TaskFlow Solutions

    Based on extensive research and customer interviews, I've developed three key buyer personas that represent TaskFlow's ideal customers in the construction industry. These personas will guide all marketing, product development, and sales efforts.

    ## Primary Persona: Michael "Mike" Construction - The Overwhelmed Project Manager

    ### Demographics & Role Information
    **Name:** Michael "Mike" Construction
    **Age:** 38 years old
    **Location:** Dallas, Texas (suburban area)
    **Job Title:** Senior Project Manager
    **Company:** Mid-sized commercial construction company (150 employees)
    **Company Revenue:** $45M annually
    **Education:** Bachelor's degree in Construction Management
    **Experience:** 12 years in construction industry, 6 years as project manager
    **Salary Range:** $75,000 - $85,000
    **Family Status:** Married with two children (ages 8 and 11)

    ### Professional Background
    **Current Role Responsibilities:**
    - Managing 3-5 concurrent commercial construction projects
    - Coordinating with 15-20 subcontractors per project
    - Budget oversight ranging from $2M - $8M per project
    - Team leadership of 8-12 direct reports
    - Client communication and stakeholder management
    - Safety compliance and quality control oversight

    **Industry Experience:**
    - Started as a construction worker straight out of college
    - Worked way up through assistant PM, PM, and now senior PM
    - Specializes in commercial office buildings and retail spaces
    - Has managed over $120M in total project value throughout career

    ### Goals & Motivations
    **Primary Professional Goals:**
    1. **Deliver projects on time and under budget** - Wants to maintain 95%+ on-time delivery rate
    2. **Reduce project stress and chaos** - Looking for ways to bring order to complex multi-contractor projects
    3. **Advance to construction manager role** - Wants promotion within 2-3 years
    4. **Improve team efficiency** - Reduce time spent on administrative tasks by 30%
    5. **Enhance client satisfaction** - Maintain long-term relationships for repeat business

    **Personal Motivations:**
    - Work-life balance to spend quality time with family
    - Professional recognition within the construction industry
    - Financial stability and growth for family security
    - Continuous learning and skill development

    ### Pain Points & Challenges
    **Daily Frustrations:**
    1. **Information Chaos** - Spends 2-3 hours daily hunting for project information across emails, spreadsheets, and phone calls
    2. **Subcontractor Communication** - Constant back-and-forth with subs who miss deadlines or miscommunicate requirements
    3. **Client Demands** - Clients asking for real-time updates when he doesn't have consolidated project status
    4. **Budget Tracking** - Excel spreadsheets that are always out of date and don't reflect real-time costs
    5. **Schedule Coordination** - Juggling multiple project timelines with interdependent tasks

    **Business Impact of Problems:**
    - Average 15% cost overrun on projects due to poor tracking
    - 20% of projects finish 2-4 weeks late
    - Spending 60+ hours per week during peak project phases
    - High stress leading to consideration of career change

    ### Technology & Decision-Making Process
    **Current Technology Stack:**
    - Microsoft Excel for project tracking and budgets
    - Email for all communication (Outlook)
    - Smartphone for on-site coordination
    - Occasional use of project management apps (but nothing comprehensive)
    - Company uses basic accounting software (QuickBooks)

    **Decision-Making Authority:**
    - Full authority for software purchases under $500/month
    - Needs director approval for purchases $500-2000/month
    - Requires executive approval for purchases over $2000/month
    - Influences technology decisions for entire PM team (5 other PMs)

    **Research & Buying Process:**
    1. **Problem Recognition** - Usually triggered by a major project issue or client complaint
    2. **Initial Research** - Google searches, asking peers, checking industry forums
    3. **Solution Evaluation** - Demos with 2-3 vendors, focuses on ease of use
    4. **Internal Buy-in** - Presents to director with ROI calculations
    5. **Trial Period** - Prefers 30-day free trials before making decisions
    6. **Implementation** - Needs implementation support and team training

    ### Communication & Engagement Preferences
    **Preferred Communication Channels:**
    1. **Email** - Primary channel, checks 3-4 times daily
    2. **LinkedIn** - Active for professional networking and industry news
    3. **Industry Publications** - Reads Construction Business Owner and ENR weekly
    4. **Trade Shows** - Attends 2-3 construction trade shows annually
    5. **Peer Networks** - Local construction manager meetups monthly

    **Content Preferences:**
    - **Case Studies** - Wants real examples from similar-sized construction companies
    - **ROI Calculators** - Needs hard numbers showing time and cost savings
    - **Video Demos** - Prefers 5-10 minute product demonstrations over long presentations
    - **Implementation Guides** - Step-by-step guides for team adoption
    - **Industry Trends** - Construction technology and best practices content

    **Communication Timing:**
    - **Best Days:** Tuesday - Thursday
    - **Best Times:** 7-9 AM (before job site visits) and 4-6 PM (end of office day)
    - **Avoid:** Fridays (job site intensive) and early mornings on Monday

    ### Behavioral Patterns & Preferences
    **Work Style:**
    - **Hands-on Leader** - Prefers to be involved in details rather than high-level overview
    - **Problem Solver** - Enjoys finding solutions to complex project challenges
    - **Team Oriented** - Values tools that help entire team, not just individual productivity
    - **Results Focused** - Measures success through on-time delivery and budget adherence

    **Technology Adoption:**
    - **Practical Adopter** - Will embrace new technology if it clearly solves real problems
    - **Simplicity Focused** - Prefers intuitive interfaces over feature-rich complexity
    - **Team Implementation** - Considers how new tools will be adopted by entire team
    - **ROI Conscious** - Needs clear financial justification for new investments

    **Influence Networks:**
    - Highly influenced by peer recommendations from other project managers
    - Trusts industry publications and construction business magazines
    - Values opinions from subcontractors and team members
    - Listens to construction industry consultants and speakers

    ## Secondary Persona: Sarah "The Efficiency Expert" Rodriguez - Operations Director

    ### Demographics & Role Information
    **Name:** Sarah Rodriguez
    **Age:** 42 years old
    **Location:** Phoenix, Arizona
    **Job Title:** Director of Operations
    **Company:** Regional construction company (75 employees)
    **Company Revenue:** $28M annually
    **Education:** MBA in Operations Management, BS in Civil Engineering
    **Experience:** 15 years in construction, 8 years in management roles
    **Salary Range:** $95,000 - $110,000
    **Family Status:** Single, focused on career advancement

    ### Goals & Motivations
    **Primary Professional Goals:**
    1. **Operational Excellence** - Standardize processes across all projects
    2. **Cost Optimization** - Reduce operational costs by 20% annually
    3. **Data-Driven Decisions** - Implement metrics and KPIs for all operations
    4. **Team Development** - Mentor project managers and improve team capabilities
    5. **Technology Integration** - Lead digital transformation initiatives

    ### Pain Points & Challenges
    **Operational Frustrations:**
    1. **Lack of Standardization** - Each PM uses different tools and processes
    2. **Poor Visibility** - Can't get real-time view of all active projects
    3. **Inefficient Reporting** - Spends hours compiling manual reports for executives
    4. **Resource Allocation** - Difficulty optimizing staff and equipment across projects
    5. **Client Transparency** - Clients demand better project visibility and reporting

    ### Communication & Engagement Preferences
    **Preferred Channels:**
    - **LinkedIn** - Very active, shares industry insights weekly
    - **Industry Conferences** - Speaks at construction management events
    - **Professional Associations** - Member of Construction Management Association
    - **Webinars** - Attends 2-3 educational webinars monthly
    - **Email Newsletters** - Subscribes to construction technology and management content

    ## Tertiary Persona: Robert "Old School" Johnson - Veteran Superintendent

    ### Demographics & Role Information
    **Name:** Robert "Bob" Johnson
    **Age:** 55 years old
    **Location:** Nashville, Tennessee
    **Job Title:** Project Superintendent
    **Company:** Large general contractor (400+ employees)
    **Experience:** 30+ years in construction industry
    **Education:** High school + trade certifications
    **Salary Range:** $85,000 - $95,000
    **Family Status:** Married, three adult children

    ### Goals & Motivations
    **Primary Goals:**
    1. **Quality Construction** - Maintain high standards and craftsmanship
    2. **Safety Leadership** - Zero accidents on job sites
    3. **Mentorship** - Pass knowledge to younger generation
    4. **Efficient Operations** - Keep projects moving smoothly
    5. **Respect & Recognition** - Maintain reputation as reliable superintendent

    ### Pain Points & Challenges
    **Technology Concerns:**
    1. **Steep Learning Curves** - Concerned about adapting to new technology
    2. **Training Time** - Worried about time investment required for new tools
    3. **Team Adoption** - Needs buy-in from field crews who resist change
    4. **Integration Issues** - Wants tools that work with existing processes
    5. **Support Requirements** - Needs strong customer support and training

    ### Communication & Engagement Preferences
    **Preferred Channels:**
    - **Phone Calls** - Prefers verbal communication over digital
    - **Face-to-Face Meetings** - Values in-person demonstrations and relationships
    - **Industry Magazines** - Reads print versions of construction publications
    - **Peer Networks** - Construction superintendent associations and meetups
    - **Company Training** - Prefers company-sponsored training over self-directed learning

    ## Persona Usage Guidelines

    ### Marketing Applications
    **Primary Persona (Mike)** - Focus 60% of marketing efforts
    - Content themes: Time savings, stress reduction, project control
    - Channels: LinkedIn, email marketing, industry publications
    - Messaging: "Get your weekends back while delivering better projects"

    **Secondary Persona (Sarah)** - Focus 30% of marketing efforts
    - Content themes: ROI, standardization, operational efficiency
    - Channels: Professional networks, webinars, industry conferences
    - Messaging: "Transform your operations with data-driven project management"

    **Tertiary Persona (Bob)** - Focus 10% of marketing efforts
    - Content themes: Simplicity, support, proven reliability
    - Channels: Trade publications, peer referrals, company partnerships
    - Messaging: "Proven project management that works with your existing processes"

    ### Product Development Priorities
    Based on these personas, TaskFlow should prioritize:
    1. **Intuitive Interface** - Critical for Mike and Bob adoption
    2. **Real-time Reporting** - Essential for Sarah's operational needs
    3. **Mobile Optimization** - Important for Mike's on-site work
    4. **Integration Capabilities** - Necessary for all three personas
    5. **Comprehensive Support** - Especially important for Bob's comfort level

    This comprehensive persona analysis provides the foundation for all customer-facing initiatives, ensuring TaskFlow Solutions meets the real needs of construction industry professionals while addressing their specific pain points and communication preferences.
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

        # Test extraction for persona agent
        print("🎯 Extracting structured data from persona response...")
        print(f"📝 Sample response length: {len(sample_response)} characters")

        structured_result = await extractor.extract(
            agent_type="persona",
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

            # Check specific persona fields
            expected_fields = ['persona_details', 'behavioral_data', 'engagement_preferences']
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
            if 'persona_details' in structured_data:
                persona_details = structured_data['persona_details']
                print(f"\n👤 Persona Details:")
                if isinstance(persona_details, dict):
                    for key, value in list(persona_details.items())[:5]:  # Show first 5
                        preview = str(value)[:80] + "..." if len(str(value)) > 80 else str(value)
                        print(f"   {key}: {preview}")

            if 'behavioral_data' in structured_data:
                behavioral = structured_data['behavioral_data']
                print(f"\n🧠 Behavioral Data:")
                if isinstance(behavioral, dict):
                    for key, value in list(behavioral.items())[:4]:  # Show first 4
                        preview = str(value)[:80] + "..." if len(str(value)) > 80 else str(value)
                        print(f"   {key}: {preview}")

            if 'engagement_preferences' in structured_data:
                engagement = structured_data['engagement_preferences']
                print(f"\n📱 Engagement Preferences:")
                if isinstance(engagement, dict):
                    for key, value in list(engagement.items())[:4]:  # Show first 4
                        preview = str(value)[:80] + "..." if len(str(value)) > 80 else str(value)
                        print(f"   {key}: {preview}")

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
    success = await test_persona_agent_extraction()

    print("\n" + "=" * 60)
    if success:
        print("🎉 PERSONA AGENT EXTRACTION TEST PASSED!")
        print("✅ StructuredExtractor service is working correctly")
        print("✅ Persona agent schema extraction successful")
    else:
        print("❌ PERSONA AGENT EXTRACTION TEST FAILED!")
        print("🔧 Check the logs above for debugging information")

    print("=" * 60)
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)