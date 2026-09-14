/**
 * Campaign Selector Component
 * Dropdown for selecting campaign during CSV mapping
 * Date: 2025-10-16
 */

import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger /*, SelectValue */ } from '@/components/ui/select'; // SelectValue unused
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { CampaignMatch } from '@/lib/utils/fuzzyMatch';
import type { Campaign } from '@/hooks/data/useCampaigns'; // Use canonical Campaign type
import { getIntlLocale } from '@/lib/locales';

interface CampaignSelectorProps {
  csvName: string;
  match: CampaignMatch<Campaign> | null;
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  onSelect: (campaignId: string) => void;
  onCreateNew?: (csvName: string) => void;
}

export function CampaignSelector({
  csvName,
  match,
  campaigns,
  selectedCampaignId,
  onSelect,
  onCreateNew
}: CampaignSelectorProps) {
  const { t, i18n } = useTranslation('campaigns');
  const intlLocale = getIntlLocale(i18n.language);

  // Find the selected campaign to display its name
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCampaignId || ''} onValueChange={onSelect}>
        <SelectTrigger className="w-[300px]">
          <span className="text-gray-900 dark:text-gray-100">
            {selectedCampaign?.name || t('performance.selector.selectCampaign')}
          </span>
        </SelectTrigger>
        <SelectContent>
          {campaigns.map(campaign => {
            const isMatched = match?.campaign.id === campaign.id;
            return (
              <SelectItem key={campaign.id} value={campaign.id}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {campaign.name}
                    {isMatched && match.matchType === 'exact' && (
                      <span className="ml-2 text-xs text-green-600">{t('performance.selector.exactMatch')}</span>
                    )}
                    {isMatched && match.matchType === 'fuzzy' && (
                      <span className="ml-2 text-xs text-yellow-600">
                        ~ {Math.round(match.score * 100)}%
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {campaign.status || t('performance.selector.noStatus')}
                    {campaign.start_date && ` • ${t('performance.selector.starts')} ${new Date(campaign.start_date).toLocaleDateString(intlLocale)}`}
                    {campaign.budget_cents && ` • $${(campaign.budget_cents / 100).toFixed(2)}`}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {onCreateNew && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateNew(csvName)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('performance.selector.createNew')}
        </Button>
      )}
    </div>
  );
}
