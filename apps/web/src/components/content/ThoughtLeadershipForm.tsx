import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Lightbulb, Target, BookOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface ThoughtLeadershipFormData {
  topic: string;
  expertise: string;
  seriesTitle?: string;
  numberOfParts: number;
  format: 'article-series' | 'whitepaper' | 'research-report' | 'opinion-piece';
  targetOutcome: string;
  keyInsights: string[];
  dataPoints: string[];
  includeVisuals: boolean;
  includeQuotes: boolean;
  callToAction: string;
}

interface ThoughtLeadershipFormProps {
  onSubmit: (data: ThoughtLeadershipFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<ThoughtLeadershipFormData>;
  suggestedTopics?: string[];
  expertiseAreas?: string[];
}

export function ThoughtLeadershipForm({
  onSubmit,
  isLoading,
  initialValues,
  suggestedTopics = [],
  expertiseAreas = []
}: ThoughtLeadershipFormProps) {
  const [formData, setFormData] = useState<ThoughtLeadershipFormData>({
    topic: initialValues?.topic || '',
    expertise: initialValues?.expertise || '',
    seriesTitle: initialValues?.seriesTitle || '',
    numberOfParts: initialValues?.numberOfParts || 1,
    format: initialValues?.format || 'article-series',
    targetOutcome: initialValues?.targetOutcome || '',
    keyInsights: initialValues?.keyInsights || [],
    dataPoints: initialValues?.dataPoints || [],
    includeVisuals: initialValues?.includeVisuals ?? true,
    includeQuotes: initialValues?.includeQuotes ?? true,
    callToAction: initialValues?.callToAction || ''
  });

  const [newInsight, setNewInsight] = useState('');
  const [newDataPoint, setNewDataPoint] = useState('');

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        topic: initialValues.topic || prev.topic,
        expertise: initialValues.expertise || prev.expertise,
        seriesTitle: initialValues.seriesTitle || prev.seriesTitle,
        numberOfParts: initialValues.numberOfParts || prev.numberOfParts,
        format: initialValues.format || prev.format,
        targetOutcome: initialValues.targetOutcome || prev.targetOutcome,
        keyInsights: initialValues.keyInsights || prev.keyInsights,
        dataPoints: initialValues.dataPoints || prev.dataPoints,
        includeVisuals: initialValues.includeVisuals ?? prev.includeVisuals,
        includeQuotes: initialValues.includeQuotes ?? prev.includeQuotes,
        callToAction: initialValues.callToAction || prev.callToAction
      }));
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addInsight = () => {
    if (newInsight.trim()) {
      setFormData(prev => ({
        ...prev,
        keyInsights: [...prev.keyInsights, newInsight.trim()]
      }));
      setNewInsight('');
    }
  };

  const removeInsight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyInsights: prev.keyInsights.filter((_, i) => i !== index)
    }));
  };

  const addDataPoint = () => {
    if (newDataPoint.trim()) {
      setFormData(prev => ({
        ...prev,
        dataPoints: [...prev.dataPoints, newDataPoint.trim()]
      }));
      setNewDataPoint('');
    }
  };

  const removeDataPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dataPoints: prev.dataPoints.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-gold" />
            Thought Leadership Configuration
          </CardTitle>
          <CardDescription>
            Create authoritative content that establishes your expertise and influences industry conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic and Expertise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Leadership Topic *</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., The Future of AI in Healthcare"
                required
              />
              {suggestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedTopics.slice(0, 3).map((topic, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setFormData(prev => ({ ...prev, topic }))}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expertise">Your Expertise Area *</Label>
              <Input
                id="expertise"
                value={formData.expertise}
                onChange={(e) => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                placeholder="e.g., Digital Transformation Expert"
                required
              />
              {expertiseAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {expertiseAreas.slice(0, 3).map((area, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setFormData(prev => ({ ...prev, expertise: area }))}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Format and Series */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Content Format *</Label>
              <Select
                value={formData.format}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, format: value as ThoughtLeadershipFormData['format'] }))
                }
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article-series">Article Series</SelectItem>
                  <SelectItem value="whitepaper">Whitepaper</SelectItem>
                  <SelectItem value="research-report">Research Report</SelectItem>
                  <SelectItem value="opinion-piece">Opinion Piece</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfParts">Number of Parts</Label>
              <Input
                id="numberOfParts"
                type="number"
                min="1"
                max="10"
                value={formData.numberOfParts}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  numberOfParts: parseInt(e.target.value) || 1
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seriesTitle">Series Title (Optional)</Label>
              <Input
                id="seriesTitle"
                value={formData.seriesTitle || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, seriesTitle: e.target.value }))}
                placeholder="e.g., Innovation Insights"
              />
            </div>
          </div>

          {/* Target Outcome */}
          <div className="space-y-2">
            <Label htmlFor="targetOutcome" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Outcome *
            </Label>
            <Textarea
              id="targetOutcome"
              value={formData.targetOutcome}
              onChange={(e) => setFormData(prev => ({ ...prev, targetOutcome: e.target.value }))}
              placeholder="What do you want readers to think, feel, or do after reading this content?"
              rows={3}
              required
            />
          </div>

          {/* Key Insights */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Key Insights to Share
            </Label>
            <div className="flex gap-2">
              <Input
                value={newInsight}
                onChange={(e) => setNewInsight(e.target.value)}
                placeholder="Add a key insight or perspective"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInsight())}
                className="min-h-12 md:min-h-10"
              />
              <Button type="button" onClick={addInsight} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.keyInsights.map((insight, i) => (
                <Badge key={i} className="flex items-center gap-1">
                  {insight}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeInsight(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Data Points */}
          <div className="space-y-2">
            <Label>Supporting Data & Statistics</Label>
            <div className="flex gap-2">
              <Input
                value={newDataPoint}
                onChange={(e) => setNewDataPoint(e.target.value)}
                placeholder="Add a data point or statistic"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDataPoint())}
                className="min-h-12 md:min-h-10"
              />
              <Button type="button" onClick={addDataPoint} size="icon" variant="secondary" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.dataPoints.map((point, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  {point}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeDataPoint(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeVisuals" className="cursor-pointer">
                Include Visual Recommendations
              </Label>
              <Switch
                id="includeVisuals"
                checked={formData.includeVisuals}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, includeVisuals: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeQuotes" className="cursor-pointer">
                Include Expert Quotes
              </Label>
              <Switch
                id="includeQuotes"
                checked={formData.includeQuotes}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, includeQuotes: checked }))
                }
              />
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-2">
            <Label htmlFor="callToAction">Call to Action *</Label>
            <Input
              id="callToAction"
              value={formData.callToAction}
              onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
              placeholder="e.g., Download our framework, Schedule a consultation"
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="w-full md:w-auto min-h-12 md:min-h-11">
          {isLoading ? 'Generating...' : 'Generate Thought Leadership Content'}
        </Button>
      </div>
    </form>
  );
}