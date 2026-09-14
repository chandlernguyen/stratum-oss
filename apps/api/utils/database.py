"""Database utility functions for agent database operations."""

import os
import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Any, Optional
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Request
from threading import Lock

# Load environment variables
load_dotenv()

# Database connection configuration
DB_URL = os.getenv("SUPABASE_DB_URL", "postgresql://postgres:postgres@127.0.0.1:56322/postgres")

# Supabase client configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:56321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU")

# Singleton pattern for Supabase client (thread-safe). Building a client per
# call created 40+ HTTP connection pools and saturated the database.
_supabase_client: Optional[Client] = None
_client_lock = Lock()

def get_supabase_client() -> Client:
    """Get singleton Supabase client instance (thread-safe).

    This implements the singleton pattern to reuse a single Supabase client
    across all requests, preventing connection pool saturation.

    Previously, each call created a new client with its own connection pool,
    leading to MaxClientsInSessionMode errors with 40+ call sites.

    Returns:
        Client: The singleton Supabase client instance with service role key
    """
    global _supabase_client

    with _client_lock:
        if _supabase_client is None:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    return _supabase_client

def get_service_role_client() -> Client:
    """Get Supabase client with service role key for admin operations.

    This is an alias for get_supabase_client() since our singleton already
    uses the service role key. Provided for semantic clarity when using
    admin APIs like auth.admin.create_user().

    Returns:
        Client: Supabase client with service role privileges
    """
    return get_supabase_client()


def get_authenticated_supabase_client(access_token: str) -> Client:
    """Get a Supabase client instance with user's access token for RLS."""
    # Create client and set the auth header
    from httpx import Headers
    
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    # Update the postgrest client's headers
    client.postgrest.headers.update({"Authorization": f"Bearer {access_token}"})
    # Update the auth client's headers  
    client.auth.headers.update({"Authorization": f"Bearer {access_token}"})
    return client

# Test UUIDs for development (in production, these would come from JWT tokens)
TEST_USER_ID = "12345678-90ab-cdef-1234-567890abcdef"
TEST_ORG_ID = "01234567-89ab-cdef-0123-456789abcdef"

def get_db_connection():
    """Get a database connection."""
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def execute_query(query: str, params: tuple = None) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return results."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                results = [dict(row) for row in cursor.fetchall()]
                return results if results else []
    except Exception as e:
        print(f"Database query error: {e}")
        return []

def execute_insert(query: str, params: tuple = None) -> Dict[str, Any]:
    """Execute an INSERT/UPDATE query and return the result."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                
                # Try to fetch the inserted/updated record if RETURNING clause is used
                try:
                    result = cursor.fetchone()
                    if result:
                        return {"status": "success", "data": dict(result)}
                except:
                    pass
                    
                return {"status": "success", "message": "Operation completed successfully"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

# Campaign-related functions
def create_marketing_campaign(user_id: str, org_id: str, campaign_name: str, campaign_type: str, budget: float = None) -> Dict[str, Any]:
    """Create a new marketing campaign."""
    query = """
        INSERT INTO campaigns (user_id, org_id, campaign_name, campaign_type, budget_allocated)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """
    return execute_insert(query, (user_id, org_id, campaign_name, campaign_type, budget))

def get_user_campaigns(user_id: str, org_id: str) -> List[Dict[str, Any]]:
    """Get all campaigns for a user's organization."""
    query = """
        SELECT * FROM campaigns 
        WHERE org_id = %s 
        ORDER BY created_at DESC
    """
    return execute_query(query, (org_id,))

