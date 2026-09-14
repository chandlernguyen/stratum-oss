import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Building,
  MapPin,
  Briefcase,
  Target,
  AlertTriangle,
  Quote,
  DollarSign,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authService';
import { useInvalidateResources } from '@/hooks/useInvalidateResources';

interface PersonaData {
  name: string;
  title: string;
  company_name: string;
  industry: string;
  vertical?: string;
  location?: string;
  company_size?: string;
  annual_revenue?: string;
  demographics?: any;
  goals?: string[];
  pain_points?: string[];
  jobs_to_be_done?: string[];
  current_tools?: string[];
  decision_criteria?: any;
  objections?: string[];
  preferred_channels?: string[];
  personality_traits?: any;
  customer_status?: string;
  satisfaction_score?: number;
  background_story?: string;
  key_quote?: string;
}

interface PersonaSaveButtonsProps {
  detectedPersonas: PersonaData[];
  campaignId?: string;
  clientId?: string;
}

export function PersonaSaveButtons({
  detectedPersonas,
  campaignId,
  clientId
}: PersonaSaveButtonsProps) {
  const { t } = useTranslation(['agents']);
  const [expandedPersonas, setExpandedPersonas] = useState<Set<number>>(new Set([0])); // Expand first by default
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [savingIndexes, setSavingIndexes] = useState<Set<number>>(new Set());
  const { invalidatePersonas, invalidateAgentOutputs } = useInvalidateResources();

  // Check if personas were already auto-saved by the agent
  // Personas with IDs (from agent function calls) should be marked as saved
  useEffect(() => {
    const autoSavedIndexes = new Set<number>();
    detectedPersonas.forEach((persona: any, index) => {
      // If persona has an ID, it was already saved by the agent
      if (persona.id || persona.persona_id) {
        autoSavedIndexes.add(index);
      }
    });
    if (autoSavedIndexes.size > 0) {
      setSavedIndexes(autoSavedIndexes);

      // Database-First: Invalidate cache when auto-saved personas are detected
      // This triggers automatic refresh of sidebar and all persona lists
      invalidatePersonas();
      invalidateAgentOutputs('persona');
      console.log(`[PersonaSaveButtons] Detected ${autoSavedIndexes.size} auto-saved personas, invalidated cache`);
    }
  }, [detectedPersonas, invalidatePersonas, invalidateAgentOutputs]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedPersonas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPersonas(newExpanded);
  };

  const handleSavePersona = async (persona: PersonaData, index: number) => {
    setSavingIndexes(prev => new Set([...prev, index]));

    try {
      // Debug logging
      console.log('[PersonaSaveButtons] Saving persona with context:', {
        campaignId,
        clientId,
        hasPersona: !!persona
      });

      const response = await authFetch(`${API_BASE_URL}/api/v1/save-detected-persona`, {
        method: 'POST',
        body: JSON.stringify({
          ...persona,
          campaign_id: campaignId,
          client_id: clientId
        })
      });

      if (response.ok) {
        await response.json(); // Parse response but don't need the data
        setSavedIndexes(prev => new Set([...prev, index]));
        toast.success(`Saved persona: ${persona.name}`);

        // Database-First: Invalidate React Query cache to trigger automatic UI refresh
        // This refreshes ALL persona lists across the app (sidebar, pages, selectors, etc.)
        invalidatePersonas();
        invalidateAgentOutputs('persona'); // Also refresh agent outputs views
      } else {
        const error = await response.json();
        toast.error(`Failed to save persona: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      toast.error('Failed to save persona');
    } finally {
      setSavingIndexes(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
    for (let i = 0; i < detectedPersonas.length; i++) {
      if (!savedIndexes.has(i)) {
        await handleSavePersona(detectedPersonas[i], i);
      }
    }
  };

  if (!detectedPersonas || detectedPersonas.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
          <UserPlus className="w-4 h-4" />
          {t('agents:context.personaSave.detected', { count: detectedPersonas.length })}
        </div>
        {detectedPersonas.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAll}
            disabled={savedIndexes.size === detectedPersonas.length}
            className="text-amber-600 border-amber-300 hover:bg-slate-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {t('agents:context.personaSave.saveAll')}
          </Button>
        )}
      </div>
      
      {detectedPersonas.map((persona, index) => (
        <Card 
          key={index} 
          className="p-4 border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-amber-50/50 dark:from-slate-900/20 dark:to-amber-900/20"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {persona.name || `Persona ${index + 1}`}
                  </h4>
                  {persona.customer_status && (
                    <Badge 
                      variant="secondary"
                      className={
                        persona.customer_status === 'active' ? 'bg-green-100 text-green-700' :
                        persona.customer_status === 'churned' ? 'bg-red-100 text-red-700' :
                        persona.customer_status === 'competitor_user' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }
                    >
                      {persona.customer_status}
                    </Badge>
                  )}
                  {persona.satisfaction_score !== null && persona.satisfaction_score !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Satisfaction: {persona.satisfaction_score}/10
                    </Badge>
                  )}
                </div>
                {persona.title && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Briefcase className="w-3 h-3" />
                    {persona.title}
                  </p>
                )}
                {persona.company_name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {persona.company_name}
                    {persona.company_size && ` (${persona.company_size})`}
                  </p>
                )}
                {persona.industry && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Industry: {persona.industry} {persona.vertical && `• ${persona.vertical}`}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleExpanded(index)}
                  className="h-8 w-8 p-0"
                >
                  {expandedPersonas.has(index) ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSavePersona(persona, index)}
                  disabled={savedIndexes.has(index) || savingIndexes.has(index)}
                  className={savedIndexes.has(index) ? 
                    "bg-green-600 hover:bg-green-700" : 
                    "bg-amber-600 hover:bg-slate-700"
                  }
                >
                  {savingIndexes.has(index) ? (
                    <>
                      <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('agents:context.personaSave.saving')}
                    </>
                  ) : savedIndexes.has(index) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      {t('agents:context.personaSave.saved')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      {t('agents:context.personaSave.savePersona')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPersonas.has(index) && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                {/* Location & Revenue */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {persona.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {typeof persona.location === 'object' && persona.location !== null
                          ? [
                              (persona.location as any).city,
                              (persona.location as any).state_province,
                              (persona.location as any).country
                            ].filter(Boolean).join(', ') || (persona.location as any).description || 'Location not specified'
                          : persona.location}
                      </span>
                    </div>
                  )}
                  {persona.annual_revenue && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700 dark:text-gray-300">{persona.annual_revenue}</span>
                    </div>
                  )}
                </div>

                {/* Demographics */}
                {persona.demographics && Object.keys(persona.demographics).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('agents:context.personaSave.demographics')}</span>
                    </div>
                    <div className="ml-6 text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                      {Object.entries(persona.demographics).map(([key, value]) => (
                        <div key={key}>
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>: {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Goals */}
                {persona.goals && persona.goals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('agents:context.personaSave.goals')}</span>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {persona.goals.slice(0, 3).map((goal, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                          • {goal}
                        </li>
                      ))}
                      {persona.goals.length > 3 && (
                        <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {t('agents:context.personaSave.moreItems', { count: persona.goals.length - 3 })}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                
                {/* Pain Points */}
                {persona.pain_points && persona.pain_points.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('agents:context.personaSave.painPoints')}</span>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {persona.pain_points.slice(0, 3).map((pain, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                          • {pain}
                        </li>
                      ))}
                      {persona.pain_points.length > 3 && (
                        <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {t('agents:context.personaSave.moreItems', { count: persona.pain_points.length - 3 })}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Key Quote */}
                {persona.key_quote && (
                  <div className="flex items-start gap-2">
                    <Quote className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm italic text-gray-700 dark:text-gray-300">
                      "{persona.key_quote}"
                    </p>
                  </div>
                )}

                {/* Background Story */}
                {persona.background_story && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <p className="line-clamp-3">{persona.background_story}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}