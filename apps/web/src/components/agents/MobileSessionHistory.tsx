import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionHistorySheet } from './SessionHistorySheet';

interface Session {
  id: string;
  session_title?: string | null | undefined;
  created_at: string;
  updated_at?: string;
  message_count?: number;
}

interface MobileSessionHistoryProps {
  sessions: Session[];
  selectedSessionId?: string;
  onSessionSelect: (session: Session) => void;
  onNewSession?: () => void;
}

/**
 * Mobile-first session history component following ChatGPT/Claude patterns.
 *
 * Renders:
 * 1. A history button (to be placed in header/tabs via the `button` prop)
 * 2. A bottom sheet with session history
 *
 * Usage:
 * ```tsx
 * const sessionHistory = useMobileSessionHistory({
 *   sessions: transformedSessions,
 *   selectedSessionId: selectedSession?.id,
 *   onSessionSelect: handleSelectSession,
 *   onNewSession: handleCreateSession,
 * });
 *
 * // In AgentTabs or header:
 * <AgentTabs trailingAction={sessionHistory.button} />
 *
 * // Anywhere in the component (renders the sheet):
 * {sessionHistory.sheet}
 * ```
 */
export function useMobileSessionHistory({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
}: MobileSessionHistoryProps) {
  const { t } = useTranslation(['agents']);
  const [isOpen, setIsOpen] = useState(false);

  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(true)}
      className="h-10 w-10 md:hidden"
      aria-label={t('agents:context.mobileHistory.ariaLabel')}
    >
      <History className="h-5 w-5 text-brand-slate" />
    </Button>
  );

  const sheet = (
    <SessionHistorySheet
      sessions={sessions}
      selectedSessionId={selectedSessionId}
      onSessionSelect={onSessionSelect}
      onNewSession={onNewSession}
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  );

  return {
    button,
    sheet,
    isOpen,
    setIsOpen,
  };
}

/**
 * Standalone component version for simpler usage.
 * Renders both the button trigger and the sheet.
 */
export function MobileSessionHistory({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  buttonClassName,
}: MobileSessionHistoryProps & { buttonClassName?: string }) {
  const { t } = useTranslation(['agents']);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={buttonClassName || "h-10 w-10 md:hidden"}
        aria-label={t('agents:context.mobileHistory.ariaLabel')}
      >
        <History className="h-5 w-5 text-brand-slate" />
      </Button>
      <SessionHistorySheet
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSessionSelect={onSessionSelect}
        onNewSession={onNewSession}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
