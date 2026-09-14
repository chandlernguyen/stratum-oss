import { useState } from "react";
import type { BusinessModelCanvas } from "@/types/agentTools";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Users, Gem, Truck, Heart, DollarSign, Key, Activity, Handshake, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BusinessCanvasProps {
  data: BusinessModelCanvas;
  isExpertMode?: boolean;
}

export function BusinessCanvas({ data, isExpertMode = false }: BusinessCanvasProps) {
  const [isExpanded, setIsExpanded] = useState(!isExpertMode);
  const { t } = useTranslation('agents');

  interface CanvasBlockProps {
    title: string;
    content: string | string[];
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
  }

  const CanvasBlock = ({ title, content, icon: Icon, className = '' }: CanvasBlockProps) => (
    <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm ${className}`}>
      <h4 className="font-bold text-sm mb-2 flex items-center text-gray-900 dark:text-gray-100">
        <Icon className="w-4 h-4 mr-2 text-gray-500" />
        {title}
      </h4>
      <div className="text-xs text-gray-700 dark:text-gray-300">
        {Array.isArray(content) ? (
          <ul className="list-disc list-inside space-y-1">
            {content.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full my-4 tool-output" data-agent="strategy">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-md">
            <Wrench className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <CardTitle className="text-xl">{t('toolRenderers.businessCanvas.title')}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <CanvasBlock title={t('toolRenderers.businessCanvas.keyPartnerships')} content={data.key_partnerships} icon={Handshake} />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <CanvasBlock title={t('toolRenderers.businessCanvas.keyActivities')} content={data.key_activities} icon={Activity} />
              <CanvasBlock title={t('toolRenderers.businessCanvas.keyResources')} content={data.key_resources} icon={Key} />
            </div>
            <div className="lg:col-span-1 flex items-center justify-center">
              <CanvasBlock title={t('toolRenderers.businessCanvas.valuePropositions')} content={data.value_propositions} icon={Gem} className="h-full" />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <CanvasBlock title={t('toolRenderers.businessCanvas.customerRelationships')} content={data.customer_relationships} icon={Heart} />
              <CanvasBlock title={t('toolRenderers.businessCanvas.channels')} content={data.channels} icon={Truck} />
            </div>
            <div className="lg:col-span-1 flex items-center justify-center">
              <CanvasBlock title={t('toolRenderers.businessCanvas.customerSegments')} content={data.customer_segments} icon={Users} className="h-full" />
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CanvasBlock title={t('toolRenderers.businessCanvas.costStructure')} content={data.cost_structure} icon={DollarSign} />
              <CanvasBlock title={t('toolRenderers.businessCanvas.revenueStreams')} content={data.revenue_streams} icon={DollarSign} />
            </div>
          </div>
          <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline">{t('toolRenderers.common.saveToWorkspace')}</Button>
            <Button>{t('toolRenderers.businessCanvas.developBusinessPlan')}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
