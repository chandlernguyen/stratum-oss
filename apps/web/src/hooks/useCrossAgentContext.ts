import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface CrossAgentContext {
  fromStrategy: boolean;
  strategySessionId?: string;
  actionItems: Array<{
    task: string;
    timeframe?: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  strategyInsights?: any;
  suggestedPrompt: string;
  clientId?: string;
  campaignId?: string;
}

export interface UseCrossAgentContextReturn {
  hasContext: boolean;
  context: CrossAgentContext | null;
  suggestedPrompt: string;
  actionItems: CrossAgentContext['actionItems'];
  fromAgent: string | null;
  clearContext: () => void;
}

/**
 * Hook to manage cross-agent context when navigating between agents
 * Handles both React Router state and sessionStorage for persistence
 */
export function useCrossAgentContext(): UseCrossAgentContextReturn {
  const location = useLocation();
  const [context, setContext] = useState<CrossAgentContext | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string>('');

  useEffect(() => {
    // Check for context from navigation state (priority 1)
    if (location.state?.prefillContext) {
      const ctx = location.state.prefillContext as CrossAgentContext;
      setContext(ctx);
      setSuggestedPrompt(ctx.suggestedPrompt || '');
      
      // Save to sessionStorage as backup
      sessionStorage.setItem('crossAgentContext', JSON.stringify(ctx));
      sessionStorage.setItem('crossAgentTimestamp', Date.now().toString());
      return;
    }
    
    // Check sessionStorage as fallback (priority 2)
    const stored = sessionStorage.getItem('crossAgentContext');
    const timestamp = sessionStorage.getItem('crossAgentTimestamp');
    
    if (stored && !context) {
      // Check if context is less than 5 minutes old
      const age = timestamp ? Date.now() - parseInt(timestamp, 10) : Infinity;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (age < fiveMinutes) {
        try {
          const parsed = JSON.parse(stored) as CrossAgentContext;
          setContext(parsed);
          setSuggestedPrompt(parsed.suggestedPrompt || '');
        } catch (error) {
          console.error('Failed to parse cross-agent context:', error);
          // Clean up invalid data
          sessionStorage.removeItem('crossAgentContext');
          sessionStorage.removeItem('crossAgentTimestamp');
        }
      } else {
        // Context is too old, clean up
        sessionStorage.removeItem('crossAgentContext');
        sessionStorage.removeItem('crossAgentTimestamp');
      }
    }
  }, [location]);

  const clearContext = () => {
    setContext(null);
    setSuggestedPrompt('');
    sessionStorage.removeItem('crossAgentContext');
    sessionStorage.removeItem('crossAgentTimestamp');
  };

  return {
    hasContext: !!context,
    context,
    suggestedPrompt,
    actionItems: context?.actionItems || [],
    fromAgent: location.state?.fromAgent || (context?.fromStrategy ? 'strategy' : null),
    clearContext
  };
}

/**
 * Helper function to format action items for display
 */
export function formatActionItems(items: CrossAgentContext['actionItems']): string {
  return items
    .map(item => {
      const timeframe = item.timeframe ? ` (${item.timeframe})` : '';
      const priority = item.priority === 'high' ? '⚡' : item.priority === 'medium' ? '🎯' : '';
      return `${priority} ${item.task}${timeframe}`;
    })
    .join('\n');
}

/**
 * Helper function to get a summary of the context
 */
export function getContextSummary(context: CrossAgentContext): {
  taskCount: number;
  categories: string[];
  estimatedTime: string | null;
  highPriorityCount: number;
} {
  const categories = [...new Set(context.actionItems.map(item => item.category))];
  const highPriorityCount = context.actionItems.filter(item => item.priority === 'high').length;
  
  // Extract timeframes and try to estimate total time
  const timeframes = context.actionItems
    .map(item => item.timeframe)
    .filter(Boolean) as string[];
  
  // Simple estimation (this could be more sophisticated)
  let estimatedTime: string | null = null;
  if (timeframes.length > 0) {
    const hasMonths = timeframes.some(t => t.includes('month'));
    const hasWeeks = timeframes.some(t => t.includes('week'));
    
    if (hasMonths) {
      estimatedTime = '1-3 months';
    } else if (hasWeeks) {
      estimatedTime = '2-4 weeks';
    } else {
      estimatedTime = timeframes[0] || null;
    }
  }
  
  return {
    taskCount: context.actionItems.length,
    categories,
    estimatedTime,
    highPriorityCount
  };
}