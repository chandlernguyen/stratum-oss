import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Archive as ArchiveIcon,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApprovalRequestButton } from '@/components/collaboration/ApprovalRequestButton';
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'archived';
  client_id?: string;
}

type StatusAction = {
  label: string;
  icon: any;
  status: Campaign['status'];
  variant: 'default' | 'outline' | 'secondary' | 'destructive';
};

interface CampaignHeaderProps {
  campaign: Campaign;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStatusChange: (status: Campaign['status']) => void | Promise<void>;
  onArchive: () => void;
  getStatusBadgeVariant: (status: string) => string;
  getStatusActions: (status: Campaign['status']) => StatusAction[];
}

export function CampaignHeader({
  campaign,
  isEditing,
  hasUnsavedChanges,
  onToggleEdit,
  onSave,
  onCancelEdit,
  onStatusChange,
  onArchive,
  getStatusBadgeVariant,
  getStatusActions,
}: CampaignHeaderProps) {
  const { t } = useTranslation('campaigns');

  // Permission checking
  const { data: userContext } = useUserContextEnhanced();
  const permissions = userContext?.permissions || [];
  const canEdit = permissions.includes('campaigns.campaign.edit');
  const canArchive = permissions.includes('campaigns.campaign.archive');
  const canExecute = permissions.includes('campaigns.campaign.execute');
  // Can modify = can edit OR can execute (for status changes like pause/resume)
  const canModify = canEdit || canExecute;

  // Guard against undefined campaign
  if (!campaign) {
    return null;
  }

  const statusActions = getStatusActions(campaign.status);

  return (
    <div className="mb-6">
      {/* Mobile: Stacked Layout | Desktop: Horizontal Layout */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Title & Status Badge */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            {campaign.name}
          </h1>
          <Badge variant={getStatusBadgeVariant(campaign.status) as any}>
            {campaign.status}
          </Badge>
        </div>

        {/* Action Buttons - Mobile: 2-column grid | Desktop: Horizontal row */}
        {/* Only show if user has any modify permissions */}
        {canModify && (
          <div className="grid grid-cols-2 md:flex md:items-center gap-2">
            {/* Quick Actions - status changes require execute or edit permission */}
            {!isEditing && statusActions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                onClick={() => onStatusChange(action.status)}
                className="min-h-12 md:min-h-10 w-full md:w-auto"
              >
                <action.icon className="h-4 w-4 mr-2" />
                <span className="md:inline">{action.label}</span>
              </Button>
            ))}

            {/* Archive button - requires archive permission */}
            {canArchive && (
              <Button
                variant="outline"
                size="sm"
                onClick={onArchive}
                className="min-h-12 md:min-h-10 w-full md:w-auto"
              >
                <ArchiveIcon className="h-4 w-4 mr-2" />
                <span className="md:inline">{t('actions.archive')}</span>
              </Button>
            )}

            {/* Request Approval - requires edit permission */}
            {canEdit && (
              <ApprovalRequestButton
                resourceType="campaign"
                resourceId={campaign.id}
                resourceTitle={campaign.name}
                clientId={campaign.client_id}
                variant="outline"
                size="sm"
                className="min-h-12 md:min-h-10 w-full md:w-auto"
              />
            )}

            {/* Edit Mode Toggle - requires edit permission */}
            {canEdit && (
              !isEditing ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onToggleEdit}
                  className="min-h-12 md:min-h-10 w-full md:w-auto col-span-2 md:col-span-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t('actions.editDetails')}</span>
                  <span className="sm:hidden">{t('actions.edit')}</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onSave}
                    disabled={!hasUnsavedChanges}
                    className="min-h-12 md:min-h-10 w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('actions.saveChanges')}</span>
                    <span className="sm:hidden">{t('actions.save')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelEdit}
                    className="min-h-12 md:min-h-10 w-full md:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('actions.cancel')}
                  </Button>
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
