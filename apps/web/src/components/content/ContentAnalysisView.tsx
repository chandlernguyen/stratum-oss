import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileSearch, BarChart3, TrendingUp, CheckSquare } from 'lucide-react';

export interface ContentAnalysisFormData {
  analysisType: string;
  timeframe: string;
  focusAreas: string[];
  includeRecommendations: boolean;
}

interface ContentAnalysisViewProps {
  onSubmit: (data: ContentAnalysisFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<ContentAnalysisFormData>;
}

export function ContentAnalysisView({
  onSubmit,
  isLoading,
  initialValues
}: ContentAnalysisViewProps) {
  const [formData, setFormData] = useState<ContentAnalysisFormData>({
    analysisType: initialValues?.analysisType || 'gaps',
    timeframe: initialValues?.timeframe || 'last-quarter',
    focusAreas: initialValues?.focusAreas || [],
    includeRecommendations: initialValues?.includeRecommendations !== undefined ? initialValues.includeRecommendations : true
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        analysisType: initialValues.analysisType || prev.analysisType,
        timeframe: initialValues.timeframe || prev.timeframe,
        focusAreas: initialValues.focusAreas || prev.focusAreas,
        includeRecommendations: initialValues.includeRecommendations !== undefined ? initialValues.includeRecommendations : prev.includeRecommendations
      }));
    }
  }, [initialValues]);

  const analysisTypes = [
    { value: 'gaps', label: 'Content Gaps', description: 'Identify missing topics and opportunities' },
    { value: 'opportunities', label: 'New Opportunities', description: 'Discover trending topics and emerging needs' },
    { value: 'performance', label: 'Performance Analysis', description: 'Evaluate existing content effectiveness' },
    { value: 'competitors', label: 'Competitive Analysis', description: 'Compare against competitor content' }
  ];

  const timeframes = [
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-quarter', label: 'Last Quarter (3 months)' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'all-time', label: 'All Time' }
  ];

  const focusAreaOptions = [
    { id: 'topics', name: 'Topics & Themes', icon: '📚' },
    { id: 'channels', name: 'Distribution Channels', icon: '📡' },
    { id: 'formats', name: 'Content Formats', icon: '🎨' },
    { id: 'audience', name: 'Audience Segments', icon: '👥' },
    { id: 'seo', name: 'SEO Performance', icon: '🔍' },
    { id: 'engagement', name: 'Engagement Metrics', icon: '💬' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.focusAreas.length > 0) {
      onSubmit(formData);
    }
  };

  const handleFocusAreaToggle = (areaId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: checked
        ? [...prev.focusAreas, areaId]
        : prev.focusAreas.filter(a => a !== areaId)
    }));
  };

  const isFormValid = formData.focusAreas.length > 0;
  const selectedAnalysisType = analysisTypes.find(t => t.value === formData.analysisType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-amber-600" />
            Content Needs Analyzer
          </CardTitle>
          <CardDescription>
            Identify gaps in your content strategy and get actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analysis Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analysis Type
            </Label>
            <RadioGroup
              value={formData.analysisType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, analysisType: value }))}
            >
              {analysisTypes.map((type) => (
                <div key={type.value} className="flex items-start space-x-3 border rounded-lg p-3">
                  <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="cursor-pointer font-medium">
                      {type.label}
                    </Label>
                    <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Timeframe */}
          <div className="space-y-2">
            <Label htmlFor="timeframe" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analysis Timeframe
            </Label>
            <Select
              value={formData.timeframe}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timeframe: value }))}
            >
              <SelectTrigger id="timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-500">
              Analyze content performance over this period
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Focus Areas *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {focusAreaOptions.map((area) => (
                <div key={area.id} className="border rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={area.id}
                      checked={formData.focusAreas.includes(area.id)}
                      onCheckedChange={(checked) => handleFocusAreaToggle(area.id, !!checked)}
                    />
                    <Label htmlFor={area.id} className="cursor-pointer font-medium flex items-center gap-2">
                      <span>{area.icon}</span>
                      {area.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {formData.focusAreas.length === 0 && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                Please select at least one focus area
              </div>
            )}
          </div>

          {/* Include Recommendations */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeRecommendations"
                checked={formData.includeRecommendations}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  includeRecommendations: !!checked
                }))}
              />
              <Label
                htmlFor="includeRecommendations"
                className="cursor-pointer text-sm font-normal"
              >
                Include actionable recommendations and next steps
              </Label>
            </div>
          </div>

          {/* Analysis Summary */}
          {formData.focusAreas.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">Analysis Summary</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-slate-700 font-medium">Type:</span>{' '}
                  <span className="text-slate-800">{selectedAnalysisType?.label}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-medium">Timeframe:</span>{' '}
                  <span className="text-slate-800">
                    {timeframes.find(t => t.value === formData.timeframe)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-700 font-medium">Focus Areas:</span>{' '}
                  <span className="text-slate-800">{formData.focusAreas.length} selected</span>
                </div>
                {formData.includeRecommendations && (
                  <div className="text-slate-700 text-xs">✓ Action recommendations included</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          size="lg"
        >
          {isLoading ? 'Analyzing Content...' : 'Analyze Content Strategy'}
        </Button>
      </div>
    </form>
  );
}
