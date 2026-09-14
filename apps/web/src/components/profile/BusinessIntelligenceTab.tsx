import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Filter,
  AlertCircle,
  Target,
  Settings,
  TrendingUp,
  Trash2,
  Palette
} from 'lucide-react';
import type { AIInsight } from '@/hooks/data/useBusinessIntelligence';
import { BusinessDataEditor } from './BusinessDataEditor';
import { BusinessMetricsDisplay } from './BusinessMetricsDisplay';
import { BrandGuidelinesTab } from './BrandGuidelinesTab';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { useBusinessContext, useAIInsights, usePersonaPatterns, useValidateInsight, useUpdateInsight, useDeleteInsight } from '@/hooks/data/useBusinessIntelligence';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { LayeredSpinner } from '@/components/ui/layered-icon';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useClientContext } from '@/contexts/ClientContext';

interface BusinessData {
  // Core fields from signup/onboarding
  companyName: string;
  organizationType: 'SME' | 'AGENCY';
  industry?: string;
  companySize?: string;
  description?: string;
  
  // AI-learned fields
  targetMarket?: string;
  geography?: string;
  businessModel?: string;
  priceRange?: string;
  competitors?: string[];
  uniqueValueProposition?: string;
  technologyStack?: string[];
  annualRevenue?: string;
  growthRate?: string;
  marketingBudget?: string;
}

interface DataField {
  key: string;
  label: string;
  value: any;
  source: 'manual' | 'ai';
  confidence?: number;
  lastUpdated?: string;
  aiSuggestion?: any;
  aiConfidence?: number;
  insightId?: string;
}

// Types for business profile learning content structure
interface BusinessProfileField {
  field_name: string;
  field_value: string | string[] | null | undefined;
  learned_by?: string;
  learned_at?: string;
  confidence?: number;
}

interface BusinessProfileContent {
  fields: BusinessProfileField[];
  learned_by?: string;
  learned_at?: string;
  field_count?: number;
}

// Type guard to validate business profile content structure
function isBusinessProfileContent(content: any): content is BusinessProfileContent {
  if (!content || typeof content !== 'object') return false;

  // Must have fields array
  if (!('fields' in content) || !Array.isArray(content.fields)) return false;

  // Validate each field has required structure
  return content.fields.every((field: any) =>
    field &&
    typeof field === 'object' &&
    'field_name' in field &&
    'field_value' in field &&
    typeof field.field_name === 'string'
  );
}

// Helper: Format field name for display (company_name → Company Name)
function formatFieldName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Helper: Format field value with comprehensive nested object support
function formatFieldValue(value: any): string | ReactElement {
  if (value === null || value === undefined) return 'Not specified';

  // Handle arrays
  if (Array.isArray(value)) {
    // Empty array
    if (value.length === 0) return 'Not specified';

    // Check if it's an array of objects (complex structure)
    if (typeof value[0] === 'object' && value[0] !== null) {
      // Return ReactElement for complex nested structures
      return (
        <div className="space-y-2">
          {value.map((item, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
              {renderObjectContent(item)}
            </div>
          ))}
        </div>
      );
    }

    // Simple array of strings/numbers
    return value.filter(Boolean).join(', ') || 'Not specified';
  }

  // Handle objects (non-array)
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
        {renderObjectContent(value)}
      </div>
    );
  }

  // Handle primitives (string, number, boolean)
  const stringValue = String(value).trim();
  return stringValue || 'Not specified';
}

