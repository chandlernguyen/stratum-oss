#!/usr/bin/env python3
"""
Content Agent Structured Extraction Test
Tests the extraction capability specifically for Content Agent outputs.
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

async def test_content_agent_extraction():
    """Test the structured extractor for Content Agent responses."""

    print("🧪 Testing Content Agent Structured Extraction")
    print("=" * 60)

    # Sample content response with blog post and social media calendar
    sample_response = """
    # Comprehensive Content Strategy for Construction Project Management Platform

    ## Content Strategy Overview
    Based on your construction industry focus and need to reduce customer churn, I've developed a multi-channel content strategy that positions TaskFlow Solutions as the go-to project management expert for construction professionals.

    ## Blog Post: "5 Construction Project Management Mistakes That Cost You $50,000 Per Project"

    ### Content Details
    **Title:** 5 Construction Project Management Mistakes That Cost You $50,000 Per Project
    **Word Count:** 2,500 words
    **Target Audience:** Construction project managers, general contractors, construction business owners
    **Content Type:** Educational blog post with case studies
    **Publishing Date:** November 15, 2025
    **Primary CTA:** "See how TaskFlow prevents these costly mistakes - Start your free trial"

    ### Content Structure
    1. **Introduction** (300 words)
       - Hook: "Last month, a general contractor in Phoenix discovered a single scheduling oversight cost his company $73,000"
       - Problem statement: Poor project management costs construction companies an average of $50,000 per project
       - Preview of the 5 critical mistakes

    2. **Mistake #1: Lack of Real-Time Progress Tracking** (500 words)
       - Case study: ABC Construction's delayed hospital project
       - Financial impact: 20% cost overrun
       - Solution: How real-time dashboards prevent delays

    3. **Mistake #2: Poor Subcontractor Communication** (500 words)
       - Case study: Miscommunication leading to rework
       - Financial impact: $30,000 in wasted materials
       - Solution: Centralized communication tools

    4. **Mistake #3: Inadequate Resource Planning** (500 words)
       - Case study: Equipment downtime costs
       - Financial impact: $15,000 in rental overages
       - Solution: Resource optimization features

    5. **Mistake #4: Document Disorganization** (400 words)
       - Case study: Lost permit documentation
       - Financial impact: Project delays and fines
       - Solution: Centralized document management

    6. **Mistake #5: No Risk Management Process** (400 words)
       - Case study: Weather delay preparation
       - Financial impact: Emergency response costs
       - Solution: Risk tracking and mitigation

    7. **Conclusion and CTA** (100 words)
       - Summary of potential savings
       - Strong call-to-action for free trial

    ### SEO Optimization
    **Primary Keywords:**
    - "construction project management" (search volume: 2,400/month)
    - "construction project management software" (search volume: 1,600/month)
    - "project management mistakes" (search volume: 800/month)

    **Secondary Keywords:**
    - "construction cost overruns"
    - "project management tools construction"
    - "construction scheduling software"

    **Meta Description:** "Discover the 5 costly construction project management mistakes that average $50,000 per project. Learn how leading contractors prevent these errors with TaskFlow Solutions."

    **Internal Links:**
    - Link to TaskFlow features pages
    - Link to construction industry case studies
    - Link to free trial signup

    ## Email Drip Campaign: "Construction Project Success Series"

    ### Campaign Overview
    **Campaign Name:** Construction Project Success Series
    **Target Audience:** Construction project managers who downloaded the blog post
    **Campaign Duration:** 5 emails over 2 weeks
    **Primary Goal:** Convert blog readers to free trial users

    ### Email Sequence

    **Email 1: Welcome + Resource Download** (Day 0)
    - Subject: "Your construction project checklist + exclusive insights"
    - Content: Welcome message, link to checklist download, set expectations
    - CTA: "Download your project management checklist"

    **Email 2: Case Study Deep Dive** (Day 3)
    - Subject: "How Denver Construction saved $120,000 with better project tracking"
    - Content: Detailed case study from blog post
    - CTA: "See how TaskFlow works for construction"

    **Email 3: Feature Spotlight** (Day 7)
    - Subject: "The #1 feature construction PMs love most"
    - Content: Real-time progress tracking feature demo
    - CTA: "Try real-time tracking free for 30 days"

    **Email 4: Social Proof** (Day 10)
    - Subject: "What 200+ construction companies say about TaskFlow"
    - Content: Customer testimonials and success metrics
    - CTA: "Join 200+ successful construction companies"

    **Email 5: Limited Time Offer** (Day 14)
    - Subject: "Final reminder: Your construction project trial expires soon"
    - Content: Urgency around trial signup, highlight key benefits
    - CTA: "Start your free trial today"

    ## Social Media Calendar: November 2025

    ### Platform Strategy

    **LinkedIn (Primary Platform)**
    - Frequency: 5 posts per week
    - Content Mix: 40% educational, 30% case studies, 20% company news, 10% industry trends
    - Best Posting Times: Tuesday-Thursday, 8-10 AM EST

    **Twitter/X (Secondary Platform)**
    - Frequency: 3 posts per week
    - Content Mix: 50% quick tips, 30% industry news, 20% engagement posts
    - Best Posting Times: Weekdays, 9 AM and 1 PM EST

    **YouTube (Long-form Content)**
    - Frequency: 1 video per week
    - Content Type: Tutorial videos and customer interviews
    - Publishing Day: Wednesdays

    ### November 2025 Content Calendar

    **Week 1 (Nov 1-7)**
    - Monday: LinkedIn post about construction industry trends
    - Tuesday: Twitter tip about project scheduling
    - Wednesday: YouTube video "TaskFlow Demo for Construction Companies"
    - Thursday: LinkedIn case study post
    - Friday: Twitter poll about biggest project management challenges
    - Saturday: LinkedIn thought leadership post
    - Sunday: Rest day

    **Week 2 (Nov 8-14)**
    - Monday: LinkedIn educational post about resource planning
    - Tuesday: Twitter thread about cost overrun prevention
    - Wednesday: YouTube customer interview with Denver Construction
    - Thursday: LinkedIn company announcement about new features
    - Friday: Twitter engagement post about construction humor
    - Saturday: LinkedIn weekend reading recommendation
    - Sunday: Rest day

    **Week 3 (Nov 15-21)**
    - Monday: LinkedIn promotion of new blog post (the $50k mistakes post)
    - Tuesday: Twitter summary of blog post key points
    - Wednesday: YouTube tutorial on avoiding project delays
    - Thursday: LinkedIn discussion starter about industry challenges
    - Friday: Twitter Friday motivation for construction professionals
    - Saturday: LinkedIn case study follow-up
    - Sunday: Rest day

    **Week 4 (Nov 22-28)**
    - Monday: LinkedIn gratitude post for construction industry
    - Tuesday: Twitter Thanksgiving message
    - Wednesday: YouTube year-end industry review
    - Thursday: Thanksgiving - no posts
    - Friday: Black Friday special offer announcement
    - Saturday: LinkedIn weekend project management tips
    - Sunday: Rest day

    ### Content Performance Metrics
    **Target KPIs:**
    - LinkedIn: 500+ impressions per post, 3% engagement rate
    - Twitter: 200+ impressions per post, 2% engagement rate
    - YouTube: 100+ views per video, 5% watch time completion
    - Overall: 50 new followers across all platforms monthly

    ## Content Calendar Integration

    ### Cross-Channel Promotion Strategy
    1. **Blog Post Launch:** Announce on all social platforms
    2. **Email Campaign:** Promote social content in emails
    3. **Social Media:** Drive traffic to blog and email signup
    4. **YouTube:** Embed blog insights in video content

    ### Content Repurposing Plan
    - Blog post → 5 LinkedIn posts + 10 Twitter threads + 1 YouTube video
    - Case studies → Email content + Social proof posts
    - Customer interviews → Blog quotes + Social media testimonials

    ## SEO Content Optimization

    ### On-Page SEO Elements
    **Title Tag:** "5 Construction Project Management Mistakes Costing You $50K | TaskFlow"
    **H1:** "5 Construction Project Management Mistakes That Cost You $50,000 Per Project"
    **Meta Description:** "Discover costly construction PM mistakes & how TaskFlow prevents $50K losses per project. Real case studies + solutions from 200+ construction companies."

    ### Content Optimization
    - Keyword density: 1-2% for primary keywords
    - LSI keywords naturally integrated throughout
    - Internal linking to 5+ relevant pages
    - External links to 2-3 authoritative construction industry sources
    - Image alt text optimized for construction project management keywords

    ### Technical SEO
    - Page load speed target: <3 seconds
    - Mobile-responsive design
    - Schema markup for article content
    - Social media meta tags for optimal sharing

    ## Content Success Metrics

    ### Blog Post KPIs
    - **Traffic Goal:** 1,000 unique visitors in first month
    - **Engagement:** 3+ minute average time on page
    - **Conversion:** 5% of visitors sign up for email list
    - **SEO:** Top 10 ranking for primary keyword within 6 months

    ### Email Campaign KPIs
    - **Open Rate:** 25% average across sequence
    - **Click Rate:** 8% average across sequence
    - **Conversion Rate:** 10% of email subscribers start free trial
    - **Unsubscribe Rate:** <2% throughout campaign

    ### Social Media KPIs
    - **Follower Growth:** 15% monthly increase
    - **Engagement Rate:** 4% average across platforms
    - **Traffic Generation:** 200+ monthly clicks to website
    - **Lead Generation:** 10+ social media leads monthly

    ## Content Production Timeline

    **Week 1:** Research and outline development
    **Week 2:** First draft writing and initial review
    **Week 3:** Revisions, SEO optimization, and graphics creation
    **Week 4:** Final review, approval, and publishing setup
    **Week 5:** Content publication and promotion launch
    **Week 6:** Performance monitoring and optimization

    This comprehensive content strategy will establish TaskFlow Solutions as the trusted authority in construction project management while driving qualified leads through educational, value-driven content across multiple channels.
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

        # Test extraction for content agent
        print("🎯 Extracting structured data from content response...")
        print(f"📝 Sample response length: {len(sample_response)} characters")

        structured_result = await extractor.extract(
            agent_type="content",
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

            # Check specific content fields
            expected_fields = ['content_type', 'content_details', 'seo_elements', 'content_calendar']
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
            if 'content_type' in structured_data:
                content_type = structured_data['content_type']
                print(f"\n📝 Content Type: {content_type}")

            if 'content_details' in structured_data:
                details = structured_data['content_details']
                print(f"\n📋 Content Details Overview:")
                if isinstance(details, dict):
                    for key, value in list(details.items())[:5]:  # Show first 5
                        preview = str(value)[:80] + "..." if len(str(value)) > 80 else str(value)
                        print(f"   {key}: {preview}")

            if 'seo_elements' in structured_data:
                seo = structured_data['seo_elements']
                print(f"\n🔍 SEO Elements:")
                if isinstance(seo, dict):
                    for key, value in list(seo.items())[:4]:  # Show first 4
                        preview = str(value)[:80] + "..." if len(str(value)) > 80 else str(value)
                        print(f"   {key}: {preview}")

            if 'content_calendar' in structured_data:
                calendar = structured_data['content_calendar']
                print(f"\n📅 Content Calendar:")
                if isinstance(calendar, dict):
                    for key, value in list(calendar.items())[:3]:  # Show first 3
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
    success = await test_content_agent_extraction()

    print("\n" + "=" * 60)
    if success:
        print("🎉 CONTENT AGENT EXTRACTION TEST PASSED!")
        print("✅ StructuredExtractor service is working correctly")
        print("✅ Content agent schema extraction successful")
    else:
        print("❌ CONTENT AGENT EXTRACTION TEST FAILED!")
        print("🔧 Check the logs above for debugging information")

    print("=" * 60)
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)