# Strategy session functions
def save_strategy_session(
    user_id: str, 
    org_id: str, 
    session_name: str, 
    business_problem: str,
    summary: str, 
    key_insights: Dict[str, Any] = None,
    frameworks_used: List[str] = None,
    business_context: Dict[str, Any] = None,
    recommended_channels: List[str] = None,
    target_metrics: Dict[str, Any] = None,
    campaign_id: str = None
) -> Dict[str, Any]:
    """Save a strategy session to the database."""
    query = """
        INSERT INTO strategy_sessions 
        (user_id, org_id, campaign_id, session_name, business_problem, summary, 
         key_insights, frameworks_used, business_context, recommended_channels, target_metrics)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    
    # Convert to JSON strings for JSONB fields
    key_insights_json = json.dumps(key_insights) if key_insights else None
    business_context_json = json.dumps(business_context) if business_context else None
    target_metrics_json = json.dumps(target_metrics) if target_metrics else None
    
    return execute_insert(query, (
        user_id, org_id, campaign_id, session_name, business_problem, summary,
        key_insights_json, frameworks_used, business_context_json, 
        recommended_channels, target_metrics_json
    ))

def get_strategy_sessions(user_id: str, org_id: str) -> List[Dict[str, Any]]:
    """Get all strategy sessions for a user's organization."""
    query = """
        SELECT s.*, mc.campaign_name
        FROM strategy_sessions s
        LEFT JOIN campaigns mc ON s.campaign_id = mc.id
        WHERE s.org_id = %s 
        ORDER BY s.created_at DESC
    """
    return execute_query(query, (org_id,))

def get_strategy_session(session_id: str) -> Dict[str, Any]:
    """Get a specific strategy session by ID."""
    query = """
        SELECT s.*, mc.campaign_name
        FROM strategy_sessions s
        LEFT JOIN campaigns mc ON s.campaign_id = mc.id
        WHERE s.id = %s
    """
    results = execute_query(query, (session_id,))
    return results[0] if results else {"error": "Strategy session not found", "status": "failed"}

def link_strategy_to_campaign(strategy_session_id: str, campaign_id: str) -> Dict[str, Any]:
    """Link a strategy session to a marketing campaign."""
    query = """
        UPDATE strategy_sessions 
        SET campaign_id = %s, updated_at = now()
        WHERE id = %s
        RETURNING *
    """
    return execute_insert(query, (campaign_id, strategy_session_id))

