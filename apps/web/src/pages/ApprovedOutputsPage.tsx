/**
 * ApprovedOutputsPage - Source of Truth for Approved Content
 *
 * Shows all outputs that have been approved through the multi-round approval workflow.
 * This is the definitive list of content ready for use/publishing.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Search, Filter, Calendar, User, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ViewOutputDialog } from '@/components/ViewOutputDialog';
import { useApprovedOutputs } from '@/hooks/data/useCollaboration';
import { useClientContext } from '@/contexts/ClientContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Agent type display configuration - labels are now i18n keys
const AGENT_TYPE_CONFIG: Record<string, { labelKey: string; color: string }> = {
  business_strategy: { labelKey: 'approved.agentTypes.businessStrategy', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  persona: { labelKey: 'approved.agentTypes.customerPersona', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  marketing_strategy: { labelKey: 'approved.agentTypes.marketingStrategy', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  content: { labelKey: 'approved.agentTypes.content', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  campaign_planning: { labelKey: 'approved.agentTypes.campaign', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  performance_intelligence: { labelKey: 'approved.agentTypes.performance', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  competitive_intelligence: { labelKey: 'approved.agentTypes.competitiveIntel', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  client_success: { labelKey: 'approved.agentTypes.clientSuccess', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
};

export function ApprovedOutputsPage() {
  const { t } = useTranslation('outputs');
  usePageTitle(t('approved.title'));

  const { clientId, clientData } = useClientContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
  const [selectedOutput, setSelectedOutput] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // For Agency users in client context, filter by client_id
  // For SME users (no client context), show all org-level outputs
  const { data: approvedOutputs, isLoading, error } = useApprovedOutputs({
    clientId: clientId || undefined,
    agentType: agentTypeFilter === 'all' ? undefined : agentTypeFilter,
  });

  // Filter by search query
  const filteredOutputs = (approvedOutputs || []).filter((output) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      output.title?.toLowerCase().includes(query) ||
      output.summary?.toLowerCase().includes(query) ||
      output.agent_type?.toLowerCase().includes(query)
    );
  });

  const handleOpenOutput = (output: any) => {
    setSelectedOutput(output);
    setDialogOpen(true);
  };

  const handleExportAll = () => {
    const exportData = filteredOutputs.map((output) => ({
      title: output.title,
      summary: output.summary,
      agent_type: output.agent_type,
      approved_at: output.approved_at,
      approver: output.approver_name,
      approval_round: output.approval_round,
      content: output.content,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approved-outputs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique agent types for filter
  const uniqueAgentTypes = Array.from(
    new Set((approvedOutputs || []).map((o) => o.agent_type).filter(Boolean))
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              Error loading approved outputs: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-brand-success/10">
            <CheckCircle className="h-6 w-6 text-brand-success" />
          </div>
          <h1 className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
            {clientData?.client_info?.name ? `${clientData.client_info.name} - ${t('approved.title')}` : t('approved.title')}
          </h1>
        </div>
        <p className="text-brand-slate dark:text-gray-400">
          {clientData?.client_info?.name
            ? t('approved.subtitleWithClient', { clientName: clientData.client_info.name })
            : t('approved.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('approved.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('approved.filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('approved.allTypes')}</SelectItem>
            {uniqueAgentTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {AGENT_TYPE_CONFIG[type] ? t(AGENT_TYPE_CONFIG[type].labelKey) : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filteredOutputs.length > 0 && (
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            {t('actions.exportAll')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-brand-slate dark:text-gray-400">{t('approved.stats.totalApproved')}</p>
            <p className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {approvedOutputs?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-brand-slate dark:text-gray-400">{t('approved.stats.thisMonth')}</p>
            <p className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {(approvedOutputs || []).filter((o) => {
                const approvedDate = new Date(o.approved_at);
                const now = new Date();
                return (
                  approvedDate.getMonth() === now.getMonth() &&
                  approvedDate.getFullYear() === now.getFullYear()
                );
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-brand-slate dark:text-gray-400">{t('approved.stats.contentTypes')}</p>
            <p className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {uniqueAgentTypes.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-brand-slate dark:text-gray-400">{t('approved.stats.avgRounds')}</p>
            <p className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {approvedOutputs && approvedOutputs.length > 0
                ? (
                    approvedOutputs.reduce((sum, o) => sum + (o.approval_round || 1), 0) /
                    approvedOutputs.length
                  ).toFixed(1)
                : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Output List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOutputs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-brand-charcoal dark:text-gray-100 mb-2">
              {t('approved.empty.title')}
            </h3>
            <p className="text-brand-slate dark:text-gray-400 max-w-md mx-auto">
              {searchQuery || agentTypeFilter !== 'all'
                ? t('approved.empty.noMatch')
                : t('approved.empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutputs.map((output) => {
            const agentConfig = AGENT_TYPE_CONFIG[output.agent_type];
            const agentLabel = agentConfig ? t(agentConfig.labelKey) : output.agent_type;
            const agentColor = agentConfig?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

            return (
              <Card
                key={output.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-brand-success"
                onClick={() => handleOpenOutput(output)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-2 text-brand-charcoal dark:text-gray-100">
                      {output.title}
                    </CardTitle>
                    <Badge className={cn('shrink-0 text-xs', agentColor)}>
                      {agentLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {output.summary && (
                    <p className="text-sm text-brand-slate dark:text-gray-400 line-clamp-2 mb-3">
                      {output.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(output.approved_at), { addSuffix: true })}
                    </span>
                    {output.approver_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {output.approver_name}
                      </span>
                    )}
                    {output.approval_round > 1 && (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {t('approved.round', { round: output.approval_round })}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <ViewOutputDialog
        output={
          selectedOutput
            ? {
                id: selectedOutput.id,
                title: selectedOutput.title,
                agent_type: selectedOutput.agent_type,
                session_id: selectedOutput.session_id || '',
                content:
                  typeof selectedOutput.content === 'string'
                    ? selectedOutput.content
                    : JSON.stringify(selectedOutput.content, null, 2),
                created_at: selectedOutput.created_at,
                tags: selectedOutput.tags || [],
              }
            : null
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
