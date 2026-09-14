import { ArrowLeft, Building2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ClientOnboardingForm } from '@/components/clients/ClientOnboardingForm';
import { useAccessDenied } from '@/components/auth/AccessDenied';
import { cn } from '@/lib/utils';

export default function AddClient() {
  const { t } = useTranslation('dashboard');
  // Check permission to create clients
  const { hasPermission, isLoading, AccessDeniedComponent } = useAccessDenied(
    'clients.client.create',
    'Client Creation'
  );

  // Show access denied if user lacks permission
  if (!isLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Back navigation */}
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "text-slate-600 dark:text-slate-400",
            "hover:text-slate-900 dark:hover:text-slate-100",
            "hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <Link to="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('clients.backToClients')}
          </Link>
        </Button>
      </div>

      {/* Premium header */}
      <div className="relative mb-8">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-4 md:-mx-6 -mt-4 rounded-3xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Premium badge */}
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4",
            "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
            "border border-blue-500/20"
          )}>
            <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
              {t('clients.addClient.badge')}
            </span>
          </div>

          {/* Serif heading */}
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {t('clients.addClient.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl">
            {t('clients.addClient.description')}
          </p>

          {/* Feature hints */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
              "bg-slate-100 dark:bg-slate-800",
              "text-slate-600 dark:text-slate-400"
            )}>
              <Sparkles className="w-3 h-3 text-amber-500" />
              {t('clients.features.aiPowered')}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
              "bg-slate-100 dark:bg-slate-800",
              "text-slate-600 dark:text-slate-400"
            )}>
              {t('clients.features.personalizedStrategies')}
            </span>
          </div>
        </div>
      </div>

      <ClientOnboardingForm />
    </div>
  );
}