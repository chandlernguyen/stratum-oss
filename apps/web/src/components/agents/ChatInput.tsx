import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Sparkles, Info, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUploadButton, type UploadedFile } from './FileUploadButton';
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { cn } from '@/lib/utils';
import type { AgentType } from './AgentChat';
import type { ExpertiseLevel } from '@/config/agentConfig';

interface Hint {
  trigger: string;
  fullPrompt?: string;
  description?: string;
  tooltip?: string;
  icon?: string;
  estimatedTime?: string;
}

interface ChatInputProps {
  agentType: AgentType;
  placeholder?: string;
  isLoading: boolean;
  isConnecting: boolean;
  // Input state
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  // File upload
  uploadedFiles: UploadedFile[];
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: (geminiUri: string) => void;
  supportsFileUpload: boolean;
  // Hints
  hints: Hint[];
  expertiseLevel: ExpertiseLevel;
  onExpertiseLevelChange: (level: ExpertiseLevel) => void;
}

// Agents that support file upload
const FILE_UPLOAD_AGENTS: AgentType[] = [
  'strategy',
  'persona',
  'marketing_strategy',
  'content',
  'performance_intelligence',
  'campaign_planning',
  'competitive_intelligence',
  'client_success',
  'quick_start',
];

/**
 * Component for the chat input area
 *
 * Responsibilities:
 * - Text input with auto-resize
 * - File upload button and display
 * - Submit button
 * - Hints/suggestions section
 */
