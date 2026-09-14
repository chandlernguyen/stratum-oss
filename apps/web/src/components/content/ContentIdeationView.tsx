import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Target, Sparkles, Hash, FileText } from 'lucide-react';
import { useAgentOutputs } from '@/hooks/data/useAgentOutputs';

export interface ContentIdeationFormData {
  topic: string;
  count: number;
  contentFormats: string[];
  includeKeywords: boolean;
  includeOutlines: boolean;
}

interface ContentIdeationViewProps {
  onSubmit: (data: ContentIdeationFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<ContentIdeationFormData>;
}

export function ContentIdeationView({
  onSubmit,
  isLoading,
  initialValues
}: ContentIdeationViewProps) {
  // Fetch cross-agent data for topic suggestions
  const { data: allOutputs = [] } = useAgentOutputs();

  // Filter marketing strategy outputs for topic suggestions
  const strategyOutputs = allOutputs.filter(output => output.agent_type === 'marketing_strategy');

  const topicSuggestions = strategyOutputs.map(strategy => ({
    id: strategy.id,
    label: strategy.title,
    value: strategy.summary || strategy.title
  }));

  const [formData, setFormData] = useState<ContentIdeationFormData>({
    topic: initialValues?.topic || '',
    count: initialValues?.count || 5,
    contentFormats: initialValues?.contentFormats || [],
    includeKeywords: initialValues?.includeKeywords || false,
    includeOutlines: initialValues?.includeOutlines || false
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        topic: initialValues.topic || prev.topic,
        count: initialValues.count || prev.count,
        contentFormats: initialValues.contentFormats || prev.contentFormats,
        includeKeywords: initialValues.includeKeywords !== undefined ? initialValues.includeKeywords : prev.includeKeywords,
        includeOutlines: initialValues.includeOutlines !== undefined ? initialValues.includeOutlines : prev.includeOutlines
      }));
    }
  }, [initialValues]);

  const availableFormats = [
    { id: 'blog', name: 'Blog Posts', icon: '📝' },
    { id: 'video', name: 'Video Content', icon: '🎥' },
    { id: 'infographic', name: 'Infographics', icon: '📊' },
    { id: 'podcast', name: 'Podcast Episodes', icon: '🎙️' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'email', name: 'Email Content', icon: '📧' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.topic && formData.contentFormats.length > 0) {
      onSubmit(formData);
    }
  };

  const handleFormatToggle = (formatId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      contentFormats: checked
        ? [...prev.contentFormats, formatId]
        : prev.contentFormats.filter(f => f !== formatId)
    }));
  };

  const isFormValid = formData.topic && formData.contentFormats.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-gold" />
            Content Ideation Generator
          </CardTitle>
          <CardDescription>
            Generate creative content ideas based on trends and audience interests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic/Area */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Topic or Area *
            </Label>

            {/* Strategy Topic Quick Select */}
            {topicSuggestions.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3 w-3 text-brand-gold" />
                  <span className="text-xs font-medium text-brand-charcoal dark:text-amber-400">
                    From your marketing strategies:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topicSuggestions.slice(0, 3).map((suggestion) => (
                    <Button
                      key={suggestion.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto py-1 px-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-amber-300 dark:hover:border-slate-700"
                      onClick={() => setFormData(prev => ({ ...prev, topic: suggestion.value }))}
                      title={suggestion.value}
                    >
                      📋 {suggestion.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., AI in Marketing, Sustainable Manufacturing"
              required
            />
            <div className="text-sm text-brand-slate">
              What topic do you need content ideas for?
            </div>
          </div>

          {/* Number of Ideas */}
          <div className="space-y-2">
            <Label htmlFor="count" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Number of Ideas: {formData.count}
            </Label>
            <input
              id="count"
              type="range"
              min="3"
              max="10"
              value={formData.count}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                count: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-brand-slate">
              <span>3 ideas</span>
              <span>5 ideas (recommended)</span>
              <span>10 ideas</span>
            </div>
          </div>

          {/* Content Formats */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preferred Content Formats *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableFormats.map((format) => (
                <div key={format.id} className="border rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={format.id}
                      checked={formData.contentFormats.includes(format.id)}
                      onCheckedChange={(checked) => handleFormatToggle(format.id, !!checked)}
                    />
                    <Label htmlFor={format.id} className="cursor-pointer font-medium flex items-center gap-2">
                      <span>{format.icon}</span>
                      {format.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {formData.contentFormats.length === 0 && (
              <div className="text-sm text-brand-gold bg-amber-50 border border-amber-200 rounded p-3">
                Please select at least one content format
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Additional Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeKeywords"
                checked={formData.includeKeywords}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  includeKeywords: !!checked
                }))}
              />
              <Label
                htmlFor="includeKeywords"
                className="cursor-pointer text-sm font-normal"
              >
                Include SEO keywords for each idea
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeOutlines"
                checked={formData.includeOutlines}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  includeOutlines: !!checked
                }))}
              />
              <Label
                htmlFor="includeOutlines"
                className="cursor-pointer text-sm font-normal"
              >
                Include brief outlines for each piece
              </Label>
            </div>
          </div>

          {/* Preview Summary */}
          {formData.contentFormats.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-brand-charcoal mb-2">Ideation Summary</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-brand-charcoal font-medium">Ideas:</span>{' '}
                  <span className="text-brand-charcoal">{formData.count} creative concepts</span>
                </div>
                <div>
                  <span className="text-brand-charcoal font-medium">Formats:</span>{' '}
                  <span className="text-brand-charcoal">{formData.contentFormats.length} selected</span>
                </div>
                {formData.includeKeywords && (
                  <div className="text-brand-charcoal text-xs">✓ SEO keywords included</div>
                )}
                {formData.includeOutlines && (
                  <div className="text-brand-charcoal text-xs">✓ Content outlines included</div>
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
          {isLoading ? 'Generating Ideas...' : 'Generate Content Ideas'}
        </Button>
      </div>
    </form>
  );
}
