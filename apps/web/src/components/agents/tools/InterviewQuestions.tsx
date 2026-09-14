import { useState } from "react";
import type { InterviewQuestions } from "@/types/agentTools";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronUp, ChevronDown, HelpCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InterviewQuestionsProps {
  data: InterviewQuestions;
  isExpertMode?: boolean;
}

export function InterviewQuestions({ data, isExpertMode = false }: InterviewQuestionsProps) {
  const [isExpanded, setIsExpanded] = useState(!isExpertMode);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('agents');

  const handleCopy = () => {
    const allQuestions = data.questions.join('\n');
    navigator.clipboard.writeText(allQuestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full  my-4 tool-output" data-agent="persona">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-md">
            <HelpCircle className="w-6 h-6 text-amber-600 dark:text-slate-300" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('toolRenderers.interviewQuestions.title')}</CardTitle>
            <CardDescription>{t('toolRenderers.interviewQuestions.forValidating', { name: data.persona_name })}</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-4">
          <ul className="space-y-3">
            {data.questions.map((question, index) => (
              <li key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
                {question}
              </li>
            ))}
          </ul>
          <div className="tool-actions mt-6 flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? t('toolRenderers.common.copied') : t('toolRenderers.common.copyAll')}
            </Button>
            <Button>{t('toolRenderers.interviewQuestions.addToGuide')}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