export function ChatInput({
  agentType,
  placeholder,
  isLoading,
  isConnecting,
  input,
  onInputChange,
  onSubmit,
  uploadedFiles,
  onFileUploaded,
  onFileRemoved,
  supportsFileUpload,
  hints,
  expertiseLevel,
  onExpertiseLevelChange,
}: ChatInputProps) {
  const { t } = useTranslation('common');
  const [showHints, setShowHints] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isKeyboardOpen } = useVirtualKeyboard();

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const isDisabled = isLoading || isConnecting;
  const canSubmit = !isDisabled && input.trim();

  return (
    <div className={cn(
      "border-t border-slate-200/80 dark:border-slate-700/80",
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
    )}>
      {/* Hints Section - Premium styling */}
      {showHints && hints.length > 0 && (
        <div className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-r from-slate-50 via-amber-50/50 to-slate-50",
          "dark:from-slate-800/90 dark:via-amber-900/10 dark:to-slate-800/90",
          "border-b border-slate-200/80 dark:border-slate-700/80"
        )}>
          {/* Decorative element */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600" />

          <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 pl-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  "bg-gradient-to-br from-amber-400 to-amber-600",
                  "shadow-md shadow-amber-500/20"
                )}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-serif text-base font-semibold text-slate-800 dark:text-slate-200">
                  Suggestions
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg",
                    "bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "text-slate-900 dark:text-slate-100",
                    "focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 dark:focus:border-amber-500",
                    "font-medium transition-all duration-200",
                    "flex-1 md:flex-none"
                  )}
                  value={expertiseLevel}
                  onChange={(e) => onExpertiseLevelChange(e.target.value as ExpertiseLevel)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowHints(false)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg",
                    "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",
                    "hover:bg-slate-100 dark:hover:bg-slate-800",
                    "transition-colors duration-200"
                  )}
                  aria-label="Hide suggestions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Suggestion Buttons - Premium cards */}
            <div className="flex flex-col md:flex-row md:flex-wrap gap-2">
              {hints.map((hint, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onInputChange(hint.fullPrompt || hint.trigger)}
                  className={cn(
                    "group flex items-center justify-between gap-3",
                    "px-4 py-3 md:py-2.5 text-sm",
                    "bg-white dark:bg-slate-800/80",
                    "border border-slate-200 dark:border-slate-700",
                    "rounded-xl md:rounded-full",
                    "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                    "hover:bg-amber-50/50 dark:hover:bg-amber-900/20",
                    "hover:shadow-md hover:shadow-amber-500/10",
                    "transition-all duration-200",
                    "font-medium text-left w-full md:w-auto"
                  )}
                  title={hint.tooltip || hint.description}
                >
                  {hint.icon && <span className="text-lg flex-shrink-0">{hint.icon}</span>}
                  <span className="text-slate-700 dark:text-slate-200 flex-1 truncate">{hint.trigger}</span>
                  {hint.estimatedTime && (
                    <span className={cn(
                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                      "bg-slate-100 dark:bg-slate-700",
                      "text-slate-500 dark:text-slate-400"
                    )}>
                      <Clock className="w-3 h-3" />
                      {hint.estimatedTime}
                    </span>
                  )}
                  <Info className="w-4 h-4 text-slate-400 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Section - pb-safe only on mobile for iOS safe area */}
      <div className={cn(
        "sticky bottom-0 rounded-b-xl",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
        isKeyboardOpen ? '' : 'pb-safe pb-safe-mobile-only'
      )}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-2.5">
          {/* Uploaded files - Premium chips */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.gemini_uri}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-1.5 text-sm",
                    "bg-slate-100 dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "rounded-full",
                    "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                    "transition-all duration-200"
                  )}
                >
                  <span className="max-w-[150px] truncate text-slate-700 dark:text-slate-300 font-medium">
                    {file.original_filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFileRemoved(file.gemini_uri)}
                    className={cn(
                      "p-0.5 rounded-full",
                      "text-slate-400 hover:text-red-500 dark:hover:text-red-400",
                      "hover:bg-red-100 dark:hover:bg-red-900/30",
                      "transition-colors duration-200"
                    )}
                    aria-label={`Remove ${file.original_filename}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input form - Premium styling */}
          <form onSubmit={onSubmit}>
            <div className={cn(
              "relative rounded-2xl",
              "bg-white dark:bg-slate-800",
              "border-2 border-slate-200 dark:border-slate-700",
              "focus-within:border-amber-400 dark:focus-within:border-amber-500",
              "focus-within:ring-4 focus-within:ring-amber-500/10 dark:focus-within:ring-amber-400/10",
              "shadow-sm focus-within:shadow-lg focus-within:shadow-amber-500/5",
              "transition-all duration-200"
            )}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  "w-full border-0 focus:ring-0 focus-visible:ring-0",
                  "text-base min-h-[52px] max-h-[200px]",
                  "resize-none overflow-y-auto rounded-2xl",
                  "font-medium bg-transparent px-4 py-3",
                  "text-slate-900 dark:text-slate-100",
                  "placeholder:text-slate-400 dark:placeholder:text-slate-500"
                )}
                style={{ fontSize: '16px' }}
                disabled={isDisabled}
              />
              {/* Bottom row: file upload + suggestions on left, send on right */}
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1">
                  {supportsFileUpload && (
                    <FileUploadButton
                      agentType={agentType}
                      onFileUploaded={onFileUploaded}
                      onFileRemoved={onFileRemoved}
                      uploadedFiles={[]}
                      disabled={isDisabled}
                    />
                  )}
                  {/* Suggestions toggle - inline with file upload */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowHints(!showHints)}
                        className={cn(
                          "p-2.5 rounded-xl",
                          "text-slate-400 dark:text-slate-500",
                          "hover:text-amber-500 dark:hover:text-amber-400",
                          "hover:bg-amber-50 dark:hover:bg-amber-900/30",
                          "transition-all duration-200",
                          showHints && "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
                        )}
                        aria-label={showHints ? t('chat.hideSuggestions') : t('chat.showSuggestions')}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{showHints ? t('chat.hideSuggestions') : t('chat.showSuggestions')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "px-3.5 py-2.5 rounded-xl",
                    "bg-gradient-to-r from-amber-500 to-amber-600",
                    "hover:from-amber-600 hover:to-amber-700",
                    "disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-600 dark:disabled:to-slate-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30",
                    "disabled:shadow-none",
                    "transition-all duration-200",
                    "min-w-[44px] min-h-[44px]"
                  )}
                  aria-label={t('chat.sendMessage')}
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5 text-white" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Export helper to check if agent supports file upload
export function agentSupportsFileUpload(agentType: AgentType): boolean {
  return FILE_UPLOAD_AGENTS.includes(agentType);
}