# Persona-related functions
def create_customer_persona(
    user_id: str,
    org_id: str,
    persona_name: str,
    demographic_data: Dict[str, Any] = None,
    psychographic_data: Dict[str, Any] = None,
    behavioral_data: Dict[str, Any] = None,
    pain_points: List[str] = None,
    goals: List[str] = None,
    preferred_channels: List[str] = None,
    messaging_preferences: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create a new customer persona."""
    query = """
        INSERT INTO persona_outputs 
        (user_id, org_id, persona_name, demographic_data, psychographic_data, 
         behavioral_data, pain_points, goals, preferred_channels, messaging_preferences)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    
    # Convert to JSON strings for JSONB fields
    demographic_json = json.dumps(demographic_data) if demographic_data else None
    psychographic_json = json.dumps(psychographic_data) if psychographic_data else None
    behavioral_json = json.dumps(behavioral_data) if behavioral_data else None
    messaging_json = json.dumps(messaging_preferences) if messaging_preferences else None
    
    return execute_insert(query, (
        user_id, org_id, persona_name, demographic_json, psychographic_json,
        behavioral_json, pain_points, goals, preferred_channels, messaging_json
    ))

def get_persona_outputs(user_id: str, org_id: str) -> List[Dict[str, Any]]:
    """Get all customer personas for a user's organization."""
    query = """
        SELECT * FROM persona_outputs 
        WHERE org_id = %s 
        ORDER BY created_at DESC
    """
    return execute_query(query, (org_id,))

def link_persona_to_strategy(persona_id: str, strategy_session_id: str, relevance_score: float = None) -> Dict[str, Any]:
    """Link a persona to a strategy session."""
    query = """
        INSERT INTO persona_strategy_mappings (persona_id, strategy_session_id, relevance_score)
        VALUES (%s, %s, %s)
        ON CONFLICT (persona_id, strategy_session_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score
        RETURNING *
    """
    return execute_insert(query, (persona_id, strategy_session_id, relevance_score))

def get_personas_for_strategy(strategy_session_id: str) -> List[Dict[str, Any]]:
    """Get all personas linked to a strategy session."""
    query = """
        SELECT p.*, psm.relevance_score
        FROM persona_outputs p
        JOIN persona_strategy_mappings psm ON p.id = psm.persona_id
        WHERE psm.strategy_session_id = %s
        ORDER BY psm.relevance_score DESC NULLS LAST
    """
    return execute_query(query, (strategy_session_id,))

def get_strategies_for_persona(persona_id: str) -> List[Dict[str, Any]]:
    """Get all strategy sessions linked to a persona."""
    query = """
        SELECT s.*, psm.relevance_score, mc.campaign_name
        FROM strategy_sessions s
        JOIN persona_strategy_mappings psm ON s.id = psm.strategy_session_id
        LEFT JOIN campaigns mc ON s.campaign_id = mc.id
        WHERE psm.persona_id = %s
        ORDER BY psm.relevance_score DESC NULLS LAST
    """
    return execute_query(query, (persona_id,))

# Phase 3: Channel Management Functions
def create_marketing_channel(
    user_id: str,
    org_id: str,
    channel_name: str,
    channel_type: str,
    platform_config: Dict[str, Any] = None,
    is_active: bool = True
) -> Dict[str, Any]:
    """Create a new marketing channel."""
    query = """
        INSERT INTO marketing_channels (user_id, org_id, channel_name, channel_type, platform_config, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    platform_config_json = json.dumps(platform_config) if platform_config else None
    return execute_insert(query, (user_id, org_id, channel_name, channel_type, platform_config_json, is_active))

def get_marketing_channels(user_id: str, org_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
    """Get all marketing channels for a user's organization."""
    if active_only:
        query = """
            SELECT * FROM marketing_channels 
            WHERE org_id = %s AND is_active = true
            ORDER BY channel_name
        """
        return execute_query(query, (org_id,))
    else:
        query = """
            SELECT * FROM marketing_channels 
            WHERE org_id = %s 
            ORDER BY channel_name
        """
        return execute_query(query, (org_id,))

def create_campaign_deployment(
    campaign_id: str,
    channel_id: str,
    content_piece_id: str = None,
    deployment_config: Dict[str, Any] = None,
    go_live_date: str = None,
    budget_allocation: float = None
) -> Dict[str, Any]:
    """Create a new campaign deployment."""
    query = """
        INSERT INTO campaign_deployments 
        (campaign_id, channel_id, content_piece_id, deployment_config, go_live_date, budget_allocation)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    deployment_config_json = json.dumps(deployment_config) if deployment_config else None
    return execute_insert(query, (campaign_id, channel_id, content_piece_id, deployment_config_json, go_live_date, budget_allocation))

def get_campaign_deployments(campaign_id: str) -> List[Dict[str, Any]]:
    """Get all deployments for a specific campaign."""
    query = """
        SELECT cd.*, mc.channel_name, mc.channel_type, cp.title as content_title
        FROM campaign_deployments cd
        JOIN marketing_channels mc ON cd.channel_id = mc.id
        LEFT JOIN content_outputs cp ON cd.content_piece_id = cp.id
        WHERE cd.campaign_id = %s
        ORDER BY cd.created_at DESC
    """
    return execute_query(query, (campaign_id,))

def update_deployment_status(deployment_id: str, status: str) -> Dict[str, Any]:
    """Update the status of a campaign deployment."""
    query = """
        UPDATE campaign_deployments 
        SET status = %s, updated_at = now()
        WHERE id = %s
        RETURNING *
    """
    return execute_insert(query, (status, deployment_id))

# Phase 4: Performance & Analytics Functions
def record_campaign_metrics(
    campaign_id: str,
    deployment_id: str = None,
    metric_date: str = None,
    impressions: int = 0,
    clicks: int = 0,
    conversions: int = 0,
    cost_per_click: float = None,
    cost_per_conversion: float = None,
    return_on_ad_spend: float = None,
    engagement_rate: float = None,
    custom_metrics: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Record campaign performance metrics."""
    query = """
        INSERT INTO campaign_metrics 
        (campaign_id, deployment_id, metric_date, impressions, clicks, conversions,
         cost_per_click, cost_per_conversion, return_on_ad_spend, engagement_rate, custom_metrics)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    custom_metrics_json = json.dumps(custom_metrics) if custom_metrics else None
    # Use current date if not provided
    if not metric_date:
        from datetime import date
        metric_date = date.today().isoformat()
    
    return execute_insert(query, (
        campaign_id, deployment_id, metric_date, impressions, clicks, conversions,
        cost_per_click, cost_per_conversion, return_on_ad_spend, engagement_rate, custom_metrics_json
    ))

def get_campaign_performance(campaign_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Get campaign performance metrics for the last N days."""
    query = """
        SELECT cm.*, cd.channel_id, mc.channel_name
        FROM campaign_metrics cm
        LEFT JOIN campaign_deployments cd ON cm.deployment_id = cd.id
        LEFT JOIN marketing_channels mc ON cd.channel_id = mc.id
        WHERE cm.campaign_id = %s 
        AND cm.metric_date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY cm.metric_date DESC, mc.channel_name
    """
    return execute_query(query, (campaign_id, days))

def get_top_performing_content(campaign_id: str, metric: str = 'conversions') -> List[Dict[str, Any]]:
    """Get top performing content pieces for a campaign."""
    # Validate metric parameter
    valid_metrics = ['impressions', 'clicks', 'conversions', 'engagement_rate', 'return_on_ad_spend']
    if metric not in valid_metrics:
        metric = 'conversions'
    
    query = f"""
        SELECT 
            cp.id, cp.title, cp.content_type,
            SUM(cm.impressions) as total_impressions,
            SUM(cm.clicks) as total_clicks,
            SUM(cm.conversions) as total_conversions,
            AVG(cm.engagement_rate) as avg_engagement_rate,
            AVG(cm.return_on_ad_spend) as avg_roas
        FROM content_outputs cp
        JOIN campaign_deployments cd ON cp.id = cd.content_piece_id
        JOIN campaign_metrics cm ON cd.id = cm.deployment_id
        WHERE cd.campaign_id = %s
        GROUP BY cp.id, cp.title, cp.content_type
        ORDER BY {metric} DESC
        LIMIT 10
    """
    return execute_query(query, (campaign_id,))

def create_ab_test(
    campaign_id: str,
    test_name: str,
    variant_a_id: str,
    variant_b_id: str,
    test_results: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create a new A/B test record."""
    query = """
        INSERT INTO ab_test_results (campaign_id, test_name, variant_a_id, variant_b_id, test_results)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """
    test_results_json = json.dumps(test_results) if test_results else None
    return execute_insert(query, (campaign_id, test_name, variant_a_id, variant_b_id, test_results_json))

def complete_ab_test(
    test_id: str,
    winner_variant: str,
    confidence_level: float,
    test_results: Dict[str, Any]
) -> Dict[str, Any]:
    """Complete an A/B test with results."""
    query = """
        UPDATE ab_test_results 
        SET winner_variant = %s, confidence_level = %s, test_results = %s, test_end_date = now()
        WHERE id = %s
        RETURNING *
    """
    test_results_json = json.dumps(test_results)
    return execute_insert(query, (winner_variant, confidence_level, test_results_json, test_id))

def get_campaign_ab_tests(campaign_id: str) -> List[Dict[str, Any]]:
    """Get all A/B tests for a campaign."""
    query = """
        SELECT 
            abt.*,
            cpa.title as variant_a_title,
            cpb.title as variant_b_title
        FROM ab_test_results abt
        LEFT JOIN content_outputs cpa ON abt.variant_a_id = cpa.id
        LEFT JOIN content_outputs cpb ON abt.variant_b_id = cpb.id
        WHERE abt.campaign_id = %s
        ORDER BY abt.created_at DESC
    """
    return execute_query(query, (campaign_id,))

def get_performance_summary(campaign_id: str) -> Dict[str, Any]:
    """Get a comprehensive performance summary for a campaign."""
    # Get overall metrics
    metrics_query = """
        SELECT 
            SUM(impressions) as total_impressions,
            SUM(clicks) as total_clicks,
            SUM(conversions) as total_conversions,
            AVG(cost_per_click) as avg_cpc,
            AVG(cost_per_conversion) as avg_cpc_conversion,
            AVG(return_on_ad_spend) as avg_roas,
            AVG(engagement_rate) as avg_engagement_rate
        FROM campaign_metrics
        WHERE campaign_id = %s
    """
    metrics_results = execute_query(metrics_query, (campaign_id,))
    
    # Get channel breakdown
    channel_query = """
        SELECT 
            mc.channel_name,
            mc.channel_type,
            SUM(cm.impressions) as impressions,
            SUM(cm.clicks) as clicks,
            SUM(cm.conversions) as conversions
        FROM campaign_metrics cm
        JOIN campaign_deployments cd ON cm.deployment_id = cd.id
        JOIN marketing_channels mc ON cd.channel_id = mc.id
        WHERE cm.campaign_id = %s
        GROUP BY mc.id, mc.channel_name, mc.channel_type
        ORDER BY conversions DESC
    """
    channel_results = execute_query(channel_query, (campaign_id,))
    
    return {
        "status": "success",
        "overall_metrics": metrics_results[0] if metrics_results else {},
        "channel_breakdown": channel_results
    }

# =============================================================================
# RAG DOCUMENT MANAGEMENT FUNCTIONS
# =============================================================================

def create_rag_document(
    user_id: str,
    org_id: str,
    filename: str,
    file_type: str,
    gcs_uri: str,
    file_size_bytes: int = None,
    mime_type: str = None,
    document_type: str = None,
    title: str = None,
    description: str = None,
    tags: List[str] = None,
    visibility: str = "organization",
    campaign_id: str = None,
    persona_id: str = None,
    strategy_session_id: str = None
) -> Dict[str, Any]:
    """Create a new RAG document record."""
    query = """
        INSERT INTO rag_documents (
            org_id, user_id, filename, file_type, gcs_uri, file_size_bytes,
            mime_type, document_type, title, description, tags, visibility,
            campaign_id, persona_id, strategy_session_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING *
    """
    
    params = (
        org_id, user_id, filename, file_type, gcs_uri, file_size_bytes,
        mime_type, document_type, title, description, tags, visibility,
        campaign_id, persona_id, strategy_session_id
    )
    
    return execute_insert(query, params)

def get_rag_documents(
    user_id: str,
    org_id: str,
    document_type: str = None,
    campaign_id: str = None,
    persona_id: str = None,
    visibility: str = None,
    processing_status: str = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get RAG documents with optional filtering."""
    where_conditions = ["org_id = %s"]
    params = [org_id]
    
    if document_type:
        where_conditions.append("document_type = %s")
        params.append(document_type)
    
    if campaign_id:
        where_conditions.append("campaign_id = %s")
        params.append(campaign_id)
    
    if persona_id:
        where_conditions.append("persona_id = %s")
        params.append(persona_id)
    
    if visibility:
        where_conditions.append("visibility = %s")
        params.append(visibility)
    
    if processing_status:
        where_conditions.append("processing_status = %s")
        params.append(processing_status)
    
    query = f"""
        SELECT 
            rd.*,
            mc.campaign_name,
            cp.persona_name,
            ss.session_name as strategy_session_name
        FROM rag_documents rd
        LEFT JOIN campaigns mc ON rd.campaign_id = mc.id
        LEFT JOIN persona_outputs cp ON rd.persona_id = cp.id
        LEFT JOIN strategy_sessions ss ON rd.strategy_session_id = ss.id
        WHERE {' AND '.join(where_conditions)}
        ORDER BY rd.created_at DESC
        LIMIT %s
    """
    
    params.append(limit)
    return execute_query(query, tuple(params))

def update_rag_document_processing_status(
    document_id: str,
    processing_status: str,
    vertex_document_id: str = None,
    processing_error: str = None
) -> Dict[str, Any]:
    """Update the processing status of a RAG document."""
    if processing_status == "indexed":
        query = """
            UPDATE rag_documents 
            SET processing_status = %s, vertex_document_id = %s, indexed_at = now()
            WHERE id = %s
            RETURNING *
        """
        params = (processing_status, vertex_document_id, document_id)
    else:
        query = """
            UPDATE rag_documents 
            SET processing_status = %s, processing_error = %s
            WHERE id = %s
            RETURNING *
        """
        params = (processing_status, processing_error, document_id)
    
    return execute_insert(query, params)

def delete_rag_document(document_id: str, user_id: str) -> Dict[str, Any]:
    """Delete a RAG document (soft delete by updating status)."""
    query = """
        UPDATE rag_documents 
        SET processing_status = 'deleted'
        WHERE id = %s AND user_id = %s
        RETURNING *
    """
    return execute_insert(query, (document_id, user_id))

def get_rag_document_by_id(document_id: str, org_id: str) -> Dict[str, Any]:
    """Get a specific RAG document by ID."""
    query = """
        SELECT 
            rd.*,
            mc.campaign_name,
            cp.persona_name,
            ss.session_name as strategy_session_name
        FROM rag_documents rd
        LEFT JOIN campaigns mc ON rd.campaign_id = mc.id
        LEFT JOIN persona_outputs cp ON rd.persona_id = cp.id
        LEFT JOIN strategy_sessions ss ON rd.strategy_session_id = ss.id
        WHERE rd.id = %s AND rd.org_id = %s
    """
    results = execute_query(query, (document_id, org_id))
    return results[0] if results else {}

def record_search_history(
    user_id: str,
    org_id: str,
    query: str,
    filters: Dict[str, Any] = None,
    results_count: int = 0,
    response_time_ms: int = None
) -> Dict[str, Any]:
    """Record a search query for analytics."""
    db_query = """
        INSERT INTO rag_search_history (
            org_id, user_id, query, filters, results_count, response_time_ms
        ) VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    
    filters_json = json.dumps(filters) if filters else None
    params = (org_id, user_id, query, filters_json, results_count, response_time_ms)
    
    return execute_insert(db_query, params)

def get_search_analytics(
    org_id: str,
    days: int = 30,
    limit: int = 100
) -> Dict[str, Any]:
    """Get search analytics for the organization."""
    # Popular queries
    popular_queries = execute_query("""
        SELECT 
            query,
            COUNT(*) as search_count,
            AVG(results_count) as avg_results,
            AVG(response_time_ms) as avg_response_time
        FROM rag_search_history 
        WHERE org_id = %s 
        AND created_at >= now() - interval '%s days'
        GROUP BY query
        ORDER BY search_count DESC
        LIMIT %s
    """, (org_id, days, limit))
    
    # Search trends
    search_trends = execute_query("""
        SELECT 
            DATE(created_at) as search_date,
            COUNT(*) as searches_count,
            COUNT(DISTINCT user_id) as unique_users
        FROM rag_search_history 
        WHERE org_id = %s 
        AND created_at >= now() - interval '%s days'
        GROUP BY DATE(created_at)
        ORDER BY search_date DESC
    """, (org_id, days))
    
    # Document type distribution
    document_filters = execute_query("""
        SELECT 
            filters->>'document_type' as document_type,
            COUNT(*) as filter_count
        FROM rag_search_history 
        WHERE org_id = %s 
        AND created_at >= now() - interval '%s days'
        AND filters->>'document_type' IS NOT NULL
        GROUP BY filters->>'document_type'
        ORDER BY filter_count DESC
    """, (org_id, days))
    
    return {
        "status": "success",
        "popular_queries": popular_queries,
        "search_trends": search_trends,
        "document_type_distribution": document_filters,
        "period_days": days
    }

def get_document_stats(org_id: str) -> Dict[str, Any]:
    """Get document statistics for the organization."""
    stats = execute_query("""
        SELECT 
            COUNT(*) as total_documents,
            COUNT(CASE WHEN processing_status = 'indexed' THEN 1 END) as indexed_documents,
            COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_documents,
            COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_documents,
            COUNT(CASE WHEN document_type = 'strategy' THEN 1 END) as strategy_documents,
            COUNT(CASE WHEN document_type = 'persona' THEN 1 END) as persona_documents,
            COUNT(CASE WHEN document_type = 'content' THEN 1 END) as content_documents,
            COUNT(CASE WHEN document_type = 'research' THEN 1 END) as research_documents,
            SUM(file_size_bytes) as total_storage_bytes,
            COUNT(DISTINCT user_id) as contributing_users
        FROM rag_documents 
        WHERE org_id = %s AND processing_status != 'deleted'
    """, (org_id,))
    
    return {
        "status": "success",
        "stats": stats[0] if stats else {}
    }