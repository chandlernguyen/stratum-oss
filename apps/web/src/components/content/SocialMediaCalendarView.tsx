import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Calendar, Hash, Share2, BarChart3 } from 'lucide-react';

export interface SocialMediaCalendarData {
  durationWeeks: number;
  platforms: string[];
  contentThemes: string[];
  postingFrequency: Record<string, number>;
}

interface SocialMediaCalendarViewProps {
  onSubmit: (data: SocialMediaCalendarData) => void;
  isLoading?: boolean;
  initialValues?: Partial<SocialMediaCalendarData>;
  suggestedThemes?: string[];
}

export function SocialMediaCalendarView({
  onSubmit,
  isLoading,
  initialValues,
  suggestedThemes = []
}: SocialMediaCalendarViewProps) {
  const [formData, setFormData] = useState<SocialMediaCalendarData>({
    durationWeeks: initialValues?.durationWeeks || 4,
    platforms: initialValues?.platforms || [],
    contentThemes: initialValues?.contentThemes || [],
    postingFrequency: initialValues?.postingFrequency || {}
  });

  const [newTheme, setNewTheme] = useState('');

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        durationWeeks: initialValues.durationWeeks || prev.durationWeeks,
        platforms: initialValues.platforms || prev.platforms,
        contentThemes: initialValues.contentThemes || prev.contentThemes,
        postingFrequency: initialValues.postingFrequency || prev.postingFrequency
      }));
    }
  }, [initialValues]);

  const availablePlatforms = [
    { id: 'linkedin', name: 'LinkedIn', defaultFrequency: 5, color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter/X', defaultFrequency: 7, color: 'bg-black' },
    { id: 'facebook', name: 'Facebook', defaultFrequency: 3, color: 'bg-blue-500' },
    { id: 'instagram', name: 'Instagram', defaultFrequency: 4, color: 'bg-pink-500' },
    { id: 'youtube', name: 'YouTube', defaultFrequency: 1, color: 'bg-red-600' },
    { id: 'tiktok', name: 'TikTok', defaultFrequency: 3, color: 'bg-gray-800' }
  ];

  const defaultThemes = [
    'Industry insights and trends',
    'Behind-the-scenes content',
    'Customer success stories',
    'Educational how-to content',
    'Product updates and features',
    'Team and company culture',
    'User-generated content',
    'Thought leadership posts'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    const platform = availablePlatforms.find(p => p.id === platformId);

    if (checked && platform) {
      setFormData(prev => ({
        ...prev,
        platforms: [...prev.platforms, platformId],
        postingFrequency: {
          ...prev.postingFrequency,
          [platformId]: platform.defaultFrequency
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        platforms: prev.platforms.filter(p => p !== platformId),
        postingFrequency: Object.fromEntries(
          Object.entries(prev.postingFrequency).filter(([key]) => key !== platformId)
        )
      }));
    }
  };

  const handleFrequencyChange = (platform: string, frequency: number) => {
    setFormData(prev => ({
      ...prev,
      postingFrequency: {
        ...prev.postingFrequency,
        [platform]: frequency
      }
    }));
  };

  const addTheme = () => {
    if (newTheme.trim() && !formData.contentThemes.includes(newTheme.trim())) {
      setFormData(prev => ({
        ...prev,
        contentThemes: [...prev.contentThemes, newTheme.trim()]
      }));
      setNewTheme('');
    }
  };

  const removeTheme = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contentThemes: prev.contentThemes.filter((_, i) => i !== index)
    }));
  };

  const addSuggestedTheme = (theme: string) => {
    if (!formData.contentThemes.includes(theme)) {
      setFormData(prev => ({
        ...prev,
        contentThemes: [...prev.contentThemes, theme]
      }));
    }
  };

  const calculateTotalPosts = () => {
    return Object.values(formData.postingFrequency).reduce((sum, freq) => sum + freq, 0) * formData.durationWeeks;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Social Media Calendar Builder
          </CardTitle>
          <CardDescription>
            Create a strategic content calendar with platform-specific posts and optimized posting schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationWeeks" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Calendar Duration (Weeks)
            </Label>
            <Input
              id="durationWeeks"
              type="number"
              min="1"
              max="12"
              value={formData.durationWeeks}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                durationWeeks: parseInt(e.target.value) || 4
              }))}
            />
            <div className="text-sm text-gray-500">
              Recommended: 4-8 weeks for effective planning
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Select Platforms & Posting Frequency
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availablePlatforms.map((platform) => (
                <div key={platform.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={platform.id}
                        checked={formData.platforms.includes(platform.id)}
                        onCheckedChange={(checked) => handlePlatformToggle(platform.id, !!checked)}
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${platform.color}`} />
                        <Label htmlFor={platform.id} className="cursor-pointer font-medium">
                          {platform.name}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {formData.platforms.includes(platform.id) && (
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Posts per week</Label>
                      <Input
                        type="number"
                        min="1"
                        max="21"
                        value={formData.postingFrequency[platform.id] || platform.defaultFrequency}
                        onChange={(e) => handleFrequencyChange(
                          platform.id,
                          parseInt(e.target.value) || platform.defaultFrequency
                        )}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {formData.platforms.length === 0 && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                Please select at least one platform to continue
              </div>
            )}
          </div>

          {/* Content Themes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Content Themes
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                placeholder="Add a content theme or pillar"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTheme())}
              />
              <Button type="button" onClick={addTheme} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested Themes */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Quick add themes:</div>
              <div className="flex flex-wrap gap-2">
                {[...defaultThemes, ...suggestedThemes].slice(0, 8).map((theme, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-green-50"
                    onClick={() => addSuggestedTheme(theme)}
                  >
                    + {theme}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Selected Themes */}
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.contentThemes.map((theme, i) => (
                <Badge key={i} className="flex items-center gap-1 bg-green-100 text-green-800">
                  {theme}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTheme(i)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Calendar Preview */}
          {formData.platforms.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">Calendar Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Duration:</span>{' '}
                  <span className="text-green-800">{formData.durationWeeks} weeks</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Platforms:</span>{' '}
                  <span className="text-green-800">{formData.platforms.length}</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Themes:</span>{' '}
                  <span className="text-green-800">{formData.contentThemes.length}</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Total Posts:</span>{' '}
                  <span className="text-green-800">{calculateTotalPosts()}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-green-700 font-medium mb-2">Weekly Breakdown:</div>
                <div className="flex flex-wrap gap-2">
                  {formData.platforms.map(platformId => {
                    const platform = availablePlatforms.find(p => p.id === platformId);
                    const frequency = formData.postingFrequency[platformId] || 0;
                    return (
                      <Badge key={platformId} variant="secondary">
                        {platform?.name}: {frequency}/week
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
          disabled={isLoading || formData.platforms.length === 0}
          size="lg"
        >
          {isLoading ? 'Building Calendar...' : 'Create Social Media Calendar'}
        </Button>
      </div>
    </form>
  );
}