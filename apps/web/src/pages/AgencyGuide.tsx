import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Users, Shield, TrendingUp, Target, Zap, MessageSquare, Download } from 'lucide-react';

export function AgencyGuide() {
  const navigate = useNavigate();
  const { t } = useTranslation('agency');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backButton')}
        </Button>
        <h1 className="text-4xl font-bold text-foreground mb-2">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      <div className="space-y-8 text-foreground">
        {/* Welcome Notice */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-300 dark:border-amber-600 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <BookOpen className="h-8 w-8 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">{t('privateAlpha.title')}</h2>
              <div className="space-y-2 text-amber-800 dark:text-amber-200">
                <p className="leading-relaxed">
                  <Trans i18nKey="privateAlpha.description" ns="agency">
                    You're using the <strong>free tier</strong> of STRAŦUM. We're actively building and improving the platform — your feedback helps shape what comes next.
                  </Trans>
                </p>
                <div className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-4 space-y-2">
                  <p className="font-semibold flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {t('privateAlpha.protectWork')}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-6">
                    <li>{t('privateAlpha.protectWorkItems.databaseReset')}</li>
                    <li><Trans i18nKey="privateAlpha.protectWorkItems.downloadData" ns="agency"><strong>Download valuable data regularly</strong> (strategies, content, insights)</Trans></li>
                    <li>{t('privateAlpha.protectWorkItems.useExport')}</li>
                    <li>{t('privateAlpha.protectWorkItems.feedbackValue')}</li>
                  </ul>
                </div>
                <p className="text-sm font-semibold flex items-center gap-2 mt-4">
                  <MessageSquare className="h-4 w-4" />
                  {t('privateAlpha.questionsTitle')}
                </p>
                <p className="text-sm">
                  <Trans i18nKey="privateAlpha.questionsDescription" ns="agency">
                    Click your profile picture in the top-right corner, then select <strong>"Send Feedback"</strong>. We read every message and use your input to make STRAŦUM better.
                  </Trans>
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Introduction */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 mr-3 text-primary" />
            <h2 className="text-2xl font-semibold">{t('introduction.title')}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t('introduction.description')}
          </p>
        </section>

        {/* Client Onboarding */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 mr-3 text-slate-600 dark:text-slate-400" />
            <h2 className="text-2xl font-semibold">{t('clientOnboarding.title')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">{t('clientOnboarding.firstClientSetup')}</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                <li><Trans i18nKey="clientOnboarding.steps.addClient" ns="agency"><strong>Add Client:</strong> Navigate to "Add Your First Client" button on the dashboard</Trans></li>
                <li><Trans i18nKey="clientOnboarding.steps.strategicFoundation" ns="agency"><strong>Strategic Foundation:</strong> Run Business Strategy Agent to establish strategic frameworks</Trans></li>
                <li><Trans i18nKey="clientOnboarding.steps.customerInsights" ns="agency"><strong>Customer Insights:</strong> Generate 3-5 personas using Persona Agent</Trans></li>
                <li><Trans i18nKey="clientOnboarding.steps.marketingDirection" ns="agency"><strong>Marketing Direction:</strong> Create initial marketing strategy with Marketing Strategy Agent</Trans></li>
              </ol>
            </div>
            <div className="bg-accent/50 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">{t('clientOnboarding.proTipLabel')}</p>
              <p className="text-sm text-muted-foreground">
                {t('clientOnboarding.proTipContent')}
              </p>
            </div>
          </div>
        </section>

        {/* Multi-Tenant Data */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 mr-3 text-green-500" />
            <h2 className="text-2xl font-semibold">{t('dataProtection.title')}</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              <Trans i18nKey="dataProtection.description" ns="agency">
                STRAŦUM keeps each client's data <strong className="text-foreground">completely separate and secure</strong>. Client A will never see Client B's information, and vice versa. This protection is built into the platform at the database level.
              </Trans>
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="font-semibold text-green-700 dark:text-green-400 mb-2">{t('dataProtection.doTitle')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-600 dark:text-green-500">
                  <li>{t('dataProtection.doItems.useSelector')}</li>
                  <li>{t('dataProtection.doItems.doubleCheck')}</li>
                  <li>{t('dataProtection.doItems.downloadRegularly')}</li>
                  <li>{t('dataProtection.doItems.lookForBadge')}</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="font-semibold text-red-700 dark:text-red-400 mb-2">{t('dataProtection.dontTitle')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-500">
                  <li>{t('dataProtection.dontItems.copySensitive')}</li>
                  <li>{t('dataProtection.dontItems.shareLogin')}</li>
                  <li>{t('dataProtection.dontItems.exportWithoutPermission')}</li>
                </ul>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">{t('dataProtection.alphaTipTitle')}</p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('dataProtection.alphaTipContent')}
              </p>
            </div>
          </div>
        </section>

        {/* Team Roles */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 mr-3 text-purple-500" />
            <h2 className="text-2xl font-semibold">{t('teamRoles.title')}</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground">{t('teamRoles.description')}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.agencyOwner.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.agencyOwner.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.agencyAdmin.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.agencyAdmin.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.accountManager.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.accountManager.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.strategist.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.strategist.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.campaignManager.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.campaignManager.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.analyst.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.analyst.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.creative.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.creative.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.freelancer.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.freelancer.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.clientViewer.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.clientViewer.description')}</p>
              </div>
              <div className="border rounded p-3">
                <p className="font-semibold">{t('teamRoles.roles.agencyViewer.title')}</p>
                <p className="text-sm text-muted-foreground">{t('teamRoles.roles.agencyViewer.description')}</p>
              </div>
            </div>
            <div className="bg-accent/50 p-4 rounded-lg">
              <p className="text-sm">
                <Trans i18nKey="teamRoles.inviteInstructions" ns="agency">
                  <strong>How to invite team members:</strong> Click your profile picture → Settings → Team Management. Assign roles based on what each person actually does, not their job title or seniority. Give people access to what they need - nothing more, nothing less.
                </Trans>
              </p>
            </div>
          </div>
        </section>

        {/* AI Agent Workflow */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Target className="h-6 w-6 mr-3 text-orange-500" />
            <h2 className="text-2xl font-semibold">{t('aiWorkflow.title')}</h2>
          </div>
          <div className="space-y-4">
            <p className="text-muted-foreground">{t('aiWorkflow.description')}</p>
            <div className="space-y-3">
              <div className="border-l-4 border-amber-500 pl-4 py-2">
                <p className="font-semibold">{t('aiWorkflow.phases.foundation.title')}</p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground ml-4 mt-1 space-y-1">
                  <li>{t('aiWorkflow.phases.foundation.steps.step1')}</li>
                  <li>{t('aiWorkflow.phases.foundation.steps.step2')}</li>
                  <li>{t('aiWorkflow.phases.foundation.steps.step3')}</li>
                </ol>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <p className="font-semibold">{t('aiWorkflow.phases.execution.title')}</p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground ml-4 mt-1 space-y-1">
                  <li>{t('aiWorkflow.phases.execution.steps.step1')}</li>
                  <li>{t('aiWorkflow.phases.execution.steps.step2')}</li>
                  <li>{t('aiWorkflow.phases.execution.steps.step3')}</li>
                </ol>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <p className="font-semibold">{t('aiWorkflow.phases.optimization.title')}</p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground ml-4 mt-1 space-y-1">
                  <li>{t('aiWorkflow.phases.optimization.steps.step1')}</li>
                  <li>{t('aiWorkflow.phases.optimization.steps.step2')}</li>
                </ol>
              </div>
            </div>
            <div className="bg-accent/50 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-1">{t('aiWorkflow.crossAgentTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('aiWorkflow.crossAgentContent')}
              </p>
            </div>
          </div>
        </section>

        {/* Campaign Management */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 mr-3 text-indigo-500" />
            <h2 className="text-2xl font-semibold">{t('campaignManagement.title')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('campaignManagement.lifecycleTitle')}</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                <li><Trans i18nKey="campaignManagement.lifecycleSteps.planning" ns="agency"><strong>Planning:</strong> Use Marketing Strategy Agent to define objectives and budget (70-20-10 rule)</Trans></li>
                <li><Trans i18nKey="campaignManagement.lifecycleSteps.content" ns="agency"><strong>Content Creation:</strong> Content Agent provides 9 tools (SEO blog, social media, email campaigns, etc.)</Trans></li>
                <li><Trans i18nKey="campaignManagement.lifecycleSteps.execution" ns="agency"><strong>Execution Tracking:</strong> Mark one strategy as "Active" per campaign, upload performance data via CSV</Trans></li>
                <li><Trans i18nKey="campaignManagement.lifecycleSteps.optimization" ns="agency"><strong>Optimization:</strong> Use Performance Intelligence Agent for quick wins insights and Budget Optimizer for allocation recommendations</Trans></li>
              </ol>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">{t('campaignManagement.multiClientTitle')}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
                <li>{t('campaignManagement.multiClientItems.selector')}</li>
                <li>{t('campaignManagement.multiClientItems.outputsHub')}</li>
                <li>{t('campaignManagement.multiClientItems.bulkOperations')}</li>
                <li>{t('campaignManagement.multiClientItems.comparison')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Performance Tracking */}
        <section className="bg-card border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-6 w-6 mr-3 text-yellow-500" />
            <h2 className="text-2xl font-semibold">{t('performanceTracking.title')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('performanceTracking.metricsTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-2">{t('performanceTracking.clientHealth.title')}</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>{t('performanceTracking.clientHealth.items.roi')}</li>
                    <li>{t('performanceTracking.clientHealth.items.content')}</li>
                    <li>{t('performanceTracking.clientHealth.items.alignment')}</li>
                    <li>{t('performanceTracking.clientHealth.items.budget')}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">{t('performanceTracking.agencyEfficiency.title')}</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>{t('performanceTracking.agencyEfficiency.items.timeSaved')}</li>
                    <li>{t('performanceTracking.agencyEfficiency.items.campaigns')}</li>
                    <li>{t('performanceTracking.agencyEfficiency.items.retention')}</li>
                    <li>{t('performanceTracking.agencyEfficiency.items.upsell')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-900/20 dark:to-purple-950/20 border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">{t('quickReference.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">{t('quickReference.tableHeaders.task')}</th>
                  <th className="text-left py-2 px-3">{t('quickReference.tableHeaders.navigation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.addClient.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.addClient.navigation')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.createPersona.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.createPersona.navigation')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.generateCalendar.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.generateCalendar.navigation')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.uploadPerformance.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.uploadPerformance.navigation')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.inviteTeam.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.inviteTeam.navigation')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">{t('quickReference.tasks.switchClients.task')}</td>
                  <td className="py-2 px-3 text-muted-foreground">{t('quickReference.tasks.switchClients.navigation')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Next Steps */}
        <section className="bg-primary/10 border-2 border-primary/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">{t('nextSteps.title')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
            <li>{t('nextSteps.steps.step1')}</li>
            <li>{t('nextSteps.steps.step2')}</li>
            <li>{t('nextSteps.steps.step3')}</li>
            <li>{t('nextSteps.steps.step4')}</li>
            <li>{t('nextSteps.steps.step5')}</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-primary/20">
            <p className="text-sm italic text-muted-foreground">
              <Trans i18nKey="nextSteps.remember" ns="agency">
                <strong>Remember:</strong> STRAŦUM provides "Intelligence Over Execution" - focus on strategic insights, not tactical automation. Let the AI agents build context progressively through natural conversations.
              </Trans>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">{t('footer.feedbackTitle')}</h3>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 max-w-2xl mx-auto mb-4">
              {t('footer.feedbackDescription')}
            </p>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t('footer.feedbackCta')}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              {t('footer.feedbackNote')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t('footer.lastUpdated')}</p>
        </div>
      </div>
    </div>
  );
}
