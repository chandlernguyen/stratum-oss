import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface OutputsFilterProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  sortBy: 'date' | 'title'
  setSortBy: (value: 'date' | 'title') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (value: 'asc' | 'desc') => void
}

export function OutputsFilter({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: OutputsFilterProps) {
  const { t } = useTranslation('outputs')

  // Combined sort option state (type + direction)
  const sortOption = `${sortBy}_${sortOrder}` as 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('_') as ['date' | 'title', 'asc' | 'desc']
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  return (
    <div className="mb-6">
      {/* Mobile-First: Stacked Layout (flex-col) | Desktop: Horizontal (md:flex-row) */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        {/* Search - Full width mobile, constrained desktop */}
        <div className="relative w-full md:flex-1 md:max-w-md group">
          <div className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2",
            "p-1.5 rounded-md",
            "bg-slate-100 dark:bg-slate-800",
            "group-focus-within:bg-amber-100 dark:group-focus-within:bg-amber-900/30",
            "transition-colors duration-200"
          )}>
            <Search className={cn(
              "w-3.5 h-3.5",
              "text-slate-500 dark:text-slate-400",
              "group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400",
              "transition-colors duration-200"
            )} />
          </div>
          <Input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-12 min-h-12 md:min-h-10",
              "border-slate-200 dark:border-slate-700",
              "focus:border-amber-400 dark:focus:border-amber-500",
              "focus:ring-amber-500/20",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Sort - Full width mobile, constrained desktop */}
        <div className="relative group">
          <Select value={sortOption} onValueChange={handleSortChange}>
            <SelectTrigger className={cn(
              "w-full md:w-52 min-h-12 md:min-h-10",
              "border-slate-200 dark:border-slate-700",
              "focus:border-amber-400 dark:focus:border-amber-500",
              "focus:ring-amber-500/20",
              "transition-all duration-200"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-md",
                  "bg-slate-100 dark:bg-slate-800"
                )}>
                  <ArrowUpDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                </div>
                <SelectValue placeholder={t('sort.label')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">
                {t('sort.newest')}
              </SelectItem>
              <SelectItem value="date_asc">
                {t('sort.oldest')}
              </SelectItem>
              <SelectItem value="title_asc">
                {t('sort.aToZ')}
              </SelectItem>
              <SelectItem value="title_desc">
                {t('sort.zToA')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
