import type { AnalysisReport } from "@/types/agentTools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AnalysisReportProps {
  data: AnalysisReport;
}

export function AnalysisReportView({ data }: AnalysisReportProps) {
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="analytics">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-md">
                    <BarChart className="w-6 h-6 text-red-600 dark:text-red-300" />
                </div>
                <div>
                    <CardTitle className="text-xl">{t('toolRenderers.analysisReport.title')}</CardTitle>
                    <CardDescription>{data.title}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('toolRenderers.analysisReport.summary')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{data.summary}</p>
            </div>
            <div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('toolRenderers.analysisReport.keyFindings')}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {data.findings.map((finding, index) => <li key={index}>{finding}</li>)}
                </ul>
            </div>
            <div>
                <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('toolRenderers.analysisReport.recommendations')}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {data.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                </ul>
            </div>
        </CardContent>
    </Card>
  );
}
