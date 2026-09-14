import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Palette, Plus, X } from 'lucide-react';

interface VisualIdentitySectionProps {
  getFieldValue: (path: string) => any;
  updateField: (path: string, value: any) => void;
  updateArrayField: (path: string, index: number, value: string) => void;
  addArrayItem: (path: string) => void;
  removeArrayItem: (path: string, index: number) => void;
}

export function VisualIdentitySection({
  getFieldValue,
  updateField,
  updateArrayField,
  addArrayItem,
  removeArrayItem
}: VisualIdentitySectionProps) {
  const { t } = useTranslation('brand');

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
        <Palette className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">{t('guidelines.forms.visual.title')}</h3>
        <Badge variant="outline">{t('guidelines.forms.visual.badge')}</Badge>
      </div>

      <div className="space-y-4">
        {renderArrayField(
          'guidelines.visual_identity.color_palette',
          'guidelines.forms.visual.colorPalette',
          'guidelines.forms.visual.colorPalettePlaceholder'
        )}

        {renderArrayField(
          'guidelines.visual_identity.typography',
          'guidelines.forms.visual.typography',
          'guidelines.forms.visual.typographyPlaceholder'
        )}

        <div>
          <Label htmlFor="logo_guidelines">{t('guidelines.forms.visual.logoGuidelines')}</Label>
          <Textarea
            id="logo_guidelines"
            value={getFieldValue('guidelines.visual_identity.logo_guidelines')}
            onChange={(e) => updateField('guidelines.visual_identity.logo_guidelines', e.target.value)}
            placeholder={t('guidelines.forms.visual.logoGuidelinesPlaceholder')}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
