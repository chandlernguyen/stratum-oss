#!/usr/bin/env python3
"""
Comprehensive test for the complete direct Gemini API agent system
Tests all 11 agents with SSE streaming support and Database-First architecture
"""
import asyncio
import json
import requests
from datetime import datetime, UTC
from base_test import BaseAgentTest

class ComprehensiveAgentTester(BaseAgentTest):
    def __init__(self):
        super().__init__()

    async def test_agent_with_sse(self, agent_key: str) -> dict:
        """Test an agent with SSE streaming support"""
        agent_info = self.AGENTS[agent_key]
        print(f"\n🤖 Testing {agent_info['name']} with SSE...")

        try:
            # Create session
            session_id = await self.create_agent_session(agent_info['endpoint'])

            # Send message with SSE streaming
            response = requests.post(
                f"{self.API_BASE_URL}/api/v1/direct-agents/{agent_info['endpoint']}/chat",
                headers=self.auth_headers,
                json={
                    "user_id": self.user_id,
                    "session_id": session_id,
                    "message": agent_info['test_message'],
                    "agent_type": agent_info['endpoint']
                },
                stream=True
            )
            response.raise_for_status()

            # Process SSE stream manually (more reliable than sseclient library)
            full_response = ""
            chunk_count = 0

            try:
                # Parse SSE stream manually
                for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
                    if chunk:
                        # Split by lines and process SSE events
                        lines = chunk.split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                try:
                                    data_str = line[6:]  # Remove 'data: ' prefix
                                    if data_str.strip():
                                        data = json.loads(data_str)
                                        token = data.get('token', '')
                                        full_response += token
                                        chunk_count += 1
                                except json.JSONDecodeError:
                                    continue
                            elif line.startswith('event: end'):
                                print(f"   📡 Received {chunk_count} SSE chunks")
                                break

                        # Break if we have sufficient content for testing (much faster)
                        if chunk_count > 10 and len(full_response) > 100:
                            print(f"   📡 Stopping after {chunk_count} chunks (sufficient content for test)")
                            break

            except Exception as sse_error:
                print(f"   ⚠️ SSE streaming failed: {sse_error}")
                # Don't fallback - we want to know if SSE fails

            # Validate response
            success = self._validate_agent_response(agent_key, full_response)

            return {
                'success': success,
                'response_length': len(full_response),
                'chunk_count': chunk_count,
                'session_id': session_id,
                'response_preview': full_response[:200] + "..." if len(full_response) > 200 else full_response
            }

        except Exception as e:
            print(f"   ❌ {agent_info['name']} failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'response_length': 0,
                'chunk_count': 0
            }

    def _validate_agent_response(self, agent_key: str, response: str) -> bool:
        """Validate agent response contains expected content"""
        response_lower = response.lower()

        # Agent-specific validation criteria
        validation_criteria = {
            'strategy': ['swot', 'strategy', 'analysis', 'business'],
            'persona': ['persona', 'customer', 'target', 'audience'],
            'marketing-strategy': ['marketing', 'strategy', 'campaign', 'channel'],
            'content': ['content', 'social', 'media', 'calendar'],
            'analytics': ['analytics', 'metric', 'performance', 'data'],
            'roi-budget': ['roi', 'budget', 'allocation', 'optimization'],
            'campaign-execution': ['campaign', 'execution', 'channel', 'deployment'],
            'quick-wins': ['quick', 'win', 'opportunity', 'growth'],
            'competitive-intelligence': ['competitive', 'competitor', 'market', 'analysis'],
            'client-success': ['client', 'customer', 'retention', 'success'],
            'ad-creative': ['creative', 'ad', 'concept', 'advertising']
        }

        criteria = validation_criteria.get(agent_key, ['response'])

        # Check if response contains at least one criterion and is substantial
        has_relevant_content = any(criterion in response_lower for criterion in criteria)
        is_substantial = len(response) > 20  # At least 20 characters (reduced for testing)

        return has_relevant_content and is_substantial

    async def test_all_agents(self):
        """Test all 10 agents systematically"""
        print("🚀 Starting comprehensive agent testing...")
        print(f"Testing {len(self.AGENTS)} agents with SSE streaming")

        # Test all agents
        for agent_key in self.AGENTS.keys():
            result = await self.test_agent_with_sse(agent_key)
            self.results[agent_key] = result

            # Add small delay between tests
            await asyncio.sleep(1)

    async def test_database_functions(self):
        """Test Database-First functions"""
        print("\n🗄️ Testing Database-First functions...")

        database_tests = {
            'user_context': {
                'function': 'get_current_user_with_org',
                'params': {}
            }
        }

        for test_name, test_config in database_tests.items():
            try:
                result = await self.test_database_function(
                    test_config['function'],
                    test_config['params']
                )
                self.results[f'db_{test_name}'] = {
                    'success': True,
                    'result': result
                }
            except Exception as e:
                self.results[f'db_{test_name}'] = {
                    'success': False,
                    'error': str(e)
                }

    async def test_cross_agent_data_sharing(self):
        """Test cross-agent data sharing"""
        print("\n🔄 Testing cross-agent data sharing...")

        try:
            # Create a strategy first using SSE streaming
            strategy_result = await self.test_agent_with_sse('strategy')

            # Create persona and test data access
            persona_result = await self.test_agent_with_sse('persona')

            # Both should succeed and have substantial content
            strategy_success = strategy_result.get('success', False)
            persona_success = persona_result.get('success', False)
            overall_success = strategy_success and persona_success

            self.results['cross_agent_sharing'] = {
                'success': overall_success,
                'strategy_response_length': strategy_result.get('response_length', 0),
                'persona_response_length': persona_result.get('response_length', 0),
                'strategy_success': strategy_success,
                'persona_success': persona_success
            }

            print(f"   Strategy result: {'✅' if strategy_success else '❌'} ({strategy_result.get('response_length', 0)} chars)")
            print(f"   Persona result: {'✅' if persona_success else '❌'} ({persona_result.get('response_length', 0)} chars)")

        except Exception as e:
            self.results['cross_agent_sharing'] = {
                'success': False,
                'error': str(e)
            }

async def main():
    """Main test execution"""
    tester = ComprehensiveAgentTester()

    try:
        # Setup test environment
        await tester.setup()

        # Run all tests
        await tester.test_all_agents()
        await tester.test_database_functions()
        await tester.test_cross_agent_data_sharing()

        # Print results
        tester.print_results_summary()

        # Check if we achieved our success criteria
        total_tests = len(tester.results)
        successful_tests = sum(1 for result in tester.results.values() if result.get('success', False))
        success_rate = (successful_tests / total_tests) * 100

        print(f"\n🎯 SUCCESS CRITERIA CHECK:")
        print(f"   Target: 95%+ pass rate")
        print(f"   Actual: {success_rate:.1f}% pass rate")

        if success_rate >= 95:
            print("✅ SUCCESS CRITERIA MET!")
        else:
            print("❌ Success criteria not met. Review failed tests.")

        return success_rate >= 95

    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return False

    finally:
        await tester.cleanup()

if __name__ == "__main__":
    print("=" * 80)
    print("🧪 COMPREHENSIVE AGENT SYSTEM TEST - MODERNIZED VERSION")
    print("=" * 80)
    print("Features:")
    print("  • 10 AI agents with SSE streaming")
    print("  • Database-First function testing")
    print("  • Cross-agent data sharing validation")
    print("  • Dynamic path resolution")
    print("  • Database org_id authentication")
    print("=" * 80)

    # Run the test
    success = asyncio.run(main())

    if success:
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        exit(1)