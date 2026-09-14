/**
 * Match Status Badge Component
 * Shows visual indicator for campaign name matching status
 * Date: 2025-10-16
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { CampaignMatch } from '@/lib/utils/fuzzyMatch';

interface MatchStatusBadgeProps {
  match: CampaignMatch<any> | null;
  csvName: string;
}

export function MatchStatusBadge({ match /*, csvName */ }: MatchStatusBadgeProps) { // csvName unused in component
  const { t } = useTranslation('campaigns');

  if (!match) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t('performance.matchStatus.noMatch')}
        </Badge>
      </div>
    );
  }

  if (match.matchType === 'exact') {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {t('performance.matchStatus.exactMatch')}
        </Badge>
        <span className="text-sm text-muted-foreground">
          → {match.campaign.name}
        </span>
      </div>
    );
  }

  if (match.matchType === 'fuzzy') {
    const scorePercent = Math.round(match.score * 100);
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="gap-1 border-yellow-600 text-yellow-700 dark:text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          {t('performance.matchStatus.fuzzyMatch', { percent: scorePercent })}
        </Badge>
        <span className="text-sm text-muted-foreground">
          → {match.campaign.name}
        </span>
      </div>
    );
  }

  return null;
}
