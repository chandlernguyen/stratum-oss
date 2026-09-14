/**
 * Campaign Mapping Wizard Component
 * Guided CSV import flow with fuzzy matching
 * Date: 2025-10-16
 * Pattern: Industry-standard CSV mapping (Flatfile, OneSchema)
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MatchStatusBadge } from './MatchStatusBadge';
import { CampaignSelector } from './CampaignSelector';
import { extractUniqueCampaignNames, findBestCampaignMatch, type CampaignMatch } from '@/lib/utils/fuzzyMatch';
import { useCampaigns, type Campaign } from '@/hooks/data/useCampaigns'; // Use canonical Campaign type
import { useImportCampaignMetricsWithMapping, type CampaignMetricRow } from '@/hooks/data/useCampaignMetrics';
import { toast } from 'sonner';

interface CampaignMapping {
  csvName: string;
  match: CampaignMatch<Campaign> | null;
  selectedCampaignId: string | null;
}

interface CampaignMappingWizardProps {
  csvData: CampaignMetricRow[];
  onImportComplete: () => void;
  onCancel: () => void;
}

export function CampaignMappingWizard({ csvData, onImportComplete, onCancel }: CampaignMappingWizardProps) {
  const { t } = useTranslation('campaigns');
  const [mappings, setMappings] = useState<CampaignMapping[]>([]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaigns({
    includeArchived: false
  });

  const importMutation = useImportCampaignMetricsWithMapping();

  // Step 1: Extract unique campaign names from CSV
  const csvCampaignNames = useMemo(() =>
    extractUniqueCampaignNames(csvData, 'campaign_name'),
    [csvData]
  );

  // Step 2: Auto-match campaigns with fuzzy logic
  useEffect(() => {
    if (!campaigns || campaigns.length === 0) return;

    const initialMappings: CampaignMapping[] = csvCampaignNames.map(csvName => {
      const match = findBestCampaignMatch(csvName, campaigns, 0.8);

      return {
        csvName,
        match,
        selectedCampaignId: match?.campaign.id || null
      };
    });

    setMappings(initialMappings);
  }, [csvCampaignNames, campaigns]);

  // Step 3: User can override mappings
  const handleMappingChange = (csvName: string, campaignId: string) => {
    setMappings(prev => prev.map(m =>
      m.csvName === csvName
        ? {
            ...m,
            selectedCampaignId: campaignId,
            match: campaigns.find(c => c.id === campaignId)
              ? { campaign: campaigns.find(c => c.id === campaignId)!, matchType: 'exact', score: 1.0 }
              : m.match
          }
        : m
    ));
  };

  // Step 4: Import with populated campaign_id
  const handleImport = async () => {
    // Validation: Ensure all campaigns are mapped
    const unmappedCampaigns = mappings.filter(m => !m.selectedCampaignId);

    if (unmappedCampaigns.length > 0) {
      toast.error(
        t('performance.mapping.unmappedError', { count: unmappedCampaigns.length }),
        {
          description: unmappedCampaigns.map(m => m.csvName).join(', ')
        }
      );
      return;
    }

    try {
      // Create mapping dictionary
      const mappingDict = new Map<string, string>();
      mappings.forEach(m => {
        if (m.selectedCampaignId) {
          mappingDict.set(m.csvName, m.selectedCampaignId);
        }
      });

      // Call the API with metrics and mappings
      await importMutation.mutateAsync({
        metrics: csvData,
        mappings: mappingDict
      });

      // On success, call the completion callback
      onImportComplete();
    } catch (error) {
      console.error('[CampaignMappingWizard] Import error:', error);
      // Error handling is done by the mutation hook
    }
  };

  // Calculate match statistics
  const stats = useMemo(() => {
    const exact = mappings.filter(m => m.match?.matchType === 'exact').length;
    const fuzzy = mappings.filter(m => m.match?.matchType === 'fuzzy').length;
    const none = mappings.filter(m => !m.match).length;
    const mapped = mappings.filter(m => m.selectedCampaignId).length;

    return { exact, fuzzy, none, mapped, total: mappings.length };
  }, [mappings]);

  if (campaignsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <Alert>
        <Upload className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-4">
          <span>
            <strong>{t('performance.mapping.metricsFound', { count: csvData.length })}</strong>{' '}
            {t('performance.mapping.acrossCampaigns', { count: stats.total })}
          </span>
          {stats.exact > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {t('performance.mapping.exactMatches', { count: stats.exact })}
            </span>
          )}
          {stats.fuzzy > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3 w-3" />
              {t('performance.mapping.fuzzyMatches', { count: stats.fuzzy })}
            </span>
          )}
          {stats.none > 0 && (
            <span className="text-red-600">
              {t('performance.mapping.needManualMapping', { count: stats.none })}
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('performance.mapping.title')}</CardTitle>
          <CardDescription>
            {t('performance.mapping.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">{t('performance.mapping.csvCampaignName')}</TableHead>
                <TableHead className="w-[200px]">{t('performance.mapping.matchStatus')}</TableHead>
                <TableHead>{t('performance.mapping.selectCampaign')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(mapping => (
                <TableRow key={mapping.csvName}>
                  <TableCell className="font-medium">
                    {mapping.csvName}
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('performance.mapping.metricsCount', { count: csvData.filter(r => r.campaign_name === mapping.csvName).length })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <MatchStatusBadge
                      match={mapping.match}
                      csvName={mapping.csvName}
                    />
                  </TableCell>
                  <TableCell>
                    <CampaignSelector
                      csvName={mapping.csvName}
                      match={mapping.match}
                      campaigns={campaigns}
                      selectedCampaignId={mapping.selectedCampaignId}
                      onSelect={(campaignId) => handleMappingChange(mapping.csvName, campaignId)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {t('performance.mapping.mappedCount', { mapped: stats.mapped, total: stats.total })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={importMutation.isPending}>
              {t('common:buttons.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || stats.mapped !== stats.total}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('performance.mapping.importing')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('performance.mapping.importMetrics', { count: csvData.length })}
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
