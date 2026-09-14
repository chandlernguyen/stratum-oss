import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageRenderer } from './MessageRenderer';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '@/types/agentTools';
import type { AgentType } from './AgentChat';

interface CrossAgentContext {
  actionItems: Array<{ task: string; timeframe?: string }>;
}

interface ChatMessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  sessionId: string | null;
  agentType: AgentType;
  agentColor?: string;
  disableInitialScroll?: boolean;
  // Auto-save
  saveStatus: 'saving' | 'saved' | 'error' | 'draft' | null;
  outputId: string | null;
  onFinalize: (outputId: string) => Promise<void>;
  // Cross-agent context
  hasContext?: boolean;
  fromAgent?: string;
  context?: CrossAgentContext | null;
  contextUsed?: boolean;
  onClearContext?: () => void;
  onClearInput?: () => void;
  onSetContextUsed?: (used: boolean) => void;
}

/**
 * Component to render the chat message list
 *
 * Responsibilities:
 * - Render messages with proper styling
 * - Handle auto-scroll
 * - Show loading indicators
 * - Display errors
 * - Show cross-agent context alerts
 * - Show auto-save status
 */
export function ChatMessageList({
  messages,
  isLoading,
  error,
  retryCount,
  sessionId,
  agentType,
  agentColor: _agentColor = 'blue',
  disableInitialScroll = false,
  saveStatus,
  outputId,
  onFinalize,
  hasContext,
  fromAgent,
  context,
  contextUsed,
  onClearContext,
  onClearInput,
  onSetContextUsed,
}: ChatMessageListProps) {
  const { t } = useTranslation(['agents', 'common']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isInitialLoadRef.current && disableInitialScroll) {
      isInitialLoadRef.current = false;
      return;
    }
    isInitialLoadRef.current = false;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, disableInitialScroll]);

  const handleClearContext = () => {
    onClearContext?.();
    onClearInput?.();
    onSetContextUsed?.(false);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Cross-agent context alert - Premium styling */}
        {hasContext && fromAgent === 'strategy' && !contextUsed && context && (
          <Alert className={cn(
            "relative overflow-hidden",
            "border-amber-300/50 dark:border-amber-500/30",
            "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10",
            "shadow-lg shadow-amber-500/10"
          )}>
            {/* Grain texture */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
              <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
            </div>

            <div className={cn(
              "p-2 rounded-lg",
              "bg-gradient-to-br from-amber-500 to-amber-600",
              "shadow-md shadow-amber-500/20"
            )}>
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <AlertDescription className="ml-3 relative">
              <div className="font-serif font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t('agents:chat.contextAlert.title')}
              </div>
              <div className="text-amber-800 dark:text-amber-200 text-sm space-y-1">
                <p>{t('agents:chat.contextAlert.actionItems', { count: context.actionItems.length })}</p>
                <ul className="list-none mt-2 space-y-1.5">
                  {context.actionItems.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <span>
                        {item.task}
                        {item.timeframe && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                            ({item.timeframe})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                  {context.actionItems.length > 3 && (
                    <li className="text-amber-600 dark:text-amber-400 font-medium pl-3.5">
                      {t('agents:chat.contextAlert.andMore', { count: context.actionItems.length - 3 })}
                    </li>
                  )}
                </ul>
                <p className="mt-3 font-medium text-amber-900 dark:text-amber-100">
                  {t('agents:chat.contextAlert.prefillNote')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                onClick={handleClearContext}
              >
                {t('agents:chat.clearContext')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Message list */}
        {messages.map((msg, index) => (
          <div key={msg.id || `message-${index}`} className="flex flex-col md:flex-row items-start gap-2 md:gap-4">
            {/* Avatar - Premium styling */}
            <div className="flex-shrink-0">
              {msg.role === 'user' ? (
                <div className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl",
                  "bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800",
                  "text-white flex items-center justify-center",
                  "font-semibold text-[11px] md:text-xs",
                  "shadow-lg shadow-slate-900/20"
                )}>
                  {t('agents:chat.you')}
                </div>
              ) : (
                <div className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-xl",
                  "bg-gradient-to-br from-amber-500 to-amber-600",
                  "flex items-center justify-center",
                  "shadow-lg shadow-amber-500/20"
                )}>
                  <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              )}
            </div>

            {/* Message Content - Premium styling */}
            <div className="flex-1 w-full md:min-w-0">
              {msg.role === 'user' ? (
                <div className={cn(
                  "relative overflow-hidden",
                  "bg-white dark:bg-slate-800/80",
                  "rounded-2xl rounded-tl-md",
                  "px-4 md:px-5 py-3 md:py-4",
                  "shadow-lg shadow-slate-900/5 dark:shadow-black/20",
                  "border border-slate-200/80 dark:border-slate-700/80"
                )}>
                  <p className="text-sm md:text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div>
                  <div className={cn(
                    "relative overflow-hidden",
                    "bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-800/70",
                    "rounded-2xl rounded-tl-md",
                    "px-4 md:px-5 py-3 md:py-4",
                    "shadow-lg shadow-amber-500/5 dark:shadow-black/20",
                    "border border-amber-100/50 dark:border-slate-700/80"
                  )}>
                    {/* Subtle grain texture */}
                    <div className="absolute inset-0 opacity-[0.01] pointer-events-none">
                      <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
                    </div>

                    <div className="relative">
                      <MessageRenderer
                        message={msg}
                        isStreaming={msg.id === 'streaming-response' && isLoading}
                        sessionId={sessionId}
                        agentType={agentType}
                      />
                    </div>
                  </div>

                  {/* Auto-save status for latest assistant message */}
                  {msg.id !== 'greeting' && msg.id !== 'streaming-response' &&
                   messages.indexOf(msg) === messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i !== -1).pop() && (
                    <div className="mt-2 ml-2">
                      <SaveStatusIndicator
                        status={saveStatus}
                        outputId={outputId || undefined}
                        onFinalize={onFinalize}
                        showToast={false}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator - Premium styling */}
        {isLoading && !messages.some(msg => msg.id === 'streaming-response') && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3 md:gap-4">
              <div className={cn(
                "flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-xl",
                "bg-gradient-to-br from-amber-500 to-amber-600",
                "flex items-center justify-center",
                "shadow-lg shadow-amber-500/20"
              )}>
                <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className={cn(
                "relative overflow-hidden",
                "bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-800/70",
                "rounded-2xl rounded-tl-md",
                "shadow-lg shadow-amber-500/5 dark:shadow-black/20",
                "border border-amber-100/50 dark:border-slate-700/80",
                "px-5 py-4"
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms', animationDuration: '600ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms', animationDuration: '600ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms', animationDuration: '600ms' }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('agents:chat.thinking')}
                  </span>
                  {retryCount > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {t('agents:chat.retrying', { current: retryCount, max: 2 })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error display - Premium styling */}
        {error && (
          <div className="flex justify-center">
            <div className={cn(
              "max-w-lg w-full p-5 rounded-xl",
              "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10",
              "border border-red-200/80 dark:border-red-800/50",
              "shadow-lg shadow-red-500/10"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  "bg-gradient-to-br from-red-500 to-red-600",
                  "shadow-md shadow-red-500/20"
                )}>
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <p className="text-base font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
