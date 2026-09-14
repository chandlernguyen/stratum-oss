import { useCallback, useState } from 'react'
import type { SavedOutput } from '@/types/agents'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { getCurrentLanguage } from '@/lib/i18n'
import { getIntlLocale } from '@/lib/locales'

interface ExportOptions {
  format: 'pdf' | 'text' | 'json'
  includeMetadata?: boolean
  branding?: {
    organizationName?: string
    logoUrl?: string
    customColors?: {
      primary: string
      secondary: string
    }
  }
}

export function useExportOutput() {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = useCallback(async (output: SavedOutput, options?: Partial<ExportOptions>) => {
    setIsExporting(true)

    try {
      const agent = AGENT_IDENTITY[output.agent_type]
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${output.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`

      // Create HTML content for PDF generation
      const htmlContent = generateHTMLReport(output, agent, options)

      // Use browser's print API for basic PDF generation
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Wait for content to load, then print
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }

      return filename
    } catch (error) {
      console.error('PDF export failed:', error)
      throw new Error('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }, [])

  const exportToText = useCallback(async (output: SavedOutput, options?: Partial<ExportOptions>) => {
    setIsExporting(true)

    try {
      const agent = AGENT_IDENTITY[output.agent_type]
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${output.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.txt`

      // Generate plain text document
      const textContent = generateTextDocument(output, agent, options)

      // Create blob and download
      const blob = new Blob([textContent], {
        type: 'text/plain;charset=utf-8'
      })

      downloadFile(blob, filename)

      return filename
    } catch (error) {
      console.error('Text export failed:', error)
      throw new Error('Failed to export text document')
    } finally {
      setIsExporting(false)
    }
  }, [])

  const exportToJSON = useCallback(async (output: SavedOutput, options?: Partial<ExportOptions>) => {
    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${output.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`

      const exportData = {
        title: output.title,
        agent_type: output.agent_type,
        content: output.content,
        created_at: output.created_at,
        exported_at: new Date().toISOString(),
        ...(options?.includeMetadata && { metadata: output.metadata })
      }

      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })

      downloadFile(blob, filename)

      return filename
    } catch (error) {
      console.error('JSON export failed:', error)
      throw new Error('Failed to export JSON')
    } finally {
      setIsExporting(false)
    }
  }, [])

  return {
    exportToPDF,
    exportToText,
    exportToJSON,
    isExporting
  }
}

function getExportIntlLocale() {
  return getIntlLocale(getCurrentLanguage())
}

// Helper function to generate HTML report for PDF
function generateHTMLReport(output: SavedOutput, agent: any, options?: Partial<ExportOptions>): string {
  const brandingColors = options?.branding?.customColors || {
    primary: agent?.color || '#3B82F6',
    secondary: '#64748B'
  }

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${output.title}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .header {
            border-bottom: 3px solid ${brandingColors.primary};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            color: ${brandingColors.primary};
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }

        .agent-badge {
            background: ${brandingColors.primary}20;
            color: ${brandingColors.primary};
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
        }

        .metadata {
            color: ${brandingColors.secondary};
            font-size: 14px;
            margin-top: 10px;
        }

        .content {
            margin-top: 30px;
        }

        .content h2 {
            color: ${brandingColors.primary};
            border-left: 4px solid ${brandingColors.primary};
            padding-left: 16px;
            margin-top: 30px;
        }

        .content pre {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
            font-size: 14px;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: ${brandingColors.secondary};
            font-size: 12px;
        }

        ${options?.branding?.organizationName ? `
        .org-branding {
            text-align: center;
            margin-bottom: 30px;
            color: ${brandingColors.secondary};
            font-size: 18px;
            font-weight: 600;
        }
        ` : ''}
    </style>
</head>
<body>
    ${options?.branding?.organizationName ? `
    <div class="org-branding">
        ${options.branding.organizationName}
    </div>
    ` : ''}

    <div class="header">
        <h1>${output.title}</h1>
        <span class="agent-badge">${agent?.name || output.agent_type} Report</span>
        <div class="metadata">
            Generated: ${new Date(output.created_at).toLocaleDateString(getExportIntlLocale(), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
        </div>
    </div>

    <div class="content">
        ${formatContentForHTML(output.content)}
    </div>

    <div class="footer">
        Generated with Marketing Suite AI Platform
    </div>
</body>
</html>`
}

// Helper function to generate plain text document
function generateTextDocument(output: SavedOutput, agent: any, options?: Partial<ExportOptions>): string {
  const headerLine = '='.repeat(70);
  const orgBranding = options?.branding?.organizationName
    ? `${options.branding.organizationName}\n${headerLine}\n\n`
    : '';

  return `${orgBranding}${output.title}
${headerLine}

Agent: ${agent?.name || output.agent_type}
Generated: ${new Date(output.created_at).toLocaleDateString(getExportIntlLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}

${headerLine}

${formatContentForText(output.content)}

${headerLine}
Generated with STRAŦUM - Marketing Intelligence Platform`
}

// Helper function to format content for plain text display
function formatContentForText(content: any): string {
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
          text += `  ${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}\n`
        })
      } else {
        text += `${formattedKey}: ${value}\n`
      }
    }

    return text
  }

  return String(content)
}

// Helper function to format content for HTML display
function formatContentForHTML(content: any): string {
  if (typeof content === 'string') {
    return content.replace(/\n/g, '<br>')
  }

  if (typeof content === 'object' && content !== null) {
    let html = ''

    for (const [key, value] of Object.entries(content)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        html += `<h2>${formatKey(key)}</h2>`
        html += formatContentForHTML(value)
      } else if (Array.isArray(value)) {
        html += `<h2>${formatKey(key)}</h2>`
        html += '<ul>'
        for (const item of value) {
          html += `<li>${typeof item === 'object' ? JSON.stringify(item, null, 2) : item}</li>`
        }
        html += '</ul>'
      } else {
        html += `<p><strong>${formatKey(key)}:</strong> ${value}</p>`
      }
    }

    return html
  }

  return String(content)
}

// Helper function to format object keys for display
function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Helper function to download files
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
