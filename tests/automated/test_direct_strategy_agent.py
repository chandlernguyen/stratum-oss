#!/usr/bin/env python
"""
Test script to validate DirectStrategyAgent POC with conversation memory
"""
import asyncio
import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv("apps/api/.env")

# Add the API modules to Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))

# Import our direct agent components
try:
    from apps.api.agents.direct_strategy_agent import DirectStrategyAgent
    from apps.api.services.session_service import create_new_session
    # Use the actual existing test user ID from database
    TEST_USER_ID = "3a81074d-8968-461f-9bbe-abd6c54172b6"
    TEST_ORG_ID = "7ff435f3-fedc-48f3-8116-9e37323bb443"
    print("✅ Successfully imported DirectStrategyAgent components")
except ImportError as e:
    print(f"❌ Failed to import components: {e}")
    exit(1)

async def test_structured_strategy_response():
    """Test structured strategy response generation"""
    print("\n🧪 Test 1: Structured Strategy Response Generation")
    
    try:
        agent = DirectStrategyAgent()
        
        # Create a new session
        session_id = await create_new_session(TEST_USER_ID, "strategy", TEST_ORG_ID)
        print(f"✅ Created session: {session_id}")
        
        # Test business problem analysis
        business_problem = """My SaaS company TechFlow Solutions has been growing steadily, but our customer acquisition cost (CAC) has increased by 40% over the last 6 months while our conversion rate dropped from 3.2% to 2.1%. We're spending $50K monthly on digital marketing across Google Ads and LinkedIn, but seeing diminishing returns. Our main competitors seem to be gaining market share in our core mid-market segment."""
        
        response = await agent.analyze_business(
            session_id=session_id,
            business_problem=business_problem,
            user_id=TEST_USER_ID
        )
        
        print(f"✅ Got response for business analysis")
        print(f"📄 Response preview: {response['content'][:200]}...")
        
        # Check if structured data is present
        if response.get('structured_data'):
            structured = response['structured_data']
            print(f"✅ Structured data received:")
            print(f"   - Key challenges: {len(structured.get('key_challenges', []))} items")
            print(f"   - Opportunities: {len(structured.get('opportunities', []))} items")
            print(f"   - Recommendations: {len(structured.get('recommendations', []))} items")
            print(f"   - Confidence score: {structured.get('confidence_score', 0)}")
            print(f"   - Suggested frameworks: {structured.get('suggested_frameworks', [])}")
            return True
        else:
            print("⚠️  No structured data in response")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def test_conversation_memory():
    """Test conversation memory across multiple interactions"""
    print("\n🧪 Test 2: Conversation Memory Validation")
    
    try:
        agent = DirectStrategyAgent()
        
        # Create a new session for memory testing
        session_id = await create_new_session(TEST_USER_ID, "strategy", TEST_ORG_ID)
        print(f"✅ Created memory test session: {session_id}")
        
        # First interaction - introduce company
        message1 = "My company is DataFlow Analytics. We provide real-time data visualization tools for e-commerce companies. Our annual revenue is $2.3M with 45 employees."
        
        response1 = await agent.analyze_business(
            session_id=session_id,
            business_problem=message1,
            user_id=TEST_USER_ID
        )
        
        print("✅ First interaction completed")
        
        # Second interaction - test memory
        message2 = "What was my company name from the previous message? And what's our current revenue?"
        
        response2 = await agent.analyze_business(
            session_id=session_id,
            business_problem=message2,
            user_id=TEST_USER_ID
        )
        
        print("✅ Second interaction completed")
        
        # Check if the agent remembered the details
        response_text = response2['content'].lower()
        if "dataflow analytics" in response_text and "2.3" in response_text:
            print("✅ Conversation memory test PASSED - Agent remembered company details")
            return True
        else:
            print(f"❌ Conversation memory test FAILED")
            print(f"Response: {response2['content'][:300]}...")
            return False
            
    except Exception as e:
        print(f"❌ Memory test failed: {e}")
        return False

async def test_framework_application():
    """Test applying business frameworks"""
    print("\n🧪 Test 3: Business Framework Application")
    
    try:
        agent = DirectStrategyAgent()
        
        # Create session for framework testing
        session_id = await create_new_session(TEST_USER_ID, "strategy", TEST_ORG_ID)
        print(f"✅ Created framework test session: {session_id}")
        
        # Apply SWOT framework
        business_context = "We're a fintech startup with a mobile payment app. We have 100K users but low transaction volume. Strong tech team but limited marketing budget."
        
        response = await agent.apply_framework(
            session_id=session_id,
            framework_type="SWOT Analysis",
            business_context=business_context,
            user_id=TEST_USER_ID
        )
        
        print("✅ SWOT framework application completed")
        
        # Check for framework-specific content
        response_text = response['content'].lower()
        if any(word in response_text for word in ['strengths', 'weaknesses', 'opportunities', 'threats', 'swot']):
            print("✅ Framework application test PASSED - SWOT elements detected")
            return True
        else:
            print("⚠️  Framework application test: Framework elements not clearly detected")
            print(f"Response preview: {response['content'][:300]}...")
            return False
            
    except Exception as e:
        print(f"❌ Framework test failed: {e}")
        return False

async def test_multiple_session_isolation():
    """Test that different sessions are properly isolated"""
    print("\n🧪 Test 4: Session Isolation")
    
    try:
        agent = DirectStrategyAgent()
        
        # Create two separate sessions
        session1 = await create_new_session(TEST_USER_ID, "strategy", TEST_ORG_ID)
        session2 = await create_new_session(TEST_USER_ID, "strategy", TEST_ORG_ID)
        
        # Different companies in each session
        company1_info = "My company is RedCorp and we sell red widgets."
        company2_info = "My company is BlueTech and we develop blue software."
        
        # Send info to each session
        await agent.analyze_business(session1, company1_info, TEST_USER_ID)
        await agent.analyze_business(session2, company2_info, TEST_USER_ID)
        
        # Now ask about company in session 1 - should only know RedCorp
        response1 = await agent.analyze_business(
            session1, 
            "What is my company name and what do we do?", 
            TEST_USER_ID
        )
        
        response1_text = response1['content'].lower()
        if "redcorp" in response1_text and "bluetech" not in response1_text:
            print("✅ Session isolation test PASSED - Sessions properly isolated")
            return True
        else:
            print("❌ Session isolation test FAILED - Sessions may be leaking data")
            print(f"Session 1 response: {response1['content'][:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Session isolation test failed: {e}")
        return False

async def main():
    """Run all POC validation tests"""
    print("🚀 DirectStrategyAgent POC Validation")
    print("="*60)
    
    # Check prerequisites
    print("📋 Checking prerequisites...")
    
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ GOOGLE_API_KEY not found. Please set it in apps/api/.env")
        return
    
    try:
        from apps.api.utils.database import get_supabase_client
        client = get_supabase_client()
        print("✅ Database connection available")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return
    
    # Run all tests
    results = []
    
    results.append(await test_structured_strategy_response())
    results.append(await test_conversation_memory())  
    results.append(await test_framework_application())
    results.append(await test_multiple_session_isolation())
    
    # Results summary
    print("\n" + "="*60)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print("\n🎉 DirectStrategyAgent POC is ready for production!")
        print("\n📈 Key achievements:")
        print("   • Structured output with Pydantic validation")
        print("   • Full conversation memory across interactions")
        print("   • Business framework application capabilities")
        print("   • Proper session isolation")
        print("   • Type-safe responses with confidence scoring")
    else:
        print(f"⚠️  {passed}/{total} tests passed")
        print("\n🔧 Some tests failed. Please check the errors above.")
    
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())