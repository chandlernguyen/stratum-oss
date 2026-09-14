import { useState } from 'react';
import type { SWOTAnalysis } from '@/types/agentTools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Sun, Zap } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { useExpertMode } from '@/components/settings/ExpertModeToggle';
import { useTranslation } from 'react-i18next';

interface SWOTGridProps {
  data: SWOTAnalysis;
  isExpertMode?: boolean;
}

export function SWOTGrid({ data }: SWOTGridProps) {
  const isExpertMode = useExpertMode();
  const [isExpanded, setIsExpanded] = useState(!isExpertMode);
  const { t } = useTranslation('agents');

  interface QuadrantProps {
    title: string;
    items: string[];
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }

  const Quadrant = ({ title, items, icon: Icon, colorClass }: QuadrantProps) => (
    <div className={`p-5 rounded-xl ${colorClass} border border-gray-200 dark:border-gray-700`}>
      <h4 className="font-bold text-base mb-3 flex items-center text-gray-900 dark:text-gray-100">
        <Icon className="w-5 h-5 mr-2" />
        {title}
      </h4>
      <ul className="space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mt-2 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Card className="w-full my-4 tool-output" data-agent="strategy">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
            <Zap className="w-6 h-6 text-brand-gold dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">{t('toolRenderers.swot.title')}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton data={data} title={t('toolRenderers.swot.title')} />
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Quadrant title={t('toolRenderers.swot.strengths')} items={data.strengths} icon={CheckCircle} colorClass="bg-green-50 dark:bg-green-900/50" />
            <Quadrant title={t('toolRenderers.swot.weaknesses')} items={data.weaknesses} icon={XCircle} colorClass="bg-red-50 dark:bg-red-900/50" />
            <Quadrant title={t('toolRenderers.swot.opportunities')} items={data.opportunities} icon={Sun} colorClass="bg-yellow-50 dark:bg-yellow-900/50" />
            <Quadrant title={t('toolRenderers.swot.threats')} items={data.threats} icon={Zap} colorClass="bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline">{t('toolRenderers.common.saveToWorkspace')}</Button>
            <Button>{t('toolRenderers.swot.createActionPlan')}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
