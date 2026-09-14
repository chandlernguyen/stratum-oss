import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContextAlert } from '@/components/agents/ContextAlert'
import { ArrowLeft, LineChart } from 'lucide-react'
import { CSVUploadWizard } from '@/components/roi-budget/CSVUploadWizard'
import { CSVUploadWithCampaignMapping } from '@/components/performance/CSVUploadWithCampaignMapping'
import { CampaignMetricsManager } from '@/components/roi-budget/CampaignMetricsManager'
import { HistoricalPerformanceCharts } from '@/components/roi-budget/HistoricalPerformanceCharts'
import { ROICalculatorForm } from '@/components/roi-budget/ROICalculatorForm'
import { CampaignDataEntryForm } from '@/components/roi-budget/CampaignDataEntryForm'
import { BudgetOptimizerForm } from '@/components/roi-budget/BudgetOptimizerForm'
import { useClientContext } from '@/contexts/ClientContext'
import { buildAgentRootUrl } from '@/utils/multiTenantRouting'

/**
 * Performance Intelligence Tool Router
 * Routes to specific tools based on URL parameter
 */
export function PerformanceIntelligenceTool() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const { clientSlug } = useClientContext(); // Get client context from provider

  // Helper functions to navigate while preserving client context
  const navigateToTool = (tool: string) => {
    const toolUrl = clientSlug
      ? `/clients/${clientSlug}/performance-intelligence/tool/${tool}`
      : `/performance-intelligence/tool/${tool}`;
    navigate(toolUrl);
  };

  const navigateToDashboard = () => {
    navigate(buildAgentRootUrl('performance_intelligence', clientSlug));
  };

  // Tool metadata
  const toolInfo = {
    upload: { title: 'Import Data', description: 'CSV import wizard with column mapping and validation' },
    'upload-v2': { title: 'Import with Campaign Matching', description: 'CSV import with intelligent campaign name matching (Phase 2)' },
    'data-manager': { title: 'Manage Campaign Metrics', description: 'View, edit, and manage your campaign performance data' },
    charts: { title: 'Historical Performance', description: 'Visualize spend, revenue, and ROI trends over time' },
    calculator: { title: 'ROI Calculator', description: 'Calculate return on investment with campaign data' },
    'manual-entry': { title: 'Manual Data Entry', description: 'Quick entry for single campaign metrics' },
    'budget-optimizer': { title: 'Budget Optimizer', description: 'Optimize budget allocation with 4 AI-powered frameworks' },
  }[toolId || ''] || { title: 'Performance Tool', description: 'Performance analysis tool' };

  // Render tool-specific component
  const renderTool = () => {
    switch (toolId) {
      case 'upload':
        return (
          <CSVUploadWizard
            onComplete={() => navigateToTool('data-manager')}
            onCancel={navigateToDashboard}
          />
        );
      case 'upload-v2':
        return (
          <CSVUploadWithCampaignMapping
            onComplete={() => navigateToTool('data-manager')}
            onCancel={navigateToDashboard}
          />
        );
      case 'data-manager':
        return <CampaignMetricsManager />;
      case 'charts':
        return <HistoricalPerformanceCharts />;
      case 'calculator':
        return <ROICalculatorForm />;
      case 'manual-entry':
        return (
          <CampaignDataEntryForm
            onSuccess={() => navigateToTool('data-manager')}
            onCancel={navigateToDashboard}
          />
        );
      case 'budget-optimizer':
        return <BudgetOptimizerForm />;
      default:
        return (
          <Card className="p-12 text-center">
            <h3 className="text-xl font-bold mb-2">Tool Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The requested tool could not be found.
            </p>
            <Button onClick={navigateToDashboard}>
              Back to Dashboard
            </Button>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-10">
        <ContextAlert />

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={navigateToDashboard}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Tool Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
              <LineChart className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                {toolInfo.title}
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-2">
                {toolInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tool Content */}
        <div className="mb-8">
          {renderTool()}
        </div>
      </div>
    </div>
  );
}
