import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreVertical,
  Eye,
  Copy,
  Download,
  Archive,
  Trash,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/hooks/useLocale'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { getIntlLocale } from '@/lib/locales'
import { cn } from '@/lib/utils'
import type { SavedOutput } from '@/types/agents'

interface UnifiedOutputCardProps {
  output: SavedOutput
  isActive?: boolean
  isArchived?: boolean
  isSelected?: boolean
  onView: (output: SavedOutput) => void
  onActivate?: (output: SavedOutput) => void
  onArchive?: (output: SavedOutput) => void
  onRestore?: (output: SavedOutput) => void
  onDelete?: (output: SavedOutput) => void
  onCopy?: (output: SavedOutput) => void
  onExport?: (output: SavedOutput) => void
  onSelect?: (output: SavedOutput) => void
  showCheckbox?: boolean
}

export function UnifiedOutputCard({
  output,
  isActive,
  isArchived,
  isSelected,
  onView,
  onActivate,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  onExport,
  onSelect,
  showCheckbox
}: UnifiedOutputCardProps) {
  const { t, locale } = useLocale('outputs')
  const agent = AGENT_IDENTITY[output.agent_type] || AGENT_IDENTITY['strategy']
  const AgentIcon = agent?.icon || FileText

  // Format the output based on type
  const getOutputDetails = () => {
    switch (output.agent_type) {
      case 'persona':
        const personaData = output.content as any
        return {
          title: personaData?.name || output.title,
          subtitle: personaData?.title || personaData?.demographics?.age || '',
          description: personaData?.company_name || personaData?.demographics?.education || '',
          badges: [
            personaData?.customer_status && (
              <Badge key="status" variant="outline" className="text-xs">
                {personaData.customer_status}
              </Badge>
            ),
            personaData?.satisfaction_score && (
              <Badge key="score" variant="secondary" className="text-xs">
                Score: {personaData.satisfaction_score}/5
              </Badge>
            )
          ].filter(Boolean)
        }

      case 'strategy':
      case 'marketing_strategy':
        const strategyData = output.content as any
        return {
          title: strategyData?.title || output.title,
          subtitle: strategyData?.framework_type || 'Strategic Analysis',
          description: strategyData?.executive_summary?.substring(0, 100) ||
                      strategyData?.positioning_statement?.substring(0, 100) ||
                      'Comprehensive strategic framework',
          badges: [
            strategyData?.frameworks_used?.length > 0 && (
              <Badge key="frameworks" variant="outline" className="text-xs">
                {strategyData.frameworks_used.length} frameworks
              </Badge>
            ),
            output.metadata?.status && (
              <Badge key="status" variant="outline" className="text-xs">
                {output.metadata.status}
              </Badge>
            )
          ].filter(Boolean)
        }

      case 'content':
        const contentData = output.content as any
        return {
          title: contentData?.title || output.title,
          subtitle: contentData?.content_type || 'Content Piece',
          description: (typeof contentData?.summary === 'string' ? contentData.summary.substring(0, 100) : null) ||
                      (typeof contentData?.content_body === 'string' ? contentData.content_body.substring(0, 100) : null) ||
                      'Generated content',
          badges: [
            contentData?.channels?.length > 0 && (
              <Badge key="channels" variant="outline" className="text-xs">
                {contentData.channels.length} channels
              </Badge>
            ),
            contentData?.target_audience && (
              <Badge key="audience" variant="secondary" className="text-xs">
                {contentData.target_audience}
              </Badge>
            )
          ].filter(Boolean)
        }

      default:
        return {
          title: output.title,
          subtitle: output.agent_type.replace(/_/g, ' '),
          description: typeof output.content === 'string'
            ? output.content.substring(0, 100)
            : 'AI-generated output',
          badges: []
        }
    }
  }

  const details = getOutputDetails()

  const getStatusIcon = () => {
    if (isArchived) {
      return <Archive className="w-4 h-4 text-gray-500" />
    }
    if (isActive) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return t('time.justNow')
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours })
    if (diffHours < 48) return t('time.yesterday')

    return date.toLocaleDateString(getIntlLocale(locale), {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  return (
    <Card
      className={cn(
        "group relative transition-all duration-200 hover:shadow-lg cursor-pointer",
        isActive && "ring-2 ring-amber-500 ring-offset-2",
        isArchived && "opacity-75 border-dashed",
        isSelected && "bg-amber-50 dark:bg-amber-900/20 border-amber-300"
      )}
      onClick={() => onView(output)}
    >
      {/* Selection Checkbox */}
      {showCheckbox && onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect(output)
            }}
            className="w-4 h-4 text-amber-600 bg-white border-gray-300 rounded focus:ring-amber-500 dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
      )}

      <CardHeader className={cn("pb-3", showCheckbox && "pl-12")}>
        <div className="flex items-start justify-between gap-2">
          {/* Left side: Icon and content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Agent Icon */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${agent.color}20` }}
            >
              <AgentIcon className="w-5 h-5" style={{ color: agent.color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 truncate">
                    {details.title}
                  </h3>

                  {/* Subtitle */}
                  {details.subtitle && (
                    <p className="text-xs text-brand-slate dark:text-gray-400 mt-0.5">
                      {details.subtitle}
                    </p>
                  )}

                  {/* Description */}
                  {details.description && (
                    <p className="text-xs text-brand-slate dark:text-gray-400 mt-1 line-clamp-2">
                      {details.description}
                    </p>
                  )}
                </div>

                {/* Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onView(output)
                    }}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('card.viewDetails')}
                    </DropdownMenuItem>

                    {onCopy && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onCopy(output)
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        {t('card.copy')}
                      </DropdownMenuItem>
                    )}

                    {onExport && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onExport(output)
                      }}>
                        <Download className="w-4 h-4 mr-2" />
                        {t('card.export')}
                      </DropdownMenuItem>
                    )}

                    {onActivate && !isActive && !isArchived && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onActivate(output)
                      }}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('card.setActive')}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {onArchive && !isArchived && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onArchive(output)
                        }}
                        className="text-brand-warning"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {t('card.archive')}
                      </DropdownMenuItem>
                    )}

                    {onRestore && isArchived && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestore(output)
                        }}
                        className="text-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('card.restore')}
                      </DropdownMenuItem>
                    )}

                    {onDelete && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(output)
                        }}
                        className="text-destructive"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        {t('card.delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges and metadata */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Agent Badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs px-1.5 py-0",
                    agent.gradient && `bg-gradient-to-r ${agent.gradient} text-white border-0`
                  )}
                >
                  {agent.name || output.agent_type}
                </Badge>

                {/* Status Badge */}
                {(isActive || isArchived) && (
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className="text-xs px-1.5 py-0 gap-1"
                  >
                    {getStatusIcon()}
                    <span>{isActive ? t('card.active') : t('card.archived')}</span>
                  </Badge>
                )}

                {/* Custom badges from details */}
                {details.badges}

                {/* Timestamp */}
                {output.created_at && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(output.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
