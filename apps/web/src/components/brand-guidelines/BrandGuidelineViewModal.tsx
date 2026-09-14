import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Megaphone, Target, Palette } from 'lucide-react';
import type { BrandGuideline } from './hooks/useBrandGuidelines';

interface BrandGuidelineViewModalProps {
  guideline: BrandGuideline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandGuidelineViewModal({
  guideline,
  open,
  onOpenChange
}: BrandGuidelineViewModalProps) {
  const { t } = useTranslation('brand');

  if (!guideline) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-gold" />
            {guideline.name || t('guidelines.untitled')}
            {!guideline.archived_at && <Badge variant="outline" className="text-brand-success border-green-600">{t('guidelines.status.active')}</Badge>}
            {guideline.is_default && <Badge variant="secondary">{t('guidelines.status.default')}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {guideline.description || t('guidelines.viewDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="brand_voice" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="brand_voice" className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                {t('guidelines.tabs.brandVoice')}
              </TabsTrigger>
              <TabsTrigger value="messaging" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('guidelines.tabs.messaging')}
              </TabsTrigger>
              <TabsTrigger value="brand_strategy" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('guidelines.tabs.strategy')}
              </TabsTrigger>
              <TabsTrigger value="visual_identity" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('guidelines.tabs.visual')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="brand_voice" className="space-y-4">
              {guideline.guidelines?.brand_voice?.tone_of_voice?.primary && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.toneOfVoice')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300 mb-2">{guideline.guidelines.brand_voice.tone_of_voice.primary}</p>
                  {guideline.guidelines.brand_voice.tone_of_voice.characteristics && (
                    <div>
                      <p className="text-sm font-medium text-brand-slate dark:text-gray-400 mb-1">{t('guidelines.view.characteristics')}:</p>
                      <div className="flex flex-wrap gap-1">
                        {guideline.guidelines.brand_voice.tone_of_voice.characteristics.map((char, i) => (
                          <Badge key={i} variant="outline">{char}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {guideline.guidelines?.brand_voice?.personality_traits?.archetype && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.personality')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300 mb-2">
                    <strong>{t('guidelines.view.archetype')}:</strong> {guideline.guidelines.brand_voice.personality_traits.archetype}
                  </p>
                  {guideline.guidelines.brand_voice.personality_traits.examples && (
                    <p className="text-brand-charcoal dark:text-gray-300">{guideline.guidelines.brand_voice.personality_traits.examples}</p>
                  )}
                </div>
              )}

              {guideline.guidelines?.brand_voice?.writing_style?.vocabulary && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.writingStyle')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300">
                    <strong>{t('guidelines.view.vocabulary')}:</strong> {guideline.guidelines.brand_voice.writing_style.vocabulary}
                  </p>
                  {guideline.guidelines.brand_voice.writing_style.perspective && (
                    <p className="text-brand-charcoal dark:text-gray-300">
                      <strong>{t('guidelines.view.perspective')}:</strong> {guideline.guidelines.brand_voice.writing_style.perspective}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messaging" className="space-y-4">
              {guideline.guidelines?.messaging?.key_messages?.primary && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.keyMessage')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300 p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
                    {guideline.guidelines.messaging.key_messages.primary}
                  </p>
                </div>
              )}

              {guideline.guidelines?.messaging?.key_messages?.supporting && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.supportingMessages')}</h4>
                  <ul className="space-y-1">
                    {guideline.guidelines.messaging.key_messages.supporting.map((msg, i) => (
                      <li key={i} className="text-brand-charcoal dark:text-gray-300 flex items-start gap-2">
                        <span className="text-brand-gold mt-1">•</span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guideline.guidelines?.messaging?.content_rules?.always_do && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.contentRules')}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-brand-success mb-2">{t('guidelines.view.alwaysDo')}:</p>
                      <ul className="space-y-1">
                        {guideline.guidelines.messaging.content_rules.always_do.map((rule, i) => (
                          <li key={i} className="text-sm text-brand-charcoal dark:text-gray-300">✓ {rule}</li>
                        ))}
                      </ul>
                    </div>
                    {guideline.guidelines.messaging.content_rules.never_do && (
                      <div>
                        <p className="text-sm font-medium text-brand-error mb-2">{t('guidelines.view.neverDo')}:</p>
                        <ul className="space-y-1">
                          {guideline.guidelines.messaging.content_rules.never_do.map((rule, i) => (
                            <li key={i} className="text-sm text-brand-charcoal dark:text-gray-300">✗ {rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="brand_strategy" className="space-y-4">
              {guideline.guidelines?.brand_strategy?.mission && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.mission')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300">{guideline.guidelines.brand_strategy.mission}</p>
                </div>
              )}

              {guideline.guidelines?.brand_strategy?.target_audience && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.targetAudience')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300">{guideline.guidelines.brand_strategy.target_audience}</p>
                </div>
              )}

              {guideline.guidelines?.brand_strategy?.values && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.values')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {guideline.guidelines.brand_strategy.values.map((value, i) => (
                      <Badge key={i} variant="secondary">{value}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visual_identity" className="space-y-4">
              {guideline.guidelines?.visual_identity?.color_palette && Array.isArray(guideline.guidelines.visual_identity.color_palette) && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.colorPalette')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {guideline.guidelines.visual_identity.color_palette.map((color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-brand-slate dark:text-gray-400">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guideline.guidelines?.visual_identity?.typography && Array.isArray(guideline.guidelines.visual_identity.typography) && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.typography')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {guideline.guidelines.visual_identity.typography.map((font, i) => (
                      <Badge key={i} variant="outline">{font}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {guideline.guidelines?.visual_identity?.logo_guidelines && (
                <div>
                  <h4 className="font-semibold text-brand-charcoal dark:text-white mb-2">{t('guidelines.view.logoGuidelines')}</h4>
                  <p className="text-brand-charcoal dark:text-gray-300">{guideline.guidelines.visual_identity.logo_guidelines}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
