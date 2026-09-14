/**
 * ActivityTimeline Component
 *
 * Displays a timeline of activity for a resource (output, campaign, etc.)
 * Shows WHO did WHAT WHEN and WHY
 */

import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Send,
  Check,
  X,
  MessageSquare,
  Globe,
  GlobeLock,
  Eye,
  Download,
  Share2,
  Activity,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLocale } from '@/hooks/useLocale';
import {
  useResourceActivity,
  getActivityColor,
  type ResourceActivity,
} from '@/hooks/data/useResourceActivity';
import { getDateFnsLocale, getIntlLocale } from '@/lib/locales';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  resourceType: string;
  resourceId: string;
  className?: string;
  maxHeight?: string;
}

const iconMap: Record<string, typeof Activity> = {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Send,
  Check,
  X,
  MessageSquare,
  Globe,
  GlobeLock,
  Eye,
  Download,
  Share2,
  Activity,
};

function getActivityIconComponent(activityType: string) {
  const iconNames: Record<string, string> = {
    created: 'Plus',
    updated: 'Pencil',
    archived: 'Archive',
    restored: 'ArchiveRestore',
    deleted: 'Trash2',
    approval_requested: 'Send',
    approved: 'Check',
    rejected: 'X',
    changes_requested: 'MessageSquare',
    published: 'Globe',
    unpublished: 'GlobeLock',
    viewed: 'Eye',
    exported: 'Download',
    shared: 'Share2',
  };
  const iconName = iconNames[activityType] || 'Activity';
  return iconMap[iconName] || Activity;
}

interface ActivityItemProps {
  activity: ResourceActivity;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}

function ActivityItem({ activity, t, locale }: ActivityItemProps) {
  const Icon = getActivityIconComponent(activity.activity_type);
  const colorClass = getActivityColor(activity.activity_type);
  const label = t(`activity.labels.${activity.activity_type}`, { defaultValue: activity.activity_type });

  // Extract reason/comment from details if present
  const reason = activity.comment || activity.details?.reason;

  const dateLocale = getDateFnsLocale(locale);
  const localeCode = getIntlLocale(locale);

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          colorClass
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100">
          <span className="font-medium">{activity.actor_name || t('activity.unknownActor')}</span>
          {activity.actor_role && (
            <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
              ({activity.actor_role})
            </span>
          )}
          {' '}
          <span className={cn('font-medium', colorClass)}>{label}</span>
        </p>

        {/* Reason/Comment */}
        {reason && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 italic">
            "{reason}"
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale })}
          {' · '}
          {new Date(activity.created_at).toLocaleDateString(localeCode, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  resourceType,
  resourceId,
  className,
  maxHeight = '400px',
}: ActivityTimelineProps) {
  const { t, locale } = useLocale('outputs');
  const { data: activities, isLoading, error } = useResourceActivity(
    resourceType,
    resourceId
  );

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">{t('activity.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-red-500">{t('activity.error')}</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Activity className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">{t('activity.empty')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)} style={{ maxHeight, overflowY: 'auto' }}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('activity.title')}
      </h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Activity items */}
        <div className="relative space-y-4">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} t={t} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}
