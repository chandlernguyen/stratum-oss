"""
Cache metrics endpoint for monitoring Gemini context caching performance.
Provides real-time visibility into cache usage, hit rates, and cost savings.
"""
from fastapi import APIRouter, Depends, HTTPException
from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.services.gemini_cache_manager import GeminiCacheManager
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cache", tags=["cache"])


@router.get("/stats")
async def get_cache_stats(current_user=Depends(get_current_user_with_org)):
    """
    Get context caching statistics for monitoring and optimization.

    DEPRECATED: Use Database-First useCostMetrics hook instead.
    This endpoint maintained for backward compatibility but will be removed in future versions.

    Returns:
        - enabled: Whether caching is enabled
        - active_caches: Number of active caches (live from cache manager)
        - estimated_monthly_savings: Based on actual usage data from database
    """
    try:
        from apps.api.utils.database import get_supabase_client

        # Check if caching is enabled
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {
                "enabled": False,
                "error": "API key not configured",
                "active_caches": 0,
                "estimated_monthly_savings_usd": 0,
                "deprecation_notice": "Use Database-First useCostMetrics hook for detailed metrics"
            }

        # Get live cache manager stats
        cache_manager = GeminiCacheManager(api_key=api_key)
        stats = cache_manager.get_cache_stats()

        # Get estimated monthly savings from database (actual usage data)
        org_id = current_user.get("app_metadata", {}).get("org_id")
        if not org_id:
            # Fallback to database lookup
            supabase = get_supabase_client()
            user_id = current_user.get("sub")
            user_data = supabase.table("users").select("org_id").eq("id", user_id).single().execute()
            org_id = user_data.data.get("org_id") if user_data.data else None

        estimated_monthly_savings = 0
        if org_id:
            supabase = get_supabase_client()
            result = supabase.rpc('get_estimated_monthly_savings', {'p_org_id': org_id}).execute()
            if result.data:
                estimated_monthly_savings = result.data.get('estimated_monthly_savings_usd', 0)

        return {
            "enabled": stats['enabled'],
            "active_caches": stats['active_caches'],
            "estimated_monthly_savings_usd": round(estimated_monthly_savings, 2),
            "deprecation_notice": "Use Database-First useCostMetrics hook for detailed metrics",
            "migration_guide": "import { useCostMetrics } from '@/hooks/useCostMetrics'"
        }

    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def cache_health_check(current_user=Depends(get_current_user_with_org)):
    """
    Health check endpoint to verify caching is working correctly.

    Returns:
        - status: 'healthy' or 'degraded'
        - issues: List of any detected issues
        - recommendations: Suggested fixes
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {
                "status": "degraded",
                "issues": ["API key not configured"],
                "recommendations": ["Set GOOGLE_API_KEY environment variable"]
            }

        cache_manager = GeminiCacheManager(api_key=api_key)
        stats = cache_manager.get_cache_stats()

        issues = []
        recommendations = []

        if not stats['enabled']:
            issues.append("Caching is not enabled")
            recommendations.append("Check API key and cache manager initialization")

        if stats['active_caches'] == 0:
            issues.append("No active caches found")
            recommendations.append("Ensure agents are creating caches on initialization")

        status = "healthy" if len(issues) == 0 else "degraded"

        return {
            "status": status,
            "issues": issues,
            "recommendations": recommendations,
            "cache_info": {
                "enabled": stats['enabled'],
                "active_caches": stats['active_caches']
            }
        }

    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return {
            "status": "error",
            "issues": [str(e)],
            "recommendations": ["Check server logs for details"]
        }
