import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMobileMenu } from '@/contexts/MobileMenuContext'

/**
 * MobileNav - Hamburger menu button that triggers the mobile menu panel
 * The actual menu content is rendered at the root level via MobileMenuPanel
 * to escape the header's stacking context
 */
export function MobileNav() {
  const { t } = useTranslation(['common'])
  const { setIsOpen } = useMobileMenu()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="lg:hidden p-3 min-w-[48px] min-h-[48px] flex items-center justify-center text-brand-charcoal hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700 -ml-2"
      aria-label={t('aria.openMenu')}
    >
      <Menu className="h-7 w-7" />
    </button>
  )
}
