import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Brain, AlertCircle, Target, Settings, Share2, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useOrganization } from '@/hooks/data/useOrganization';
import { getIntlLocale } from '@/lib/locales';

interface PersonaInsight {
  id: string;
  title: string;
  content: any;
  category: string[];
  confidence_score: number;
  insight_type: string;
  created_at: string;
  validation_status: string;
}

interface InsightPattern {
  pattern_type: string;
  pattern_name: string;
  frequency: number;
  personas_affected: string[];
  details: any;
}

interface PersonaInsightsPanelProps {
  personas: any[];
  selectedPersonaId?: string;
  refreshTrigger?: number;
}

export function PersonaInsightsPanel({ personas, selectedPersonaId, refreshTrigger }: PersonaInsightsPanelProps) {
  const { t, i18n } = useTranslation('agents');
  const intlLocale = getIntlLocale(i18n.language);
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<PersonaInsight[]>([]);
  const [patterns, setPatterns] = useState<InsightPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<PersonaInsight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { organization } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && organization?.id) {
      loadInsights();
    }
  }, [isOpen, organization?.id, selectedPersonaId, refreshTrigger]);

  const loadInsights = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Load persona insights - filter by persona if one is selected
      let url = `/api/v1/intelligence/insights/${organization.id}/persona`;
      if (selectedPersonaId) {
        url += `?persona_id=${selectedPersonaId}`;
      }
      const insightsResponse = await api.get(url);
      setInsights(insightsResponse.data.data || []);

      // Load cross-persona patterns only if no specific persona is selected
      if (!selectedPersonaId) {
        const patternsResponse = await api.get(`/api/v1/intelligence/persona-patterns/${organization.id}`);
        setPatterns(patternsResponse.data.patterns || []);
      } else {
        setPatterns([]);
      }
    } catch (error) {
      console.error('Error loading persona insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInsight = async (insightId: string) => {
    if (!confirm(t('personas.insights.confirmDelete'))) return;

    try {
      await api.delete(`/api/v1/intelligence/insights/${insightId}`);
      // Remove from local state
      setInsights(prev => prev.filter(i => i.id !== insightId));
      // Close modal if this insight was being viewed
      if (selectedInsight?.id === insightId) {
        setIsModalOpen(false);
        setSelectedInsight(null);
      }
      console.log('Insight deleted successfully');
    } catch (error) {
      console.error('Error deleting insight:', error);
      alert(t('personas.insights.deleteFailed'));
    }
  };

  const openInsightModal = (insight: PersonaInsight) => {
    setSelectedInsight(insight);
    setIsModalOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'pain_point':
      case 'challenge':
        return <AlertCircle className="h-4 w-4" />;
      case 'goal':
      case 'objective':
        return <Target className="h-4 w-4" />;
      case 'preference':
      case 'channel':
        return <Settings className="h-4 w-4" />;
      case 'behavior':
      case 'pattern':
        return <Share2 className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };


  // Calculate total insights - either for selected persona or across all
  const totalInsights = selectedPersonaId 
    ? insights.length 
    : personas.reduce((sum, persona) => {
        return sum + (persona.insights_summary?.total_insights || 0);
      }, 0);

  // Get top pain points from patterns
  const topPainPoints = patterns
    .filter(p => p.pattern_type === 'pain_point')
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);

  const handleViewAllInsights = () => {
    // Navigate to the profile page with the Learning History tab selected
    navigate('/profile?tab=learning-history&filter=persona_agent');
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export insights');
  };

  const handleApplyToCampaign = () => {
    // TODO: Navigate to campaign builder with insights context
    navigate('/campaigns');
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-100 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-950/20 dark:to-gray-900">
          <CardHeader className="pb-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <Brain className="h-4 w-4 text-amber-600" />
                </div>
                <CardTitle className="text-sm font-medium">{t('personas.insights.title')}</CardTitle>
                {totalInsights > 0 && (
                  <Badge variant="secondary" className="ml-2 px-2 py-0 text-xs">
                    {totalInsights}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isOpen && totalInsights > 0 && (
                  <Sparkles className="h-3 w-3 text-amber-400" />
                )}
                {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </div>
          </CardHeader>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <Card className="border-amber-100">
          <CardContent className="pt-4 space-y-4">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t('personas.insights.loading')}
              </div>
            ) : insights.length === 0 ? (
              <Alert className="border-amber-100 bg-slate-50/50">
                <Brain className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  {t('personas.insights.noInsights')}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Top Pain Points Summary */}
                {topPainPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {t('personas.insights.topPainPoints')}
                    </h4>
                    <div className="space-y-1.5">
                      {topPainPoints.map((pattern, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-red-50/50 border border-red-100 rounded-md">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 line-clamp-2">{pattern.pattern_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t('personas.insights.personasAffected', { count: pattern.personas_affected?.length || 0 })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Insights */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {selectedPersonaId ? t('personas.insights.personaSpecific') : t('personas.insights.recentInsights')}
                  </h4>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {insights.slice(0, selectedPersonaId ? 10 : 3).map((insight) => (
                      <div 
                        key={insight.id}
                        className="p-2 border border-gray-100 rounded-md bg-white cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                        onClick={() => openInsightModal(insight)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <div className="mt-0.5">
                              {getCategoryIcon(insight.category?.[0])}
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2 flex-1">{insight.title}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getConfidenceColor(insight.confidence_score)}`}>
                            {Math.round(insight.confidence_score * 100)}%
                          </Badge>
                        </div>
                        {insight.validation_status === 'auto_approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-600 text-xs px-1.5 py-0 mt-1">
                            {t('personas.insights.autoApproved')}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={handleViewAllInsights}
                  >
                    {t('personas.insights.viewAll')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={handleExport}
                  >
                    {t('personas.insights.export')}
                  </Button>
                  {patterns.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={handleApplyToCampaign}
                    >
                      {t('personas.insights.applyToCampaign')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>

    {/* Insight Detail Modal */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedInsight && getCategoryIcon(selectedInsight.category?.[0])}
            <span>{t('personas.insights.modal.title')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('personas.insights.modal.description')}
          </DialogDescription>
        </DialogHeader>
        
        {selectedInsight && (
          <div className="space-y-4">
            {/* Title and Confidence */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedInsight.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${getConfidenceColor(selectedInsight.confidence_score)}`}>
                  {t('personas.insights.modal.confidence')}: {Math.round(selectedInsight.confidence_score * 100)}%
                </Badge>
                {selectedInsight.validation_status === 'auto_approved' && (
                  <Badge variant="outline" className="bg-green-50 text-green-600">
                    {t('personas.insights.autoApproved')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Full Content */}
            {selectedInsight.content && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('personas.insights.modal.fullDetails')}</h4>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {(() => {
                    if (typeof selectedInsight.content === 'string') {
                      return selectedInsight.content;
                    }
                    
                    const content = selectedInsight.content;
                    let displayText = '';
                    
                    if (content.raw_text) {
                      displayText += `Insight: "${content.raw_text}"\n\n`;
                    }
                    
                    if (content.actionable_recommendations && content.actionable_recommendations.length > 0) {
                      displayText += '📋 Actionable Recommendations:\n';
                      content.actionable_recommendations.forEach((rec: string, idx: number) => {
                        displayText += `  ${idx + 1}. ${rec}\n`;
                      });
                      displayText += '\n';
                    }
                    
                    if (content.themes && content.themes.length > 0) {
                      displayText += `🏷️ Themes: ${content.themes.join(', ')}\n\n`;
                    }
                    
                    if (content.tags && content.tags.length > 0) {
                      displayText += `🔖 Tags: ${content.tags.join(', ')}\n\n`;
                    }
                    
                    if (content.importance) {
                      displayText += `⚡ Importance: ${(content.importance * 100).toFixed(0)}%\n`;
                    }
                    
                    if (!displayText) {
                      displayText = content.description || content.details || JSON.stringify(content, null, 2);
                    }
                    
                    return displayText;
                  })()}
                </div>
              </div>
            )}

            {/* Categories */}
            {selectedInsight.category && selectedInsight.category.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('personas.insights.modal.categories')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.category.map((cat, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{t('personas.insights.modal.type')}: <strong>{selectedInsight.insight_type}</strong></span>
                <span>{t('personas.insights.modal.created')}: <strong>{new Date(selectedInsight.created_at).toLocaleDateString(intlLocale)}</strong></span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              if (selectedInsight) {
                deleteInsight(selectedInsight.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('personas.insights.deleteInsight')}
          </Button>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            {t('personas.insights.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
