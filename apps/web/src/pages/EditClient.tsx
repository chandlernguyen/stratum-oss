import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ClientOnboardingForm } from '@/components/clients/ClientOnboardingForm';
import { useClientContext } from '@/contexts/ClientContext';

export default function EditClient() {
  const { t } = useTranslation('dashboard');
  const { clientSlug: clientSlugBranded } = useClientContext();
  const clientSlug = clientSlugBranded || undefined;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('clients.backToClients')}
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('clients.editClient.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('clients.editClient.description')}
        </p>
      </div>

      <ClientOnboardingForm editMode={true} clientSlug={clientSlug} />
    </div>
  );
}
