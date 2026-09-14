import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CalendarIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  FileText,
  File,
  ChevronDown,
  MessageSquare,
  History,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { OutputContentViewer } from '@/components/outputs/OutputContentViewer'
import { MarketingStrategyEditor } from '@/components/outputs/editors/MarketingStrategyEditor'
import { AnalyticsEditor } from '@/components/outputs/editors/AnalyticsEditor'
import { ROIBudgetEditor } from '@/components/outputs/editors/ROIBudgetEditor'
import { ContentEditor } from '@/components/outputs/editors/ContentEditor'
import { GenericContentEditor } from '@/components/outputs/editors/GenericContentEditor'
import { CommentThread } from '@/components/collaboration/CommentThread'
import { ApprovalRequestButton } from '@/components/collaboration/ApprovalRequestButton'
import { ApprovalStatusBanner } from '@/components/collaboration/ApprovalStatusBanner'
import { ActivityTimeline } from '@/components/outputs/ActivityTimeline'
import { useExportOutput } from '@/hooks/useExportOutput'
import { useRoleAccess } from '@/hooks/data/useUserContextEnhanced'
import { getIntlLocale } from '@/lib/locales'
import { toast } from 'sonner'
import type { SavedOutput } from '@/types/agents'

interface ViewOutputDialogProps {
  output: SavedOutput | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (updatedOutput: SavedOutput) => void
  allowEdit?: boolean
  clientId?: string
}

