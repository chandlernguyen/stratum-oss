import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DollarSign,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Building2,
  Lightbulb
} from 'lucide-react';

interface AILearnings {
  marketingBudget?: string;
  businessModel?: string;
  revenue?: string;
  customer_acquisition_cost?: string;
  lifetime_value?: string;
  uniqueValueProposition?: string;
}

interface BusinessContextCardProps {
  aiLearnings: AILearnings;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BusinessContextCard({ aiLearnings, isExpanded, onToggle }: BusinessContextCardProps) {
  const { t } = useTranslation('agents');
  const hasData = aiLearnings.marketingBudget || aiLearnings.businessModel || aiLearnings.revenue;

  return (
    <Card>
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">{t('context.cards.business.title')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {(aiLearnings.marketingBudget || aiLearnings.businessModel) && (
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
                {/* Collapsed View - Show more detail */}
                <CollapsibleContent className="space-y-0">
                  <div className="space-y-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiLearnings.marketingBudget && (
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            {t('context.cards.business.marketingBudget')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {aiLearnings.marketingBudget}
                          </div>
                        </div>
                      )}
                      {aiLearnings.revenue && (
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            {t('context.cards.business.revenue')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {aiLearnings.revenue}
                          </div>
                        </div>
                      )}
                    </div>

                    {aiLearnings.businessModel && (
                      <div>
                        <div className="text-sm font-medium">{t('context.cards.business.businessModel')}</div>
                        <div className="text-xs text-muted-foreground">
                          {aiLearnings.businessModel}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {aiLearnings.customer_acquisition_cost && (
                        <Badge variant="outline" className="text-xs">
                          {t('context.cards.business.cac')}: {aiLearnings.customer_acquisition_cost}
                        </Badge>
                      )}
                      {aiLearnings.lifetime_value && (
                        <Badge variant="secondary" className="text-xs">
                          {t('context.cards.business.ltv')}: {aiLearnings.lifetime_value}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>

                {/* Expanded View */}
                <CollapsibleContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      {/* Financial Context */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiLearnings.marketingBudget && (
                          <div>
                            <div className="font-medium text-sm mb-1 flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              {t('context.cards.business.marketingBudget')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.marketingBudget}
                            </p>
                          </div>
                        )}
                        {aiLearnings.revenue && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.business.annualRevenue')}</div>
                            <p className="text-xs text-muted-foreground">
                              {aiLearnings.revenue}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Business Model */}
                      {aiLearnings.businessModel && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-blue-600" />
                            {t('context.cards.business.businessModel')}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {aiLearnings.businessModel}
                          </p>
                        </div>
                      )}

                      {/* Customer Economics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiLearnings.customer_acquisition_cost && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.business.customerAcquisitionCost')}</div>
                            <Badge variant="outline" className="text-xs">
                              {aiLearnings.customer_acquisition_cost}
                            </Badge>
                          </div>
                        )}
                        {aiLearnings.lifetime_value && (
                          <div>
                            <div className="font-medium text-sm mb-1">{t('context.cards.business.customerLifetimeValue')}</div>
                            <Badge variant="outline" className="text-xs">
                              {aiLearnings.lifetime_value}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Value Proposition */}
                      {aiLearnings.uniqueValueProposition && (
                        <div>
                          <div className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-amber-600" />
                            {t('context.cards.business.uniqueValueProposition')}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {aiLearnings.uniqueValueProposition}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('context.cards.business.emptyState')}
              </div>
            )}
          </CardContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
