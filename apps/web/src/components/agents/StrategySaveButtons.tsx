import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Check, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Target,
  DollarSign,
  Calendar,
  TrendingUp,
  Megaphone,
  Lightbulb,
  ArrowRight,
  Folder
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authService';
import { getIntlLocale } from '@/lib/locales';

interface StrategySection {
  title: string;
  content: string;
  type: 'messaging' | 'channels' | 'budget' | 'content' | 'timeline' | 'tactics' | 'general';
  icon?: any;
}

interface DetectedStrategy {
  campaign_name: string;
  campaign_duration: string;
  total_budget: number;
  monthly_budget: number;
  objectives: string[];
  target_verticals: string[];
  target_personas: string[];
  key_challenges: string[];
  unique_strengths: string[];
  media_mix: {
    owned: number;
    earned: number;
    paid: number;
  };
  budget_allocation?: any;
  messaging_framework?: any;
  channel_strategy?: any;
  content_strategy?: any;
  go_to_market?: any;
  estimated_reach?: number;
  estimated_roi?: number;
  success_metrics: string[];
  sections: StrategySection[];
  raw_content: string;
  executive_summary: string;
  strategy_reasoning: string;
}

interface StrategySaveButtonsProps {
  detectedStrategy: DetectedStrategy | null;
  campaignId?: string;
  clientId?: string;
}

export function StrategySaveButtons({
  detectedStrategy,
  campaignId,
  clientId
}: StrategySaveButtonsProps) {
  const { t, i18n } = useTranslation(['agents']);
  const intlLocale = getIntlLocale(i18n.language);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSaveOption, setSelectedSaveOption] = useState<'campaign' | 'company'>('campaign');

  if (!detectedStrategy) return null;

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'messaging': return Target;
      case 'channels': return Megaphone;
      case 'budget': return DollarSign;
      case 'content': return FileText;
      case 'timeline': return Calendar;
      case 'tactics': return Lightbulb;
      default: return TrendingUp;
    }
  };

  const handleSaveStrategy = async () => {
    setIsSaving(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/api/v1/save-marketing-strategy`, {
        method: 'POST',
        body: JSON.stringify({
          strategy: detectedStrategy,
          campaign_id: selectedSaveOption === 'campaign' ? campaignId : null,
          client_id: clientId,  // Pass client_id for schema routing
          save_to: selectedSaveOption // 'campaign' or 'company'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setIsSaved(true);
        toast.success(`Strategy saved to ${selectedSaveOption === 'campaign' ? 'campaign' : 'company'} outputs`);
        
        // Trigger a custom event to refresh the outputs list
        window.dispatchEvent(new CustomEvent('strategy-saved', { 
          detail: { 
            strategy: detectedStrategy, 
            strategyId: result.strategy_id,
            saveLocation: selectedSaveOption 
          } 
        }));
      } else {
        const error = await response.json();
        toast.error(`Failed to save strategy: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-lg">{t('agents:context.strategySave.title')}</h3>
            <Badge variant="secondary" className="ml-2">
              {t('agents:context.strategySave.sections', { count: detectedStrategy.sections.length })}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Strategy Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">{t('agents:context.strategySave.campaign')} {detectedStrategy.campaign_name}</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {t('agents:context.strategySave.budget')} ${detectedStrategy.total_budget.toLocaleString(intlLocale)} total
              {detectedStrategy.monthly_budget > 0 && ` ($${detectedStrategy.monthly_budget.toLocaleString(intlLocale)}/mo)`}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('agents:context.strategySave.duration')} {detectedStrategy.campaign_duration || 'Not specified'}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('agents:context.strategySave.mediaMix')} {detectedStrategy.media_mix.owned}% Owned / {detectedStrategy.media_mix.earned}% Earned / {detectedStrategy.media_mix.paid}% Paid
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Key Objectives */}
            {detectedStrategy.objectives && detectedStrategy.objectives.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">{t('agents:context.strategySave.objectives')}</h4>
                <div className="flex flex-wrap gap-1">
                  {detectedStrategy.objectives.map((obj: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Target Personas & Verticals */}
            {(detectedStrategy.target_personas.length > 0 || detectedStrategy.target_verticals.length > 0) && (
              <div className="flex gap-4">
                {detectedStrategy.target_personas.length > 0 && (
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">{t('agents:context.strategySave.targetPersonas')}</h4>
                    <div className="flex flex-wrap gap-1">
                      {detectedStrategy.target_personas.slice(0, 3).map((persona, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {persona}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {detectedStrategy.target_verticals.length > 0 && (
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">{t('agents:context.strategySave.targetVerticals')}</h4>
                    <div className="flex flex-wrap gap-1">
                      {detectedStrategy.target_verticals.map((vertical, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {vertical}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Executive Summary */}
            {detectedStrategy.executive_summary && (
              <div>
                <h4 className="text-sm font-medium mb-1">{t('agents:context.strategySave.summary')}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  {detectedStrategy.executive_summary}
                </p>
              </div>
            )}

            {/* Strategy Sections Preview */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('agents:context.strategySave.strategyComponents')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {detectedStrategy.sections.slice(0, 6).map((section, idx) => {
                  const Icon = getSectionIcon(section.type);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <Icon className="h-3 w-3 text-gray-500" />
                      <span className="truncate">{section.title}</span>
                    </div>
                  );
                })}
              </div>
              {detectedStrategy.sections.length > 6 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('agents:context.strategySave.moreSections', { count: detectedStrategy.sections.length - 6 })}
                </p>
              )}
            </div>

            {/* Save Options */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{t('agents:context.strategySave.saveTo')}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedSaveOption === 'campaign' ? 'default' : 'outline'}
                    onClick={() => setSelectedSaveOption('campaign')}
                    disabled={!campaignId || isSaved}
                  >
                    {t('agents:context.strategySave.campaignFolder')}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSaveOption === 'company' ? 'default' : 'outline'}
                    onClick={() => setSelectedSaveOption('company')}
                    disabled={isSaved}
                  >
                    {t('agents:context.strategySave.companyOutputs')}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveStrategy}
                    disabled={isSaved || isSaving}
                    size="sm"
                    className="bg-amber-600 hover:bg-slate-700"
                  >
                    {isSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        {t('agents:context.strategySave.saved')}
                      </>
                    ) : isSaving ? (
                      <>
                        <Save className="h-4 w-4 mr-1 animate-pulse" />
                        {t('agents:context.strategySave.saving')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        {t('agents:context.strategySave.saveStrategy')}
                      </>
                    )}
                  </Button>
                  {isSaved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = '/outputs'}
                    >
                      {t('agents:context.strategySave.viewInOutputs')}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Next Steps Hint */}
                {isSaved && (
                  <div className="text-xs text-gray-500">
                    {t('agents:context.strategySave.nextHint')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
