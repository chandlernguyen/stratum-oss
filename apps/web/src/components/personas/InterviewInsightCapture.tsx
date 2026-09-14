import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Lightbulb, Save, AlertCircle, Target,
  DollarSign, Clock, Quote, CheckCircle, TrendingUp,
  MessageSquare, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Simple toast implementation until proper toast is available
const useToast = () => {
  return {
    toast: (options: { title: string; description?: string; variant?: string }) => {
      console.log('Toast:', options);
      // TODO: Implement proper toast notifications
    }
  };
};

interface InterviewInsight {
  id?: string;
  persona_id: string;
  session_id: string;
  insight_category: string;
  raw_text: string;
  actionable_recommendations: string[];
  importance: number;
  confidence: number;
  tags: string[];
  themes: string[];
  context: string;
}

interface InterviewInsightCaptureProps {
  persona: any;
  conversation: string;
  sessionId: string;
  orgId: string;
  className?: string;
}

export function InterviewInsightCapture({ 
  persona, 
  conversation, 
  sessionId,
  orgId,
  className 
}: InterviewInsightCaptureProps) {
  const { t } = useTranslation('agents');
  const [insights, setInsights] = useState<InterviewInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedInsights, setSavedInsights] = useState<Set<string>>(new Set());
  const [savingInsights, setSavingInsights] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const insightsRef = useRef<InterviewInsight[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    insightsRef.current = insights;
  }, [insights]);

  // Auto-collapse/expand based on unsaved insights
  useEffect(() => {
    const unsavedInsights = insights.filter(insight => {
      const insightId = insight.id || `temp-${insights.indexOf(insight)}`;
      return !savedInsights.has(insightId);
    });
    
    // Auto-expand if there are unsaved insights, auto-collapse if all are saved
    if (unsavedInsights.length > 0) {
      setIsExpanded(true);
    } else if (insights.length > 0 && unsavedInsights.length === 0) {
      // Delay collapse slightly to let user see the "saved" confirmation
      setTimeout(() => setIsExpanded(false), 2000);
    }
  }, [insights, savedInsights]);

  // Analyze conversation chunks for insights
  useEffect(() => {
    const analyzeForInsights = async () => {
      console.log('Checking conversation for insights:', {
        hasConversation: !!conversation,
        length: conversation?.length,
        minRequired: 200,
        willAnalyze: conversation && conversation.length >= 200
      });
      
      if (!conversation || conversation.length < 200) return;
      
      // Get last 800 chars for analysis (recent context)
      const recentChunk = conversation.slice(-800);
      console.log('Analyzing chunk:', recentChunk.slice(0, 100) + '...');
      
      // Create a simple hash for deduplication (handles Unicode)
      const hashString = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
      };
      
      // Skip if we've already analyzed this chunk
      const chunkHash = hashString(recentChunk.slice(0, 50));
      if (insightsRef.current.some(i => i.context?.includes(chunkHash))) {
        console.log('Skipping - already analyzed this chunk');
        return;
      }
      
      console.log('Starting insight extraction API call...');
      setIsAnalyzing(true);
      
      // Call backend API to extract insights
      try {
        console.log('Calling API with:', {
          persona_id: persona.id,
          org_id: orgId,
          session_id: sessionId,
          chunk_length: recentChunk.length
        });
        
        const response = await api.post('/api/v1/intelligence/extract-interview-insight', {
          conversation_chunk: recentChunk,
          persona_id: persona.id,
          org_id: orgId,
          session_id: sessionId
        });
        
        console.log('API Response:', response.data);
        
        if (response.data && response.data.status === 'success' && response.data.data) {
          const insight = response.data.data;
          console.log('Extracted insight:', insight);
          
          // Only add high-importance insights
          const importance = typeof insight.importance === 'string' ? parseFloat(insight.importance) : insight.importance;
          console.log('Insight importance:', importance, 'Threshold: 0.4');
          
          if (importance > 0.4 && !isDuplicate(insight)) {
            // Add chunk hash to context for deduplication
            insight.context = `${chunkHash}|${insight.context}`;
            insight.importance = importance; // Ensure it's a number
            setInsights(prev => [...prev, insight]);
            console.log('Added insight to list');
            
            // Auto-save critical insights
            if (importance > 0.85) {
              console.log('Auto-saving critical insight');
              await saveInsight(insight);
            }
          } else {
            console.log('Insight not added - importance too low or duplicate');
          }
        } else {
          console.log('No insight extracted or unsuccessful response');
        }
      } catch (error) {
        console.error('Error extracting insights:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    // Debounce analysis
    const timer = setTimeout(analyzeForInsights, 3000);
    return () => clearTimeout(timer);
  }, [conversation, persona.id, orgId, sessionId]);

  const isDuplicate = (newInsight: InterviewInsight) => {
    return insightsRef.current.some(existing => {
      // Check for exact raw text match
      if (existing.raw_text === newInsight.raw_text) {
        return true;
      }
      
      // Check for very similar text (case-insensitive, trimmed)
      const existingText = existing.raw_text?.toLowerCase().trim();
      const newText = newInsight.raw_text?.toLowerCase().trim();
      if (existingText && newText && existingText === newText) {
        return true;
      }
      
      // Check for same category with overlapping themes
      if (existing.insight_category === newInsight.insight_category) {
        const existingThemes = existing.themes || [];
        const newThemes = newInsight.themes || [];
        const hasOverlappingThemes = existingThemes.some(theme => 
          newThemes.includes(theme)
        );
        
        // If same category and has overlapping themes and similar text length
        if (hasOverlappingThemes && 
            Math.abs((existing.raw_text?.length || 0) - (newInsight.raw_text?.length || 0)) < 20) {
          return true;
        }
      }
      
      return false;
    });
  };

  const saveInsight = async (insight: InterviewInsight) => {
    const insightIdentifier = insight.id || `temp-${insights.indexOf(insight)}`;

    // Prevent duplicate saves
    if (savedInsights.has(insightIdentifier) || savingInsights.has(insightIdentifier)) {
      console.log('Insight already saved or being saved:', insightIdentifier);
      return;
    }

    // Mark as saving
    setSavingInsights(prev => new Set([...prev, insightIdentifier]));

    try {
      // Database-first approach: Use Supabase RPC to call save_interview_insight function
      const { data, error } = await supabase.rpc('save_interview_insight', {
        p_org_id: orgId,
        p_persona_id: insight.persona_id,
        p_session_id: insight.session_id,
        p_insight_category: insight.insight_category,
        p_raw_text: insight.raw_text,
        p_actionable_recommendations: insight.actionable_recommendations || [],
        p_importance: insight.importance || 0.5,
        p_confidence: insight.confidence || 0.8,
        p_tags: insight.tags || [],
        p_themes: insight.themes || [],
        p_context: insight.context || ''
      });

      if (error) {
        console.error('Error saving insight:', error);
        throw error;
      }

      // The database function returns the created insight
      if (data && data.length > 0 && data[0].id) {
        setSavedInsights(prev => new Set([...prev, insightIdentifier]));
        toast({
          title: t('personas.insightCapture.savedTitle'),
          description: t('personas.insightCapture.savedDescription')
        });
        console.log('Insight saved successfully:', data[0].id);
      } else {
        console.error('Unexpected response format:', data);
        toast({
          title: t('personas.insightCapture.warningTitle'),
          description: t('personas.insightCapture.warningDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving insight:', error);
      toast({
        title: t('personas.insightCapture.errorTitle'),
        description: t('personas.insightCapture.errorDescription', { error: (error as any).message || 'Unknown error' }),
        variant: "destructive"
      });
    } finally {
      // Remove from saving set
      setSavingInsights(prev => {
        const newSet = new Set(prev);
        newSet.delete(insightIdentifier);
        return newSet;
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      pain_point: <AlertCircle className="w-4 h-4 text-red-500" />,
      goal: <Target className="w-4 h-4 text-green-500" />,
      budget: <DollarSign className="w-4 h-4 text-blue-500" />,
      timeline: <Clock className="w-4 h-4 text-orange-500" />,
      quote: <Quote className="w-4 h-4 text-amber-500" />,
      objection: <MessageSquare className="w-4 h-4 text-yellow-600" />,
      preference: <TrendingUp className="w-4 h-4 text-indigo-500" />,
      decision_criteria: <Calendar className="w-4 h-4 text-pink-500" />
    };
    return icons[category] || <Lightbulb className="w-4 h-4 text-amber-500" />;
  };

  const getImportanceColor = (importance: number) => {
    if (importance > 0.8) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (importance > 0.6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  if (insights.length === 0 && !isAnalyzing) return null;

  return (
    <Card className={cn(
      "shadow-xl border-slate-200 dark:border-slate-800",
      "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
      className
    )}>
      <CardHeader 
        className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            {(() => {
              const unsavedCount = insights.filter(insight => {
                const insightId = insight.id || `temp-${insights.indexOf(insight)}`;
                return !savedInsights.has(insightId);
              }).length;
              const savedCount = insights.length - unsavedCount;
              
              if (isExpanded) {
                return unsavedCount > 0
                  ? t('personas.insightCapture.titleNew', { count: unsavedCount })
                  : t('personas.insightCapture.titleCount', { count: insights.length });
              } else {
                return savedCount > 0
                  ? t('personas.insightCapture.titleSaved', { count: savedCount })
                  : t('personas.insightCapture.title');
              }
            })()}
          </h3>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <Badge variant="secondary" className="animate-pulse">
                {t('personas.insightCapture.analyzing')}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <>
          <CardContent className="overflow-y-auto max-h-[400px] space-y-3 p-4">
            {insights.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('personas.insightCapture.listening')}</p>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <Card 
                  key={idx} 
                  className="p-3 border-l-4 border-amber-500 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(insight.insight_category)}
                        <span className="text-sm font-medium capitalize">
                          {insight.insight_category.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge className={cn("text-xs", getImportanceColor(insight.importance))}>
                        {(insight.importance * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{insight.raw_text}"
                    </p>
                    
                    {insight.actionable_recommendations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {t('personas.insightCapture.actions')}:
                        </span>
                        {insight.actionable_recommendations.slice(0, 2).map((rec, i) => (
                          <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                            • {rec}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-1 mt-2">
                      {insight.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {!savedInsights.has(insight.id || `temp-${idx}`) && !savingInsights.has(insight.id || `temp-${idx}`) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => saveInsight(insight)}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {t('personas.insightCapture.saveInsight')}
                      </Button>
                    )}
                    
                    {savingInsights.has(insight.id || `temp-${idx}`) && (
                      <div className="flex items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs mt-2 p-2 rounded-md border border-blue-200 dark:border-blue-800">
                        <span className="animate-pulse">{t('personas.insightCapture.saving')}</span>
                      </div>
                    )}
                    
                    {savedInsights.has(insight.id || `temp-${idx}`) && (
                      <div className="flex items-center justify-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs mt-2 p-2 rounded-md border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-3 h-3" />
                        <span className="font-medium">{t('personas.insightCapture.savedSuccessfully')}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </CardContent>
          
          {insights.length > 0 && (
            <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
              <Button 
                className="w-full"
                onClick={async () => {
                  // Save insights sequentially to prevent duplicates
                  const unsavedInsights = insights.filter(insight => {
                    const insightId = insight.id || `temp-${insights.indexOf(insight)}`;
                    return !savedInsights.has(insightId) && !savingInsights.has(insightId);
                  });
                  
                  for (const insight of unsavedInsights) {
                    await saveInsight(insight);
                  }
                  
                  // Clear insights after all are saved to prevent re-analysis of same content
                  if (unsavedInsights.length > 0) {
                    setTimeout(() => {
                      setInsights([]); // Clear all insights after saving
                      setSavedInsights(new Set()); // Clear saved tracking
                    }, 2000); // Wait 2 seconds to show success message
                  }
                }}
                disabled={insights.every(i => {
                  const insightId = i.id || `temp-${insights.indexOf(i)}`;
                  return savedInsights.has(insightId) || savingInsights.has(insightId);
                })}
              >
                <Save className="w-4 h-4 mr-2" />
                {savingInsights.size > 0 ? t('personas.insightCapture.saving') : t('personas.insightCapture.saveAll')}
              </Button>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}