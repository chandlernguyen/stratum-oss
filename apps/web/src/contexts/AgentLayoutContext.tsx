/**
 * AgentLayoutContext - Controls layout behavior for agent pages
 *
 * Provides two key features:
 * 1. isAgentPage: Signals that an agent page is active, enabling viewport-constrained
 *    layout (h-screen overflow-hidden) to prevent double scrollbars
 * 2. hideFooter: Hides footer when in active chat mode for a cleaner experience
 *
 * Usage: Agent components call setIsAgentPage(true) on mount and setHideFooter(true)
 * when entering chat mode (active session).
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface AgentLayoutContextValue {
  /** Whether an agent page is currently active (enables viewport-constrained layout) */
  isAgentPage: boolean;
  /** Signal that an agent page is active */
  setIsAgentPage: (isAgent: boolean) => void;
  /** Whether to hide the footer (used when in active chat mode) */
  hideFooter: boolean;
  /** Control footer visibility */
  setHideFooter: (hide: boolean) => void;
}

const AgentLayoutContext = createContext<AgentLayoutContextValue | null>(null);

export function AgentLayoutProvider({ children }: { children: ReactNode }) {
  const [isAgentPage, setIsAgentPage] = useState(false);
  const [hideFooter, setHideFooter] = useState(false);
  const location = useLocation();

  // Reset state when navigating to a different route
  // Agent components will re-set values if they're active
  useEffect(() => {
    setIsAgentPage(false);
    setHideFooter(false);
  }, [location.pathname]);

  return (
    <AgentLayoutContext.Provider value={{ isAgentPage, setIsAgentPage, hideFooter, setHideFooter }}>
      {children}
    </AgentLayoutContext.Provider>
  );
}

export function useAgentLayout() {
  return useContext(AgentLayoutContext);
}
