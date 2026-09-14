import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { useAuthStore } from '@/stores/auth'
import { useUserIdentity } from '@/hooks/data/useUserIdentity'
import {
  Search,
  LogOut,
  User,
  FileText,
  Sparkles,
  Rocket,
  Home,
  Users
} from 'lucide-react'
import { buildAgentRootUrl } from '@/utils/multiTenantRouting'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'
import { stripLocalePrefix } from '@/lib/localePath'

// Create a custom event for opening the command palette
const OPEN_COMMAND_PALETTE_EVENT = 'openCommandPalette'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const { signOut } = useAuthStore()
  const { data: identity } = useUserIdentity()

  // Check if user is agency
  const isAgency = identity?.organization?.type === 'AGENCY'

  // Get current client slug from URL if on client page
  const clientSlugMatch = stripLocalePrefix(location.pathname).match(/\/clients\/([^/]+)/)
  const currentClientSlug = clientSlugMatch?.[1]

  // Store last-viewed client in localStorage for persistence
  useEffect(() => {
    if (currentClientSlug) {
      localStorage.setItem('lastViewedClient', currentClientSlug)
    }
  }, [currentClientSlug])

  // Smart navigation function that works for both SME and Agency
  const navigateToAgent = useCallback((agentPath: string) => {
    if (!isAgency) {
      // SME: Use direct path
      navigate(agentPath)
      return
    }

    // AGENCY: Need client context
    const clientSlug = currentClientSlug || localStorage.getItem('lastViewedClient')

    if (clientSlug) {
      // Extract agent type from path (e.g., '/strategy' -> 'strategy')
      const agentType = agentPath.replace('/', '')
      // Convert to snake_case for buildAgentRootUrl (e.g., 'campaign-planning' -> 'campaign_planning')
      const agentTypeSnakeCase = agentType.replace(/-/g, '_')
      navigate(buildAgentRootUrl(agentTypeSnakeCase, clientSlug))
    } else {
      // No client context, go to clients list
      navigate('/clients')
    }
  }, [isAgency, currentClientSlug, navigate])

  // Register keyboard shortcut and listen for custom event
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const handleOpenEvent = () => {
      setOpen(true)
    }

    document.addEventListener('keydown', down)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
    
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
    }
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Quick actions
  const quickActions = [
    {
      id: 'home',
      label: 'Go to Dashboard',
      icon: Home,
      shortcut: '⌘H',
      action: () => navigate('/dashboard')
    },
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: User,
      shortcut: '⌘,',
      action: () => navigate('/profile')
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: LogOut,
      shortcut: '⌘⇧Q',
      action: () => {
        signOut()
        navigate('/login')
      }
    }
  ]

  // Register additional keyboard shortcuts
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch(e.key.toLowerCase()) {
          case 'h':
            e.preventDefault()
            navigate('/dashboard')
            break
          // Removed 'w' shortcut to avoid conflict with close tab (Cmd+W)
          // Removed 'a' shortcut to avoid conflict with select all (Cmd+A)
          case ',':
            e.preventDefault()
            navigate('/profile')
            break
          case 'q':
            if (e.shiftKey) {
              e.preventDefault()
              signOut()
              navigate('/login')
            }
            break
        }
        
        // Agent shortcuts (⌘1-9)
        const num = parseInt(e.key)
        if (num >= 1 && num <= 9) {
          e.preventDefault()
          const agents = Object.values(AGENT_IDENTITY)
          if (agents[num - 1]) {
            navigateToAgent(agents[num - 1].path)
          }
        }
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [navigate, signOut, navigateToAgent])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <CommandItem
                  key={action.id}
                  onSelect={() => runCommand(action.action)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
          
          <CommandSeparator />
          
          {/* Agents */}
          <CommandGroup heading="AI Agents">
            {Object.values(AGENT_IDENTITY).map((agent, index) => {
              const Icon = agent.icon
              return (
                <CommandItem
                  key={agent.id}
                  onSelect={() => runCommand(() => navigateToAgent(agent.path))}
                >
                  <Icon className="mr-2 h-4 w-4" style={{ color: agent.color }} />
                  <span>{agent.name}</span>
                  <CommandShortcut>⌘{index + 1}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
          
          <CommandSeparator />
          
          {/* Recent Outputs */}
          <CommandGroup heading="Recent Outputs">
            <CommandItem onSelect={() => runCommand(() => navigate('/outputs'))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>View All Outputs</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/outputs?view=expert'))}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Expert Mode</span>
            </CommandItem>
          </CommandGroup>
          
          {/* Templates */}
          <CommandGroup heading="Quick Win Templates">
            <CommandItem onSelect={() => runCommand(() => {
              localStorage.setItem('quickWinTemplate', JSON.stringify({
                id: 'competitor-analysis',
                agents: ['competitive-intelligence']
              }))
              navigateToAgent('/competitive-intelligence')
            })}>
              <Rocket className="mr-2 h-4 w-4" />
              <span>Competitor Analysis</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => {
              localStorage.setItem('quickWinTemplate', JSON.stringify({
                id: 'customer-discovery',
                agents: ['persona']
              }))
              navigateToAgent('/persona')
            })}>
              <Users className="mr-2 h-4 w-4" />
              <span>Customer Discovery</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
  )
}

export function CommandPaletteTrigger() {
  const { t } = useTranslation('common')
  const handleClick = () => {
    // Dispatch a custom event to open the command palette
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] text-sm text-muted-foreground bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">{t('search.placeholder')}</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}
