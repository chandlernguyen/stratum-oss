import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatKey, renderValue } from '../shared/ViewerUtils'
import { FileText } from 'lucide-react'

interface GenericViewerProps {
  content: any
  hasStructuredData: boolean
}

export function GenericViewer({ content, hasStructuredData }: GenericViewerProps) {
  // Handle empty content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No content data available</p>
      </div>
    )
  }

  // Handle string content
  if (typeof content === 'string') {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  // Handle structured data with improved formatting
  const skipFields = ['created_at', 'updated_at', 'created_by', 'id', 'org_id', 'archived_at',
                      'extraction_status', 'extraction_model', 'extraction_timestamp']

  // Filter out empty or metadata fields
  const validEntries = Object.entries(content).filter(([key, value]) => {
    return !skipFields.includes(key) && value !== null && value !== undefined &&
           !(typeof value === 'object' && Object.keys(value).length === 0) &&
           !(Array.isArray(value) && value.length === 0)
  })

  if (validEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No meaningful content to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-green-100 border-green-300 text-green-700">
            Structured Data
          </Badge>
          <span className="text-xs">Enhanced data extraction successful</span>
        </div>
      )}

      {validEntries.map(([key, value]) => {
        // Special handling for common structured fields
        if (key === 'title' && typeof value === 'string') {
          return (
            <Card key={key} className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{value}</CardTitle>
              </CardHeader>
            </Card>
          )
        }

        if (key === 'summary' && typeof value === 'string') {
          return (
            <Card key={key}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground italic">{value}</p>
              </CardContent>
            </Card>
          )
        }

        // Default card rendering for other fields
        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">{formatKey(key)}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderValue(value)}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}