import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SaveIcon, CheckIcon, TagIcon, EyeIcon } from 'lucide-react'
import type { AgentType, Message } from '@/types/agents'
import { useSaveOutput } from '@/hooks/data/useAgentOutputs'
import { getIntlLocale } from '@/lib/locales'

interface SaveOutputDialogProps {
  message: Message;
  agentType: AgentType;
  onSave?: () => void;
  trigger?: React.ReactNode;
}

export function SaveOutputDialog({
  message,
  agentType,
  onSave,
  trigger
}: SaveOutputDialogProps) {
  const { t, i18n } = useTranslation(['common']);
  const intlLocale = getIntlLocale(i18n.language);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([agentType]);
  const [tagInput, setTagInput] = useState('');
  const [saved, setSaved] = useState(false);

  // Use the save output mutation hook
  const saveOutputMutation = useSaveOutput();

  // Suggested tags based on agent type
  const suggestedTags: Record<AgentType, string[]> = {
    strategy: ['analysis', 'growth', 'market', 'competitive', 'swot', 'framework'],
    persona: ['customer', 'demographics', 'behavior', 'journey', 'segment'],
    marketing_strategy: ['messaging', 'positioning', 'channels', 'budget', 'go-to-market'],
    content: ['calendar', 'campaign', 'creative', 'messaging', 'channels'],
    analytics: ['performance', 'metrics', 'insights', 'optimization', 'trends'],
    roi_budget: ['roi', 'budget', 'cost', 'revenue', 'efficiency', 'allocation'],
    campaign_planning: ['launch', 'execution', 'deployment', 'testing', 'channels'],
    competitive_intelligence: ['competitors', 'market', 'positioning', 'threats', 'opportunities'],
    client_success: ['retention', 'satisfaction', 'health', 'relationships', 'success'],
    quick_wins: ['immediate', 'impact', 'quick', 'actionable', 'improvements'],
    performance_intelligence: ['kpis', 'benchmarks', 'attribution', 'reporting', 'intelligence'],
    quick_start: ['onboarding', 'setup', 'foundation', 'comprehensive', 'intelligence']
  };

  // Auto-generate title based on content
  useEffect(() => {
    if (open && !title) {
      const contentPreview = message.text.substring(0, 100);
      let autoTitle = '';
      
      if (contentPreview.toLowerCase().includes('strategy')) {
        autoTitle = 'Strategic Analysis';
      } else if (contentPreview.toLowerCase().includes('persona')) {
        autoTitle = 'Customer Persona';
      } else if (contentPreview.toLowerCase().includes('content')) {
        autoTitle = 'Content Strategy';
      } else if (contentPreview.toLowerCase().includes('analytic')) {
        autoTitle = 'Performance Analysis';
      } else {
        autoTitle = `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Output`;
      }
      
      setTitle(`${autoTitle} - ${new Date().toLocaleDateString(intlLocale)}`);
    }
  }, [open, title, message.text, agentType, intlLocale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (open) {
        if (e.key === 'Escape') {
          setOpen(false);
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open]);

  const handleSave = async () => {
    if (saveOutputMutation.isPending || !title.trim()) return;

    try {
      await saveOutputMutation.mutateAsync({
        agent_type: agentType,
        output_type: 'message',
        title: title.trim(),
        content: { text: message.text },
        session_id: message.id,
        metadata: { tags: tags.filter(tag => tag.trim().length > 0) }
      });

      setSaved(true);
      setOpen(false);
      onSave?.();

      // Reset form
      setTimeout(() => {
        setSaved(false);
        setTitle('');
        setTags([agentType]);
        setTagInput('');
      }, 2000);
    } catch (error) {
      console.error('Error saveOutputMutation.isPending output:', error);
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addSuggestedTag = (tag: string) => {
    addTag(tag);
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = getWordCount(text);
    return Math.ceil(words / wordsPerMinute);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={saved}
          className="ml-2"
          title={t('saveOutputDialog.saveWithDetails')}
        >
          {saved ? (
            <>
              <CheckIcon className="h-4 w-4 mr-1" />
              {t('quickSave.saved')}
            </>
          ) : (
            <>
              <SaveIcon className="h-4 w-4 mr-1" />
              {t('buttons.save')}
            </>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SaveIcon className="h-5 w-5" />
              {t('saveOutputDialog.title', { agentType: agentType.charAt(0).toUpperCase() + agentType.slice(1) })}
            </DialogTitle>
            <DialogDescription>
              {t('saveOutputDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title Input */}
            <div>
              <Label htmlFor="title">{t('saveOutputDialog.titleLabel')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('saveOutputDialog.titlePlaceholder', { agentType, date: new Date().toLocaleDateString(intlLocale) })}
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && !tagInput && handleSave()}
              />
            </div>

            {/* Tags Section */}
            <div>
              <Label htmlFor="tags" className="flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                {t('labels.tags')}
              </Label>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder={t('saveOutputDialog.tagsPlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addTag(tagInput)}
                    variant="outline"
                    type="button"
                    disabled={!tagInput.trim()}
                  >
                    {t('buttons.add')}
                  </Button>
                </div>

                {/* Current Tags */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} x
                    </Badge>
                  ))}
                </div>

                {/* Suggested Tags */}
                <div>
                  <Label className="text-sm text-gray-600">{t('saveOutputDialog.suggestedTags')}</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {suggestedTags[agentType]
                      .filter(tag => !tags.includes(tag))
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50"
                          onClick={() => addSuggestedTag(tag)}
                        >
                          + {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div>
              <Label className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                {t('saveOutputDialog.contentPreview')}
              </Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                <div className="text-sm text-gray-600 mb-2 flex gap-4">
                  <span>{t('saveOutputDialog.words', { count: getWordCount(message.text) })}</span>
                  <span>{t('saveOutputDialog.minRead', { count: getReadingTime(message.text) })}</span>
                  <span>{t('saveOutputDialog.outputType', { agentType })}</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-sm">
                  {message.text.length > 300
                    ? `${message.text.substring(0, 300)}...`
                    : message.text
                  }
                </div>
              </div>
            </div>

            {/* Structured Data Preview (if available) */}
            {message.structured_data && (
              <div>
                <Label>{t('saveOutputDialog.structuredData')}</Label>
                <div className="mt-1 p-2 bg-blue-50 rounded text-xs">
                  {t('saveOutputDialog.structuredDataHint')}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              {t('saveOutputDialog.keyboardHint')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveOutputMutation.isPending || !title.trim()}
                className="min-w-20"
              >
                {saveOutputMutation.isPending ? t('quickSave.saving') : t('saveOutputDialog.saveOutput')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