// Helper: Render object content with nested array support
function renderObjectContent(obj: Record<string, any>): ReactElement {
  const entries = Object.entries(obj);

  return (
    <div className="space-y-1.5">
      {entries.map(([key, val]) => {
        // Skip metadata fields
        if (['confidence_score', 'extraction_date', 'learned_by', 'learned_at'].includes(key)) {
          return null;
        }

        return (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatFieldName(key)}:
            </span>{' '}
            <span className="text-gray-900 dark:text-gray-100">
              {renderNestedValue(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Helper: Render nested values recursively
function renderNestedValue(value: any): string | ReactElement {
  if (value === null || value === undefined) return 'Not specified';

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';

    // Array of primitives (strings, numbers)
    if (typeof value[0] !== 'object') {
      return value.join(', ');
    }

    // Array of objects - render as list
    return (
      <ul className="list-disc list-inside mt-1 space-y-0.5">
        {value.map((item, idx) => (
          <li key={idx} className="text-gray-800 dark:text-gray-200">
            {typeof item === 'object' ? (
              <span className="inline-block ml-2">{renderObjectContent(item)}</span>
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }

  // Handle nested objects
  if (typeof value === 'object') {
    return (
      <div className="ml-4 mt-1">
        {renderObjectContent(value)}
      </div>
    );
  }

  // Primitives
  return String(value);
}

// Helper: Render business profile fields with error handling
function renderBusinessProfileFields(fields: BusinessProfileField[]): ReactElement {
  try {
    // Filter out invalid fields
    const validFields = fields.filter(field =>
      field?.field_name &&
      field.field_value !== null &&
      field.field_value !== undefined &&
      field.field_value !== ''
    );

    if (validFields.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No fields available
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {validFields.map((field, idx) => (
          <div key={`${field.field_name}-${idx}`} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {formatFieldName(field.field_name)}:
            </span>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {formatFieldValue(field.field_value)}
            </div>
            {field.confidence && field.confidence < 1 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(field.confidence * 100)}% confidence
              </span>
            )}
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('[BusinessIntelligenceTab] Error rendering fields:', error);
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Error displaying fields
      </div>
    );
  }
}

// Helper: Render generic insight content with fallback
function renderInsightContent(insight: AIInsight): ReactElement {
  try {
    const content = insight.content;

    if (!content || typeof content !== 'object') {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No content available
        </div>
      );
    }

    // Business profile learning (from Migration 232)
    if (isBusinessProfileContent(content)) {
      return renderBusinessProfileFields(content.fields);
    }

    // Generic fallback for other content types
    const METADATA_FIELDS = ['learned_by', 'learned_at', 'field_count', 'fields'];
    const displayEntries = Object.entries(content).filter(([key]) =>
      !METADATA_FIELDS.includes(key)
    );

    if (displayEntries.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No displayable content
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {displayEntries.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {formatFieldName(key)}:
            </span>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {formatFieldValue(value as any)}
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('[BusinessIntelligenceTab] Error rendering content:', error, insight);
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Error displaying content. Please refresh and try again.
      </div>
    );
  }
}

export function BusinessIntelligenceTab() {
  const { data: identity, isLoading: identityLoading } = useUserIdentity();
  const organization = identity?.organization;
  const { clientSlug: clientSlugBranded } = useClientContext();
  const clientSlug = clientSlugBranded || undefined;

  // Get client data if in client context (for agencies)
  const { data: client, isLoading: clientLoading } = useClientBySlug(clientSlug);

  // Pass client ID to useBusinessContext for client-scoped intelligence
  const { data: businessContext, isLoading: contextLoading, refetch: refetchContext } = useBusinessContext(client?.id);
  // NEW: Pass client ID to useAIInsights for client-scoped learning history (agency users)
  const { data: insights = [], isLoading: insightsLoading, refetch: refetchInsights } = useAIInsights(undefined, client?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirmDelete, DeleteDialog } = useDeleteConfirmation();

  // Get initial tab from URL or default to 'business-profile'
  const tabFromUrl = searchParams.get('tab') as 'business-profile' | 'learning-history' | 'brand-guidelines' | null;
  const [activeView, setActiveView] = useState<'business-profile' | 'learning-history' | 'brand-guidelines'>(
    tabFromUrl || 'business-profile'
  );
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, any>>({});
  const [isEditingBusinessData, setIsEditingBusinessData] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>('all');

  // Use persona patterns hook conditionally
  const { data: personaPatterns = [] } = usePersonaPatterns(
    filterAgent === 'persona_agent' ? organization?.id : undefined
  );

  // Mutation hooks for insight operations
  const validateInsightMutation = useValidateInsight();
  const updateInsightMutation = useUpdateInsight();
  const deleteInsightMutation = useDeleteInsight();

  const loading = identityLoading || clientLoading || contextLoading || insightsLoading;

  // Update active view when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'business-profile' | 'learning-history' | 'brand-guidelines' | null;
    if (tabFromUrl && tabFromUrl !== activeView) {
      setActiveView(tabFromUrl);
    }
  }, [searchParams]);

  // Process business data - use useMemo to prevent infinite loop
  const businessData = useMemo<BusinessData | null>(() => {
    if (!organization) return null;

    // Extract the latest AI-learned data (include both approved and auto-approved)
    const latestAIData: Partial<BusinessData> = {};
    insights.forEach((insight: AIInsight) => {
      if (insight.content && (insight.validation_status === 'approved' || insight.validation_status === 'auto_approved')) {
        Object.entries(insight.content).forEach(([key, value]) => {
          // Map AI field names to our field names
          const fieldMap: Record<string, keyof BusinessData> = {
            'company_name': 'companyName',
            'industry': 'industry',
            'industry_sector': 'industry',
            'number_of_employees': 'companySize',
            'size': 'companySize',
            'target_market': 'targetMarket',
            'customer_segments': 'targetMarket',
            'geography': 'geography',
            'business_model': 'businessModel',
            'competitors': 'competitors',
            'competitors_mentioned': 'competitors',
            'unique_value': 'uniqueValueProposition',
            'unique_value_propositions': 'uniqueValueProposition',
            'technology': 'technologyStack',
            'annual_revenue': 'annualRevenue',
            'revenue': 'annualRevenue',
            'growth': 'growthRate',
            'growth_rate_or_churn_rate': 'growthRate',
            'budget': 'marketingBudget',
            'marketing_budget': 'marketingBudget'
          };

          const mappedKey = fieldMap[key] || fieldMap[key.toLowerCase().replace(/\s+/g, '_')] || key;

          // Special handling for number_of_employees to company size range
          if (key === 'number_of_employees' && typeof value === 'number') {
            if (value < 10) (latestAIData as any).companySize = 'Less than 10';
            else if (value <= 50) (latestAIData as any).companySize = '10-50';
            else if (value <= 200) (latestAIData as any).companySize = '51-200';
            else if (value <= 500) (latestAIData as any).companySize = '201-500';
            else (latestAIData as any).companySize = 'More than 500';
          } else if (mappedKey in latestAIData === false || insight.confidence_score > 0.8) {
            (latestAIData as any)[mappedKey] = value;
          }
        });
      }
    });

    // Combine manual and AI data
    // businessContext is already the core_business_data object, not nested in business_info
    const manualData: any = businessContext || {};
    return {
      companyName: client?.name || organization.name,  // Use client name if in client context
      organizationType: organization.type as 'SME' | 'AGENCY',
      industry: manualData.industry,
      companySize: manualData.company_size || manualData.companySize,
      description: manualData.description,
      ...latestAIData
    };
  }, [organization, client, businessContext, insights]);

  // Compute pending suggestions - use useMemo to prevent infinite loop
  const pendingSuggestions = useMemo(() => {
    const pendingInsights = insights.filter((i: AIInsight) =>
      i.validation_status === 'pending'
    ) || [];

    const suggestions: Record<string, any> = {};
    pendingInsights.forEach((insight: AIInsight) => {
      if (insight.content) {
        Object.entries(insight.content).forEach(([key, value]) => {
          suggestions[key] = {
            value,
            confidence: insight.confidence_score,
            insightId: insight.id
          };
        });
      }
    });
    return suggestions;
  }, [insights]);

  const refreshData = () => {
    refetchContext();
    refetchInsights();
  };


  const handleValidateInsight = async (insightId: string, status: 'approved' | 'rejected') => {
    try {
      await validateInsightMutation.mutateAsync({ insightId, status });
      setSelectedInsight(null);
    } catch (error) {
      console.error('Error validating insight:', error);
    }
  };

  // Bulk validation for grouped similar insights
  const handleBulkValidateInsights = async (groupInsights: AIInsight[], status: 'approved' | 'rejected') => {
    try {
      // Filter to only pending insights to avoid changing already processed ones
      const pendingInsights = groupInsights.filter(insight => insight.validation_status === 'pending');

      if (pendingInsights.length === 0) {
        return;
      }

      // Process all pending insights in the group
      for (const insight of pendingInsights) {
        await validateInsightMutation.mutateAsync({ insightId: insight.id, status });
      }

      setSelectedInsight(null);
    } catch (error) {
      console.error('Error bulk validating insights:', error);
    }
  };

  const handleUpdateInsight = async () => {
    if (!selectedInsight) return;

    try {
      await updateInsightMutation.mutateAsync({
        insightId: selectedInsight.id,
        content: editedContent
      });
      // Update local state
      setSelectedInsight({ ...selectedInsight, content: editedContent });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating insight:', error);
    }
  };

  const handleDeleteInsight = async (insight: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog

    const groupInsights = insight.groupInsights || [insight];
    const insightCount = groupInsights.length;

    const confirmed = await confirmDelete({
      id: insight.id,
      name: insightCount > 1
        ? `${insightCount} similar insights`
        : insight.title,
      isArchived: false
    });

    if (!confirmed) {
      return;
    }

    try {
      // Delete all insights in the group
      for (const groupInsight of groupInsights) {
        await deleteInsightMutation.mutateAsync({
          insightId: groupInsight.id,
          sourceAgent: groupInsight.source_agent
        });
      }
    } catch (error) {
      console.error('Error deleting insight(s):', error);
    }
  };

  // Group similar insights to reduce repetition
  const groupSimilarInsights = (insights: AIInsight[]) => {
    const grouped: { [key: string]: AIInsight[] } = {};

    insights.forEach(insight => {
      // Create a key based on the first 50 characters of the title
      const key = insight.title.substring(0, 50).toLowerCase().trim();

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(insight);
    });

    // Return the first insight from each group, with a count and all insights in the group
    return Object.values(grouped).map(group => ({
      ...group[0],
      duplicateCount: group.length,
      groupInsights: group // Include all insights in this group
    }));
  };

  const handleAcceptSuggestion = async (_field: string, suggestion: any) => {
    try {
      // Update the insight status to approved
      if (suggestion.insightId) {
        await validateInsightMutation.mutateAsync({
          insightId: suggestion.insightId,
          status: 'approved'
        });
      }

      // Data will be automatically refreshed by the mutation's onSuccess
      // businessData and pendingSuggestions are now computed via useMemo from insights state
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const getFieldDisplay = (key: string, value: any, source: 'manual' | 'ai'): DataField => {
    const labels: Record<string, string> = {
      companyName: 'Company Name',
      organizationType: 'Organization Type',
      industry: 'Industry',
      companySize: 'Company Size',
      description: 'Description',
      targetMarket: 'Target Market',
      geography: 'Geography',
      businessModel: 'Business Model',
      priceRange: 'Price Range',
      competitors: 'Competitors',
      uniqueValueProposition: 'Unique Value Proposition',
      technologyStack: 'Technology Stack',
      annualRevenue: 'Annual Revenue',
      growthRate: 'Growth Rate',
      marketingBudget: 'Marketing Budget'
    };
    
    return {
      key,
      label: labels[key] || key,
      value,
      source,
      aiSuggestion: pendingSuggestions[key]?.value,
      aiConfidence: pendingSuggestions[key]?.confidence,
      insightId: pendingSuggestions[key]?.insightId
    };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LayeredSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading business intelligence...</p>
        </div>
      </div>
    );
  }

  // Core fields are now managed in BusinessDataEditor component
  // Removed unused aiFields variable
  const suggestionCount = Object.keys(pendingSuggestions).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 md:w-6 md:h-6 text-brand-gold dark:text-amber-400" />
            Business Intelligence
          </h2>
          <p className="text-sm md:text-base text-brand-slate dark:text-gray-400 mt-1">
            Your business profile combining manual data and AI-learned insights
          </p>
        </div>
      </div>

      {/* Suggestions Alert */}
      {suggestionCount > 0 && (
        <Alert className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            You have {suggestionCount} new AI suggestion{suggestionCount > 1 ? 's' : ''} to review
          </AlertDescription>
        </Alert>
      )}

      {/* View Tabs - Redesigned for clarity */}
      <Tabs value={activeView} onValueChange={(v) => {
        setActiveView(v as any);
        // Update URL to persist tab state
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', v);
        setSearchParams(newParams);
      }}>
        <TabsList className="grid w-full grid-cols-3 gap-1 md:gap-0">
          <TabsTrigger value="business-profile" className="text-xs md:text-sm px-2 md:px-4">
            <Building2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Business Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="brand-guidelines" className="text-xs md:text-sm px-2 md:px-4">
            <Palette className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Brand Guidelines</span>
            <span className="sm:hidden">Brand</span>
          </TabsTrigger>
          <TabsTrigger value="learning-history" className="text-xs md:text-sm px-2 md:px-4">
            <Brain className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Learning History</span>
            <span className="sm:hidden">Learning</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab - View and edit all business data */}
        <TabsContent value="business-profile" className="space-y-6 mt-6">
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              This is the authoritative business context used by all AI agents. Click Edit to modify any information.
            </AlertDescription>
          </Alert>
          
          <BusinessDataEditor
            isEditing={isEditingBusinessData}
            onEditingChange={setIsEditingBusinessData}
            onRefresh={refreshData}
            clientId={client?.id}
          />

          {/* AI-Learned Business Metrics */}
          <BusinessMetricsDisplay metrics={businessContext?.business_metrics} />

          {/* Show any pending conflicts */}
          {Object.keys(pendingSuggestions).length > 0 && (
            <Card className="border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Data Conflicts Detected
                </CardTitle>
                <CardDescription>
                  AI has found information that differs from your manual entries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(pendingSuggestions).map(([field, suggestion]) => (
                  <div key={field} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getFieldDisplay(field, null, 'ai').label}</span>
                      <Badge variant="outline" className="text-amber-600">
                        Conflict
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Current</Badge>
                        <span className="text-sm">
                          {typeof (businessData as any)?.[field] === 'object' 
                            ? JSON.stringify((businessData as any)?.[field]) 
                            : (businessData as any)?.[field] || 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800">AI Suggestion</Badge>
                        <span className="text-sm">
                          {typeof suggestion.value === 'object' 
                            ? JSON.stringify(suggestion.value) 
                            : suggestion.value}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptSuggestion(field, suggestion)}
                        className="w-full sm:w-auto"
                      >
                        Accept AI Value
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // Reject the insight to keep current value
                          if (suggestion.insightId) {
                            await validateInsightMutation.mutateAsync({
                              insightId: suggestion.insightId,
                              status: 'rejected'
                            });
                          }
                        }}
                        className="w-full sm:w-auto"
                      >
                        Keep Current
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Brand Guidelines Tab */}
        <TabsContent value="brand-guidelines" className="mt-6">
          <BrandGuidelinesTab
            orgId={organization?.id}
            clientId={client?.id}
          />
        </TabsContent>

        {/* Learning History Tab - Audit trail */}
        <TabsContent value="learning-history" className="mt-6">
          <div className="space-y-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg md:text-xl">AI Learning History</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Track how AI has learned about your business over time
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-brand-slate dark:text-gray-400" />
                    <Select value={filterAgent} onValueChange={setFilterAgent}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All agents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All agents</SelectItem>
                        <SelectItem value="persona_agent">Persona insights</SelectItem>
                        <SelectItem value="strategy_agent">Strategy insights</SelectItem>
                        <SelectItem value="marketing_strategy_agent">Marketing insights</SelectItem>
                        <SelectItem value="content_agent">Content insights</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!insights || insights.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No AI insights yet</h3>
                    <p className="text-muted-foreground">
                      As you interact with marketing agents, AI will learn about your business
                      and surface insights here for your review.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Persona Patterns Summary - Only show when filtered to persona_agent */}
                    {filterAgent === 'persona_agent' && personaPatterns.length > 0 && (
                      <div className="mb-6 space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-amber-600" />
                          Cross-Persona Patterns
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Top Pain Points */}
                          {personaPatterns
                            .filter(p => p.pattern_type === 'pain_point')
                            .slice(0, 3)
                            .map((pattern, idx) => (
                              <Card key={idx} className="p-3 border-slate-300 bg-slate-50 dark:bg-slate-900/20 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">{pattern.pattern_name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {pattern.frequency} mention(s) • {pattern.personas_affected?.length || 0} persona(s)
                                    </p>
                                  </div>
                                </div>
                              </Card>
                          ))}
                          {/* Common Goals */}
                          {personaPatterns
                            .filter(p => p.pattern_type === 'goal')
                            .slice(0, 3)
                            .map((pattern, idx) => (
                              <Card key={idx} className="p-3 border-amber-300 bg-amber-50 dark:bg-amber-900/20 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-start gap-2">
                                  <Target className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">{pattern.pattern_name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {pattern.frequency} mention(s) • {pattern.personas_affected?.length || 0} persona(s)
                                    </p>
                                  </div>
                                </div>
                              </Card>
                          ))}
                          {/* Channel Preferences */}
                          {personaPatterns
                            .filter(p => p.pattern_type === 'channel' || p.pattern_type === 'preference')
                            .slice(0, 3)
                            .map((pattern, idx) => (
                              <Card key={idx} className="p-3 border-slate-300 bg-slate-50 dark:bg-slate-900/20 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="flex items-start gap-2">
                                  <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">{pattern.pattern_name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {pattern.frequency} mention(s) • {pattern.personas_affected?.length || 0} persona(s)
                                    </p>
                                  </div>
                                </div>
                              </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <span className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                        Total insights: {
                          filterAgent === 'all'
                            ? insights.length
                            : insights.filter(i => i.source_agent === filterAgent).length
                        }
                      </span>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs">
                          {insights.filter(i => i.validation_status === 'approved').length} Approved
                        </Badge>
                        <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20 text-xs">
                          {insights.filter(i => i.validation_status === 'auto_approved').length} Auto-Approved
                        </Badge>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                          {insights.filter(i => i.validation_status === 'pending').length} Pending
                        </Badge>
                        <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-500/20 text-xs">
                          {insights.filter(i => i.validation_status === 'rejected').length} Rejected
                        </Badge>
                      </div>
                    </div>
                    {groupSimilarInsights(
                      insights.filter(insight => filterAgent === 'all' || insight.source_agent === filterAgent)
                    ).map((insight: any) => (
                      <div
                        key={insight.id}
                        className="flex items-start justify-between p-3 md:p-4 border rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200"
                      >
                        <div
                          className="flex-1 cursor-pointer min-h-[44px]"
                          onClick={() => {
                            setSelectedInsight({
                              ...insight,
                              groupInsights: (insight as any).groupInsights || [insight]
                            });
                            setEditedContent(insight.content || {});
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                            <span className="font-medium text-xs md:text-sm text-brand-charcoal dark:text-gray-100">{insight.title}</span>
                            {insight.duplicateCount > 1 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-slate-100 dark:bg-slate-900/30">
                                {insight.duplicateCount} similar
                              </Badge>
                            )}
                            <Badge className={`text-xs ${
                              insight.validation_status === 'approved'
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                : insight.validation_status === 'pending'
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : insight.validation_status === 'auto_approved'
                                ? "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
                                : "bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-500/20"
                            }`}>
                              {insight.validation_status === 'auto_approved' ? 'Auto-Approved' : insight.validation_status}
                            </Badge>
                          </div>
                          <div className="text-xs text-brand-slate dark:text-gray-400">
                            From {insight.source_agent?.replace('_', ' ')} • {Math.round(insight.confidence_score * 100)}% confidence
                          </div>
                          {insight.content && (
                            <div className="mt-1.5 md:mt-2 text-xs text-brand-slate dark:text-gray-400">
                              {Object.keys(insight.content).length} fields extracted
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-w-[44px] min-h-[44px] text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          onClick={(e) => handleDeleteInsight(insight, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insight Detail Dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={() => {
        setSelectedInsight(null);
        setIsEditing(false);
        setEditedContent({});
      }}>
        <DialogContent className="max-w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {selectedInsight?.title}
              </span>
              {!isEditing && selectedInsight && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setEditedContent(selectedInsight.content || {});
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Extracted from {selectedInsight?.source_agent?.replace('_', ' ')} conversation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Confidence Score */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Confidence:</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(selectedInsight?.confidence_score || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm">{Math.round((selectedInsight?.confidence_score || 0) * 100)}%</span>
              </div>
            </div>

            {/* Business Context Details */}
            <div className="space-y-3">
              <h3 className="font-semibold">Extracted Business Context:</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {isEditing ? (
                  // Edit mode
                  <div className="space-y-3">
                    {Object.entries(editedContent).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </label>
                        <input
                          type="text"
                          className="text-sm px-2 py-1 border rounded bg-white dark:bg-gray-800"
                          value={Array.isArray(value) ? value.join(', ') : String(value || '')}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditedContent(prev => ({
                              ...prev,
                              [key]: key === 'competitors' || key === 'technologyStack' || key === 'technology_stack'
                                ? newValue.split(',').map(s => s.trim()).filter(Boolean)
                                : newValue
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // View mode - use robust helper function
                  selectedInsight ? renderInsightContent(selectedInsight) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No insight selected
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Actions */}
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  onClick={handleUpdateInsight}
                  className="w-full sm:flex-1"
                  variant="default"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(selectedInsight?.content || {});
                  }}
                  className="w-full sm:flex-1"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            ) : selectedInsight?.validation_status === 'pending' && (
              <div className="space-y-2 pt-4 border-t">
                {/* Check if this insight has similar grouped insights */}
                {(selectedInsight as any)?.groupInsights?.length > 1 ? (
                  // Bulk actions for grouped insights
                  <div className="space-y-3">
                    <div className="text-xs md:text-sm text-brand-slate dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                      <strong>Note:</strong> This action will affect {
                        ((selectedInsight as any)?.groupInsights || []).filter((i: AIInsight) => i.validation_status === 'pending').length
                      } similar pending insights in this group.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => {
                          if (selectedInsight && (selectedInsight as any)?.groupInsights) {
                            handleBulkValidateInsights((selectedInsight as any).groupInsights, 'approved');
                          }
                        }}
                        className="w-full sm:flex-1"
                        variant="default"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve All Similar
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedInsight && (selectedInsight as any)?.groupInsights) {
                            handleBulkValidateInsights((selectedInsight as any).groupInsights, 'rejected');
                          }
                        }}
                        className="w-full sm:flex-1"
                        variant="outline"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject All Similar
                      </Button>
                    </div>
                    {/* Still provide option to act on just this one */}
                    <div className="border-t pt-3">
                      <div className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mb-2">Or act on just this insight:</div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => {
                            if (selectedInsight) {
                              handleValidateInsight(selectedInsight.id, 'approved');
                            }
                          }}
                          size="sm"
                          variant="secondary"
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve This Only
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedInsight) {
                              handleValidateInsight(selectedInsight.id, 'rejected');
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject This Only
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Single insight actions
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        if (selectedInsight) {
                          handleValidateInsight(selectedInsight.id, 'approved');
                        }
                      }}
                      className="w-full sm:flex-1"
                      variant="default"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Apply
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedInsight) {
                          handleValidateInsight(selectedInsight.id, 'rejected');
                        }
                      }}
                      className="w-full sm:flex-1"
                      variant="outline"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog />
    </div>
  );
}