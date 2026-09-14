import type { Forecast } from "@/types/agentTools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ForecastChartProps {
  data: Forecast;
}

export function ForecastChart({ data }: ForecastChartProps) {
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="analytics">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-md">
                    <LineChart className="w-6 h-6 text-red-600 dark:text-red-300" />
                </div>
                <div>
                    <CardTitle className="text-xl">{t('toolRenderers.forecast.title', { metric: data.metric_name })}</CardTitle>
                    <CardDescription>{t('toolRenderers.forecast.forNextPeriod', { period: data.time_period })}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="text-center p-6">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{data.forecast_value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('toolRenderers.forecast.confidence', { level: (data.confidence_level * 100).toFixed(0) })}</p>
            <div className="mt-4 text-xs text-left bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <p className="font-semibold mb-1">{t('toolRenderers.forecast.assumptions')}</p>
                <ul className="list-disc list-inside space-y-1">
                    {data.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}
                </ul>
            </div>
        </CardContent>
    </Card>
  );
}
