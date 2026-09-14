// Agent-related type definitions

export type AgentType = 'strategy' | 'persona' | 'marketing_strategy' | 'content' | 'analytics' | 'roi_budget' | 'campaign_planning' | 'competitive_intelligence' | 'client_success' | 'quick_wins' | 'performance_intelligence' | 'quick_start';

export interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  structured_data?: any;
}

export interface SavedOutput {
  id: string;
  session_id: string;
  agent_type: AgentType;
  title: string;
  content: string;
  structured_data?: Record<string, any>;
  tags: string[];
  created_at: string;
  view_count?: number;
  reuse_count?: number;
  last_accessed?: string;
  avg_rating?: number;
  metadata?: Record<string, any>;
  // Phase 2: Output protection - ownership and approval fields
  user_id?: string;
  created_by?: string;
  approval_status?: 'not_submitted' | 'pending' | 'changes_needed' | 'approved' | 'rejected';
}

export interface SaveOutputRequest {
  message_id: string;
  title: string;
  tags?: string[];
}

export interface SaveOutputResponse {
  success: boolean;
  message_id: string;
  agent_type: string;
}

export interface InjectContextResponse {
  session_id: string;
  injected_context: string;
  message_count: number;
}