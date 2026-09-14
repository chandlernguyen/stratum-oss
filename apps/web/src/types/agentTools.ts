// This file contains TypeScript interfaces that mirror the Pydantic models
// defined in the backend at `apps/api/models/agent_tools.py`.
// Keeping these in sync is crucial for type safety between frontend and backend.

// --- General Message Structure ---

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structured_data?: AllToolOutputs; // Can be any of the tool outputs below
  timestamp: string;
  isOptimistic?: boolean; // For client-side optimistic UI (instant acknowledgement)
}

// A union type for all possible tool outputs
export type AllToolOutputs = 
  | SWOTAnalysis
  | PortersFiveForces
  | BusinessModelCanvas
  | Persona
  | BuyerJourney
  | InterviewQuestions
  | ContentIdea
  | BlogPost
  | SocialMediaPost
  | ContentCalendar
  | AnalysisReport
  | Optimization
  | Forecast
  | CampaignROIResult
  | BudgetSuggestion
  | DeploymentPlan
  | ABTestSuggestion
  | QuickWinSuggestion
  | CompetitorAnalysis
  | MarketGap
  | ClientHealthReport
  | RetentionStrategy;

// --- Strategy Agent Tools ---

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PortersFiveForces {
  threat_of_new_entrants: string;
  bargaining_power_of_buyers: string;
  bargaining_power_of_suppliers: string;
  threat_of_substitutes: string;
  industry_rivalry: string;
}

export interface BusinessModelCanvas {
  customer_segments: string[];
  value_propositions: string;
  channels: string[];
  customer_relationships: string[];
  revenue_streams: string;
  key_activities: string[];
  key_resources: string[];
  key_partnerships: string[];
  cost_structure: string;
}

// --- Persona Agent Tools ---

export interface Persona {
  name: string;
  demographics: string;
  psychographics: string;
  goals: string[];
  pain_points: string[];
  communication_channels: string[];
}

export interface BuyerJourneyStage {
  stage_name: string;
  description: string;
  key_questions: string[];
  content_opportunities: string[];
}

export interface BuyerJourney {
  persona_name: string;
  stages: BuyerJourneyStage[];
}

export interface InterviewQuestions {
  persona_name: string;
  questions: string[];
}

// --- Content Agent Tools ---

export interface ContentIdea {
  title: string;
  format: string;
  angle: string;
  target_persona: string;
}

export interface BlogPost {
  title: string;
  outline: string[];
  body: string;
  seo_keywords: string[];
}

export interface SocialMediaPost {
  platform: string;
  text_content: string;
  image_description?: string;
  hashtags: string[];
}

export interface ContentCalendarEntry {
  publish_date: string; // YYYY-MM-DD
  content_idea: ContentIdea;
  platform: string;
}

export interface ContentCalendar {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  schedule: ContentCalendarEntry[];
}

// --- Analytics Agent Tools ---

export interface AnalysisReport {
  title: string;
  summary: string;
  findings: string[];
  recommendations: string[];
}

export interface Optimization {
  area: string;
  suggestion: string;
  expected_impact: string;
  priority: string;
}

export interface Forecast {
  metric_name: string;
  time_period: string;
  forecast_value: string;
  confidence_level: number;
  assumptions: string[];
}

// --- ROI & Budget Agent Tools ---

export interface CampaignROIResult {
  campaign_name: string;
  total_spend: number;
  total_revenue: number;
  roi_percentage: number;
  notes: string;
}

export interface BudgetReallocation {
  from_channel: string;
  to_channel: string;
  amount: number;
  reasoning: string;
}

export interface BudgetSuggestion {
  suggestions: BudgetReallocation[];
  summary: string;
}

// --- Campaign Execution Agent Tools ---

export interface DeploymentPlan {
  campaign_name: string;
  channel_breakdown: { [key: string]: string };
  schedule_summary: string;
}

export interface ABTestVariant {
  variant_name: string;
  description: string;
  kpi_to_measure: string;
}

export interface ABTestSuggestion {
  element_to_test: string;
  variants: ABTestVariant[];
}

// --- Quick Wins Agent Tools ---

export interface QuickWinSuggestion {
  opportunity: string;
  impact: string;
  effort: string;
  recommendation: string;
}

// --- Competitive Intelligence Agent Tools ---

export interface CompetitorAnalysis {
  name: string;
  strengths: string[];
  weaknesses: string[];
  strategy_summary: string;
}

export interface MarketGap {
  opportunity_area: string;
  description: string;
  recommendation: string;
}

// --- Client Success Agent Tools ---

export interface ClientHealthReport {
  client_name: string;
  health_score: number;
  positive_indicators: string[];
  areas_of_concern: string[];
  summary: string;
}

export interface RetentionStrategy {
  strategy_name: string;
  description: string;
  impact_on_health: string;
}
