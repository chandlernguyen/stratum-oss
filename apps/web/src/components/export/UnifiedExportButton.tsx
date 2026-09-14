/**
 * UnifiedExportButton Component
 *
 * A reusable export button component providing consistent export functionality
 * across all agent outputs and content types.
 *
 * Features:
 * - PDF export via browser print dialog
 * - Text file export (.txt with UTF-8 encoding)
 * - JSON export with structured data
 * - Copy to clipboard functionality
 * - Custom branding support
 * - Loading states and error handling
 *
 * Date: 2025-10-17
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DownloadIcon,
  FileTextIcon,
  FileIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  Loader2
} from 'lucide-react'
import { useExportOutput } from '@/hooks/useExportOutput'
import { toast } from 'sonner'
import type { SavedOutput } from '@/types/agents'

interface UnifiedExportButtonProps {
  /** The output data to export */
  output: SavedOutput

  /** Custom branding options for exports */
  branding?: {
    organizationName?: string
    logoUrl?: string
    customColors?: {
      primary: string
      secondary: string
    }
  }

  /** Whether to include metadata in exports */
  includeMetadata?: boolean

  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost'

  /** Button size */
  size?: 'default' | 'sm' | 'lg'

  /** Custom button label */
  label?: string

  /** Whether to show the dropdown chevron */
  showChevron?: boolean

  /** Callback after successful export */
  onExportSuccess?: (format: string) => void

  /** Callback after export error */
  onExportError?: (error: Error, format: string) => void
}

export function UnifiedExportButton({
  output,
  branding,
  includeMetadata = true,
  variant = 'outline',
  size = 'sm',
  label = 'Export',
  showChevron = true,
  onExportSuccess,
  onExportError
}: UnifiedExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const { exportToPDF, exportToText, exportToJSON, isExporting } = useExportOutput()

  const handleExportPDF = async () => {
    try {
      await exportToPDF(output, {
        format: 'pdf',
        includeMetadata,
        branding
      })
      toast.success('PDF export started - check your downloads')
      onExportSuccess?.('pdf')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to export PDF')
      toast.error('Failed to export PDF')
      onExportError?.(err, 'pdf')
    }
  }

  const handleExportText = async () => {
    try {
      await exportToText(output, {
        format: 'text',
        includeMetadata,
        branding
      })
      toast.success('Text file downloaded successfully')
      onExportSuccess?.('text')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to export text file')
      toast.error('Failed to export text file')
      onExportError?.(err, 'text')
    }
  }

  const handleExportJSON = async () => {
    try {
      await exportToJSON(output, {
        format: 'json',
        includeMetadata
      })
      toast.success('JSON file downloaded successfully')
      onExportSuccess?.('json')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to export JSON')
      toast.error('Failed to export JSON')
      onExportError?.(err, 'json')
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      const contentToCopy = typeof output.content === 'string'
        ? output.content
        : JSON.stringify(output.content, null, 2)

      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      toast.success('Content copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
      onExportSuccess?.('clipboard')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to copy to clipboard')
      toast.error('Failed to copy to clipboard')
      onExportError?.(err, 'clipboard')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <DownloadIcon className="w-4 h-4 mr-2" />
              {label}
              {showChevron && <ChevronDownIcon className="w-4 h-4 ml-2" />}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileTextIcon className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportText} disabled={isExporting}>
          <FileIcon className="w-4 h-4 mr-2" />
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} disabled={isExporting}>
          <DownloadIcon className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyToClipboard} disabled={isExporting}>
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
