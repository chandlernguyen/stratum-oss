import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  HelpCircle,
  AlertTriangle,
  Users,
  Target,
  Settings,
  CheckCircle
} from 'lucide-react';
import type { ClarificationQuestion } from '@/hooks/useContentRecommendations';

interface ContentClarificationDialogProps {
  questions: ClarificationQuestion[];
  message: string;
  onAnswersSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

export function ContentClarificationDialog({
  questions,
  message,
  onAnswersSubmit,
  onSkip,
  isSubmitting = false
}: ContentClarificationDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleAnswerChange = (index: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [index]: answer
    }));
  };

  const handleSubmit = () => {
    onAnswersSubmit(answers);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'infrastructure':
        return <Settings className="h-5 w-5" />;
      case 'personas':
        return <Users className="h-5 w-5" />;
      case 'strategy':
        return <Target className="h-5 w-5" />;
      case 'conflicts':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'infrastructure':
        return 'bg-blue-100 text-brand-info';
      case 'personas':
        return 'bg-slate-100 text-brand-charcoal';
      case 'strategy':
        return 'bg-green-100 text-brand-success';
      case 'conflicts':
        return 'bg-red-100 text-brand-error';
      default:
        return 'bg-gray-100 text-brand-charcoal';
    }
  };

  const isStepComplete = (index: number) => {
    return answers[index] && answers[index].trim().length > 0;
  };

  const canSubmit = questions.every((_, index) => isStepComplete(index));

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-3 mb-2">
          <HelpCircle className="h-6 w-6 text-brand-warning" />
          <CardTitle className="text-xl">Help Me Understand Your Business Better</CardTitle>
        </div>
        <p className="text-brand-slate dark:text-gray-400 text-sm">
          {message}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-12 rounded-full transition-colors ${
                isStepComplete(index)
                  ? 'bg-green-500'
                  : index === currentStep
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card
              key={index}
              className={`border-2 transition-all ${
                currentStep === index
                  ? 'border-blue-300 shadow-md'
                  : isStepComplete(index)
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-gray-200'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${getCategoryColor(question.category)}`}>
                    {getCategoryIcon(question.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">
                        Question {index + 1}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {question.category}
                      </Badge>
                      {isStepComplete(index) && (
                        <CheckCircle className="h-4 w-4 text-brand-success" />
                      )}
                    </div>
                    <p className="text-brand-charcoal dark:text-gray-300 mb-2">
                      {question.question}
                    </p>
                    <p className="text-sm text-brand-slate mb-3">
                      <strong>Why this matters:</strong> {question.reason}
                    </p>

                    {/* Answer Input */}
                    {question.category === 'infrastructure' || question.category === 'conflicts' ? (
                      <Textarea
                        placeholder="Please provide details..."
                        value={answers[index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="min-h-[80px]"
                        onFocus={() => setCurrentStep(index)}
                      />
                    ) : (
                      <Input
                        placeholder="Your answer..."
                        value={answers[index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        onFocus={() => setCurrentStep(index)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip for now
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-slate">
              {Object.keys(answers).length} of {questions.length} answered
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? 'Generating...' : 'Get Smart Recommendations'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-sm text-brand-info dark:text-blue-300">
            💡 <strong>Better answers = Better recommendations.</strong> The more specific you are,
            the more relevant and actionable your content suggestions will be.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}