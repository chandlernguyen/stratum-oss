import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { /* useNavigate, */ useParams } from 'react-router-dom'; // useNavigate unused - handleEditSession commented out
import { useOrganization } from '@/hooks/data/useOrganization';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { useSessionManagement, type UseSessionManagementConfig } from '@/hooks/useSessionManagement';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { useClientContext } from '@/contexts/ClientContext';
import { useAgentOutputs, useUpdateOutput, useArchiveOutput } from '@/hooks/data/useAgentOutputs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  FileText,
  Archive,
  Eye,
  type LucideIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResourceActionsDropdown } from '@/components/ResourceActionsDropdown';
import { ViewOutputDialog } from '@/components/ViewOutputDialog';
import { UnifiedOutputCard } from '@/components/outputs/UnifiedOutputCard';
import { getResourceConfigByType } from '@/config/resource-configs';
import { AGENT_IDENTITY } from '@/config/agentIdentity';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import type { SavedOutput } from '@/types/agents';
import { getIntlLocale } from '@/lib/locales';

export interface AgentSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string;
  message_count?: number;
  first_message?: string;
  mode?: string; // For agents that have modes (like marketing strategy)
}

export interface AgentOutput {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Flexible for different agent output structures
}

export interface OutputsConfig {
  enabled: boolean;
  endpoint?: string; // Optional: legacy API endpoint (deprecated - use Database-First instead)
  tabName?: string; // Default: "Outputs", can override to "Strategies", "Reports", etc.

  // Transform raw API data to display format
  transformOutput: (data: any) => {
    id: string;
    title: string;
    type: string;
    data: any;
    created_at: string;
  };

  // Optional customization
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  itemIcon?: LucideIcon;
}

export interface AgentSidebarConfig {
  // Agent identification
  agentType: string;
  agentDisplayName: string;

  // Visual styling
  primaryColor: string; // e.g., 'blue', 'green', 'purple'
  icon: LucideIcon;
  gradientClasses: string; // e.g., 'from-slate-600 to-amber-600'

  // API endpoints
  sessionsEndpoint: string; // e.g., '/api/v1/direct-agents/strategy/sessions'

  // URL routing
  baseRoute: string; // e.g., '/strategy'
  sessionRoute: string; // e.g., '/strategy/session'

  // Session display customization
  getSessionTitle?: (session: AgentSession) => string;
  getSessionIcon?: (session: AgentSession) => LucideIcon;
  getSessionBadges?: (session: AgentSession) => Array<{ label: string; variant?: string }>;
  buildSessionUrl?: (session: AgentSession) => string;

  // Sidebar behavior
  defaultSessions?: number; // Default 4
  storageKey?: string; // For localStorage width persistence

  // NEW: Outputs tab configuration
  outputsConfig?: OutputsConfig;
}

