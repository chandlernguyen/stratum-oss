/**
 * ApprovalQueue Component
 *
 * Dashboard widget showing pending approval requests.
 * Allows quick resolution (approve/reject/request changes).
 */

import { Link } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useApprovals,
  type ApprovalRequest,
  type ApprovalPriority,
} from '@/hooks/data/useCollaboration';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/useLocale';

interface ApprovalQueueProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
}

const priorityConfig: Record<ApprovalPriority, { icon: React.ReactNode; color: string }> = {
  low: { icon: null, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  normal: { icon: null, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  high: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  urgent: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

function ApprovalItem({
  approval,
  t,
  formatRelativeTime,
}: {
  approval: ApprovalRequest;
  t: (key: string, options?: Record<string, unknown>) => string;
  formatRelativeTime: (date: Date) => string;
}) {
  const priority = priorityConfig[approval.priority];

  // Generate the view URL based on resource type
  const getViewUrl = () => {
    if (approval.resource_type === 'output' && approval.resource_id) {
      return `/outputs/${approval.resource_id}`;
    }
    return null;
  };

  const viewUrl = getViewUrl();
  const priorityLabel = t(`approvals.priority.${approval.priority}`);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="mt-0.5">
        <Shield className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {approval.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('approvals.from', { name: approval.requester_name || 'Unknown' })} &middot;{' '}
              {formatRelativeTime(new Date(approval.created_at))}
            </p>
          </div>
          <Badge className={cn('text-xs flex-shrink-0', priority.color)}>
            {priority.icon}
            {priorityLabel}
          </Badge>
        </div>

        {approval.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {approval.description}
          </p>
        )}

        {/* Primary Action: View & Review */}
        <div className="flex items-center gap-2 mt-2">
          {viewUrl ? (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              asChild
            >
              <Link to={viewUrl}>
                <Eye className="h-3 w-3" />
                {t('approvals.reviewContent')}
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              {t('approvals.contentNotAvailable')}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {t('approvals.viewToApprove')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ApprovalQueue({ className, maxItems = 5, showHeader = true }: ApprovalQueueProps) {
  const { data, isLoading } = useApprovals({ assigned_to_me: true, status: 'pending' });
  const { t, formatRelativeTime } = useLocale('common');

  const approvals = data?.approvals.slice(0, maxItems) || [];
  const totalPending = data?.pending_count || 0;

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {t('approvals.title')}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {t('approvals.title')}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('approvals.noPending')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('approvals.allCaughtUp')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {t('approvals.title')}
              {totalPending > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalPending}
                </Badge>
              )}
            </CardTitle>
            {totalPending > maxItems && (
              <Link
                to="/approvals"
                className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
              >
                {t('approvals.viewAll')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <ScrollArea className={approvals.length > 3 ? 'h-[320px]' : undefined}>
          <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
            {approvals.map((approval) => (
              <ApprovalItem
                key={approval.id}
                approval={approval}
                t={t}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
