import { Link, NavLink } from 'react-router-dom'
import { LogOut, ChevronDown, User, FileText, CheckCircle, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { useState, useRef, useEffect } from 'react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { NotificationBell } from '@/components/collaboration/NotificationBell'
import { useClientContext } from '@/contexts/ClientContext'

/**
 * ClientViewHeader - Simplified header for external agency_client users
 *
 * Features a minimal navigation focused on:
 * - Outputs (content to review)
 * - Approvals (approved content)
 * - Comments (feedback)
 *
 * No access to:
 * - Agents (AI tools)
 * - Campaigns management
 * - Settings/Team
 * - Other clients
 */

// Premium Dropdown Component
function Dropdown({
  trigger,
  children
}: {
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200/80 py-1.5 z-50 dark:bg-slate-900/95 dark:border-slate-700/80 dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClientViewHeader() {
  const { t } = useTranslation(['common'])
  const { signOut, user } = useAuthStore()
  const clientContext = useClientContext()
  const clientName = clientContext?.clientData?.client_info?.name || t('clientPortal.title')
  const clientSlug = clientContext?.clientSlug || 'my-client'

  // Base path for all portal routes
  const portalBase = `/portal/${clientSlug}`

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 text-sm font-medium transition-all duration-200 px-4 py-2 rounded-lg ${
      isActive
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
    }`

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/80 dark:border-slate-700/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)] safe-top">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Client Name */}
        <div className="flex items-center">
          <Link to={portalBase} className="flex items-center group">
            <div className="flex items-center gap-3">
              {/* Premium logo container */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <img
                  src="/logo-icon.svg"
                  alt="STRATUM"
                  className="relative w-9 h-9 drop-shadow-sm"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-semibold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  {clientName}
                </span>
                <span className="text-[10px] font-medium tracking-widest uppercase text-slate-400 dark:text-slate-500">
                  {t('clientPortal.title')}
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation - Simplified for clients */}
          <nav className="hidden md:flex items-center gap-1 ml-10">
            <NavLink to={portalBase} end className={navLinkClasses}>
              <FileText className="h-4 w-4" />
              {t('clientPortal.review')}
            </NavLink>
            <NavLink to={`${portalBase}/approved`} className={navLinkClasses}>
              <CheckCircle className="h-4 w-4" />
              {t('navigation.approved')}
            </NavLink>
          </nav>
        </div>

        {/* Right side - Notifications, Theme, User */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />

          <Dropdown
            trigger={
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white font-semibold text-sm shadow-md ring-2 ring-white/20">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                  {user?.email}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
              </button>
            }
          >
            <NavLink
              to={`${portalBase}/profile`}
              className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-amber-400"
            >
              <User className="mr-3 h-4 w-4" />
              {t('navigation.myProfile')}
            </NavLink>
            <NavLink
              to={`${portalBase}/feedback`}
              className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-700 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-amber-400"
            >
              <MessageSquare className="mr-3 h-4 w-4" />
              {t('navigation.feedback')}
            </NavLink>
            <div className="border-t border-slate-100 my-1 dark:border-slate-700"></div>
            <button
              onClick={signOut}
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <LogOut className="mr-3 h-4 w-4" />
              {t('navigation.signOut')}
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <nav className="container flex items-center justify-center gap-8 py-2">
          <NavLink
            to={portalBase}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 px-4 rounded-lg transition-colors ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{t('clientPortal.review')}</span>
          </NavLink>
          <NavLink
            to={`${portalBase}/approved`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 px-4 rounded-lg transition-colors ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{t('navigation.approved')}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