interface AgentSidebarProps {
  config: AgentSidebarConfig;
  onSelectSession: (session: AgentSession) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function AgentSidebar({
  config,
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: AgentSidebarProps) {
  const { t, i18n } = useTranslation(['agents']);
  const intlLocale = getIntlLocale(i18n.language);
  // Extract URL params for campaign context and get client context
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { clientSlug } = useClientContext();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Resolve clientSlug to client_id for session filtering
  const [clientId, setClientId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function resolveClientId() {
      if (!clientSlug || !orgId) {
        setClientId(undefined);
        return;
      }

      try {
        // Use schema-aware RPC function for proper routing (agency vs SME)
        const { data, error } = await supabase.rpc('get_client_by_slug_routed', {
          p_org_id: orgId,
          p_slug: clientSlug
        });

        if (error) {
          console.error(`[AgentSidebar] Error resolving clientSlug "${clientSlug}":`, error);
          setClientId(undefined);
          return;
        }

        setClientId(data?.id);
        console.log(`[AgentSidebar] Resolved clientSlug "${clientSlug}" to client_id: ${data?.id}`);
      } catch (err) {
        console.error(`[AgentSidebar] Exception resolving clientSlug:`, err);
        setClientId(undefined);
      }
    }

    resolveClientId();
  }, [clientSlug, orgId]);

  // Phase 4: Database-First session management
  // NEW: Pass clientId for agency multi-tenant session isolation
  const sessionManagementConfig: UseSessionManagementConfig = {
    endpoint: config.sessionsEndpoint,
    agentType: config.agentType,
    clientId: clientId, // Filter sessions by client when provided
    autoLoad: !clientSlug || clientId !== undefined // Wait for clientId resolution if clientSlug exists
  };

  const {
    sessions,
    loading,
    showArchived,
    setShowArchived,
    // deleteSession: handleDeleteSession, // Unused - handled by ResourceActionsDropdown
    // archiveSession: handleArchiveSession, // Unused - handled by ResourceActionsDropdown
    // restoreSession: handleRestoreSession, // Unused - handled by ResourceActionsDropdown
    loadSessions
  } = useSessionManagement(sessionManagementConfig);

  // Database-First: Use direct Supabase query instead of API calls
  // FIX: Pass clientId for agency multi-tenant schema routing
  const {
    data: rawOutputs = [],
    isLoading: loadingOutputs
  } = useAgentOutputs({
    agentType: config.agentType,
    clientId: clientId, // FIX: Pass clientId for agency schema routing
    includeArchived: false,
    limit: 50
  });

  // Database-First mutations
  const updateOutputMutation = useUpdateOutput();
  const archiveOutputMutation = useArchiveOutput();

  // Unified confirmation dialog for output deletion
  const { confirmDelete, DeleteDialog } = useDeleteConfirmation();

  // Transform outputs using config's transformOutput function for proper display
  const outputs = rawOutputs.map(output => {
    // Apply transformation if outputsConfig exists
    if (config.outputsConfig?.transformOutput) {
      const transformed = config.outputsConfig.transformOutput(output);
      return {
        ...output,
        // Override with transformed values for display
        title: transformed.title,
        type: transformed.type,
        data: transformed.data,
        // Ensure compatibility with AgentOutput interface
        created_at: output.created_at,
        updated_at: output.updated_at || output.created_at
      };
    }

    // Fallback if no transform function
    return {
      ...output,
      id: output.id,
      created_at: output.created_at,
      updated_at: output.updated_at || output.created_at
    };
  });
  const [activeTab, setActiveTab] = useState<'history' | 'outputs'>('history');
  // Persist sidebar collapsed state in localStorage
  const SIDEBAR_COLLAPSED_KEY = 'stratum:ui:sidebar-collapsed';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    // Default to collapsed (true) for cleaner chat experience
    return stored !== null ? stored === 'true' : true;
  });
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<SavedOutput | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const storageKey = config.storageKey || `${config.agentType}-sidebar-width`;
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // const navigate = useNavigate(); // Unused - handleEditSession was commented out
  const { isAgency } = useOrganization();
  // campaignId already extracted from useParams above
  const { data: currentCampaign } = useCampaign(campaignId);

  // Temporarily set currentClient to null - will be handled by URL routing later
  const currentClient: any = null;

  // Get agent configuration from AGENT_IDENTITY for output tab name
  const agentConfig = AGENT_IDENTITY[config.agentType];
  const outputTabName = config.outputsConfig?.tabName || agentConfig?.outputTabName || 'Outputs';


  // Get resource config for sessions
  const getSessionResourceConfig = () => {
    const sessionType = `${config.agentType}_session`;
    return getResourceConfigByType(sessionType) || {
      type: sessionType,
      apiBasePath: config.sessionsEndpoint,
      tableName: 'agent_conversations',
      displayName: 'Session',
      pluralDisplayName: 'Sessions'
    };
  };

  const sessionResourceConfig = getSessionResourceConfig();

  // Note: Resource actions now handled directly by ResourceActionsDropdown with Database-First

  const SESSIONS_TO_SHOW = config.defaultSessions || 4;

  // Database-First: No need for manual loading - React Query handles it automatically

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    const constrainedWidth = Math.max(240, Math.min(600, newWidth));
    setSidebarWidth(constrainedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      const storageKey = config.storageKey || `${config.agentType}-sidebar-width`;
      localStorage.setItem(storageKey, sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth, config.agentType, config.storageKey]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Only auto-collapse on mobile (don't auto-expand on desktop - respect user preference)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      // Only collapse on mobile, never auto-expand (user preference respected)
      if (isMobile && !isCollapsed) {
        setIsCollapsed(true);
      }
      // Removed: auto-expand on desktop - this was overriding user preference
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  // Phase 4: Database-First - outputs now loaded via useAgentOutputs hook

  const handleArchiveSessionWrapper = (session: AgentSession) => {
    // NOTE: The actual archiving is handled by ResourceActionsDropdown
    // This callback handles side effects: navigation and refresh
    console.log('Session archived:', session.id);

    // If archived session was selected, navigate to create new session
    if (selectedSessionId === session.id) {
      onCreateSession();
    }

    // Refresh sessions list to reflect the archived state
    loadSessions();
  };

  const handleDeleteSessionWrapper = (session: AgentSession) => {
    // NOTE: The actual deletion is handled by ResourceActionsDropdown
    // This callback handles side effects: navigation and refresh
    console.log('Session deleted:', session.id);

    // If deleted session was selected, navigate to create new session
    if (selectedSessionId === session.id) {
      onCreateSession();
    }

    // Refresh sessions list to remove the deleted session
    loadSessions();
  };

  const handleRestoreSessionWrapper = (session: AgentSession) => {
    // NOTE: The actual restoring is handled by ResourceActionsDropdown
    // This callback handles side effects: navigation and refresh
    console.log('Session restored:', session.id);

    // Navigate to the restored session automatically
    onSelectSession(session);

    // Refresh sessions list to reflect the restored state
    loadSessions();
  };


  const handleCopySession = (session: AgentSession) => {
    const sessionContent = `Session: ${defaultGetSessionTitle(session)}\nCreated: ${new Date(session.created_at).toLocaleDateString(intlLocale)}\nMessages: ${session.message_count}`;
    navigator.clipboard.writeText(sessionContent);
    console.log('Session info copied to clipboard');
  };

  // Unused - sessions are immutable, users navigate by clicking the card
  // const handleEditSession = (session: AgentSession) => {
  //   const sessionUrl = defaultBuildSessionUrl(session);
  //   navigate(sessionUrl);
  // };

  const handleViewOutput = (output: AgentOutput) => {
    if (!config.outputsConfig) return;

    const transformed = config.outputsConfig.transformOutput(output);

    // Convert to SavedOutput format for ViewOutputDialog
    const savedOutput: SavedOutput = {
      id: transformed.id,
      session_id: 'temp-session', // This is a required field but not used for display
      agent_type: config.agentType as any,
      title: transformed.title,
      content: transformed.data, // Pass as object for proper viewer rendering
      tags: [],
      created_at: transformed.created_at
    };

    setSelectedOutput(savedOutput);
    setViewDialogOpen(true);
  };

  const handleExportOutput = async (output: AgentOutput) => {
    if (!config.outputsConfig) return;

    const transformed = config.outputsConfig.transformOutput(output);

    try {
      const exportData = {
        id: transformed.id,
        type: transformed.type,
        title: transformed.title,
        data: transformed.data,
        created_at: transformed.created_at,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.agentType}-${transformed.type}-${transformed.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting output:', error);
      alert(t('agents:context.sidebar.errors.exportFailed'));
    }
  };

  const handleDeleteOutput = async (outputId: string) => {
    // Find the output to get its name
    const output = outputs.find(o => o.id === outputId);
    const outputName = output?.title || 'this output';

    // Show unified confirmation dialog
    const confirmed = await confirmDelete({
      id: outputId,
      name: outputName,
      isArchived: false // Outputs in sidebar are active by default
    });

    // User canceled
    if (!confirmed) return;

    try {
      // Database-First: Use archive instead of delete (soft delete)
      await archiveOutputMutation.mutateAsync({ id: outputId, reason: 'User deleted' });
    } catch (error) {
      console.error('Error deleting output:', error);
      // Error toast is handled by the mutation
    }
  };

  const handleArchiveOutput = async (output: AgentOutput) => {
    if (!config.outputsConfig) return;

    try {
      // Database-First: Use archive mutation instead of API call
      await archiveOutputMutation.mutateAsync({
        id: output.id,
        reason: 'Archived via sidebar'
      });

      // React Query will automatically refetch and update UI
    } catch (error) {
      console.error('Error archiving output:', error);
      alert(t('agents:context.sidebar.errors.archiveFailed'));
    }
  };

  const handleSaveOutput = async (updatedOutput: SavedOutput) => {
    if (!config.outputsConfig) return;

    try {
      // Database-First: Use update mutation instead of API call
      await updateOutputMutation.mutateAsync({
        id: updatedOutput.id,
        data: {
          title: updatedOutput.title,
          content: typeof updatedOutput.content === 'string'
            ? { text: updatedOutput.content }
            : updatedOutput.content,
          updated_at: new Date().toISOString()
        }
      });

      // React Query will automatically refetch and update UI
    } catch (error) {
      console.error('Error saving output:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  const defaultGetSessionTitle = (session: AgentSession) => {
    // Debug logging for marketing strategy sessions
    if (config.agentType === 'marketing_strategy') {
      console.log('Marketing Strategy Session data:', {
        id: session.id,
        session_title: session.session_title,
        first_message: session.first_message?.substring(0, 100),
        message_count: session.message_count || 0
      });
    }

    if (session.session_title) return session.session_title;

    if (session.first_message && session.first_message !== 'No messages') {
      // Clean up the message content for better display
      let cleanMessage = session.first_message.trim();

      // Remove leading/trailing whitespace and newlines
      cleanMessage = cleanMessage.replace(/^\s+|\s+$/g, '');

      // Remove any markdown formatting
      cleanMessage = cleanMessage.replace(/^#+\s+/gm, ''); // Remove headers
      cleanMessage = cleanMessage.replace(/\*\*(.+?)\*\*/g, '$1'); // Remove bold
      cleanMessage = cleanMessage.replace(/^\* /gm, ''); // Remove bullet points
      cleanMessage = cleanMessage.replace(/^- /gm, ''); // Remove dashes
      cleanMessage = cleanMessage.replace(/^\d+\.\s+/gm, ''); // Remove numbered lists

      // Get the first meaningful line
      const lines = cleanMessage.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // Try to extract a meaningful title
      let title = '';

      // Look for common patterns in marketing strategy messages
      for (const line of lines) {
        // Check for campaign names
        if (line.toLowerCase().includes('campaign:') || line.toLowerCase().includes('active campaign:')) {
          title = line.replace(/^.*campaign:\s*/i, '').trim();
          break;
        }
        // Check for strategy-related keywords
        if (line.toLowerCase().includes('strategy') ||
            line.toLowerCase().includes('plan') ||
            line.toLowerCase().includes('marketing') ||
            line.toLowerCase().includes('growth')) {
          title = line;
          break;
        }
        // Use first non-empty line as fallback
        if (!title && line.length > 5) {
          title = line;
        }
      }

      // Clean up the title
      title = title.replace(/[:;,]+$/, ''); // Remove trailing punctuation

      // If still no good title, use the first line
      if (!title) {
        title = lines[0] || 'Marketing Strategy Session';
      }

      // Truncate if too long
      return title.length > 60 ? title.substring(0, 60) + '...' : title;
    }

    // Better fallback for sessions with no title or messages
    const date = new Date(session.created_at).toLocaleDateString(intlLocale);
    return `${config.agentDisplayName} - ${date}`;
  };

  const defaultGetSessionIcon = () => config.icon;

  // Unused - only used in commented-out handleEditSession
  // const defaultBuildSessionUrl = (session: AgentSession) => {
  //   if (config.buildSessionUrl) {
  //     return config.buildSessionUrl(session);
  //   }
  //   return `${config.sessionRoute}/${session.id}`;
  // };

  const getSessionTitle = config.getSessionTitle || defaultGetSessionTitle;
  const getSessionIcon = config.getSessionIcon || defaultGetSessionIcon;
  const getSessionBadges = config.getSessionBadges || (() => []);

  if (loading && activeTab === 'history') {
    return (
      <div
        ref={sidebarRef}
        className="relative glass-sidebar flex-shrink-0"
        style={{ width: isCollapsed ? 64 : sidebarWidth }}
      >
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={sidebarRef}
        className={`
          hidden md:flex
          relative glass-sidebar flex-shrink-0 flex-col
          md:relative
          ${!isCollapsed ? 'md:static' : ''}
        `}
        style={{
          width: isCollapsed ? 64 : sidebarWidth,
          transition: isResizing ? 'none' : 'width 200ms'
        }}
      >
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        {/* Header - Refined styling */}
        <div className="flex items-center justify-between mb-5">
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-3">
                {/* Premium icon container */}
                <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradientClasses} shadow-md`}>
                  <config.icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {config.agentDisplayName}
                </h2>
              </div>
              <Button
                onClick={() => setIsCollapsed(true)}
                variant="ghost"
                size="sm"
                className="p-1 min-h-10 min-w-10 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label={t('agents:context.sidebar.collapseSidebar')}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}

          {isCollapsed && (
            <Button
              onClick={() => setIsCollapsed(false)}
              variant="default"
              size="sm"
              className={`w-full min-h-12 min-w-12 bg-gradient-to-r ${config.gradientClasses} hover:opacity-90 text-white shadow-lg`}
              aria-label={t('agents:context.sidebar.expandSidebar')}
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Context Badges */}
            {(currentClient || currentCampaign) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {isAgency && currentClient && (
                  <Badge variant="outline" className="text-xs">
                    <span className="text-brand-slate">{t('agents:context.sidebar.contextBadges.client')}</span>
                    <span className="ml-1 font-medium">{currentClient.name}</span>
                  </Badge>
                )}
                {currentCampaign && (
                  <Badge variant="outline" className="text-xs">
                    <span className="text-brand-slate">{t('agents:context.sidebar.contextBadges.campaign')}</span>
                    <span className="ml-1 font-medium">{currentCampaign.name}</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Tabs for History and Outputs */}
            {config.outputsConfig?.enabled && (
              <div className="mb-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'history' | 'outputs')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="history" className="text-xs">
                      <History className="w-3 h-3 mr-1" />
                      {t('agents:context.sidebar.tabs.history')}
                      {sessions.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {sessions.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="outputs" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      {outputTabName}
                      {outputs.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {outputs.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Action Button - Premium CTA */}
            {activeTab === 'history' && !showArchived && (
              <Button
                onClick={onCreateSession}
                className={`w-full mb-4 gap-2 bg-gradient-to-r ${config.gradientClasses} text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5`}
              >
                <Plus className="w-4 h-4" />
                {t('agents:context.sidebar.newSession')}
              </Button>
            )}

            {/* Archive View Toggle - Refined */}
            {activeTab === 'history' && (
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => setShowArchived(false)}
                  variant={!showArchived ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 gap-1.5 ${!showArchived ? 'bg-slate-900 dark:bg-slate-700 shadow-md' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  <Eye className="h-3 w-3" />
                  {t('agents:context.sidebar.active')}
                </Button>
                <Button
                  onClick={() => setShowArchived(true)}
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 gap-1.5 ${showArchived ? 'bg-slate-900 dark:bg-slate-700 shadow-md' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  <Archive className="h-3 w-3" />
                  {t('agents:context.sidebar.archived')}
                </Button>
              </div>
            )}

            {/* Content Area */}
            <ScrollArea className="flex-1">
              {activeTab === 'history' ? (
                // Sessions List
                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-brand-slate dark:text-gray-400">
                      {showArchived ? (
                        <>
                          <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">{t('agents:context.sidebar.emptyStates.noArchived')}</p>
                          <p className="text-xs">{t('agents:context.sidebar.emptyStates.archivedHint')}</p>
                          <Button
                            onClick={() => setShowArchived(false)}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            {t('agents:context.sidebar.emptyStates.viewActive')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <config.icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">{t('agents:context.sidebar.emptyStates.noSessions', { agentType: config.agentType })}</p>
                          <p className="text-xs">{t('agents:context.sidebar.emptyStates.createFirst', { agentType: config.agentType })}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {(showAllSessions ? sessions : sessions.slice(0, SESSIONS_TO_SHOW)).map((session) => {
                        const SessionIcon = getSessionIcon(session);
                        const isSelected = selectedSessionId === session.id;
                        const sessionBadges = getSessionBadges(session);

                        return (
                          <Card
                            key={session.id}
                            className={`p-3.5 cursor-pointer transition-all duration-200 group border ${
                              showArchived
                                ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-700/60'
                                : isSelected
                                ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-600/50 shadow-md shadow-amber-500/5'
                                : 'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                            }`}
                            onClick={() => {
                              onSelectSession(session);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-2 rounded-lg ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-md'
                                    : 'bg-slate-100 dark:bg-slate-700'
                                }`}>
                                  <SessionIcon className={`w-4 h-4 ${
                                    isSelected
                                      ? 'text-white'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm mb-1 line-clamp-2">
                                    {getSessionTitle(session)}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {new Date(session.created_at).toLocaleDateString(intlLocale)}
                                    {(session.message_count || 0) > 0 && (
                                      <>
                                        <span>•</span>
                                        <MessageSquare className="h-3 w-3" />
                                        {session.message_count || 0}
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {showArchived && (
                                      <Badge className="bg-gray-500 text-white text-xs">
                                        <Archive className="h-2 w-2 mr-1" />
                                        {t('agents:context.sidebar.archivedBadge')}
                                      </Badge>
                                    )}
                                    {sessionBadges.length > 0 && sessionBadges.map((badge, idx) => (
                                      <Badge key={idx} variant={badge.variant as any || "secondary"} className="text-xs">
                                        {badge.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <ResourceActionsDropdown
                                item={session}
                                config={sessionResourceConfig}
                                onArchive={!showArchived ? handleArchiveSessionWrapper : undefined}
                                onDelete={handleDeleteSessionWrapper}
                                onCopy={handleCopySession}
                                onRestore={showArchived ? handleRestoreSessionWrapper : undefined}
                                showArchive={!showArchived}
                                showDelete={true}
                                showCopy={!showArchived}
                                showRestore={showArchived}
                                showView={false}
                                showEdit={false} // Sessions are immutable - users navigate by clicking the card
                                customActions={[]}
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </Card>
                        );
                      })}

                      {sessions.length > SESSIONS_TO_SHOW && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSessions(!showAllSessions)}
                          className="w-full mt-2"
                        >
                          {showAllSessions ? t('agents:context.sidebar.showLess') : t('agents:context.sidebar.showMore', { count: sessions.length - SESSIONS_TO_SHOW })}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Outputs List
                <div className="space-y-2">
                  {loadingOutputs ? (
                    <div className="text-center py-8 text-brand-slate">{t('agents:context.sidebar.loadingOutputs', { outputType: outputTabName.toLowerCase() })}</div>
                  ) : outputs.length === 0 ? (
                    <div className="text-center py-8 text-brand-slate dark:text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">{config.outputsConfig?.emptyStateMessage || t('agents:context.sidebar.emptyStates.noOutputs', { outputType: outputTabName.toLowerCase() })}</p>
                      <p className="text-xs mt-1">{config.outputsConfig?.emptyStateDescription || t('agents:context.sidebar.emptyStates.startSession', { agentType: config.agentType })}</p>
                      <Button
                        onClick={() => setActiveTab('history')}
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('agents:context.sidebar.emptyStates.startButton')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {outputs.map((output) => (
                        <UnifiedOutputCard
                          key={output.id}
                          output={output as unknown as SavedOutput}
                          isActive={false}
                          isArchived={!!output.archived_at}
                          isSelected={false}
                          onView={handleViewOutput}
                          onArchive={handleArchiveOutput}
                          onDelete={(item) => handleDeleteOutput(item.id)}
                          onExport={handleExportOutput}
                          showCheckbox={false}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {/* Collapsed state with tooltips for discoverability */}
        {isCollapsed && (
          <div className="space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCreateSession}
                  className="w-full min-h-12 min-w-12"
                  aria-label={t('agents:context.sidebar.tooltips.newAgent', { agentName: config.agentDisplayName })}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('agents:context.sidebar.tooltips.newAgent', { agentName: config.agentDisplayName })}</p>
              </TooltipContent>
            </Tooltip>

            {sessions.slice(0, 3).map((session) => {
              const SessionIcon = getSessionIcon(session);
              const isSelected = selectedSessionId === session.id;
              const sessionTitle = getSessionTitle(session);

              return (
                <Tooltip key={session.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelected ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => {
                        onSelectSession(session);
                      }}
                      className="w-full min-h-12 min-w-12"
                      aria-label={sessionTitle}
                    >
                      <SessionIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="font-medium truncate">{sessionTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString(intlLocale)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-${config.primaryColor}-600/20 transition-colors`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Note: Archive and Delete dialogs for sessions are handled by ResourceActionsDropdown */}

      {/* View Output Dialog */}
      <ViewOutputDialog
        output={selectedOutput}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onSave={handleSaveOutput}
        allowEdit={true}
      />

      {/* Delete Confirmation Dialog for Outputs */}
      <DeleteDialog />
    </div>
    </>
  );
}
