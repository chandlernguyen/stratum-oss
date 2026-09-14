/**
 * AgentPageLayout - Shared layout wrapper for all agent pages
 *
 * Provides two layout modes inspired by Claude.ai:
 * 1. Landing Mode: Centered title, feature cards, centered input (no active session)
 * 2. Session Mode: Compact header (top-left), full-height chat, input at bottom
 *
 * Solves the double-scrollbar issue by:
 * 1. Using h-full (parent constrains to viewport via App.tsx)
 * 2. Using proper flexbox with overflow-hidden on parent, overflow-y-auto on chat
 * 3. Using min-h-0 to allow flex children to shrink below content size
 *
 * Usage:
 * ```tsx
 * <AgentPageLayout
 *   mode={selectedSession ? 'session' : 'landing'}
 *   icon={Target}
 *   title="Business Strategy Agent"
 *   subtitle="AI-powered strategic analysis"
 *   featureCards={[...]}
 *   sessionTitle={selectedSession?.session_title}
 *   onNewSession={handleCreateSession}
 *   sidebar={<AgentSidebar ... />}
 *   sessionHistorySheet={<SessionHistorySheet ... />}
 * >
 *   <AgentChat ... />
 * </AgentPageLayout>
 * ```
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContextAlert } from './ContextAlert';
import { useAgentLayout } from '@/contexts/AgentLayoutContext';

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string; // e.g., 'text-amber-600 dark:text-amber-400'
  borderColor?: string; // e.g., 'hover:border-amber-200 dark:hover:border-amber-800'
}

interface AgentPageLayoutProps {
  children: ReactNode;
  /** Layout mode: 'landing' for new sessions, 'session' for active chat */
  mode: 'landing' | 'session';
  /** Agent icon (LucideIcon) */
  icon: LucideIcon;
  /** Agent title (e.g., "Business Strategy Agent") */
  title: string;
  /** Subtitle shown in landing mode */
  subtitle?: string;
  /** Session title shown in session mode */
  sessionTitle?: string | null;
  /** Callback to create a new session */
  onNewSession?: () => void;
  /** Feature cards shown in landing mode */
  featureCards?: FeatureCard[];
  /** Sidebar component (desktop only) */
  sidebar?: ReactNode;
  /** Session history sheet (mobile only) */
  sessionHistorySheet?: ReactNode;
  /** Mobile history button (mobile only, renders in header) */
  mobileHistoryButton?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Gradient colors for the background */
  gradient?: 'slate' | 'amber' | 'green' | 'blue';
  /** Icon gradient from color */
  gradientFrom?: string;
  /** Icon gradient to color */
  gradientTo?: string;
}

interface AgentPageLayoutContextValue {
  inLayout: boolean;
  mode: 'landing' | 'session';
}

const AgentPageLayoutContext = createContext<AgentPageLayoutContextValue>({
  inLayout: false,
  mode: 'landing',
});

// 2025 Design: Refined Authority - Premium gradient backgrounds
const gradientClasses = {
  slate: 'from-slate-50 via-white to-stone-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900',
  amber: 'from-amber-50/30 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900',
  green: 'from-emerald-50/30 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900',
  blue: 'from-blue-50/30 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900',
};

