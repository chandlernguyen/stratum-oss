import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ArrowLeft, ArrowRight, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuickStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface QuickStartAnswers {
  company: string;
  goal: string;
  audience: string;
  budget: string;
  timeline: string;
}

export function QuickStartModal({
  open,
  onOpenChange,
  onComplete
}: QuickStartModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuickStartAnswers>({
    company: '',
    goal: '',
    audience: '',
    budget: '',
    timeline: ''
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGenerate = () => {
    // Navigate to Quick Start agent page with answers in state (URL-based approach)
    navigate(ROUTES.agents.quickStart.root, {
      state: {
        quickStartAnswers: answers
      }
    });

    // Close modal and notify parent
    onComplete?.();
    onOpenChange(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return answers.company.length > 0;
      case 2:
        return answers.goal.length > 0;
      case 3:
        return answers.audience.length > 0;
      case 4:
        return answers.budget.length > 0;
      case 5:
        return answers.timeline.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="company">{t('quickStartModal.steps.company.label')}</Label>
              <Textarea
                id="company"
                placeholder={t('quickStartModal.steps.company.placeholder')}
                value={answers.company}
                onChange={(e) => setAnswers({ ...answers, company: e.target.value })}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('quickStartModal.steps.company.hint')}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal">{t('quickStartModal.steps.goal.label')}</Label>
              <Textarea
                id="goal"
                placeholder={t('quickStartModal.steps.goal.placeholder')}
                value={answers.goal}
                onChange={(e) => setAnswers({ ...answers, goal: e.target.value })}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('quickStartModal.steps.goal.hint')}
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="audience">{t('quickStartModal.steps.audience.label')}</Label>
              <Textarea
                id="audience"
                placeholder={t('quickStartModal.steps.audience.placeholder')}
                value={answers.audience}
                onChange={(e) => setAnswers({ ...answers, audience: e.target.value })}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('quickStartModal.steps.audience.hint')}
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget">{t('quickStartModal.steps.budget.label')}</Label>
              <Select
                value={answers.budget}
                onValueChange={(value) => setAnswers({ ...answers, budget: value })}
              >
                <SelectTrigger id="budget" className="mt-2">
                  <SelectValue placeholder={t('quickStartModal.steps.budget.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1000">{t('quickStartModal.steps.budget.options.bootstrap')}</SelectItem>
                  <SelectItem value="1000-5000">{t('quickStartModal.steps.budget.options.growing')}</SelectItem>
                  <SelectItem value="5000-20000">{t('quickStartModal.steps.budget.options.scaling')}</SelectItem>
                  <SelectItem value="20000+">{t('quickStartModal.steps.budget.options.enterprise')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('quickStartModal.steps.budget.hint')}
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="timeline">{t('quickStartModal.steps.timeline.label')}</Label>
              <Select
                value={answers.timeline}
                onValueChange={(value) => setAnswers({ ...answers, timeline: value })}
              >
                <SelectTrigger id="timeline" className="mt-2">
                  <SelectValue placeholder={t('quickStartModal.steps.timeline.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t('quickStartModal.steps.timeline.options.immediate')}</SelectItem>
                  <SelectItem value="1-3-months">{t('quickStartModal.steps.timeline.options.shortTerm')}</SelectItem>
                  <SelectItem value="3-6-months">{t('quickStartModal.steps.timeline.options.mediumTerm')}</SelectItem>
                  <SelectItem value="6-12-months">{t('quickStartModal.steps.timeline.options.longTerm')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('quickStartModal.steps.timeline.hint')}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-gold" />
            <DialogTitle>{t('quickStartModal.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('quickStartModal.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('quickStartModal.step', { current: step, total: totalSteps })}</span>
            <span>{t('quickStartModal.complete', { percent: Math.round(progress) })}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="py-6">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('quickStartModal.back')}
          </Button>

          <div className="flex gap-2">
            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {t('quickStartModal.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-slate-600 to-amber-600"
              >
                <Rocket className="w-4 h-4 mr-2" />
                {t('quickStartModal.start')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
