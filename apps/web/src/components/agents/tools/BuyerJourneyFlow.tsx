import React, { useState } from "react";
import type { BuyerJourney } from "@/types/agentTools";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Search, MessageCircle, ShoppingCart, Star, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BuyerJourneyFlowProps {
  data: BuyerJourney;
  isExpertMode?: boolean;
}

const stageIcons = {
  Awareness: Search,
  Consideration: MessageCircle,
  Decision: ShoppingCart,
  Retention: Star,
  Default: ArrowRight
};

export function BuyerJourneyFlow({ data, isExpertMode = false }: BuyerJourneyFlowProps) {
  const [isExpanded, setIsExpanded] = useState(!isExpertMode);
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="persona">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-md">
            <ArrowRight className="w-6 h-6 text-amber-600 dark:text-slate-300" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('toolRenderers.buyerJourney.title')}</CardTitle>
            <CardDescription>{t('toolRenderers.buyerJourney.forPersona', { name: data.persona_name })}</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            {data.stages.map((stage, index) => {
              const Icon = stageIcons[stage.stage_name as keyof typeof stageIcons] || stageIcons.Default;
              return (
                <React.Fragment key={index}>
                  <div className="flex-1 w-full">
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
                      <h4 className="font-bold text-md mb-2 flex items-center text-gray-900 dark:text-gray-100">
                        <Icon className="w-5 h-5 mr-2 text-gray-500" />
                        {stage.stage_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{stage.description}</p>
                      <div className="text-xs space-y-2">
                        <div>
                          <p className="font-semibold">{t('toolRenderers.buyerJourney.keyQuestions')}</p>
                          <ul className="list-disc list-inside pl-2">
                            {stage.key_questions.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold">{t('toolRenderers.buyerJourney.contentOpportunities')}</p>
                          <ul className="list-disc list-inside pl-2">
                            {stage.content_opportunities.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < data.stages.length - 1 && (
                    <div className="hidden md:flex items-center justify-center h-full pt-10">
                      <ArrowRight className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline">{t('toolRenderers.common.saveToWorkspace')}</Button>
            <Button>{t('toolRenderers.buyerJourney.generateContentIdeas')}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
