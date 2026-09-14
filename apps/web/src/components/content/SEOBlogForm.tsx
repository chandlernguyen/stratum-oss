import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Plus,
  X,
  Sparkles,
  FileText,
  TrendingUp,
  Target,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Hash
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SEOBlogFormProps {
  onSubmit: (data: SEOBlogFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<SEOBlogFormData>;
  suggestedTopics?: string[];
  suggestedKeywords?: string[];
}

export interface SEOBlogFormData {
  topic: string;
  keywords: string[];
  wordCount: number;
  tone: string;
  targetAudience: string;
  contentGoal: string;
  includeMetaDescription: boolean;
  includeOutline: boolean;
  competitorUrls?: string[];
}

export function SEOBlogForm({
  onSubmit,
  isLoading = false,
  initialValues,
  suggestedTopics,
  suggestedKeywords
}: SEOBlogFormProps) {
  const [formData, setFormData] = useState<SEOBlogFormData>({
    topic: initialValues?.topic || '',
    keywords: initialValues?.keywords || [],
    wordCount: initialValues?.wordCount || 1500,
    tone: initialValues?.tone || 'professional',
    targetAudience: initialValues?.targetAudience || '',
    contentGoal: initialValues?.contentGoal || 'educate',
    includeMetaDescription: initialValues?.includeMetaDescription ?? true,
    includeOutline: initialValues?.includeOutline ?? true,
    competitorUrls: initialValues?.competitorUrls || []
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [competitorUrlInput, setCompetitorUrlInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Update form when initialValues change (async data arrives)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        topic: initialValues.topic || prev.topic,
        keywords: initialValues.keywords || prev.keywords,
        wordCount: initialValues.wordCount || prev.wordCount,
        tone: initialValues.tone || prev.tone,
        targetAudience: initialValues.targetAudience || prev.targetAudience,
        contentGoal: initialValues.contentGoal || prev.contentGoal,
        includeMetaDescription: initialValues.includeMetaDescription ?? prev.includeMetaDescription,
        includeOutline: initialValues.includeOutline ?? prev.includeOutline,
        competitorUrls: initialValues.competitorUrls || prev.competitorUrls
      }));
    }
  }, [initialValues]);

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addCompetitorUrl = () => {
    if (competitorUrlInput.trim() && !formData.competitorUrls?.includes(competitorUrlInput.trim())) {
      setFormData(prev => ({
        ...prev,
        competitorUrls: [...(prev.competitorUrls || []), competitorUrlInput.trim()]
      }));
      setCompetitorUrlInput('');
    }
  };

  const removeCompetitorUrl = (url: string) => {
    setFormData(prev => ({
      ...prev,
      competitorUrls: prev.competitorUrls?.filter(u => u !== url)
    }));
  };

  const handleSubmit = () => {
    if (!formData.topic.trim()) {
      alert('Please enter a topic for your blog post');
      return;
    }
    onSubmit(formData);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.topic.trim() !== '';
      case 2:
        return formData.keywords.length > 0;
      case 3:
        return formData.targetAudience.trim() !== '';
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                currentStep >= step
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-brand-slate'
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`flex-1 h-1 mx-2 transition-colors ${
                  currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Topic & Goal */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Blog Post Topic
            </CardTitle>
            <CardDescription>
              What would you like to write about? Be specific for better SEO optimization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic *</Label>

              {/* Suggested Topics */}
              {suggestedTopics && suggestedTopics.length > 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-sm text-muted-foreground mb-2">Suggested topics from your content plan:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((topic, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, topic }))}
                        className="text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {topic}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Textarea
                id="topic"
                placeholder="e.g., 'How to implement zero-waste practices in small businesses'"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                className="mt-2 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="goal">Content Goal</Label>
              <Select
                value={formData.contentGoal}
                onValueChange={(value) => setFormData(prev => ({ ...prev, contentGoal: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="educate">Educate & Inform</SelectItem>
                  <SelectItem value="convert">Drive Conversions</SelectItem>
                  <SelectItem value="awareness">Build Awareness</SelectItem>
                  <SelectItem value="thought-leadership">Establish Thought Leadership</SelectItem>
                  <SelectItem value="seo">SEO & Traffic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tone">Writing Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="persuasive">Persuasive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Keywords & SEO */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              SEO Keywords
            </CardTitle>
            <CardDescription>
              Add target keywords for SEO optimization. Include both primary and long-tail keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="keywords">Keywords *</Label>

              {/* Suggested Keywords */}
              {suggestedKeywords && suggestedKeywords.length > 0 && (
                <div className="mt-2 mb-3">
                  <p className="text-sm text-muted-foreground mb-2">Suggested keywords from your marketing strategy:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedKeywords
                      .filter(kw => !formData.keywords.includes(kw))
                      .map((keyword, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            keywords: [...prev.keywords, keyword]
                          }))}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {keyword}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <Input
                  id="keywords"
                  placeholder="Enter a keyword..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  className="min-h-12 md:min-h-10"
                />
                <Button onClick={addKeyword} type="button" size="icon" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="px-3 py-1 flex items-center gap-1"
                  >
                    <Hash className="h-3 w-3" />
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 hover:text-brand-error"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="competitors">Competitor URLs (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="competitors"
                  placeholder="https://competitor.com/blog-post"
                  value={competitorUrlInput}
                  onChange={(e) => setCompetitorUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitorUrl())}
                  className="min-h-12 md:min-h-10"
                />
                <Button onClick={addCompetitorUrl} type="button" size="icon" variant="outline" className="min-w-12 min-h-12 md:min-w-10 md:min-h-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-3">
                {formData.competitorUrls?.map((url) => (
                  <div key={url} className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate">{url}</span>
                    <button
                      onClick={() => removeCompetitorUrl(url)}
                      className="text-brand-error hover:text-brand-error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Include 3-5 primary keywords for optimal SEO performance. Competitor URLs help create differentiated content.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Audience & Length */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Audience & Structure
            </CardTitle>
            <CardDescription>
              Define your audience and content structure preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="audience">Target Audience *</Label>
              <Textarea
                id="audience"
                placeholder="e.g., Small business owners interested in sustainability, ages 30-50, environmentally conscious..."
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="wordCount">Word Count: {formData.wordCount}</Label>
              <Slider
                id="wordCount"
                min={500}
                max={3000}
                step={100}
                value={[formData.wordCount]}
                onValueChange={(value: number[]) => setFormData(prev => ({ ...prev, wordCount: value[0] }))}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-brand-slate mt-1">
                <span>500 words</span>
                <span>1500 words (recommended)</span>
                <span>3000 words</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="meta">Include Meta Description</Label>
                  <p className="text-sm text-brand-slate">Generate SEO meta description</p>
                </div>
                <Switch
                  id="meta"
                  checked={formData.includeMetaDescription}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeMetaDescription: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="outline">Include Content Outline</Label>
                  <p className="text-sm text-brand-slate">Generate detailed blog structure</p>
                </div>
                <Switch
                  id="outline"
                  checked={formData.includeOutline}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeOutline: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Generate */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Review & Generate
            </CardTitle>
            <CardDescription>
              Review your blog post configuration before generating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Topic</p>
                  <p className="text-sm text-brand-slate">{formData.topic}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Keywords ({formData.keywords.length})</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.keywords.map(k => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Target Audience</p>
                  <p className="text-sm text-brand-slate">{formData.targetAudience}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm text-brand-slate">Word Count</p>
                  <p className="font-medium">{formData.wordCount} words</p>
                </div>
                <div>
                  <p className="text-sm text-brand-slate">Tone</p>
                  <p className="font-medium capitalize">{formData.tone}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-slate">Goal</p>
                  <p className="font-medium capitalize">{formData.contentGoal.replace('-', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-slate">Features</p>
                  <div className="space-y-1">
                    {formData.includeMetaDescription && (
                      <Badge variant="outline" className="text-xs">Meta Description</Badge>
                    )}
                    {formData.includeOutline && (
                      <Badge variant="outline" className="text-xs">Content Outline</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons - Mobile: Full width stacked, Desktop: Horizontal */}
      <div className="flex flex-col md:flex-row md:justify-between gap-3 md:gap-0">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="w-full md:w-auto min-h-12 md:min-h-10"
        >
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!isStepValid(currentStep)}
            className="w-full md:w-auto min-h-12 md:min-h-10"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isStepValid(3)}
            className="w-full md:w-auto md:min-w-[150px] min-h-12 md:min-h-10"
          >
            {isLoading ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Blog Post
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}