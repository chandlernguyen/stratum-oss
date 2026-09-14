import { type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AgentTab {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface AgentTabsProps {
  tabs: AgentTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  /** Optional trailing action element (e.g., history button) */
  trailingAction?: ReactNode;
}

/**
 * Mobile-first horizontal tab navigation for agents
 * - Hidden on desktop (md:hidden)
 * - 48px touch targets (WCAG compliant)
 * - Horizontal scroll if needed
 * - Count badges for list views
 * - Optional trailing action (right side)
 */
export function AgentTabs({ tabs, activeTab, onChange, trailingAction }: AgentTabsProps) {
  return (
    <div className="md:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max px-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 h-12
                  font-semibold text-sm
                  border-b-2 transition-all
                  whitespace-nowrap
                  ${
                    isActive
                      ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-bold
                      ${
                        isActive
                          ? 'bg-amber-600 text-white dark:bg-amber-500'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
        {/* Trailing action (e.g., history button) */}
        {trailingAction && (
          <div className="flex-shrink-0 px-2">
            {trailingAction}
          </div>
        )}
      </div>
    </div>
  );
}
