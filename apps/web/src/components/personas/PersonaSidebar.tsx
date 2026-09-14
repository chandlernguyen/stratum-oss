import { useState, useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonaInsightsPanel } from './PersonaInsightsPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourceActionsDropdown } from '@/components/ResourceActionsDropdown';
import { getResourceConfigByType } from '@/config/resource-configs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  MoreVertical,
  MessageSquare,
  Edit,
  Copy,
  Trash,
  Star,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  UserCheck,
  Archive,
  Eye,
  History,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonas, useArchivePersona, type Persona } from '@/hooks/data/usePersonas';
import { personasAPI } from '@/lib/api-client'; // Still needed for create/update/duplicate

interface ChatSession {
  id: string;
  persona_id?: string;
  persona_name?: string;
  title: string;
  created_at: string;
  last_message?: string;
  message_count: number;
  archived?: boolean;
  archived_at?: string;
  archived_reason?: string;
}

interface PersonaSidebarProps {
  onSelectPersona: (persona: Persona) => void;
  onCreatePersona: () => void;
  onEditPersona?: (persona: Persona) => void;
  selectedPersonaId?: string;
  refreshTrigger?: number; // Optional trigger to force refresh
  clientId?: string; // ✅ Agency client filtering
  chatSessions?: ChatSession[]; // Chat history from parent
  onSelectChat?: (sessionId: string) => void;
  currentChatId?: string;
  onDeleteChatSession?: (sessionId: string) => void; // Now archives (soft delete)
  onPermanentDeleteChatSession?: (sessionId: string) => void; // Hard delete
  onRenameChatSession?: (sessionId: string, newTitle: string) => void;
  onExportChatSession?: (sessionId: string) => void;
  onDuplicateChatSession?: (sessionId: string) => void;
  onNewChat?: () => void; // New prop for starting a new chat
  onArchiveChatSession?: (sessionId: string, reason?: string) => Promise<boolean>;
  onRestoreChatSession?: (sessionId: string) => Promise<boolean>;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}

