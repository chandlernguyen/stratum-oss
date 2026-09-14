import type { Optimization } from '@/types/agentTools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OptimizationListProps {
  data: Optimization[];
}

export function OptimizationList({ data }: OptimizationListProps) {
  const { t } = useTranslation('agents');

  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <Card className="w-full  my-4 tool-output" data-agent="analytics">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-md">
                    <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-300" />
                </div>
                <CardTitle className="text-xl">{t('toolRenderers.optimization.title')}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="space-y-3">
            {data.map((item, index) => (
                <div key={index} className={`p-3 border-l-4 rounded-r-md bg-gray-50 dark:bg-gray-800 ${getPriorityClass(item.priority)}`}>
                    <p className="font-semibold text-sm">{item.suggestion}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{t('toolRenderers.optimization.area', { value: item.area })}</span>
                        <span>{t('toolRenderers.optimization.impact', { value: item.expected_impact })}</span>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
  );
}
