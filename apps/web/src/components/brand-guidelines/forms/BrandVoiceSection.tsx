import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Megaphone, Plus, X } from 'lucide-react';

interface BrandVoiceSectionProps {
  getFieldValue: (path: string) => any;
  updateField: (path: string, value: any) => void;
  updateArrayField: (path: string, index: number, value: string) => void;
  addArrayItem: (path: string) => void;
  removeArrayItem: (path: string, index: number) => void;
}

export function BrandVoiceSection({
  getFieldValue,
  updateField,
  updateArrayField,
  addArrayItem,
  removeArrayItem
}: BrandVoiceSectionProps) {
  const { t } = useTranslation('brand');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tone_of_voice: true,
    personality_traits: false,
    writing_style: false,
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
        <Megaphone className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold">{t('guidelines.forms.voice.title')}</h3>
        <Badge variant="secondary">{t('guidelines.forms.voice.badge')}</Badge>
      </div>

      {/* Tone of Voice */}
      <Collapsible
        open={expandedSections.tone_of_voice}
        onOpenChange={() => toggleSection('tone_of_voice')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.tone_of_voice ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.voice.toneOfVoice')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-slate-200 ml-2">
          <div>
            <Label htmlFor="primary_tone">{t('guidelines.forms.voice.primaryTone')}</Label>
            <Input
              id="primary_tone"
              value={getFieldValue('guidelines.brand_voice.tone_of_voice.primary')}
              onChange={(e) => updateField('guidelines.brand_voice.tone_of_voice.primary', e.target.value)}
              placeholder={t('guidelines.forms.voice.primaryTonePlaceholder')}
            />
          </div>

          {renderArrayField(
            'guidelines.brand_voice.tone_of_voice.characteristics',
            'guidelines.forms.voice.characteristics',
            'guidelines.forms.voice.characteristicsPlaceholder'
          )}

          {renderArrayField(
            'guidelines.brand_voice.tone_of_voice.avoid',
            'guidelines.forms.voice.avoid',
            'guidelines.forms.voice.avoidPlaceholder'
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Personality Traits */}
      <Collapsible
        open={expandedSections.personality_traits}
        onOpenChange={() => toggleSection('personality_traits')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.personality_traits ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.voice.personalityTraits')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-slate-200 ml-2">
          <div>
            <Label htmlFor="archetype">{t('guidelines.forms.voice.archetype')}</Label>
            <Input
              id="archetype"
              value={getFieldValue('guidelines.brand_voice.personality_traits.archetype')}
              onChange={(e) => updateField('guidelines.brand_voice.personality_traits.archetype', e.target.value)}
              placeholder={t('guidelines.forms.voice.archetypePlaceholder')}
            />
          </div>

          {renderArrayField(
            'guidelines.brand_voice.personality_traits.attributes',
            'guidelines.forms.voice.attributes',
            'guidelines.forms.voice.attributesPlaceholder'
          )}

          <div>
            <Label htmlFor="personality_examples">{t('guidelines.forms.voice.examples')}</Label>
            <Textarea
              id="personality_examples"
              value={getFieldValue('guidelines.brand_voice.personality_traits.examples')}
              onChange={(e) => updateField('guidelines.brand_voice.personality_traits.examples', e.target.value)}
              placeholder={t('guidelines.forms.voice.examplesPlaceholder')}
              rows={3}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Writing Style */}
      <Collapsible
        open={expandedSections.writing_style}
        onOpenChange={() => toggleSection('writing_style')}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-left w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          {expandedSections.writing_style ?
            <ChevronDown className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />
          }
          <h4 className="font-medium">{t('guidelines.forms.voice.writingStyle')}</h4>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4 border-l-2 border-slate-200 ml-2">
          <div>
            <Label htmlFor="sentence_length">{t('guidelines.forms.voice.sentenceLength')}</Label>
            <Input
              id="sentence_length"
              value={getFieldValue('guidelines.brand_voice.writing_style.sentence_length')}
              onChange={(e) => updateField('guidelines.brand_voice.writing_style.sentence_length', e.target.value)}
              placeholder={t('guidelines.forms.voice.sentenceLengthPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="vocabulary">{t('guidelines.forms.voice.vocabulary')}</Label>
            <Input
              id="vocabulary"
              value={getFieldValue('guidelines.brand_voice.writing_style.vocabulary')}
              onChange={(e) => updateField('guidelines.brand_voice.writing_style.vocabulary', e.target.value)}
              placeholder={t('guidelines.forms.voice.vocabularyPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="perspective">{t('guidelines.forms.voice.perspective')}</Label>
            <Input
              id="perspective"
              value={getFieldValue('guidelines.brand_voice.writing_style.perspective')}
              onChange={(e) => updateField('guidelines.brand_voice.writing_style.perspective', e.target.value)}
              placeholder={t('guidelines.forms.voice.perspectivePlaceholder')}
            />
          </div>

          {renderArrayField(
            'guidelines.brand_voice.writing_style.formatting',
            'guidelines.forms.voice.preferredFormatting',
            'guidelines.forms.voice.preferredFormattingPlaceholder'
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
