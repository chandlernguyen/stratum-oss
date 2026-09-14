import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, MessageSquare, Loader2 } from 'lucide-react';
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

interface ValidationErrors {
  feedback?: string;
  category?: string;
}

const MIN_FEEDBACK_LENGTH = 10;
const MAX_FEEDBACK_LENGTH = 2000;

const FEEDBACK_CATEGORY_KEYS = [
  { value: 'general-feedback', key: 'generalFeedback' },
  { value: 'agent-performance', key: 'agentPerformance' },
  { value: 'feature-request', key: 'featureRequest' },
  { value: 'bug-report', key: 'bugReport' },
  { value: 'user-experience', key: 'userExperience' },
  { value: 'data-accuracy', key: 'dataAccuracy' },
] as const;

function validateFeedback(
  text: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null {
  if (!text.trim()) {
    return t('feedback.validation.feedbackRequired');
  }
  if (text.length < MIN_FEEDBACK_LENGTH) {
    return t('feedback.validation.feedbackMinLength', { min: MIN_FEEDBACK_LENGTH });
  }
  if (text.length > MAX_FEEDBACK_LENGTH) {
    return t('feedback.validation.feedbackMaxLength', { max: MAX_FEEDBACK_LENGTH });
  }
  return null;
}

function validateCategory(
  cat: string,
  t: (key: string) => string
): string | null {
  if (!cat) {
    return t('feedback.validation.categoryRequired');
  }
  return null;
}

export function FeedbackPage() {
  const { t } = useTranslation('common');

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('feedback.pageTitle'));

  const { data: identity, isLoading: identityLoading } = useUserIdentity();
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFeedbackChange = (value: string) => {
    setFeedback(value);
    // Clear validation error as user types
    if (validationErrors.feedback) {
      const error = validateFeedback(value, t);
      setValidationErrors((prev) => ({ ...prev, feedback: error || undefined }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    // Clear validation error when category selected
    if (validationErrors.category) {
      setValidationErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const feedbackError = validateFeedback(feedback, t);
    const categoryError = validateCategory(category, t);

    if (feedbackError || categoryError) {
      setValidationErrors({
        feedback: feedbackError || undefined,
        category: categoryError || undefined,
      });
      return;
    }

    if (!identity?.user || !identity?.organization) {
      toast.error(t('feedback.messages.authError'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Capture metadata
      const metadata = {
        referrer: document.referrer || 'direct',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        form_version: '1.0',
        timestamp: new Date().toISOString(),
      };

      // Insert feedback
      const { error: insertError } = await supabase.from('user_feedback').insert([
        {
          user_id: identity.user.id,
          org_id: identity.organization.id,
          org_type: identity.organization.type.toLowerCase(), // Convert to lowercase for CHECK constraint
          category,
          feedback_text: feedback,
          user_agent: navigator.userAgent,
          metadata,
        },
      ]);

      if (insertError) {
        console.error('Feedback submission error:', insertError);
        toast.error(t('feedback.messages.submitError'));
        return;
      }

      // Success!
      setIsSuccess(true);
      toast.success(t('feedback.messages.thankYou'));
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error(t('feedback.messages.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setIsSuccess(false);
    setFeedback('');
    setCategory('');
    setValidationErrors({});
  };

  if (identityLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            {t('loading.default')}
          </p>
        </div>
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {t('feedback.successTitle')}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {t('feedback.successMessage')}
            </p>
            <Button
              onClick={handleSubmitAnother}
              className="mt-6 bg-gradient-to-r from-amber-500 to-amber-300 text-white hover:from-amber-600 hover:to-amber-400"
            >
              {t('feedback.submitAnother')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Feedback form
  return (
    <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-900">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-300 shadow-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t('feedback.title')}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {t('feedback.subtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <Label
                htmlFor="category"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t('feedback.categoryLabel')} <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger
                  id="category"
                  className={`mt-2 ${
                    validationErrors.category
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                  }`}
                  aria-invalid={!!validationErrors.category}
                  aria-describedby={
                    validationErrors.category ? 'category-error' : undefined
                  }
                >
                  <SelectValue placeholder={t('feedback.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORY_KEYS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <div className="font-medium">
                          {t(`feedback.categories.${cat.key}.label`)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t(`feedback.categories.${cat.key}.description`)}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category && (
                <p
                  id="category-error"
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {validationErrors.category}
                </p>
              )}
            </div>

            {/* Feedback Textarea */}
            <div>
              <Label
                htmlFor="feedback"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t('feedback.feedbackLabel')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => handleFeedbackChange(e.target.value)}
                placeholder={t('feedback.feedbackPlaceholder')}
                rows={8}
                className={`mt-2 resize-none ${
                  validationErrors.feedback
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                }`}
                aria-invalid={!!validationErrors.feedback}
                aria-describedby={
                  validationErrors.feedback ? 'feedback-error' : 'feedback-counter'
                }
              />
              <div className="mt-2 flex items-center justify-between">
                {validationErrors.feedback ? (
                  <p
                    id="feedback-error"
                    className="text-sm text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    {validationErrors.feedback}
                  </p>
                ) : (
                  <div />
                )}
                <p
                  id="feedback-counter"
                  className={`text-sm ${
                    feedback.length > MAX_FEEDBACK_LENGTH
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  aria-live="polite"
                >
                  {feedback.length}/{MAX_FEEDBACK_LENGTH}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-300 py-3 text-white shadow-lg transition-all duration-150 hover:shadow-xl hover:from-amber-600 hover:to-amber-400 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('feedback.submitting')}
                </>
              ) : (
                t('feedback.submitButton')
              )}
            </Button>
          </form>

          {/* Privacy Note */}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {t('feedback.privacyNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
