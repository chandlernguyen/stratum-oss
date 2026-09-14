import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Brain,
  Building2,
  Users,
  Target,
  TrendingUp,
  X,
  Check,
  Edit3,
  AlertCircle
} from 'lucide-react'

interface ExtractedContext {
  id: string
  agent_type: string
  extracted_context: {
    companyName?: string
    industry?: string
    companySize?: string
    targetMarket?: string
    competitors?: string[]
    priceRange?: string
    businessModel?: string
    uniqueValue?: string
    [key: string]: any
  }
  confidence_score: number
  created_at: string
}

interface ContextConfirmationProps {
  extractedContext: ExtractedContext
  onApprove: (historyId: string, editedContext?: any) => void
  onReject: (historyId: string) => void
  onClose: () => void
}

export function ContextConfirmation({
  extractedContext,
  onApprove,
  onReject,
  onClose
}: ContextConfirmationProps) {
  const { t } = useTranslation(['agents'])
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(extractedContext.extracted_context)
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await onApprove(extractedContext.id, isEditing ? editedData : undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await onReject(extractedContext.id)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatFieldName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }

  const renderField = (key: string, value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null

    const icon = {
      companyName: <Building2 className="w-4 h-4" />,
      industry: <TrendingUp className="w-4 h-4" />,
      companySize: <Users className="w-4 h-4" />,
      targetMarket: <Target className="w-4 h-4" />
    }[key] || <AlertCircle className="w-4 h-4" />

    if (isEditing) {
      if (Array.isArray(value)) {
        return (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              {icon}
              {formatFieldName(key)}
            </label>
            <Input
              value={value.join(', ')}
              onChange={(e) => setEditedData({
                ...editedData,
                [key]: e.target.value.split(', ').filter(item => item.trim())
              })}
              placeholder={t('agents:context.confirmation.placeholder')}
            />
          </div>
        )
      }

      if (key === 'uniqueValue' || key === 'businessModel') {
        return (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              {icon}
              {formatFieldName(key)}
            </label>
            <Textarea
              value={value}
              onChange={(e) => setEditedData({ ...editedData, [key]: e.target.value })}
              rows={2}
            />
          </div>
        )
      }

      return (
        <div key={key} className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            {icon}
            {formatFieldName(key)}
          </label>
          <Input
            value={value}
            onChange={(e) => setEditedData({ ...editedData, [key]: e.target.value })}
          />
        </div>
      )
    }

    // Display mode
    return (
      <div key={key} className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <div className="font-medium text-sm">{formatFieldName(key)}</div>
          <div className="text-sm text-gray-600">
            {Array.isArray(value) ? value.join(', ') : value}
          </div>
        </div>
      </div>
    )
  }

  const contextEntries = Object.entries(extractedContext.extracted_context)
    .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">{t('agents:context.confirmation.title')}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Badge className={`${getConfidenceColor(extractedContext.confidence_score)}`}>
              {Math.round(extractedContext.confidence_score * 100)}% {t('agents:context.confirmation.confidence')}
            </Badge>
            <div className="text-sm text-gray-500">
              {t('agents:context.confirmation.from', { agentType: extractedContext.agent_type })}
            </div>
          </div>

          <CardDescription>
            {t('agents:context.confirmation.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 max-h-[50vh] overflow-y-auto">
          {contextEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('agents:context.confirmation.noContext')}
            </div>
          ) : (
            <div className="space-y-4">
              {contextEntries.map(([key, value]) => renderField(key, value))}
            </div>
          )}
        </CardContent>

        <div className="p-6 border-t bg-gray-50 space-y-4">
          {!isEditing && contextEntries.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full"
              disabled={loading}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('agents:context.confirmation.actions.editBefore')}
            </Button>
          )}

          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditedData(extractedContext.extracted_context)
                }}
                disabled={loading}
              >
                {t('agents:context.confirmation.actions.cancelEdit')}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                {t('agents:context.confirmation.actions.doneEditing')}
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              {t('agents:context.confirmation.actions.dontSave')}
            </Button>

            <Button
              onClick={handleApprove}
              disabled={loading || contextEntries.length === 0}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              {loading ? t('agents:context.confirmation.actions.saving') : t('agents:context.confirmation.actions.saveAll')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}