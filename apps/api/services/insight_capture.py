"""
Insight Capture Service
Automatically captures insights from AI agent interactions
"""

from typing import Dict, Any, Optional, List
from uuid import UUID
import logging
from datetime import datetime, timezone

from apps.api.utils.database import get_supabase_client
from apps.api.services.pii_detection import get_pii_detection_service

logger = logging.getLogger(__name__)

class InsightCaptureService:
    """Service for capturing AI-generated insights"""
    
    @staticmethod
    async def capture_from_strategy_framework(
        framework_type: str,
        framework_data: Dict[str, Any],
        business_context: str,
        org_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Capture insights from strategy framework analysis
        
        Args:
            framework_type: Type of framework (swot, porters, bcg, etc.)
            framework_data: The actual framework data/results
            business_context: The business context used for analysis
            org_id: Organization ID
            user_id: Optional user ID
            session_id: Optional session ID
            campaign_id: Optional campaign ID
            
        Returns:
            Insight ID if successful, None otherwise
        """
        try:
            supabase = get_supabase_client()
            pii_service = get_pii_detection_service()
            
            # Map framework types to human-readable titles
            framework_titles = {
                'swot': 'SWOT Analysis',
                'porters': "Porter's Five Forces Analysis",
                'bcg': 'BCG Matrix Analysis',
                'vrio': 'VRIO Framework Analysis',
                'business_model': 'Business Model Canvas',
                'ice': 'ICE Prioritization',
                'three_horizons': 'Three Horizons of Growth',
                'blue_ocean': 'Blue Ocean Strategy',
                'mckinsey_7s': 'McKinsey 7S Framework',
                'okr': 'OKR Framework',
                'jtbd': 'Jobs to Be Done Analysis'
            }
            
            title = f"{framework_titles.get(framework_type, 'Strategic Analysis')} Insights"
            
            # Create insight content
            content = {
                'framework_type': framework_type,
                'business_context': business_context,
                'analysis_results': framework_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Extract key learnings based on framework type
            key_learnings = await _extract_key_learnings(framework_type, framework_data)
            if key_learnings:
                content['key_learnings'] = key_learnings
            
            # Check for PII in the content
            content_str = str(content)
            pii_result = await pii_service.detect_pii(
                content_str, 
                context={'source': 'strategy_framework', 'framework': framework_type}
            )
            
            # Prepare masked content if PII detected
            masked_content = None
            if pii_result.contains_pii:
                masked_content = {
                    **content,
                    '_masked': True,
                    '_pii_types': pii_result.pii_types
                }
            
            # Calculate confidence score based on framework completeness
            confidence_score = _calculate_framework_confidence(framework_type, framework_data)
            
            # Create insight record
            insight_data = {
                'org_id': org_id,
                'user_id': user_id,
                'insight_type': 'learning',
                'source_type': 'agent_conversation',
                'source_agent': 'strategy',
                'session_id': session_id,
                'campaign_id': campaign_id,
                'title': title,
                'content': content,
                'category': ['strategy', framework_type],
                'confidence_score': confidence_score,
                'contains_pii': pii_result.contains_pii,
                'pii_types': pii_result.pii_types if pii_result.contains_pii else None,
                'pii_confidence': pii_result.confidence if pii_result.contains_pii else None,
                'pii_masked_content': masked_content,
                'impact_score': 75  # Strategy insights are generally high impact
            }
            
            # Insert into database
            result = supabase.table('ai_insights').insert(insight_data).execute()
            
            if result.data:
                insight_id = result.data[0]['id']
                logger.info(f"Captured insight {insight_id} from {framework_type} analysis")
                return insight_id
            
        except Exception as e:
            logger.error(f"Failed to capture insight from {framework_type}: {e}")
        
        return None
    
    @staticmethod
    async def capture_recommendation(
        title: str,
        recommendation: str,
        context: Dict[str, Any],
        org_id: str,
        confidence: float = 0.7,
        user_id: Optional[str] = None,
        source_agent: str = 'strategy'
    ) -> Optional[str]:
        """
        Capture a specific recommendation
        
        Args:
            title: Title of the recommendation
            recommendation: The actual recommendation text
            context: Additional context
            org_id: Organization ID
            confidence: Confidence score (0-1)
            user_id: Optional user ID
            source_agent: Which agent generated this
            
        Returns:
            Insight ID if successful
        """
        try:
            supabase = get_supabase_client()
            pii_service = get_pii_detection_service()
            
            content = {
                'recommendation': recommendation,
                'context': context,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # PII detection
            pii_result = await pii_service.detect_pii(
                recommendation,
                context={'source': 'recommendation', 'agent': source_agent}
            )
            
            insight_data = {
                'org_id': org_id,
                'user_id': user_id,
                'insight_type': 'recommendation',
                'source_type': 'agent_conversation',
                'source_agent': source_agent,
                'title': title,
                'content': content,
                'category': ['recommendation', source_agent],
                'confidence_score': confidence,
                'contains_pii': pii_result.contains_pii,
                'pii_types': pii_result.pii_types if pii_result.contains_pii else None,
                'impact_score': 60
            }
            
            result = supabase.table('ai_insights').insert(insight_data).execute()
            
            if result.data:
                return result.data[0]['id']
                
        except Exception as e:
            logger.error(f"Failed to capture recommendation: {e}")
        
        return None


async def _extract_key_learnings(framework_type: str, framework_data: Dict[str, Any]) -> List[str]:
    """Extract key learnings from framework data"""
    learnings = []
    
    try:
        if framework_type == 'swot':
            # Extract top strengths and critical weaknesses
            if 'strengths' in framework_data and framework_data['strengths']:
                learnings.append(f"Key strength: {framework_data['strengths'][0]}")
            if 'weaknesses' in framework_data and framework_data['weaknesses']:
                learnings.append(f"Critical weakness: {framework_data['weaknesses'][0]}")
            if 'opportunities' in framework_data and framework_data['opportunities']:
                learnings.append(f"Major opportunity: {framework_data['opportunities'][0]}")
                
        elif framework_type == 'bcg':
            # Identify stars and cash cows
            if 'items' in framework_data:
                stars = [item for item in framework_data['items'] if item.get('category') == 'star']
                if stars:
                    learnings.append(f"Star product/service: {stars[0].get('name', 'Unknown')}")
                    
        elif framework_type == 'vrio':
            # Find sustainable competitive advantages
            if 'resources' in framework_data:
                advantages = [r for r in framework_data['resources'] 
                            if r.get('valuable') and r.get('rare') and not r.get('imitable')]
                if advantages:
                    learnings.append(f"Competitive advantage: {advantages[0].get('name', 'Unknown')}")
                    
    except Exception as e:
        logger.debug(f"Could not extract learnings from {framework_type}: {e}")
    
    return learnings


def _calculate_framework_confidence(framework_type: str, framework_data: Dict[str, Any]) -> float:
    """Calculate confidence score based on framework completeness"""
    try:
        # Base confidence
        confidence = 0.7
        
        # Check for completeness
        if framework_type == 'swot':
            fields = ['strengths', 'weaknesses', 'opportunities', 'threats']
            filled = sum(1 for f in fields if framework_data.get(f))
            confidence = 0.5 + (filled / len(fields)) * 0.5
            
        elif framework_type == 'business_model':
            # Business Model Canvas has 9 blocks
            fields = ['key_partners', 'key_activities', 'key_resources', 
                     'value_propositions', 'customer_relationships', 'channels',
                     'customer_segments', 'cost_structure', 'revenue_streams']
            filled = sum(1 for f in fields if framework_data.get(f))
            confidence = 0.4 + (filled / len(fields)) * 0.6
            
        # Cap at 0.95 for automated analysis
        return min(confidence, 0.95)
        
    except Exception:
        return 0.7  # Default confidence


# Singleton instance
_insight_service: Optional[InsightCaptureService] = None

def get_insight_capture_service() -> InsightCaptureService:
    """Get or create the insight capture service singleton"""
    global _insight_service
    if _insight_service is None:
        _insight_service = InsightCaptureService()
    return _insight_service