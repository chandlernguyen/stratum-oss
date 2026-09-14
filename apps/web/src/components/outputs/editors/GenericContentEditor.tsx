import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileText, Code, Eye } from 'lucide-react'

interface GenericContentEditorProps {
  content: any
  onChange: (updatedContent: any) => void
  agentType: string
}

export function GenericContentEditor({ content, onChange, agentType }: GenericContentEditorProps) {
  const { t } = useTranslation(['outputs', 'common'])
  const [editMode, setEditMode] = useState<'structured' | 'json'>('structured')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Convert content to structured key-value pairs for easier editing
  const getEditableFields = (obj: any): Array<{ key: string; value: any; type: string }> => {
    if (!obj || typeof obj !== 'object') return []

    const fields: Array<{ key: string; value: any; type: string }> = []

    Object.entries(obj).forEach(([key, value]) => {
      // Skip only core metadata fields, but allow content fields
      if (['id', 'created_at', 'updated_at', 'org_id', 'user_id', 'archived_at', 'archived_by'].includes(key)) return

      // Skip null or undefined values
      if (value === null || value === undefined) return

      let type = 'text'
      if (typeof value === 'number') type = 'number'
      else if (typeof value === 'boolean') type = 'boolean'
      else if (Array.isArray(value)) type = 'array'
      else if (typeof value === 'object' && value !== null) type = 'object'
      else if (typeof value === 'string' && value.length > 100) type = 'textarea'

      fields.push({ key, value, type })
    })

    return fields.sort((a, b) => {
      // Put simpler fields first
      const priority = { text: 1, textarea: 2, number: 3, boolean: 4, array: 5, object: 6 }
      return (priority[a.type as keyof typeof priority] || 9) - (priority[b.type as keyof typeof priority] || 9)
    })
  }

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...content, [key]: value }
    onChange(updated)
  }

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      setJsonError(null)
      onChange(parsed)
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
    }
  }

  const renderFieldEditor = (field: { key: string; value: any; type: string }) => {
    const { key, value, type } = field
    const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    switch (type) {
      case 'text':
        return (
          <div key={key}>
            <Label htmlFor={`field-${key}`}>{displayName}</Label>
            <Textarea
              id={`field-${key}`}
              value={value || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={`Enter ${displayName.toLowerCase()}`}
              rows={2}
              className="mt-1"
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={key}>
            <Label htmlFor={`field-${key}`}>{displayName}</Label>
            <Textarea
              id={`field-${key}`}
              value={value || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={`Enter ${displayName.toLowerCase()}`}
              rows={Math.min(Math.max(String(value || '').split('\n').length, 4), 8)}
              className="mt-1"
            />
          </div>
        )

      case 'array':
        return (
          <div key={key}>
            <Label htmlFor={`field-${key}`}>{displayName} (comma-separated)</Label>
            <Textarea
              id={`field-${key}`}
              value={Array.isArray(value) ? value.join(', ') : ''}
              onChange={(e) => {
                const arrayValue = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                handleFieldChange(key, arrayValue)
              }}
              placeholder={`Enter ${displayName.toLowerCase()} separated by commas`}
              rows={2}
              className="mt-1"
            />
          </div>
        )

      case 'object':
        return (
          <div key={key}>
            <Label htmlFor={`field-${key}`}>{displayName} (JSON)</Label>
            <Textarea
              id={`field-${key}`}
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleFieldChange(key, parsed)
                } catch {
                  // Keep the text as is if it's not valid JSON yet
                }
              }}
              placeholder={`Enter ${displayName.toLowerCase()} as JSON`}
              rows={Math.min(Math.max(JSON.stringify(value, null, 2).split('\n').length, 3), 8)}
              className="mt-1 font-mono text-sm"
            />
          </div>
        )

      default:
        return (
          <div key={key}>
            <Label htmlFor={`field-${key}`}>{displayName}</Label>
            <Textarea
              id={`field-${key}`}
              value={String(value || '')}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={`Enter ${displayName.toLowerCase()}`}
              rows={2}
              className="mt-1"
            />
          </div>
        )
    }
  }

  const editableFields = getEditableFields(content)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('editors.generic.editContent', { agentType: agentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={editMode} onValueChange={(value) => setEditMode(value as 'structured' | 'json')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="structured" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {t('editors.generic.tabs.structured')}
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                {t('editors.generic.tabs.json')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structured" className="mt-6">
              <div className="space-y-4">
                {editableFields.length > 0 ? (
                  editableFields.map(renderFieldEditor)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('editors.generic.noEditableFields')}</p>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode('json')}
                      className="mt-2"
                    >
                      {t('editors.generic.switchToJson')}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-6">
              <div className="space-y-2">
                <Label htmlFor="json-content">{t('editors.generic.rawJsonContent')}</Label>
                <Textarea
                  id="json-content"
                  value={JSON.stringify(content, null, 2)}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder={t('editors.generic.enterValidJson')}
                />
                {jsonError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {t('editors.generic.jsonError')}: {jsonError}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}