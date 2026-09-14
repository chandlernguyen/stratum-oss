import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Target, Plus, X } from 'lucide-react';

interface MessagingSectionProps {
  getFieldValue: (path: string) => any;
  updateField: (path: string, value: any) => void;
  updateArrayField: (path: string, index: number, value: string) => void;
  addArrayItem: (path: string) => void;
  removeArrayItem: (path: string, index: number) => void;
}

export function MessagingSection({
  getFieldValue,
  updateField,
  updateArrayField,
  addArrayItem,
  removeArrayItem
}: MessagingSectionProps) {
  const { t } = useTranslation('brand');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    key_messages: true,
    value_propositions: false,
    content_rules: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderArrayField = (path: string, labelKey: string, placeholderKey: string) => {
    const items = getFieldValue(path) as string[] || [];
    const label = t(labelKey);

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => updateArrayField(path, index, e.target.value)}
              placeholder={t(placeholderKey)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeArrayItem(path, index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addArrayItem(path)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('guidelines.forms.addItem', { item: label.toLowerCase() })}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h3 className="text-lg font-semibold">{t('guidelines.forms.messaging.title')}</h3>
        <Badge variant="secondary">{t('guidelines.forms.messaging.badge')}</Badge>
      </div>

      {/* Key Messages */}
      <Collapsible
        open={expandedSections.key_messages}
        onOpenChange={() => toggleSection('key_messages')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.key_messages ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.messaging.keyMessages')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-amber-200 dark:border-amber-800 ml-2">
          <div>
            <Label htmlFor="primary_message">{t('guidelines.forms.messaging.primaryMessage')}</Label>
            <Textarea
              id="primary_message"
              value={getFieldValue('guidelines.messaging.key_messages.primary')}
              onChange={(e) => updateField('guidelines.messaging.key_messages.primary', e.target.value)}
              placeholder={t('guidelines.forms.messaging.primaryMessagePlaceholder')}
              rows={2}
            />
          </div>

          {renderArrayField(
            'guidelines.messaging.key_messages.supporting',
            'guidelines.forms.messaging.supportingMessages',
            'guidelines.forms.messaging.supportingMessagesPlaceholder'
          )}

          <div>
            <Label htmlFor="differentiation">{t('guidelines.forms.messaging.differentiation')}</Label>
            <Textarea
              id="differentiation"
              value={getFieldValue('guidelines.messaging.key_messages.differentiation')}
              onChange={(e) => updateField('guidelines.messaging.key_messages.differentiation', e.target.value)}
              placeholder={t('guidelines.forms.messaging.differentiationPlaceholder')}
              rows={2}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Value Propositions */}
      <Collapsible
        open={expandedSections.value_propositions}
        onOpenChange={() => toggleSection('value_propositions')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.value_propositions ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.messaging.valuePropositions')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-amber-200 dark:border-amber-800 ml-2">
          <div>
            <Label htmlFor="functional">{t('guidelines.forms.messaging.functionalBenefit')}</Label>
            <Input
              id="functional"
              value={getFieldValue('guidelines.messaging.value_propositions.functional')}
              onChange={(e) => updateField('guidelines.messaging.value_propositions.functional', e.target.value)}
              placeholder={t('guidelines.forms.messaging.functionalBenefitPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="emotional">{t('guidelines.forms.messaging.emotionalBenefit')}</Label>
            <Input
              id="emotional"
              value={getFieldValue('guidelines.messaging.value_propositions.emotional')}
              onChange={(e) => updateField('guidelines.messaging.value_propositions.emotional', e.target.value)}
              placeholder={t('guidelines.forms.messaging.emotionalBenefitPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="social">{t('guidelines.forms.messaging.socialBenefit')}</Label>
            <Input
              id="social"
              value={getFieldValue('guidelines.messaging.value_propositions.social')}
              onChange={(e) => updateField('guidelines.messaging.value_propositions.social', e.target.value)}
              placeholder={t('guidelines.forms.messaging.socialBenefitPlaceholder')}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Content Rules */}
      <Collapsible
        open={expandedSections.content_rules}
        onOpenChange={() => toggleSection('content_rules')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.content_rules ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.messaging.contentRules')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-amber-200 dark:border-amber-800 ml-2">
          {renderArrayField(
            'guidelines.messaging.content_rules.always_do',
            'guidelines.forms.messaging.alwaysDo',
            'guidelines.forms.messaging.alwaysDoPlaceholder'
          )}

          {renderArrayField(
            'guidelines.messaging.content_rules.never_do',
            'guidelines.forms.messaging.neverDo',
            'guidelines.forms.messaging.neverDoPlaceholder'
          )}

          {renderArrayField(
            'guidelines.messaging.content_rules.required_elements',
            'guidelines.forms.messaging.requiredElements',
            'guidelines.forms.messaging.requiredElementsPlaceholder'
          )}

          {renderArrayField(
            'guidelines.messaging.content_rules.prohibited_words',
            'guidelines.forms.messaging.prohibitedWords',
            'guidelines.forms.messaging.prohibitedWordsPlaceholder'
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
