import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  MapPin,
  Building2,
  Users,
  DollarSign,
  Target,
  AlertCircle,
  Brain,
  User,
  Lightbulb
} from 'lucide-react';

interface PersonaData {
  id: string;
  name: string;
  persona_type?: string;
  title?: string;
  company_name?: string;
  industry?: string;
  location?: string | {
    city?: string;
    state_province?: string;
    country?: string;
  };
  company_size?: string;
  annual_revenue?: string;
  goals?: string[];
  pain_points?: string[];
  current_tools?: string[];
  preferred_channels?: string[];
  personality_traits?: {
    risk_tolerance?: string;
    innovation_appetite?: string;
    decision_speed?: string;
  };
  customer_status?: string;
  satisfaction_score?: number;
  background_story?: string;
  insights_count?: number;
  insights_summary?: any;
}

interface PersonaCardProps {
  persona: PersonaData;
  variant?: 'compact' | 'detailed';
}

export function PersonaCard({ persona, variant = 'detailed' }: PersonaCardProps) {
  const { t } = useTranslation('agents');

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex-1">
          <div className="font-medium text-sm">{persona.name}</div>
          <div className="text-xs text-muted-foreground">
            {persona.title && persona.company_name ?
              `${persona.title} ${t('context.personaCard.at')} ${persona.company_name}` :
              persona.persona_type || t('context.personaCard.customerPersona')
            }
          </div>
          {persona.industry && (
            <div className="text-xs text-muted-foreground mt-1">
              {persona.industry} • {
                typeof persona.location === 'object' && persona.location
                  ? [persona.location.city, persona.location.state_province, persona.location.country].filter(Boolean).join(', ')
                  : persona.location || t('context.personaCard.global')
              }
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {persona.customer_status && (
            <Badge
              variant={persona.customer_status === 'active' ? 'default' : 'secondary'}
              className="text-xs capitalize"
            >
              {persona.customer_status}
            </Badge>
          )}
          {persona.insights_count && persona.insights_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t('context.personaCard.insightsCount', { count: persona.insights_count })}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-base">{persona.name}</div>
          {persona.title && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {persona.title}
              {persona.company_name && ` ${t('context.personaCard.at')} ${persona.company_name}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {persona.satisfaction_score && (
            <Badge variant="outline" className="text-xs">
              {t('context.personaCard.satisfaction', { score: persona.satisfaction_score })}
            </Badge>
          )}
          {persona.customer_status && (
            <Badge
              variant={persona.customer_status === 'active' ? 'default' : 'secondary'}
              className="text-xs capitalize"
            >
              {persona.customer_status}
            </Badge>
          )}
        </div>
      </div>

      {/* Demographics */}
      {(persona.location || persona.industry || persona.company_size || persona.annual_revenue) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {persona.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('context.personaCard.location')}:</span>
              <span>{
                typeof persona.location === 'object'
                  ? [persona.location.city, persona.location.state_province, persona.location.country].filter(Boolean).join(', ')
                  : persona.location
              }</span>
            </div>
          )}
          {persona.industry && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('context.personaCard.industry')}:</span>
              <span>{persona.industry}</span>
            </div>
          )}
          {persona.company_size && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('context.personaCard.companySize')}:</span>
              <span>{persona.company_size}</span>
            </div>
          )}
          {persona.annual_revenue && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('context.personaCard.revenue')}:</span>
              <span>{persona.annual_revenue}</span>
            </div>
          )}
        </div>
      )}

      {/* Goals & Pain Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {persona.goals && persona.goals.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1 flex items-center gap-1">
              <Target className="h-3 w-3 text-brand-success" />
              {t('context.personaCard.goals')}
            </div>
            <ul className="text-xs space-y-1">
              {persona.goals.slice(0, 3).map((goal, i) => (
                <li key={i} className="text-muted-foreground">• {goal}</li>
              ))}
            </ul>
          </div>
        )}
        {persona.pain_points && persona.pain_points.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-brand-error" />
              {t('context.personaCard.painPoints')}
            </div>
            <ul className="text-xs space-y-1">
              {persona.pain_points.slice(0, 3).map((pain, i) => (
                <li key={i} className="text-muted-foreground">• {pain}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Personality Traits */}
      {persona.personality_traits && Object.keys(persona.personality_traits).length > 0 && (
        <div>
          <div className="font-medium text-sm mb-2 flex items-center gap-1">
            <Brain className="h-3 w-3 text-brand-info" />
            {t('context.personaCard.personality')}
          </div>
          <div className="flex flex-wrap gap-2">
            {persona.personality_traits.risk_tolerance && (
              <Badge variant="outline" className="text-xs">
                {t('context.personaCard.risk')}: {persona.personality_traits.risk_tolerance}
              </Badge>
            )}
            {persona.personality_traits.innovation_appetite && (
              <Badge variant="outline" className="text-xs">
                {t('context.personaCard.innovation')}: {persona.personality_traits.innovation_appetite}
              </Badge>
            )}
            {persona.personality_traits.decision_speed && (
              <Badge variant="outline" className="text-xs">
                {t('context.personaCard.decision')}: {persona.personality_traits.decision_speed}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Current Tools & Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {persona.current_tools && persona.current_tools.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1">{t('context.personaCard.currentTools')}</div>
            <div className="flex flex-wrap gap-1">
              {persona.current_tools.slice(0, 4).map((tool, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {persona.preferred_channels && persona.preferred_channels.length > 0 && (
          <div>
            <div className="font-medium text-sm mb-1">{t('context.personaCard.preferredChannels')}</div>
            <div className="flex flex-wrap gap-1">
              {persona.preferred_channels.slice(0, 4).map((channel, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {channel}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Background Story */}
      {persona.background_story && (
        <div>
          <div className="font-medium text-sm mb-1 flex items-center gap-1">
            <User className="h-3 w-3 text-brand-gold" />
            {t('context.personaCard.background')}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {persona.background_story.substring(0, 200)}
            {persona.background_story.length > 200 && '...'}
          </p>
        </div>
      )}

      {/* Insights Summary */}
      {persona.insights_count && persona.insights_count > 0 && (
        <div className="bg-slate-50 dark:bg-slate-950/20 rounded p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-sm flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-brand-gold" />
              {t('context.personaCard.aiInsights')}
            </div>
            <Badge variant="secondary" className="text-xs">
              {t('context.personaCard.insightsCount', { count: persona.insights_count })}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('context.personaCard.insightsAvailable')}
          </p>
        </div>
      )}
    </div>
  );
}
