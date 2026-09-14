import { type CampaignMetric } from '@/hooks/data/useCampaignMetrics';

export interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
  mapped: Partial<CampaignMetric>;
  errors: string[];
  duplicateOf?: {
    campaign_name: string;
    metric_date: string;
    source: string;
  };
  isValid: boolean;
  isDuplicate: boolean;
}
