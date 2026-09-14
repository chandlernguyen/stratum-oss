import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Plus, X } from 'lucide-react';

interface BrandStrategySectionProps {
  getFieldValue: (path: string) => any;
  updateField: (path: string, value: any) => void;
  updateArrayField: (path: string, index: number, value: string) => void;
  addArrayItem: (path: string) => void;
  removeArrayItem: (path: string, index: number) => void;
}

export function BrandStrategySection({
  getFieldValue,
  updateField,
  updateArrayField,
  addArrayItem,
  removeArrayItem
}: BrandStrategySectionProps) {
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
        <Eye className="h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold">{t('guidelines.forms.strategy.title')}</h3>
        <Badge variant="outline">{t('guidelines.forms.strategy.badge')}</Badge>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="mission">{t('guidelines.forms.strategy.mission')}</Label>
          <Textarea
            id="mission"
            value={getFieldValue('guidelines.brand_strategy.mission')}
            onChange={(e) => updateField('guidelines.brand_strategy.mission', e.target.value)}
            placeholder={t('guidelines.forms.strategy.missionPlaceholder')}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="vision">{t('guidelines.forms.strategy.vision')}</Label>
          <Textarea
            id="vision"
            value={getFieldValue('guidelines.brand_strategy.vision')}
            onChange={(e) => updateField('guidelines.brand_strategy.vision', e.target.value)}
            placeholder={t('guidelines.forms.strategy.visionPlaceholder')}
            rows={2}
          />
        </div>

        {renderArrayField(
          'guidelines.brand_strategy.values',
          'guidelines.forms.strategy.coreValues',
          'guidelines.forms.strategy.coreValuesPlaceholder'
        )}

        <div>
          <Label htmlFor="target_audience">{t('guidelines.forms.strategy.targetAudience')}</Label>
          <Textarea
            id="target_audience"
            value={getFieldValue('guidelines.brand_strategy.target_audience')}
            onChange={(e) => updateField('guidelines.brand_strategy.target_audience', e.target.value)}
            placeholder={t('guidelines.forms.strategy.targetAudiencePlaceholder')}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
