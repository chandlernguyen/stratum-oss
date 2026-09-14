import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/config/routes';
import { PersonaInterviewChat } from '@/components/agents/PersonaInterviewChat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MessageSquare, Brain } from 'lucide-react';
import { usePersona } from '@/hooks/data/usePersonas';
import { useClientContext } from '@/contexts/ClientContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import { AgentTabs } from '@/components/agents/AgentTabs';
import { extractInterviewParams } from '@/utils/wildcardRouteParams';

export function PersonaInterview() {
  const { t } = useTranslation('agents');

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('persona.interview.pageTitle'));

  // Use wildcard route params extraction (route is agents/persona/interview/*)
  const params = useParams<{ '*': string }>();
  const { personaId, sessionId } = extractInterviewParams(params['*']);
  const navigate = useNavigate();
  const { clientSlug } = useClientContext(); // Get client context from provider
  const [activeTab, setActiveTab] = useState<string>('interview');

  // Database-First approach: Use direct Supabase hook
  const { data: persona, isLoading: loading, error } = usePersona(personaId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('persona.interview.loading.title')}</p>
        </div>
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('persona.interview.loading.error')}</p>
          <Button
            onClick={() => navigate(buildContextAwareUrl('/persona', clientSlug) || ROUTES.agents.persona.root)}
            className="mt-4"
          >
            {t('persona.interview.loading.returnButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header - Mobile optimized */}
      <div className="border-b bg-white dark:bg-gray-900">
        <div className="container mx-auto px-3 md:px-6 py-2 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(buildContextAwareUrl('/persona', clientSlug) || ROUTES.agents.persona.root)}
                className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
              >
                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t('persona.interview.header.backToPersonaAgent')}</span>
                <span className="sm:hidden">{t('persona.interview.header.back')}</span>
              </Button>
              <div className="h-4 md:h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-1 md:gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                <span className="font-semibold text-sm md:text-base">{t('persona.interview.header.interviewMode')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs (hidden on desktop) */}
      <AgentTabs
        tabs={[
          {
            id: 'interview',
            label: t('persona.interview.tabs.interview'),
            icon: MessageSquare,
          },
          {
            id: 'insights',
            label: t('persona.interview.tabs.liveInsights'),
            icon: Brain,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1">
        <Card className="h-[calc(100vh-5rem)] mx-auto max-w-full shadow-none rounded-none border-0">
          <PersonaInterviewChat
            persona={persona}
            sessionId={sessionId}
            activeTab={activeTab}
          />
        </Card>
      </div>
    </div>
  );
}