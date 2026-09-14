import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Plus, MessageSquare, Clock } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  id: string
  session_title?: string | null | undefined
  created_at: string
  updated_at?: string
  message_count?: number
}

interface SessionHistorySheetProps {
  sessions: Session[]
  selectedSessionId?: string
  onSessionSelect: (session: Session) => void
  onNewSession?: () => void
  /** Custom trigger element - if provided, the default FAB is hidden */
  trigger?: React.ReactNode
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function SessionHistorySheet({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  trigger,
  open,
  onOpenChange
}: SessionHistorySheetProps) {
  const { t } = useTranslation(['agents'])
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false)

  // Use controlled or uncontrolled mode
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  // Handle session selection and close sheet
  const handleSessionSelect = (session: Session) => {
    onSessionSelect(session)
    setIsOpen?.(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Use custom trigger if provided, otherwise no default trigger (FAB removed) */}
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side="bottom"
        className={cn(
          "h-[85vh] overflow-hidden flex flex-col p-0",
          "bg-white dark:bg-slate-900",
          "border-t border-slate-200/80 dark:border-slate-700/80",
          "rounded-t-3xl"
        )}
      >
        {/* Premium Header */}
        <SheetHeader className={cn(
          "relative px-6 pt-6 pb-4",
          "border-b border-slate-200/80 dark:border-slate-700/80",
          "bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900"
        )}>
          {/* Decorative handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />

          <div className="flex items-center gap-3 mt-2">
            <div className={cn(
              "p-2 rounded-xl",
              "bg-gradient-to-br from-amber-400 to-amber-600",
              "shadow-lg shadow-amber-500/20"
            )}>
              <History className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="font-serif text-xl text-slate-900 dark:text-slate-100">
              {t('agents:context.sessionHistory.title')}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* New Session Button - Premium styling */}
        {onNewSession && (
          <div className="px-6 pt-4 pb-2">
            <Button
              onClick={onNewSession}
              className={cn(
                "w-full min-h-12",
                "bg-gradient-to-r from-amber-500 to-amber-600",
                "hover:from-amber-600 hover:to-amber-700",
                "text-white font-semibold",
                "shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30",
                "transition-all duration-200",
                "rounded-xl"
              )}
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('agents:context.sessionHistory.newSession')}
            </Button>
          </div>
        )}

        {/* Sessions List - Premium styling */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={cn(
                "w-20 h-20 rounded-2xl mb-6",
                "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
                "flex items-center justify-center",
                "shadow-lg shadow-slate-900/10 dark:shadow-black/20"
              )}>
                <History className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {t('agents:context.sessionHistory.emptyState.title')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                {t('agents:context.sessionHistory.emptyState.description')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const isSelected = session.id === selectedSessionId
                const timeAgo = formatDistanceToNow(new Date(session.created_at), { addSuffix: true })

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all duration-200",
                      "min-h-[80px] tap-target",
                      "border-2",
                      isSelected
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-900/20 shadow-md shadow-amber-500/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-amber-400/50 dark:hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Session icon */}
                      <div className={cn(
                        "p-2 rounded-lg flex-shrink-0",
                        isSelected
                          ? "bg-amber-100 dark:bg-amber-900/40"
                          : "bg-slate-100 dark:bg-slate-800"
                      )}>
                        <MessageSquare className={cn(
                          "w-4 h-4",
                          isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-semibold text-sm mb-1 truncate",
                          isSelected ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"
                        )}>
                          {session.session_title || t('agents:context.sessionHistory.untitledSession')}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo}
                          </span>
                          {session.message_count !== undefined && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {session.message_count} {session.message_count === 1 ? t('agents:context.sessionHistory.messageCount.singular') : t('agents:context.sessionHistory.messageCount.plural')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0 self-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Bottom safe area padding */}
          <div className="h-4 safe-bottom" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
