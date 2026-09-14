/**
 * Types for the Progressive Learning System
 */

export type InsightType = 'learning' | 'recommendation' | 'observation' | 'pattern' | 'validation';
export type SourceType = 'agent_conversation' | 'user_activity' | 'data_analysis' | 'user_input';
export type ValidationStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface AIInsight {
  id: string;
  org_id: string;
  user_id?: string;
  insight_type: InsightType;
  source_type: SourceType;
  source_agent?: string;
  session_id?: string;
  campaign_id?: string;
  title: string;
  content: Record<string, any>;
  category: string[];
  contains_pii: boolean;
  pii_types?: string[];
  confidence_score: number;
  validation_status: ValidationStatus;
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
  impact_score: number;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InsightStats {
  total_insights: number;
  pending_review: number;
  approved: number;
  auto_approved: number;
  rejected: number;
  contains_pii_count: number;
  avg_confidence: number;
  avg_impact: number;
  total_usage: number;
  active_agents: string[];
  latest_insight_at?: string;
  insights_by_type: Record<string, number>;
  insights_by_agent: Record<string, number>;
}

export interface InsightFilters {
  status?: ValidationStatus;
  agent?: string;
  insight_type?: InsightType;
  contains_pii?: boolean;
  confidence_min?: number;
  category?: string[];
}

export interface InsightValidation {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface BulkValidation {
  insight_ids: string[];
  status: 'approved' | 'rejected';
  reason?: string;
}