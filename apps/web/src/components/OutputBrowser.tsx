import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronRight,
  TrendingUp,
  Star,
  Calendar,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react'
import type { AgentType, SavedOutput } from '@/types/agents'
import { useMyOutputs } from '@/hooks/data/useAgentOutputs'
import { formatDate as formatLocalizedDate } from '@/lib/i18n'
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/locales'

interface OutputBrowserProps {
  onSelect: (outputs: SavedOutput[]) => void;
  currentAgent?: AgentType;
  className?: string;
}

export function OutputBrowser({ onSelect, currentAgent, className }: OutputBrowserProps) {
  const { t, i18n } = useTranslation(['common']);
  const locale = normalizeLocale(i18n.language) ?? DEFAULT_LOCALE;
  const [filteredOutputs, setFilteredOutputs] = useState<SavedOutput[]>([]);
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent');

  // Use direct database access for my outputs
  const { data: rawOutputs = [], isLoading: loading, error: queryError, refetch } = useMyOutputs({
    agentType: agentFilter !== 'all' ? agentFilter : undefined,
    limit: 50
  });

  // Convert to SavedOutput format
  const outputs: SavedOutput[] = rawOutputs.map(output => ({
    id: output.id,
    title: output.title,
    content: typeof output.content === 'string' ? output.content : JSON.stringify(output.content),
    agent_type: output.agent_type as AgentType,
    created_at: output.created_at,
    session_id: output.session_id || output.id,
    tags: [], // Tags could be derived from categories if needed
    metadata: output.metadata
  }));

  const error = queryError ? 'Failed to load saved outputs.' : null;

  useEffect(() => {
    filterAndSortOutputs();
  }, [outputs, searchTerm, agentFilter, sortBy]);


  const filterAndSortOutputs = () => {
    let filtered = [...outputs];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        output =>
          output.title.toLowerCase().includes(search) ||
          output.content.toLowerCase().includes(search) ||
          output.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Apply agent type filter
    if (agentFilter !== 'all') {
      filtered = filtered.filter(output => output.agent_type === agentFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.reuse_count || 0) - (a.reuse_count || 0);
        case 'rating':
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredOutputs(filtered);
  };

  const getSuggestionScore = (output: SavedOutput): number => {
    let score = 0;
    
    // Agent relationship scoring
    const agentAffinities: Record<AgentType, Record<AgentType, number>> = {
      strategy: { persona: 0.5, marketing_strategy: 0.6, content: 0.3, analytics: 0.2, strategy: 0.1, roi_budget: 0.4, campaign_planning: 0.3, competitive_intelligence: 0.5, client_success: 0.2, quick_wins: 0.3, performance_intelligence: 0.4, quick_start: 0.1 },
      persona: { strategy: 0.8, marketing_strategy: 0.9, content: 0.7, analytics: 0.3, persona: 0.1, roi_budget: 0.2, campaign_planning: 0.4, competitive_intelligence: 0.3, client_success: 0.5, quick_wins: 0.2, performance_intelligence: 0.3, quick_start: 0.1 },
      marketing_strategy: { persona: 0.9, strategy: 0.7, content: 0.8, analytics: 0.4, marketing_strategy: 0.1, roi_budget: 0.6, campaign_planning: 0.7, competitive_intelligence: 0.4, client_success: 0.3, quick_wins: 0.5, performance_intelligence: 0.5, quick_start: 0.1 },
      content: { persona: 0.9, marketing_strategy: 0.8, strategy: 0.7, analytics: 0.5, content: 0.1, roi_budget: 0.2, campaign_planning: 0.6, competitive_intelligence: 0.2, client_success: 0.3, quick_wins: 0.4, performance_intelligence: 0.6, quick_start: 0.1 },
      analytics: { content: 0.8, marketing_strategy: 0.5, strategy: 0.5, persona: 0.4, analytics: 0.1, roi_budget: 0.7, campaign_planning: 0.5, competitive_intelligence: 0.4, client_success: 0.3, quick_wins: 0.5, performance_intelligence: 0.8, quick_start: 0.1 },
      roi_budget: { analytics: 0.8, marketing_strategy: 0.6, strategy: 0.6, content: 0.2, persona: 0.2, roi_budget: 0.1, campaign_planning: 0.7, competitive_intelligence: 0.3, client_success: 0.4, quick_wins: 0.5, performance_intelligence: 0.7, quick_start: 0.1 },
      campaign_planning: { content: 0.7, marketing_strategy: 0.7, strategy: 0.5, persona: 0.4, analytics: 0.5, roi_budget: 0.6, campaign_planning: 0.1, competitive_intelligence: 0.3, client_success: 0.4, quick_wins: 0.6, performance_intelligence: 0.5, quick_start: 0.1 },
      competitive_intelligence: { strategy: 0.8, marketing_strategy: 0.5, analytics: 0.6, content: 0.3, persona: 0.3, roi_budget: 0.4, campaign_planning: 0.3, competitive_intelligence: 0.1, client_success: 0.3, quick_wins: 0.4, performance_intelligence: 0.6, quick_start: 0.1 },
      client_success: { persona: 0.7, marketing_strategy: 0.4, analytics: 0.5, strategy: 0.4, content: 0.3, roi_budget: 0.4, campaign_planning: 0.4, competitive_intelligence: 0.3, client_success: 0.1, quick_wins: 0.3, performance_intelligence: 0.5, quick_start: 0.1 },
      quick_wins: { campaign_planning: 0.7, marketing_strategy: 0.5, strategy: 0.5, analytics: 0.5, content: 0.4, persona: 0.3, roi_budget: 0.5, competitive_intelligence: 0.4, client_success: 0.3, quick_wins: 0.1, performance_intelligence: 0.4, quick_start: 0.1 },
      performance_intelligence: { analytics: 0.9, roi_budget: 0.8, competitive_intelligence: 0.7, strategy: 0.6, marketing_strategy: 0.5, campaign_planning: 0.6, content: 0.4, persona: 0.3, client_success: 0.5, quick_wins: 0.5, performance_intelligence: 0.1, quick_start: 0.1 },
      quick_start: { strategy: 0.9, persona: 0.9, marketing_strategy: 0.9, content: 0.3, analytics: 0.2, roi_budget: 0.2, campaign_planning: 0.3, competitive_intelligence: 0.3, client_success: 0.2, quick_wins: 0.4, performance_intelligence: 0.3, quick_start: 0.1 }
    };
    
    if (currentAgent && agentAffinities[currentAgent]) {
      score += agentAffinities[currentAgent][output.agent_type] || 0;
    }
    
    // Popularity bonus
    if ((output.reuse_count || 0) > 3) score += 0.2;
    
    // Recency bonus
    const daysSinceCreation = 
      (Date.now() - new Date(output.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) score += 0.3;
    else if (daysSinceCreation < 30) score += 0.1;
    
    // Rating bonus
    if ((output.avg_rating || 0) > 4) score += 0.2;
    
    return score;
  };

  const suggestedOutputs = filteredOutputs
    .map(output => ({ ...output, score: getSuggestionScore(output) }))
    .filter(output => output.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const toggleSelection = (outputId: string) => {
    const newSelection = new Set(selectedOutputs);
    if (newSelection.has(outputId)) {
      newSelection.delete(outputId);
    } else {
      newSelection.add(outputId);
    }
    setSelectedOutputs(newSelection);
  };

  const handleUseSelected = () => {
    const selected = outputs.filter(o => selectedOutputs.has(o.id));
    onSelect(selected);
    setSelectedOutputs(new Set()); // Clear selection
  };

  const getAgentColor = (agentType: string) => {
    const colors: Record<string, string> = {
      strategy: 'bg-blue-100 text-blue-800 border-blue-300',
      persona: 'bg-green-100 text-green-800 border-green-300',
      content: 'bg-slate-100 text-slate-800 border-amber-300',
      analytics: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[agentType] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('outputBrowser.weeksAgo', { count: Math.ceil(diffDays / 7) });
    return formatLocalizedDate(date, locale);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            {t('outputBrowser.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-brand-error">
            <p>{error}</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-2">
              {t('buttons.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>{t('outputBrowser.savedOutputs')}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            title={t('buttons.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('outputBrowser.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('outputBrowser.allAgents')}</SelectItem>
                <SelectItem value="strategy">{t('outputBrowser.agents.strategy')}</SelectItem>
                <SelectItem value="persona">{t('outputBrowser.agents.persona')}</SelectItem>
                <SelectItem value="content">{t('outputBrowser.agents.content')}</SelectItem>
                <SelectItem value="analytics">{t('outputBrowser.agents.analytics')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('outputBrowser.sortBy.recent')}</SelectItem>
                <SelectItem value="popular">{t('outputBrowser.sortBy.popular')}</SelectItem>
                <SelectItem value="rating">{t('outputBrowser.sortBy.topRated')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Suggestions for current agent */}
        {currentAgent && suggestedOutputs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('outputBrowser.suggestedFor', { agent: currentAgent })}
            </h4>
            <div className="space-y-2">
              {suggestedOutputs.map(output => (
                <div
                  key={output.id}
                  className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                  onClick={() => toggleSelection(output.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{output.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getAgentColor(output.agent_type)} variant="secondary">
                          {output.agent_type}
                        </Badge>
                        {(output.reuse_count || 0) > 0 && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {output.reuse_count}
                          </span>
                        )}
                        {(output.avg_rating || 0) > 0 && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {output.avg_rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All outputs */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredOutputs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {outputs.length === 0 ? (
                  <div>
                    <p>{t('outputBrowser.noSavedOutputs')}</p>
                    <p className="text-sm mt-1">{t('outputBrowser.saveHint')}</p>
                  </div>
                ) : (
                  <p>{t('outputBrowser.noMatchingOutputs')}</p>
                )}
              </div>
            ) : (
              filteredOutputs.map((output) => (
                <div
                  key={output.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedOutputs.has(output.id)
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSelection(output.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{output.title}</h4>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(output.created_at)}</span>
                        
                        {(output.view_count || 0) > 0 && (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>{t('outputBrowser.views', { count: output.view_count })}</span>
                          </>
                        )}

                        {(output.reuse_count || 0) > 0 && (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            <span>{t('outputBrowser.reuses', { count: output.reuse_count })}</span>
                          </>
                        )}
                        
                        {(output.avg_rating || 0) > 0 && (
                          <>
                            <Star className="h-3 w-3" />
                            <span>{output.avg_rating?.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getAgentColor(output.agent_type)}`}
                        >
                          {output.agent_type}
                        </Badge>
                        {output.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {output.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{output.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selection actions */}
        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <span className="text-sm text-gray-500">
            {t('outputBrowser.selected', { count: selectedOutputs.size })}
          </span>
          <Button
            onClick={handleUseSelected}
            disabled={selectedOutputs.size === 0}
            className="min-w-24"
          >
            {t('outputBrowser.useSelected', { count: selectedOutputs.size })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