export function ViewOutputDialog({
  output,
  open,
  onOpenChange,
  onSave,
  allowEdit = false,
  clientId
}: ViewOutputDialogProps) {
  const { t, locale } = useLocale('outputs')
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedOutput, setEditedOutput] = useState<(SavedOutput & { content: any }) | null>(null)
  const { exportToPDF, exportToText, exportToJSON, isExporting } = useExportOutput()
  const { isOwner, isAdmin, isManager } = useRoleAccess()

  // Check if user can view activity history (Owner, Admin, or Manager roles)
  const canViewHistory = isOwner || isAdmin || isManager

  if (!output) return null

  const agent = AGENT_IDENTITY[output.agent_type]
  const Icon = agent?.icon

  // Helper function to format object keys for display
  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Helper function to format content as readable text (not JSON)
  const formatContentForText = (content: any): string => {
    if (typeof content === 'string') {
      return content
    }

    if (typeof content === 'object' && content !== null) {
      let text = ''

      for (const [key, value] of Object.entries(content)) {
        const formattedKey = formatKey(key)

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          text += `\n${formattedKey}:\n${'-'.repeat(formattedKey.length + 1)}\n`
          text += formatContentForText(value)
        } else if (Array.isArray(value)) {
          text += `\n${formattedKey}:\n`
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              // Format nested objects in arrays more readably
              const itemLines = Object.entries(item)
                .map(([k, v]) => `     ${formatKey(k)}: ${v}`)
                .join('\n')
              text += `  ${index + 1}.\n${itemLines}\n`
            } else {
              text += `  ${index + 1}. ${item}\n`
            }
          })
        } else {
          text += `${formattedKey}: ${value}\n`
        }
      }

      return text
    }

    return String(content)
  }

  const handleCopy = async () => {
    try {
      // Format content as readable text with title header
      const header = `${output.title}\n${'='.repeat(output.title.length)}\n\n`
      const formattedContent = formatContentForText(
        typeof output.content === 'string'
          ? (() => { try { return JSON.parse(output.content) } catch { return output.content } })()
          : output.content
      )
      const contentToCopy = header + formattedContent.trim()

      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleExportPDF = async () => {
    try {
      await exportToPDF(output, {
        format: 'pdf',
        includeMetadata: true,
        branding: {
          organizationName: 'Marketing Suite AI'
        }
      })
      toast.success(t('dialog.toast.pdfStarted'))
    } catch (error) {
      toast.error(t('dialog.toast.pdfError'))
    }
  }

  const handleExportText = async () => {
    try {
      await exportToText(output, {
        format: 'text',
        includeMetadata: true
      })
      toast.success(t('dialog.toast.textSuccess'))
    } catch (error) {
      toast.error(t('dialog.toast.textError'))
    }
  }

  const handleExportJSON = async () => {
    try {
      await exportToJSON(output, {
        format: 'json',
        includeMetadata: true
      })
      toast.success(t('dialog.toast.jsonSuccess'))
    } catch (error) {
      toast.error(t('dialog.toast.jsonError'))
    }
  }

  const handleEdit = () => {
    // Parse string content back to object for editing
    let parsedContent: any = output.content
    try {
      // If content is a string, try to parse it as JSON
      if (typeof output.content === 'string') {
        parsedContent = JSON.parse(output.content)
      }
    } catch (error) {
      // If parsing fails, use structured_data as fallback or keep as string
      parsedContent = output.structured_data || (typeof output.content === 'string' ? output.content : JSON.stringify(output.content))
    }

    setEditedOutput({
      ...output,
      content: parsedContent as any
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedOutput(null)
  }

  const handleSave = async () => {
    if (!editedOutput || !onSave) return

    try {
      // Ensure content is a string for SavedOutput compatibility
      const outputToSave = {
        ...editedOutput,
        content: typeof editedOutput.content === 'string'
          ? editedOutput.content
          : JSON.stringify(editedOutput.content)
      }

      await onSave(outputToSave)
      setIsEditing(false)
      setEditedOutput(null)
      toast.success(t('dialog.toast.saveSuccess'))
    } catch (error) {
      console.error('Failed to save output:', error)
      toast.error(t('dialog.toast.saveError'))
    }
  }

  const handleContentChange = (field: string, value: any) => {
    if (!editedOutput) return

    if (field === 'title') {
      setEditedOutput({ ...editedOutput, title: value })
    } else if (field === 'content') {
      // Handle both string and object content
      setEditedOutput({ ...editedOutput, content: value })
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {Icon && (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: agent.color }} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{output.title}</h2>
              <Badge variant="outline" className="mt-1">
                {agent?.name || output.agent_type}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {t('dialog.description')}
          </DialogDescription>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <CalendarIcon className="h-4 w-4" />
            {new Date(output.created_at).toLocaleDateString(getIntlLocale(locale), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </DialogHeader>

        {/* Approval Status Banner - shown when there's a pending approval for this output */}
        <ApprovalStatusBanner
          resourceType="output"
          resourceId={output.id}
          className="my-3"
        />

        <Tabs defaultValue="content" className="py-4">
          <TabsList className="mb-4">
            <TabsTrigger value="content">{t('dialog.tabs.content')}</TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('dialog.tabs.comments')}
            </TabsTrigger>
            {canViewHistory && (
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                {t('dialog.tabs.history')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="max-h-[55vh] overflow-y-auto">
            {isEditing && editedOutput ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">{t('dialog.fields.title')}</Label>
                  <Input
                    id="edit-title"
                    value={editedOutput.title}
                    onChange={(e) => handleContentChange('title', e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Use specialized editors for each agent type */}
                {output.agent_type === 'marketing_strategy' ? (
                  <MarketingStrategyEditor
                    content={editedOutput.content}
                    onChange={(updatedContent) => handleContentChange('content', updatedContent)}
                  />
                ) : output.agent_type === 'analytics' ? (
                  <AnalyticsEditor
                    content={editedOutput.content}
                    onChange={(updatedContent) => handleContentChange('content', updatedContent)}
                  />
                ) : output.agent_type === 'roi_budget' ? (
                  <ROIBudgetEditor
                    content={editedOutput.content}
                    onChange={(updatedContent) => handleContentChange('content', updatedContent)}
                  />
                ) : output.agent_type === 'content' ? (
                  <ContentEditor
                    content={editedOutput.content}
                    onChange={(updatedContent) => handleContentChange('content', updatedContent)}
                  />
                ) : (
                  <GenericContentEditor
                    content={editedOutput.content}
                    onChange={(updatedContent) => handleContentChange('content', updatedContent)}
                    agentType={output.agent_type}
                  />
                )}
              </div>
            ) : (
              <OutputContentViewer output={output} />
            )}
          </TabsContent>

          <TabsContent value="comments" className="max-h-[55vh] overflow-y-auto">
            <CommentThread
              resourceType="output"
              resourceId={output.id}
              clientId={clientId}
              maxHeight="400px"
            />
          </TabsContent>

          {canViewHistory && (
            <TabsContent value="history" className="max-h-[55vh] overflow-y-auto">
              <ActivityTimeline
                resourceType="output"
                resourceId={output.id}
                maxHeight="400px"
              />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t('dialog.generatedBy', { agent: agent?.name || output.agent_type })}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <XIcon className="w-4 h-4 mr-2" />
                  {t('dialog.actions.cancel')}
                </Button>
                <Button onClick={handleSave}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {t('dialog.actions.save')}
                </Button>
              </>
            ) : (
              <>
                {allowEdit && onSave && (
                  <Button variant="outline" onClick={handleEdit}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    {t('dialog.actions.edit')}
                  </Button>
                )}
                <ApprovalRequestButton
                  resourceType="output"
                  resourceId={output.id}
                  resourceTitle={output.title}
                  clientId={clientId}
                  variant="outline"
                  size="default"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isExporting}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      {t('dialog.actions.export')}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                      <FileText className="w-4 h-4 mr-2" />
                      {t('dialog.actions.exportPDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportText} disabled={isExporting}>
                      <File className="w-4 h-4 mr-2" />
                      {t('dialog.actions.exportText')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJSON} disabled={isExporting}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      {t('dialog.actions.exportJSON')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      {t('dialog.actions.copied')}
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4 mr-2" />
                      {t('dialog.actions.copy')}
                    </>
                  )}
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  {t('dialog.actions.close')}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