export function PersonaSidebar({
  onSelectPersona,
  onCreatePersona,
  onEditPersona,
  selectedPersonaId,
  refreshTrigger,
  clientId, // ✅ Agency client filtering
  chatSessions = [],
  onSelectChat,
  currentChatId,
  onDeleteChatSession: _onDeleteChatSession,
  onPermanentDeleteChatSession,
  onRenameChatSession,
  onExportChatSession,
  onDuplicateChatSession,
  onNewChat,
  onArchiveChatSession,
  onRestoreChatSession,
  showArchived: showArchivedSessions = false,
  onToggleArchived
}: PersonaSidebarProps) {
  const { t, locale } = useLocale('personas');

  // Persist sidebar collapsed state in localStorage (match AgentSidebar pattern)
  const SIDEBAR_COLLAPSED_KEY = 'stratum:ui:sidebar-collapsed';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    // Default to collapsed (true) for cleaner chat experience
    return stored !== null ? stored === 'true' : true;
  });
  const [showArchivedPersonas, setShowArchivedPersonas] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'outputs'>('history');

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Use the new data access hook with client filtering
  const { data: personas = [], isLoading, refetch } = usePersonas({
    includeArchived: showArchivedPersonas,
    clientId: clientId || undefined // ✅ Filter by client for Agency users
  });

  // Archive mutation hook
  const archivePersonaMutation = useArchivePersona();

  // Initialize session resource actions for the dropdown menu
  const sessionConfig = getResourceConfigByType('persona_session') || {
    type: 'persona_session',
    apiBasePath: '/api/v1/direct-agents/persona/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  };

  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load saved width from localStorage or use default
    const saved = localStorage.getItem('persona-sidebar-width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    refetch();
  }, [refreshTrigger]); // Refresh when trigger changes

  // ✅ Refetch when clientId changes (for Agency users switching between clients)
  useEffect(() => {
    if (clientId) {
      refetch();
    }
  }, [clientId, refetch]);

  // Listen for persona-saved events
  useEffect(() => {
    const handlePersonaSaved = (_event: CustomEvent) => {
      // Refresh the personas list when a new persona is saved
      refetch();
    };

    window.addEventListener('persona-saved', handlePersonaSaved as EventListener);

    return () => {
      window.removeEventListener('persona-saved', handlePersonaSaved as EventListener);
    };
  }, [refetch]);

  // Handle resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate new width based on mouse position
    const newWidth = e.clientX;
    // Set min and max width constraints
    const constrainedWidth = Math.max(280, Math.min(500, newWidth));
    setSidebarWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    // Save width to localStorage
    if (!isCollapsed) {
      localStorage.setItem('persona-sidebar-width', sidebarWidth.toString());
    }
  };

  useEffect(() => {
    if (isResizing) {
      // Add cursor style to body during resize
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing, sidebarWidth]);

  // Removed fetchPersonas - now using hook

  const handleDeletePersona = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archivePersonaMutation.mutateAsync({ id: personaId, reason: 'User requested deletion' });
    } catch (error) {
      console.error('Error archiving persona:', error);
    }
  };

  const handleRestorePersona = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // First get the persona data
      const persona = personas.find(p => p.id === personaId);
      if (!persona) {
        console.error('Persona not found');
        return;
      }
      
      // Restore the persona
      const response = await personasAPI.restore(personaId);
      if (response.success) {
        await refetch();
      }
    } catch (error) {
      console.error('Error restoring persona:', error);
    }
  };

  const handleDuplicatePersona = async (personaId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Generate a unique name with timestamp to avoid conflicts
      const timestamp = new Date().toLocaleDateString(getIntlLocale(locale), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const newName = `${currentName} (Copy ${timestamp})`;
      
      const response = await personasAPI.duplicate(personaId, newName);
      if (response.success) {
        await refetch();
      }
    } catch (error) {
      console.error('Error duplicating persona:', error);
    }
  };

  const getPersonaIcon = (persona: Persona) => {
    // Use different icons based on primary status
    if (persona.is_primary) {
      return <UserCheck className="w-4 h-4 text-brand-success" />;
    }
    return <User className="w-4 h-4 text-brand-slate" />;
  };

  const getIndustryColor = (industry?: string) => {
    // Color code by industry type
    const industryColors: Record<string, string> = {
      'Technology': 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
      'Healthcare': 'bg-green-100 text-brand-success dark:bg-green-900 dark:text-green-300',
      'Finance': 'bg-slate-100 text-brand-charcoal dark:bg-slate-900 dark:text-slate-300',
      'Retail': 'bg-yellow-100 text-brand-warning dark:bg-yellow-900 dark:text-yellow-300',
      'Manufacturing': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return industryColors[industry || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  // Removed renderSatisfactionStars - not in schema

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="relative w-16 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-2">
          {/* Large expand button with gradient - matches AgentSidebar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsCollapsed(false)}
                variant="default"
                size="sm"
                className="w-full min-h-12 min-w-12 mb-2 bg-gradient-to-r from-slate-600 to-amber-600 hover:opacity-90 text-white shadow-md"
                aria-label={t('sidebar.expandTooltip')}
              >
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('sidebar.expandTooltip')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCreatePersona}
                className="mb-2 min-h-12 min-w-12 w-full"
                aria-label={t('sidebar.createTooltip')}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('sidebar.createTooltip')}</p>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-1">
            {personas.slice(0, 8).map((persona) => (
              <Tooltip key={persona.id}>
                <TooltipTrigger asChild>
                  <div className="relative group">
                    <Button
                      variant={selectedPersonaId === persona.id ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => onSelectPersona(persona)}
                      className="w-full min-h-12 min-w-12"
                      aria-label={persona.name}
                    >
                      {getPersonaIcon(persona)}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-1 top-0 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('actions.moreOptions')}
                        >
                          <MoreVertical className="w-3 h-3" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="right" className="z-[60]">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPersona(persona);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('list.interview')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPersona?.(persona);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDuplicatePersona(persona.id, persona.name, e)}
                        >
                          <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('actions.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeletePersona(persona.id, e)}
                          className="text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-medium">{persona.name}</p>
                  <p className="text-xs text-muted-foreground">{persona.title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('relativeTime.justNow');
    if (diffHours < 24) return t('relativeTime.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('relativeTime.daysAgo', { count: diffDays });
    return date.toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
      style={{
        width: sidebarWidth,
        transition: isResizing ? 'none' : 'width 200ms'
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-gold" />
            <h3 className="font-semibold text-brand-charcoal dark:text-gray-100">
              {t('sidebar.header')}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8"
            aria-label={t('sidebar.collapseTooltip')}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'history' | 'outputs')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="history" className="text-xs" aria-label={t('sidebar.tabs.history')}>
              <History className="w-3 h-3 mr-1" aria-hidden="true" />
              {t('sidebar.tabs.history')}
              {chatSessions.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {chatSessions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outputs" className="text-xs" aria-label={t('sidebar.tabs.outputs')}>
              <Users className="w-3 h-3 mr-1" aria-hidden="true" />
              {t('sidebar.tabs.outputs')}
              {personas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {showArchivedPersonas ? personas.length : personas.filter(p => !p.archived_at).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab-specific actions */}
          {activeTab === 'outputs' ? (
            <>
              <Button
                onClick={onCreatePersona}
                className="w-full bg-amber-600 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('sidebar.newPersona')}
              </Button>

              {/* Show Archived Toggle for Personas */}
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => setShowArchivedPersonas(false)}
                  variant={!showArchivedPersonas ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  {t('sidebar.viewActive')}
                </Button>
                <Button
                  onClick={() => setShowArchivedPersonas(true)}
                  variant={showArchivedPersonas ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                >
                  <Archive className="h-3 w-3" />
                  {t('sidebar.viewArchived')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  if (onNewChat) {
                    onNewChat();
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('sidebar.newChat')}
              </Button>

              {/* Archive Toggle for Chat Sessions */}
              {onToggleArchived && (
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => onToggleArchived()}
                    variant={!showArchivedSessions ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                    {t('sidebar.viewActive')}
                  </Button>
                  <Button
                    onClick={() => onToggleArchived()}
                    variant={showArchivedSessions ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                  >
                    <Archive className="h-3 w-3" />
                    {t('sidebar.viewArchived')}
                  </Button>
                </div>
              )}
            </>
          )}
        </Tabs>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {activeTab === 'outputs' ? (
            // Personas Tab Content
            <>
              {isLoading ? (
                <div className="text-center py-8 text-brand-slate">
                  {t('sidebar.loading')}
                </div>
              ) : personas.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-brand-slate dark:text-gray-400 mb-4">
                    {t('sidebar.emptyPersonas')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreatePersona}
                    className="mx-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('sidebar.createFirstPersona')}
                  </Button>
                </div>
              ) : (
                personas.map((persona) => (
              <Card
                key={persona.id}
                className={cn(
                  "p-3 cursor-pointer transition-all duration-200 border hover:shadow-md relative",
                  selectedPersonaId === persona.id
                    ? 'bg-slate-50 dark:bg-slate-900/20 border-amber-300 dark:border-slate-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
                  persona.archived_at && 'opacity-60'
                )}
                onClick={() => onSelectPersona(persona)}
              >
                {/* Archived Badge */}
                {persona.archived_at && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-10 text-xs px-1.5 py-0"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    {t('sidebar.archived')}
                  </Badge>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {getPersonaIcon(persona)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-brand-charcoal dark:text-gray-100 break-words">
                          {persona.name}
                        </p>
                        <p className="text-xs text-brand-slate dark:text-gray-400 break-words mt-0.5">
                          {persona.title}
                        </p>
                        <p className="text-xs text-brand-slate dark:text-brand-slate break-words mt-0.5">
                          {persona.company_name}
                        </p>
                        {/* Primary Badge */}
                        {persona.is_primary && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-slate-50 text-brand-charcoal border-slate-200">
                              <Star className="w-3 h-3 mr-1" />
                              {t('sidebar.primary')}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('actions.moreOptions')}
                        >
                          <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPersona(persona);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('list.interview')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPersona?.(persona);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDuplicatePersona(persona.id, persona.name, e)}
                        >
                          <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('actions.duplicate')}
                        </DropdownMenuItem>
                        {persona.archived_at ? (
                          <DropdownMenuItem
                            onClick={(e) => handleRestorePersona(persona.id, e)}
                            className="text-brand-success"
                          >
                            <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
                            {t('list.restore')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => handleDeletePersona(persona.id, e)}
                            className="text-destructive"
                          >
                            <Trash className="w-4 h-4 mr-2" aria-hidden="true" />
                            {t('actions.archive')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Industry Badge */}
                  {persona.industry && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", getIndustryColor(persona.industry))}
                      >
                        {persona.industry}
                      </Badge>
                    </div>
                  )}

                  {/* Tags */}
                  {persona.tags && persona.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {persona.tags.slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="text-xs py-0 h-5"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {persona.tags.length > 2 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs py-0 h-5"
                        >
                          +{persona.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
                ))
              )}
            </>
          ) : (
            // History Tab Content
            <>
              {chatSessions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  {t('sidebar.emptyHistory')}
                </p>
                <p className="text-xs text-brand-slate dark:text-brand-slate">
                  {t('sidebar.emptyHistoryDescription')}
                </p>
              </div>
            ) : (
              chatSessions
                .filter(session => {
                  const isArchived = !!session.archived_at || session.archived === true;
                  return showArchivedSessions ? isArchived : !isArchived;
                })
                .map((session) => {
                const isArchived = !!session.archived_at || session.archived === true;
                return (
                  <Card
                    key={session.id}
                    className={cn(
                      "group p-3 cursor-pointer transition-all duration-200 border hover:shadow-md relative",
                      currentChatId === session.id
                        ? 'bg-slate-50 dark:bg-slate-900/20 border-amber-300 dark:border-slate-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
                      isArchived && 'opacity-60'
                    )}
                    onClick={() => onSelectChat?.(session.id)}
                  >
                    {/* Archived Badge */}
                    {isArchived && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-10 text-xs px-1.5 py-0"
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        {t('sidebar.archived')}
                      </Badge>
                    )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-brand-charcoal dark:text-gray-100 truncate">
                        {session.title || t('sidebar.untitledSession')}
                      </p>
                      {session.persona_name && (
                        <p className="text-xs text-brand-gold dark:text-amber-400 mt-0.5">
                          <User className="w-3 h-3 inline mr-1" />
                          {session.persona_name}
                        </p>
                      )}
                      {session.last_message && (
                        <p className="text-xs text-brand-slate dark:text-brand-slate mt-1 line-clamp-2">
                          {session.last_message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(session.created_at)}
                        </span>
                        {session.message_count > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              {t('sidebar.messages', { count: session.message_count })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ResourceActionsDropdown
                      item={session}
                      config={sessionConfig}
                      onArchive={!showArchivedSessions ? (session) => {
                        onArchiveChatSession?.(session.id, 'User archived');
                      } : undefined}
                      onRestore={showArchivedSessions ? (session) => {
                        onRestoreChatSession?.(session.id);
                      } : undefined}
                      onDelete={(session) => {
                        onPermanentDeleteChatSession?.(session.id);
                      }}
                      showArchive={!showArchivedSessions}
                      showRestore={showArchivedSessions}
                      showDelete={true}
                      showCopy={false}
                      showView={false}
                      showEdit={false}
                      customActions={[
                        {
                          label: t('sidebar.sessionActions.rename'),
                          icon: Edit,
                          action: (session) => {
                            const newTitle = prompt('Enter new session title:', session.title);
                            if (newTitle && newTitle.trim()) {
                              onRenameChatSession?.(session.id, newTitle.trim());
                            }
                          }
                        },
                        {
                          label: t('sidebar.sessionActions.export'),
                          icon: Copy,
                          action: (session) => {
                            onExportChatSession?.(session.id);
                          }
                        },
                        {
                          label: t('sidebar.sessionActions.duplicate'),
                          icon: Copy,
                          action: (session) => {
                            onDuplicateChatSession?.(session.id);
                          }
                        }
                      ]}
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  </Card>
                );
              })
            )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Persona Insights Panel - Only show on personas tab */}
      {activeTab === 'outputs' && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <PersonaInsightsPanel
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:bg-amber-400 dark:hover:bg-amber-600 transition-colors cursor-col-resize"
          onMouseDown={() => setIsResizing(true)}
          style={{
            width: isResizing ? '2px' : '1px',
            backgroundColor: isResizing ? '#9333ea' : undefined
          }}
        />
      )}
    </div>
  );
}
