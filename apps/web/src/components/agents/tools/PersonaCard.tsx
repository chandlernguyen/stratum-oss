import { useState } from 'react';
import type { Persona } from '@/types/agentTools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronUp, ChevronDown, User, Map, Heart, Target, ThumbsDown, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PersonaCardProps {
  data: Persona;
  isExpertMode?: boolean;
}

export function PersonaCard({ data, isExpertMode = false }: PersonaCardProps) {
  const [isExpanded, setIsExpanded] = useState(!isExpertMode);
  const { t } = useTranslation('agents');

  interface InfoSectionProps {
    title: string;
    content: string | string[];
    icon: React.ComponentType<{ className?: string }>;
  }

  const InfoSection = ({ title, content, icon: Icon }: InfoSectionProps) => (
    <div>
      <h4 className="font-semibold text-base mb-2 flex items-center text-brand-charcoal dark:text-gray-100">
        <Icon className="w-5 h-5 mr-2 text-brand-slate" />
        {title}
      </h4>
      {Array.isArray(content) ? (
        <ul className="list-disc list-inside space-y-1 text-sm text-brand-charcoal dark:text-gray-300">
          {content.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-brand-charcoal dark:text-gray-300">{content}</p>
      )}
    </div>
  );

  return (
    <Card className="w-full  my-4 tool-output" data-agent="persona">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-md">
            <User className="w-6 h-6 text-brand-gold dark:text-slate-300" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('toolRenderers.persona.title')}</CardTitle>
            <CardDescription>{data.name}</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-4">
          <div className="space-y-6">
            <InfoSection title={t('toolRenderers.persona.demographics')} content={data.demographics} icon={Map} />
            <InfoSection title={t('toolRenderers.persona.psychographics')} content={data.psychographics} icon={Heart} />
            <InfoSection title={t('toolRenderers.persona.goals')} content={data.goals} icon={Target} />
            <InfoSection title={t('toolRenderers.persona.painPoints')} content={data.pain_points} icon={ThumbsDown} />
            <InfoSection title={t('toolRenderers.persona.communicationChannels')} content={data.communication_channels} icon={MessageSquare} />
          </div>
          <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline">{t('toolRenderers.common.saveToWorkspace')}</Button>
            <Button>{t('toolRenderers.persona.mapBuyerJourney')}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
