/**
 * NotificationBell Component
 *
 * Displays notification indicator with badge count and dropdown menu.
 * Integrates with real-time Supabase subscriptions for instant updates.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCircle2, Clock, MessageSquare, ListTodo, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotificationBell,
  useNotifications,
  useMarkNotificationsRead,
  type Notification,
  type NotificationType,
} from '@/hooks/data/useCollaboration';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Notification type icons and colors
const notificationConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  approval_request: { icon: <Shield className="h-4 w-4" />, color: 'text-amber-500' },
  approval_resolved: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
  approval_changes_requested: { icon: <Clock className="h-4 w-4" />, color: 'text-orange-500' },
  comment: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-500' },
  mention: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-purple-500' },
  comment_resolved: { icon: <Check className="h-4 w-4" />, color: 'text-green-500' },
  task_assigned: { icon: <ListTodo className="h-4 w-4" />, color: 'text-blue-500' },
  task_completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
  task_due_soon: { icon: <Clock className="h-4 w-4" />, color: 'text-orange-500' },
  task_status_changed: { icon: <ListTodo className="h-4 w-4" />, color: 'text-slate-500' },
  system: { icon: <Bell className="h-4 w-4" />, color: 'text-slate-500' },
};

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = notificationConfig[notification.type] || notificationConfig.system;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0',
        !notification.is_read && 'bg-amber-50/50 dark:bg-amber-900/10'
      )}
      onClick={() => {
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
      }}
    >
      <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900 dark:text-gray-100', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />}
    </div>
  );
}

function NotificationDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const { data, isLoading } = useNotifications({ unread_only: false });
  const markRead = useMarkNotificationsRead();

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    markRead.mutate(undefined);
  };

  const handleMarkOneRead = (id: string) => {
    markRead.mutate([id]);
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
        {data && data.unread_count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markRead.isPending}
            className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-80">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.notifications.length ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          data.notifications.slice(0, 10).map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkOneRead}
            />
          ))
        )}
      </ScrollArea>

      {data && data.total > 10 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <Link
            to="/notifications"
            onClick={onClose}
            className="block text-center text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium"
          >
            {t('notifications.viewAll', { count: data.total })}
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationBell() {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount, isLoading } = useNotificationBell();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only show unread notifications count in badge (pendingApprovals/pendingTasks shown on dashboard)
  const totalBadge = unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={t('notifications.count', { count: totalBadge })}
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {totalBadge > 0 && !isLoading && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-xs font-bold"
          >
            {totalBadge > 99 ? '99+' : totalBadge}
          </Badge>
        )}
      </Button>

      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
