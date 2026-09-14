import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles, Upload, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

interface OpportunityEmptyStateProps {
  variant: 'no-data' | 'no-opportunities';
  onStartChat?: () => void;
}

export function OpportunityEmptyState({ variant, onStartChat }: OpportunityEmptyStateProps) {
  const { clientSlug } = useClientContext();
  if (variant === 'no-data') {
    return (
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
        <CardContent className="text-center py-16">
          <AlertCircle className="mx-auto h-16 w-16 text-amber-400 mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Import Campaign Data First
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
            Opportunity Intelligence analyzes your campaign performance to identify
            high-impact, low-effort improvements. Import your campaign metrics to unlock
            personalized, data-driven recommendations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Link to={buildContextAwareUrl("/performance-intelligence/tool/upload-v2", clientSlug) || "/performance-intelligence/tool/upload-v2"} className="flex-1">
              <Button size="lg" className="w-full bg-amber-600 hover:bg-amber-700">
                <Upload className="mr-2 h-5 w-5" />
                Import Campaign Metrics
              </Button>
            </Link>
            <Link to={buildContextAwareUrl("/performance-intelligence/tool/manual-entry", clientSlug) || "/performance-intelligence/tool/manual-entry"} className="flex-1">
              <Button size="lg" variant="outline" className="w-full">
                Manual Entry
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              What You'll Get:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                <span>High-impact opportunities ranked by ROI</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
                <span>Step-by-step implementation guides</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-500 flex-shrink-0" />
                <span>Effort vs impact analysis</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // variant === 'no-opportunities'
  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
      <CardContent className="text-center py-16">
        <Sparkles className="mx-auto h-16 w-16 text-amber-400 mb-6" />
        <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          No Opportunities Identified Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
          Chat with the Opportunity Intelligence Agent to analyze your marketing
          performance and identify high-impact, low-effort opportunities for growth.
        </p>

        <Button
          size="lg"
          className="bg-amber-600 hover:bg-amber-700"
          onClick={onStartChat}
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          Identify Opportunities
        </Button>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            The Agent Will Analyze:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Campaign performance data</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Marketing strategy outputs</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>Content performance</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
