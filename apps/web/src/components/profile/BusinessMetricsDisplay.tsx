import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, Settings, Brain } from 'lucide-react';
import type { BusinessMetrics } from '@/hooks/data/useBusinessIntelligence';

interface BusinessMetricsDisplayProps {
  metrics?: BusinessMetrics;
}

export function BusinessMetricsDisplay({ metrics }: BusinessMetricsDisplayProps) {
  if (!metrics) {
    return null;
  }

  const hasMetrics = Object.values(metrics).some(category => category && Object.keys(category).length > 0);

  if (!hasMetrics) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-gray-400" />
            AI-Learned Business Metrics
          </CardTitle>
          <CardDescription>
            No metrics extracted yet. Metrics are automatically learned from your agent conversations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const categories = [
    { key: 'financial' as const, label: 'Financial Metrics', icon: DollarSign, color: 'text-green-600' },
    { key: 'marketing' as const, label: 'Marketing Metrics', icon: Target, color: 'text-blue-600' },
    { key: 'product' as const, label: 'Product Metrics', icon: Users, color: 'text-purple-600' },
    { key: 'operational' as const, label: 'Operational Metrics', icon: Settings, color: 'text-gray-600' },
  ];

  const getTrendIcon = (trend?: string) => {
    if (!trend) return null;
    if (trend === 'increasing') return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatMetricName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Deduplicate metrics by merging those with same/similar names
  const deduplicateMetrics = (categoryMetrics: Record<string, any>) => {
    const deduplicated: Record<string, any> = {};
    const processed = new Set<string>();

    Object.entries(categoryMetrics).forEach(([metricName, metric]) => {
      if (processed.has(metricName)) return;

      // Find all metrics with same value or aliases
      const duplicates = Object.entries(categoryMetrics).filter(([name, m]) => {
        if (name === metricName) return true;

        // Check if names are aliases of each other
        const currentAliases = metric.aliases || [];
        const otherAliases = m.aliases || [];

        if (currentAliases.includes(name) || otherAliases.includes(metricName)) {
          return true;
        }

        // Check if they share common aliases (e.g., both have "marketing_budget")
        const sharedAliases = currentAliases.filter((alias: string) =>
          otherAliases.includes(alias)
        );
        if (sharedAliases.length > 0) {
          return true;
        }

        // Check if they have the same value (likely duplicates)
        if (m.value === metric.value && metric.learned_by === m.learned_by) {
          // Additional check: similar names (e.g., "marketing_budget" vs "marketing_budget_monthly")
          const simplifiedCurrent = metricName.toLowerCase().replace(/[_\s]/g, '');
          const simplifiedOther = name.toLowerCase().replace(/[_\s]/g, '');

          // Check if one contains the other OR they have significant overlap
          if (simplifiedCurrent.includes(simplifiedOther) || simplifiedOther.includes(simplifiedCurrent)) {
            return true;
          }

          // Check for word overlap (e.g., "marketing_budget_monthly" and "marketing_budget_per_month")
          const currentWords = new Set(metricName.toLowerCase().split(/[_\s]+/));
          const otherWords = new Set(name.toLowerCase().split(/[_\s]+/));

          // Define synonyms that should be considered the same
          const synonymGroups = [
            ['rate', 'percentage', 'percent', 'pct'],
            ['monthly', 'month', 'per_month'],
            ['yearly', 'year', 'annual', 'annually'],
            ['count', 'number', 'total'],
            ['budget', 'spend', 'spending'],
          ];

          // Normalize words by replacing synonyms with a canonical form
          const normalizeSynonyms = (words: Set<string>) => {
            const normalized = new Set<string>();
            words.forEach(word => {
              let canonical = word;
              for (const group of synonymGroups) {
                if (group.includes(word)) {
                  canonical = group[0]; // Use first word as canonical
                  break;
                }
              }
              normalized.add(canonical);
            });
            return normalized;
          };

          const normalizedCurrent = normalizeSynonyms(currentWords);
          const normalizedOther = normalizeSynonyms(otherWords);
          const commonWords = [...normalizedCurrent].filter(word => normalizedOther.has(word));

          // If they share 65%+ of normalized words and have same value, they're duplicates
          const overlapRatio = commonWords.length / Math.max(normalizedCurrent.size, normalizedOther.size);
          if (overlapRatio >= 0.65) {
            return true;
          }
        }

        return false;
      });

      // Merge all duplicates
      const merged = {
        ...metric,
        sources: duplicates.map(([name, m]) => ({
          name: name,
          learned_by: m.learned_by,
          confidence: m.confidence,
          context: m.context
        })),
        // Combine all aliases
        aliases: Array.from(new Set([
          ...(metric.aliases || []),
          ...duplicates.flatMap(([name, m]) => [name, ...(m.aliases || [])])
        ])).filter(alias => alias !== metricName),
        // Use highest confidence
        confidence: Math.max(...duplicates.map(([, m]) => m.confidence || 0))
      };

      // Use the shortest, most readable name as the primary key
      const primaryName = duplicates
        .map(([name]) => name)
        .sort((a, b) => a.length - b.length)[0];

      deduplicated[primaryName] = merged;

      // Mark all as processed
      duplicates.forEach(([name]) => processed.add(name));
    });

    return deduplicated;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-amber-600" />
          AI-Learned Business Metrics
        </CardTitle>
        <CardDescription>
          Metrics automatically extracted from your conversations with AI agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(({ key, label, icon: Icon, color }) => {
          const categoryMetrics = metrics[key];
          if (!categoryMetrics || Object.keys(categoryMetrics).length === 0) {
            return null;
          }

          // Deduplicate before rendering
          const deduplicatedMetrics = deduplicateMetrics(categoryMetrics);

          return (
            <div key={key} className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(deduplicatedMetrics).map(([metricName, metric]) => (
                  <div
                    key={metricName}
                    className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatMetricName(metricName)}
                      </span>
                      {metric.trend && getTrendIcon(metric.trend)}
                    </div>

                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {metric.value}
                    </div>

                    {/* Show current/previous for trends */}
                    {metric.current && metric.previous && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {metric.previous} → {metric.current}
                      </div>
                    )}

                    {/* Show context if available */}
                    {metric.context && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {metric.context}
                      </div>
                    )}

                    {/* Metadata badges - Show all sources if merged */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {metric.sources && metric.sources.length > 1 ? (
                        // Multiple sources - show all
                        <>
                          {metric.sources.map((source: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                              {source.learned_by} {source.confidence && `(${Math.round(source.confidence * 100)}%)`}
                            </Badge>
                          ))}
                        </>
                      ) : (
                        // Single source
                        <>
                          {metric.learned_by && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {metric.learned_by}
                            </Badge>
                          )}
                          {metric.confidence && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {Math.round(metric.confidence * 100)}%
                            </Badge>
                          )}
                        </>
                      )}
                    </div>

                    {/* Show aliases if available */}
                    {metric.aliases && metric.aliases.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Also: {metric.aliases.slice(0, 3).join(', ')}
                        {metric.aliases.length > 3 && ` +${metric.aliases.length - 3} more`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
