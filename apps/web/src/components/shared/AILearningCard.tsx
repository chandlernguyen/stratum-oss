import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Brain } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface AILearning {
  id?: string;
  title?: string; // Sometimes missing in legacy data
  content: any; // Can be string or object with business context
  source?: string;
  source_agent?: string;
  confidence?: number;
  confidence_score?: number;
  validation_status?: 'pending' | 'approved' | 'auto_approved' | 'rejected';
  fields_extracted?: number;
  duplicateCount?: number;
  created_at?: string;
}

interface AILearningCardProps {
  learning: AILearning;
  onClick?: () => void;
  showDialog?: boolean;
}

export function AILearningCard({ learning, onClick, showDialog = true }: AILearningCardProps) {
  const { t } = useTranslation('intelligence');
  const { locale } = useLocale('common');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (showDialog) {
      setIsDialogOpen(true);
    }
  };

  const getDisplayText = () => {
    // Use the title from the API if available
    if (learning.title) {
      return learning.title;
    }
    
    // Fallback to content-based display
    if (typeof learning.content === 'string') {
      return learning.content.length > 100 
        ? learning.content.substring(0, 100) + '...'
        : learning.content;
    }
    
    // For object content, try to get a meaningful summary
    if (learning.content?.company_name) {
      return `${t('aiLearning.businessContext')}: ${learning.content.company_name}`;
    }

    return t('aiLearning.aiInsight');
  };

  const getConfidence = () => {
    return learning.confidence || (learning.confidence_score ? learning.confidence_score * 100 : 0);
  };

  return (
    <>
      <div 
        className="flex items-start gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-medium break-words">
              {getDisplayText()}
            </p>
            {learning.duplicateCount && learning.duplicateCount > 1 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-gray-100 flex-shrink-0">
                {t('aiLearning.similar', { count: learning.duplicateCount })}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {learning.source || learning.source_agent || t('aiLearning.aiAgent')}
            {' • '}
            {t('aiLearning.confidence', { value: Math.round(getConfidence()) })}
            {learning.fields_extracted && ` • ${t('aiLearning.fieldsExtracted', { count: learning.fields_extracted })}`}
          </p>
        </div>
      </div>

      {/* Insight Detail Dialog */}
      {showDialog && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {learning.title || t('aiLearning.dialogTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('aiLearning.extractedFrom', { source: learning.source_agent?.replace(/_/g, ' ') || learning.source || t('aiLearning.aiAgent') })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Validation Status */}
              {learning.validation_status && (
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${
                    learning.validation_status === 'approved' 
                      ? "bg-green-100 text-green-800"
                      : learning.validation_status === 'pending'
                      ? "bg-yellow-100 text-yellow-800"
                      : learning.validation_status === 'auto_approved'
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {learning.validation_status === 'auto_approved' ? 'Auto-Approved' : learning.validation_status}
                  </Badge>
                </div>
              )}

              {/* Confidence Score */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{t('aiLearning.confidenceLabel')}:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${getConfidence()}%` }}
                    />
                  </div>
                  <span className="text-sm">{Math.round(getConfidence())}%</span>
                </div>
              </div>

              {/* Content Details */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('aiLearning.extractedBusinessContext')}:</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  {!learning.content ? (
                    <p className="text-sm text-muted-foreground">{t('aiLearning.noContent')}</p>
                  ) : typeof learning.content === 'string' ? (
                    <p className="text-sm">{learning.content}</p>
                  ) : (
                    <div className="space-y-3">
                      {getLearnedFields(learning.content).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {formatFieldName(key)}:
                          </span>
                          <span className="text-sm">
                            {formatFieldValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {learning.created_at && (
                <div className="text-xs text-muted-foreground">
                  {t('aiLearning.capturedOn', { date: new Date(learning.created_at).toLocaleString(getIntlLocale(locale)) })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Helper functions for formatting
function formatFieldName(key: string): string {
  return key
    .replace(/_learned$/, '') // Remove '_learned' suffix
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatFieldValue(value: any): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value || 'Not specified');
}

// Helper function to filter out metadata objects and extract only learned values
function getLearnedFields(content: any): [string, any][] {
  if (!content || typeof content !== 'object') {
    return [];
  }

  const entries = Object.entries(content);

  // Filter to only include learned values (ending with _learned) or non-metadata fields
  const learnedEntries = entries.filter(([key, value]) => {
    // Include fields ending with _learned
    if (key.endsWith('_learned')) {
      return true;
    }

    // Exclude metadata objects (they have user_id, confidence, learned_at, learned_by)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.includes('user_id') || keys.includes('confidence') || keys.includes('learned_by')) {
        return false; // This is metadata, skip it
      }
    }

    // Include other non-metadata fields
    return true;
  });

  return learnedEntries;
}

// Export a list component for multiple learnings
interface AILearningListProps {
  learnings: AILearning[];
  maxItems?: number;
  onItemClick?: (learning: AILearning) => void;
}

export function AILearningList({ 
  learnings, 
  maxItems = 3, 
  onItemClick 
}: AILearningListProps) {
  // Group similar insights to reduce repetition
  const groupedLearnings = groupLearnings(learnings);
  
  return (
    <div className="space-y-3">
      {groupedLearnings.slice(0, maxItems).map((learning, index) => (
        <AILearningCard 
          key={learning.id || index} 
          learning={learning}
          onClick={onItemClick ? () => onItemClick(learning) : undefined}
        />
      ))}
    </div>
  );
}

// Helper function to group similar learnings
function groupLearnings(learnings: AILearning[]): AILearning[] {
  const grouped: { [key: string]: AILearning[] } = {};
  
  learnings.forEach((learning) => {
    const key = getGroupingKey(learning);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(learning);
  });
  
  // Return the first insight from each group, with a count
  return Object.values(grouped).map(group => ({
    ...group[0],
    duplicateCount: group.length
  }));
}

function getGroupingKey(learning: AILearning): string {
  // Group by title since that's the main identifier
  if (!learning.title) {
    // Fallback for learnings without a title
    if (typeof learning.content === 'string') {
      return learning.content.substring(0, 50).toLowerCase().trim();
    }
    return JSON.stringify(learning.content || {}).substring(0, 50).toLowerCase().trim();
  }
  return learning.title.substring(0, 50).toLowerCase().trim();
}
