import type { ContentCalendar } from "@/types/agentTools";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContentCalendarViewProps {
  data: ContentCalendar;
}

export function ContentCalendarView({ data }: ContentCalendarViewProps) {
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="content">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                    <CardTitle className="text-xl">{t('toolRenderers.contentCalendar.title')}</CardTitle>
                    <CardDescription>{t('toolRenderers.contentCalendar.dateRange', { start: data.start_date, end: data.end_date })}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {data.schedule.map((entry, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="col-span-1 font-semibold text-sm">
                            {entry.publish_date}
                        </div>
                        <div className="col-span-2">
                            <p className="font-bold text-sm">{entry.content_idea.title}</p>
                            <p className="text-xs text-gray-500">{entry.content_idea.format}</p>
                        </div>
                        <div className="col-span-1 text-xs text-right">
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-full">
                                {entry.platform}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
