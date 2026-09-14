import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Globe,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Target,
  MapPin
} from 'lucide-react';

interface AILearnings {
  targetMarket?: string;
  geography?: string;
  uniqueValueProposition?: string;
  competitors?: string[];
  market_position?: string;
  growth_stage?: string;
  distribution_channels?: string[];
  seasonal_trends?: string[];
  market_size?: string;
  competitive_advantages?: string[];
}

interface MarketFocusCardProps {
  aiLearnings: AILearnings;
  isExpanded: boolean;
  onToggle: () => void;
}

export function MarketFocusCard({ aiLearnings, isExpanded, onToggle }: MarketFocusCardProps) {
  const { t } = useTranslation('agents');
  const hasData = aiLearnings.targetMarket || aiLearnings.geography;

  return (
    <Card>
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">{t('context.cards.market.title')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {hasData && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CardContent className="pt-3">
            {hasData ? (
              <>
                {/* Collapsed View - Show more info */}
                <CollapsibleContent className="space-y-0">
                  <div className="space-y-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiLearnings.targetMarket && (
                        <div>
                          <div className="text-sm font-medium">{t('context.cards.market.targetMarket')}</div>
                          <div className="text-sm text-muted-foreground">
                            {aiLearnings.targetMarket}
                          </div>
                        </div>
                      )}
                      {aiLearnings.geography && (
                        <div>
                          <div className="text-sm font-medium">{t('context.cards.market.geographicFocus')}</div>
                          <div className="text-sm text-muted-foreground">
                            {aiLearnings.geography}
                          </div>
                        </div>
                      )}
                    </div>

                    {aiLearnings.uniqueValueProposition && (
                      <div>
                        <div className="text-sm font-medium">{t('context.cards.market.valueProposition')}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {aiLearnings.uniqueValueProposition.substring(0, 100)}
                          {aiLearnings.uniqueValueProposition.length > 100 && '...'}
                        </p>
                      </div>
                    )}

                    {aiLearnings.competitors && aiLearnings.competitors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">{t('context.cards.market.competingWith')}:</span>
                        {aiLearnings.competitors.slice(0, 3).map((competitor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>

                {/* Expanded View */}
                <CollapsibleContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      {/* Core Market Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiLearnings.targetMarket && (
                          <div>
                            <div className="font-medium text-sm mb-1 flex items-center gap-1">
                              <Target className="h-3 w-3 text-green-600" />
                              {t('context.cards.market.targetMarket')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.targetMarket}
                            </p>
                          </div>
                        )}
                        {aiLearnings.geography && (
                          <div>
                            <div className="font-medium text-sm mb-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              {t('context.cards.market.geographicFocus')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.geography}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Market Intelligence */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiLearnings.market_size && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.market.marketSize')}</div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.market_size}
                            </p>
                          </div>
                        )}
                        {aiLearnings.market_position && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.market.marketPosition')}</div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.market_position}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Growth & Trends */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiLearnings.growth_stage && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.market.growthStage')}</div>
                            <Badge variant="outline" className="text-xs">
                              {aiLearnings.growth_stage}
                            </Badge>
                          </div>
                        )}
                        {aiLearnings.seasonal_trends && aiLearnings.seasonal_trends.length > 0 && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.market.seasonalTrends')}</div>
                            <div className="flex flex-wrap gap-1">
                              {aiLearnings.seasonal_trends.map((trend, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {trend}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Distribution Channels */}
                      {aiLearnings.distribution_channels && aiLearnings.distribution_channels.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('context.cards.market.distributionChannels')}</div>
                          <div className="flex flex-wrap gap-1">
                            {aiLearnings.distribution_channels.map((channel, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Competitive Advantages */}
                      {aiLearnings.competitive_advantages && aiLearnings.competitive_advantages.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {t('context.cards.market.competitiveAdvantages')}
                          </div>
                          <ul className="text-xs space-y-1">
                            {aiLearnings.competitive_advantages.map((advantage, i) => (
                              <li key={i} className="text-muted-foreground">• {advantage}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Competitors */}
                      {aiLearnings.competitors && aiLearnings.competitors.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('context.cards.market.keyCompetitors')}</div>
                          <div className="flex flex-wrap gap-1">
                            {aiLearnings.competitors.map((competitor, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {competitor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('context.cards.market.emptyState')}
              </div>
            )}
          </CardContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
