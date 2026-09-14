import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Target, TrendingUp, Users, Zap, Sparkles } from 'lucide-react';
import { usePersonas } from '@/hooks/data/usePersonas';
import { useAgentOutputs } from '@/hooks/data/useAgentOutputs';

export interface ContentPlanFormData {
  topic: string;
  durationWeeks: number;
  contentTypes: string[];
  targetAudience: string;
  primaryGoal: string;
  publicationFrequency: number;
}

interface ContentPlanViewProps {
  onSubmit: (data: ContentPlanFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<ContentPlanFormData>;
}

export function ContentPlanView({
  onSubmit,
  isLoading,
  initialValues
}: ContentPlanViewProps) {
  // Fetch cross-agent data
  const { data: personas = [] } = usePersonas({ includeArchived: false });
  const { data: allOutputs = [] } = useAgentOutputs();

  // Filter marketing strategy outputs and extract topic suggestions
  const strategyOutputs = allOutputs.filter(output => output.agent_type === 'marketing_strategy');

  // Extract meaningful topics from strategy summaries
  const topicSuggestions = strategyOutputs.map(strategy => ({
    id: strategy.id,
    label: strategy.title,
    value: strategy.summary || strategy.title // Use summary as the topic, fallback to title
  }));

  const [formData, setFormData] = useState<ContentPlanFormData>({
    topic: initialValues?.topic || '',
    durationWeeks: initialValues?.durationWeeks || 4,
    contentTypes: initialValues?.contentTypes || [],
    targetAudience: initialValues?.targetAudience || '',
    primaryGoal: initialValues?.primaryGoal || 'engagement',
    publicationFrequency: initialValues?.publicationFrequency || 3
  });

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        topic: initialValues.topic || prev.topic,
        durationWeeks: initialValues.durationWeeks || prev.durationWeeks,
        contentTypes: initialValues.contentTypes || prev.contentTypes,
        targetAudience: initialValues.targetAudience || prev.targetAudience,
        primaryGoal: initialValues.primaryGoal || prev.primaryGoal,
        publicationFrequency: initialValues.publicationFrequency || prev.publicationFrequency
      }));
    }
  }, [initialValues]);

  const availableContentTypes = [
    { id: 'blog', name: 'Blog Posts', icon: '📝' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'email', name: 'Email Campaigns', icon: '📧' },
    { id: 'video', name: 'Video Content', icon: '🎥' },
    { id: 'infographic', name: 'Infographics', icon: '📊' },
    { id: 'podcast', name: 'Podcast Episodes', icon: '🎙️' }
  ];

  const primaryGoals = [
    { value: 'awareness', label: 'Brand Awareness', description: 'Reach new audiences and build visibility' },
    { value: 'engagement', label: 'Engagement', description: 'Drive interactions and build community' },
    { value: 'conversion', label: 'Conversion', description: 'Generate leads and sales' },
    { value: 'education', label: 'Education', description: 'Inform and teach your audience' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.topic && formData.targetAudience && formData.contentTypes.length > 0) {
      onSubmit(formData);
    }
  };

  const handleContentTypeToggle = (typeId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: checked
        ? [...prev.contentTypes, typeId]
        : prev.contentTypes.filter(t => t !== typeId)
    }));
  };

  const isFormValid = formData.topic && formData.targetAudience && formData.contentTypes.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-gold" />
            Content Plan Generator
          </CardTitle>
          <CardDescription>
            Create a comprehensive content strategy with editorial calendar and publishing schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic/Theme */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Content Topic or Theme *
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
                      title={suggestion.value} // Show full summary on hover
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
              placeholder="e.g., Digital Marketing Strategies for SMEs"
              required
            />
            <div className="text-sm text-brand-slate">
              What will your content focus on?
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationWeeks" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Plan Duration: {formData.durationWeeks} weeks
            </Label>
            <input
              id="durationWeeks"
              type="range"
              min="2"
              max="8"
              value={formData.durationWeeks}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                durationWeeks: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-brand-slate">
              <span>2 weeks</span>
              <span>4 weeks (recommended)</span>
              <span>8 weeks</span>
            </div>
          </div>

          {/* Content Types */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Content Types to Include *
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableContentTypes.map((type) => (
                <div key={type.id} className="border rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={formData.contentTypes.includes(type.id)}
                      onCheckedChange={(checked) => handleContentTypeToggle(type.id, !!checked)}
                    />
                    <Label htmlFor={type.id} className="cursor-pointer font-medium flex items-center gap-2">
                      <span>{type.icon}</span>
                      {type.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {formData.contentTypes.length === 0 && (
              <div className="text-sm text-brand-gold bg-amber-50 border border-amber-200 rounded p-3">
                Please select at least one content type
              </div>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Audience *
            </Label>

            {/* Persona Quick Select */}
            {personas.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3 w-3 text-brand-gold" />
                  <span className="text-xs font-medium text-brand-charcoal dark:text-amber-400">
                    From your saved personas:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {personas.slice(0, 5).map((persona) => (
                    <Button
                      key={persona.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto py-1 px-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-amber-300 dark:hover:border-slate-700"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        targetAudience: `${persona.title} at ${persona.company_name}`
                      }))}
                    >
                      <span className="font-medium">{persona.name}</span>
                      <span className="mx-1">·</span>
                      <span className="text-muted-foreground">{persona.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., Small business owners, Marketing professionals"
              required
            />
            <div className="text-sm text-brand-slate">
              Who is this content for?
            </div>
          </div>

          {/* Primary Goal */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Primary Goal
            </Label>
            <RadioGroup
              value={formData.primaryGoal}
              onValueChange={(value) => setFormData(prev => ({ ...prev, primaryGoal: value }))}
            >
              {primaryGoals.map((goal) => (
                <div key={goal.value} className="flex items-start space-x-3 border rounded-lg p-3">
                  <RadioGroupItem value={goal.value} id={goal.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={goal.value} className="cursor-pointer font-medium">
                      {goal.label}
                    </Label>
                    <p className="text-sm text-brand-slate mt-0.5">{goal.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Publication Frequency */}
          <div className="space-y-2">
            <Label htmlFor="publicationFrequency" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Publication Frequency: {formData.publicationFrequency} posts per week
            </Label>
            <input
              id="publicationFrequency"
              type="range"
              min="1"
              max="7"
              value={formData.publicationFrequency}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                publicationFrequency: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-brand-slate">
              <span>1/week</span>
              <span>3/week (recommended)</span>
              <span>7/week (daily)</span>
            </div>
          </div>

          {/* Plan Overview */}
          {formData.contentTypes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-brand-charcoal mb-3">Plan Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-brand-charcoal font-medium">Duration:</span>{' '}
                  <span className="text-brand-charcoal">{formData.durationWeeks} weeks</span>
                </div>
                <div>
                  <span className="text-brand-charcoal font-medium">Content Types:</span>{' '}
                  <span className="text-brand-charcoal">{formData.contentTypes.length}</span>
                </div>
                <div>
                  <span className="text-brand-charcoal font-medium">Frequency:</span>{' '}
                  <span className="text-brand-charcoal">{formData.publicationFrequency}/week</span>
                </div>
                <div>
                  <span className="text-brand-charcoal font-medium">Total Posts:</span>{' '}
                  <span className="text-brand-charcoal">
                    ~{formData.publicationFrequency * formData.durationWeeks}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-brand-charcoal font-medium mb-2">Selected Content Types:</div>
                <div className="flex flex-wrap gap-2">
                  {formData.contentTypes.map(typeId => {
                    const type = availableContentTypes.find(t => t.id === typeId);
                    return (
                      <Badge key={typeId} variant="secondary">
                        {type?.icon} {type?.name}
                      </Badge>
                    );
                  })}
                </div>
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
          {isLoading ? 'Generating Plan...' : 'Generate Content Plan'}
        </Button>
      </div>
    </form>
  );
}