export function AgentPageLayout({
  children,
  mode,
  icon: Icon,
  title,
  subtitle,
  sessionTitle,
  onNewSession,
  featureCards,
  sidebar,
  sessionHistorySheet,
  mobileHistoryButton,
  className,
  gradient = 'slate',
  gradientFrom = 'from-slate-600',
  gradientTo = 'to-amber-600',
}: AgentPageLayoutProps) {
  const { t } = useTranslation(['agents']);
  const agentLayout = useAgentLayout();

  // Signal this is an agent page (enables viewport-constrained layout in App.tsx)
  useEffect(() => {
    agentLayout?.setIsAgentPage(true);
    return () => agentLayout?.setIsAgentPage(false);
  }, [agentLayout]);

  // Hide footer when in active session mode
  useEffect(() => {
    agentLayout?.setHideFooter(mode === 'session');
  }, [mode, agentLayout]);

  const isSession = mode === 'session';

  return (
    <AgentPageLayoutContext.Provider value={{ inLayout: true, mode }}>
      {/* Use h-full since parent (App.tsx) constrains to viewport */}
      <div
        className={cn(
          'h-full overflow-hidden bg-gradient-to-br',
          gradientClasses[gradient],
          className
        )}
      >
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar - Desktop only */}
          {sidebar && (
            <div className="hidden md:block flex-shrink-0">
              {sidebar}
            </div>
          )}

          {/* Session History Sheet - Mobile only */}
          {sessionHistorySheet}

          {/* Main Content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {isSession ? (
              /* SESSION MODE: Compact header, full chat */
              <>
                {/* Compact Header - Glass effect with refined styling */}
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-between px-4 py-3",
                  "border-b border-slate-200/80 dark:border-slate-700/80",
                  "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
                  "shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                )}>
                  <div className="flex items-center gap-3">
                    {/* Premium icon with warm shadow */}
                    <div className={cn(
                      "p-2 rounded-xl bg-gradient-to-br shadow-lg",
                      gradientFrom, gradientTo,
                      "shadow-slate-900/20 dark:shadow-black/30"
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-serif font-semibold text-slate-900 dark:text-slate-100">
                        {title}
                      </span>
                      {sessionTitle && (
                        <span className="hidden md:inline text-sm text-slate-500 dark:text-slate-400 ml-2">
                          — {sessionTitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mobile history button */}
                    {mobileHistoryButton}
                    {onNewSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onNewSession}
                        className={cn(
                          "text-slate-500 hover:text-slate-900",
                          "dark:text-slate-400 dark:hover:text-slate-100",
                          "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {t('agents:context.header.newSession')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Chat Area - Full height, extends to edges on mobile */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <Card className={cn(
                    "flex-1 min-h-0 overflow-hidden flex flex-col",
                    "mx-0 md:mx-4 mt-2 md:mt-3 mb-0 md:mb-2",
                    "rounded-none md:rounded-xl",
                    "border-x-0 md:border-x border-b-0 md:border-b",
                    "border-slate-200/80 dark:border-slate-700/80",
                    "shadow-lg shadow-slate-900/5 dark:shadow-black/20"
                  )}>
                    {children}
                  </Card>
                </div>
              </>
            ) : (
              /* LANDING MODE: Premium centered layout */
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto">
                  {/* Context Alert */}
                  <ContextAlert />

                  {/* Premium Hero Header */}
                  <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
                      {/* Premium Icon with shadow and grain */}
                      <div className={cn(
                        "p-3 md:p-4 rounded-2xl bg-gradient-to-br shadow-xl",
                        gradientFrom, gradientTo,
                        "shadow-slate-900/20 dark:shadow-black/40"
                      )}>
                        <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        {/* Serif heading for authority */}
                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100">
                          {title}
                        </h1>
                        {subtitle && (
                          <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mt-2 md:mt-3">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Feature Cards - Premium styling */}
                    {featureCards && featureCards.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-8 md:mt-10">
                        {featureCards.map((card, index) => (
                          <Card
                            key={index}
                            className={cn(
                              "relative p-5 md:p-6 transition-all duration-300",
                              "bg-white dark:bg-slate-800/50",
                              "border border-slate-200/80 dark:border-slate-700/60",
                              "hover:border-amber-400/50 dark:hover:border-amber-500/40",
                              "hover:shadow-lg hover:shadow-amber-500/5",
                              "hover:-translate-y-0.5",
                              "card-textured"
                            )}
                          >
                            <div className="relative z-10 flex items-start gap-4">
                              {/* Icon with gradient background */}
                              <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 shadow-md">
                                <card.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                                  {card.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {card.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chat Component - Premium container */}
                  <Card className={cn(
                    "overflow-hidden",
                    "border border-slate-200/80 dark:border-slate-700/80",
                    "shadow-2xl shadow-slate-900/10 dark:shadow-black/30",
                    "rounded-2xl"
                  )}>
                    {children}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AgentPageLayoutContext.Provider>
  );
}

// Hook to check if we're inside an AgentPageLayout and get current mode
export function useAgentPageLayout() {
  return useContext(AgentPageLayoutContext);
}
