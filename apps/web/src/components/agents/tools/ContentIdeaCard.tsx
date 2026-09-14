import type { ContentIdea } from "@/types/agentTools";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Type, Target, PenSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContentIdeaCardProps {
  idea: ContentIdea;
}

export function ContentIdeaCard({ idea }: ContentIdeaCardProps) {
  const { t } = useTranslation('agents');

  return (
    <Card className="w-full  my-4 tool-output" data-agent="content">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-brand-warning" />
              {t('toolRenderers.contentIdea.title')}
            </CardTitle>
            <CardDescription className="mt-1">{idea.title}</CardDescription>
          </div>
          <div className="text-xs uppercase font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {idea.format}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm flex items-center mb-1 text-brand-charcoal dark:text-gray-100">
            <Type className="w-4 h-4 mr-2 text-gray-500" />
            {t('toolRenderers.contentIdea.angle')}
          </h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{idea.angle}</p>
        </div>
        <div>
          <h4 className="font-semibold text-sm flex items-center mb-1 text-brand-charcoal dark:text-gray-100">
            <Target className="w-4 h-4 mr-2 text-gray-500" />
            {t('toolRenderers.contentIdea.targetPersona')}
          </h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{idea.target_persona}</p>
        </div>
        <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline">{t('toolRenderers.contentIdea.saveIdea')}</Button>
            <Button>
                <PenSquare className="w-4 h-4 mr-2" />
                {t('toolRenderers.contentIdea.draftThisPost')}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
