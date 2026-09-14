import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import {
  Sparkles,
  Rocket,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  Shield,
  Clock
} from 'lucide-react';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { CONTACT_EMAIL } from '@/config/brand';

interface InvitationFormData {
  email: string;
  companyName: string;
  organizationType: 'SME' | 'AGENCY';
  useCase: string;
  referralSource: string;
}

export function RequestInvitation() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { isReady: recaptchaReady, executeRecaptcha, error: recaptchaError } = useRecaptcha();

  const [formData, setFormData] = useState<InvitationFormData>({
    email: '',
    companyName: '',
    organizationType: 'SME',
    useCase: '',
    referralSource: ''
  });

  const [validationErrors, setValidationErrors] = useState<Partial<InvitationFormData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const errors: Partial<InvitationFormData> = {};

    // Email validation
    if (!formData.email) {
      errors.email = t('requestInvitation.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('requestInvitation.errors.invalidEmail');
    }

    // Company name validation
    if (!formData.companyName) {
      errors.companyName = t('requestInvitation.errors.companyRequired');
    } else if (formData.companyName.length < 2) {
      errors.companyName = t('requestInvitation.errors.companyTooShort');
    }

    // Use case validation (optional but helpful)
    if (formData.useCase && formData.useCase.length > 500) {
      errors.useCase = t('requestInvitation.errors.useCaseTooLong');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Check if reCAPTCHA is ready
    if (!recaptchaReady) {
      setError(t('requestInvitation.errors.securityLoading'));
      return;
    }

    setLoading(true);

    try {
      // Execute reCAPTCHA before submission
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await executeRecaptcha('submit_invitation');
        console.log('reCAPTCHA validation successful');
      } catch (recaptchaErr: any) {
        console.error('reCAPTCHA validation failed:', recaptchaErr);
        setError(t('requestInvitation.errors.securityFailed'));
        setLoading(false);
        return;
      }

      if (!recaptchaToken) {
        setError(t('requestInvitation.errors.securityFailedRetry'));
        setLoading(false);
        return;
      }

      // Submit invitation request to backend API
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/api/v1/invitations/request`, {
        method: 'POST',
        headers: getLocaleHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email: formData.email,
          companyName: formData.companyName,
          organizationType: formData.organizationType,
          useCase: formData.useCase || null,
          referralSource: formData.referralSource || null,
          recaptchaToken: recaptchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error:', result);
        setError(result.detail || t('requestInvitation.errors.submitFailed'));
        setLoading(false);
        return;
      }

      if (result.success) {
        setSubmitted(true);
      }
    } catch (err: any) {
      console.error('Invitation request failed:', err);
      setError(t('requestInvitation.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InvitationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <PublicHeader />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-2 border-amber-200 dark:border-amber-900/50">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-3xl font-bold text-brand-charcoal dark:text-slate-100">
                {t('requestInvitation.success.title')}
              </CardTitle>
              <CardDescription className="text-base mt-2 dark:text-slate-300">
                {t('requestInvitation.success.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20">
                <AlertDescription className="text-brand-charcoal dark:text-slate-200">
                  <p className="font-medium mb-2">{t('requestInvitation.success.whatHappensNext')}</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>{t('requestInvitation.success.step1')}</li>
                    <li>{t('requestInvitation.success.step2', { email: formData.email })}</li>
                    <li>{t('requestInvitation.success.step3')}</li>
                    <li>{t('requestInvitation.success.step4')}</li>
                  </ol>
                  <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                    {t('requestInvitation.success.bookmarkTip')}
                  </p>
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-3 gap-4 pt-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-brand-slate dark:text-slate-400" />
                  <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.success.reviewTime')}</p>
                  <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.success.reviewTimeLabel')}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-brand-slate dark:text-slate-400" />
                  <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.success.secure')}</p>
                  <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.success.secureLabel')}</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.success.exclusive')}</p>
                  <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.success.exclusiveLabel')}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  {t('requestInvitation.success.backToHome')}
                </Button>
                <Button
                  variant="stratum"
                  className="flex-1"
                  onClick={() => window.location.href = `mailto:${CONTACT_EMAIL}`}
                >
                  {t('requestInvitation.success.emailUs')}
                </Button>
              </div>

              <p className="text-xs text-center text-brand-slate dark:text-slate-400 pt-4">
                {t('requestInvitation.success.contactUs')}{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-600 dark:text-amber-400 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <PublicHeader />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-brand-charcoal dark:text-slate-100 mb-4">
              {t('requestInvitation.title')}
            </h1>
            <p className="text-xl text-brand-slate dark:text-slate-300 max-w-2xl mx-auto">
              {t('requestInvitation.subtitle')}
            </p>
          </div>

          {/* Trust Signals */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <Shield className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.trustSignals.reviewed')}</p>
              <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.trustSignals.reviewedLabel')}</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.trustSignals.responseTime')}</p>
              <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.trustSignals.responseTimeLabel')}</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-brand-charcoal dark:text-slate-100">{t('requestInvitation.trustSignals.noCharges')}</p>
              <p className="text-xs text-brand-slate dark:text-slate-400">{t('requestInvitation.trustSignals.noChargesLabel')}</p>
            </div>
          </div>

          {/* Form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">{t('requestInvitation.formTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* reCAPTCHA Error Alert */}
                {recaptchaError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>{t('requestInvitation.errors.securityError')}:</strong> {recaptchaError}
                      <br />
                      <span className="text-xs mt-2 block">
                        {t('requestInvitation.errors.persistsContact')}{' '}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                          {CONTACT_EMAIL}
                        </a>
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Form Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t('requestInvitation.form.emailLabel')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('requestInvitation.form.emailPlaceholder')}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    className={validationErrors.email ? 'border-destructive' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">{validationErrors.email}</p>
                  )}
                  <p className="text-xs text-brand-slate">
                    {t('requestInvitation.form.emailHelp')}
                  </p>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    {t('requestInvitation.form.companyLabel')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder={t('requestInvitation.form.companyPlaceholder')}
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    disabled={loading}
                    className={validationErrors.companyName ? 'border-destructive' : ''}
                  />
                  {validationErrors.companyName && (
                    <p className="text-sm text-destructive">{validationErrors.companyName}</p>
                  )}
                </div>

                {/* Organization Type */}
                <div className="space-y-3">
                  <Label>
                    {t('requestInvitation.form.orgTypeLabel')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* SME Option */}
                    <button
                      type="button"
                      onClick={() => handleInputChange('organizationType', 'SME')}
                      disabled={loading}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-200 ${
                        formData.organizationType === 'SME'
                          ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md'
                          : 'border-gray-200 dark:border-slate-700 hover:border-[#64748B] dark:hover:border-slate-600 hover:shadow-sm'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold text-base mb-1">
                            <Building2 className="h-5 w-5 text-[#64748B] dark:text-slate-400" />
                            <span className="text-gray-900 dark:text-gray-100">{t('requestInvitation.form.smeTitle')}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                            {t('requestInvitation.form.smeDescription')}
                          </p>
                        </div>
                        {formData.organizationType === 'SME' && (
                          <CheckCircle2 className="h-6 w-6 text-[#F59E0B] flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>

                    {/* Agency Option */}
                    <button
                      type="button"
                      onClick={() => handleInputChange('organizationType', 'AGENCY')}
                      disabled={loading}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-200 ${
                        formData.organizationType === 'AGENCY'
                          ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md'
                          : 'border-gray-200 dark:border-slate-700 hover:border-[#64748B] dark:hover:border-slate-600 hover:shadow-sm'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold text-base mb-1">
                            <Users className="h-5 w-5 text-[#64748B] dark:text-slate-400" />
                            <span className="text-gray-900 dark:text-gray-100">{t('requestInvitation.form.agencyTitle')}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                            {t('requestInvitation.form.agencyDescription')}
                          </p>
                        </div>
                        {formData.organizationType === 'AGENCY' && (
                          <CheckCircle2 className="h-6 w-6 text-[#F59E0B] flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Use Case */}
                <div className="space-y-2">
                  <Label htmlFor="useCase">
                    {t('requestInvitation.form.useCaseLabel')}
                  </Label>
                  <Textarea
                    id="useCase"
                    placeholder={t('requestInvitation.form.useCasePlaceholder')}
                    value={formData.useCase}
                    onChange={(e) => handleInputChange('useCase', e.target.value)}
                    disabled={loading}
                    rows={4}
                    maxLength={500}
                    className={validationErrors.useCase ? 'border-destructive' : ''}
                  />
                  {validationErrors.useCase && (
                    <p className="text-sm text-destructive">{validationErrors.useCase}</p>
                  )}
                  <p className="text-xs text-brand-slate">
                    {t('requestInvitation.form.characterCount', { count: formData.useCase.length, max: 500 })}
                  </p>
                </div>

                {/* Referral Source */}
                <div className="space-y-2">
                  <Label htmlFor="referralSource">
                    {t('requestInvitation.form.referralLabel')}
                  </Label>
                  <Input
                    id="referralSource"
                    type="text"
                    placeholder={t('requestInvitation.form.referralPlaceholder')}
                    value={formData.referralSource}
                    onChange={(e) => handleInputChange('referralSource', e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    variant="stratum"
                    className="w-full"
                    disabled={loading || !recaptchaReady}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t('requestInvitation.form.submitting')}
                      </>
                    ) : !recaptchaReady ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t('requestInvitation.form.loadingSecurity')}
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        {t('requestInvitation.form.submitButton')}
                      </>
                    )}
                  </Button>

                  {/* reCAPTCHA Badge Notice */}
                  <p className="text-xs text-center text-brand-slate mt-2">
                    {t('requestInvitation.form.recaptchaNotice')}
                  </p>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-center text-brand-slate pt-4">
                  {t('requestInvitation.form.termsPrefix')}{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/terms')}
                    className="text-amber-600 hover:underline"
                  >
                    {t('requestInvitation.form.termsLink')}
                  </button>{' '}
                  {t('requestInvitation.form.termsAnd')}{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/privacy')}
                    className="text-amber-600 hover:underline"
                  >
                    {t('requestInvitation.form.privacyLink')}
                  </button>
                  .
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Alternative Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm text-brand-slate dark:text-slate-400">
              {t('requestInvitation.alternativeContact')}{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

export default RequestInvitation;
