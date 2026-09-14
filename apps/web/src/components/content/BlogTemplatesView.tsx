import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Target, FileText, CheckSquare, Sparkles } from 'lucide-react';
import { useAgentOutputs } from '@/hooks/data/useAgentOutputs';

export interface BlogTemplatesFormData {
  contentIdea: string;
  blogType: string;
  includeStructure: boolean;
  includeExamples: boolean;
  targetWordCount: number;
}

interface BlogTemplatesViewProps {
  onSubmit: (data: BlogTemplatesFormData) => void;
  isLoading?: boolean;
  initialValues?: Partial<BlogTemplatesFormData>;
}

export function BlogTemplatesView({
  onSubmit,
  isLoading,
  initialValues
}: BlogTemplatesViewProps) {
  // Fetch cross-agent data for content idea suggestions
  const { data: allOutputs = [] } = useAgentOutputs();

  // Filter content and marketing strategy outputs for topic suggestions
  const contentOutputs = allOutputs.filter(output =>
    output.agent_type === 'content' || output.agent_type === 'marketing_strategy'
  );

  // Extract unique, relevant titles (limit to 5 most recent)
  const contentIdeasSuggestions = contentOutputs
    .slice(0, 8)
    .map(output => ({
      id: output.id,
      title: output.title
    }))
    .filter(idea => idea.title && idea.title !== 'Content Output');

  const [formData, setFormData] = useState<BlogTemplatesFormData>({
    contentIdea: initialValues?.contentIdea || '',
    blogType: initialValues?.blogType || 'how-to',
    includeStructure: initialValues?.includeStructure || true,
    includeExamples: initialValues?.includeExamples || false,
    targetWordCount: initialValues?.targetWordCount || 1500
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => ({
        contentIdea: initialValues.contentIdea || prev.contentIdea,
        blogType: initialValues.blogType || prev.blogType,
        includeStructure: initialValues.includeStructure !== undefined ? initialValues.includeStructure : prev.includeStructure,
        includeExamples: initialValues.includeExamples !== undefined ? initialValues.includeExamples : prev.includeExamples,
        targetWordCount: initialValues.targetWordCount || prev.targetWordCount
      }));
    }
  }, [initialValues]);

  const blogTypes = [
    { value: 'how-to', label: 'How-To Guide', description: 'Step-by-step instructional content' },
    { value: 'listicle', label: 'Listicle', description: 'Numbered list format (e.g., "10 Ways to...")' },
    { value: 'case-study', label: 'Case Study', description: 'Real-world example with results' },
    { value: 'comparison', label: 'Comparison', description: 'Compare products, services, or approaches' },
    { value: 'thought-leadership', label: 'Thought Leadership', description: 'Industry insights and expert opinions' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.contentIdea) {
      onSubmit(formData);
    }
  };

  const isFormValid = formData.contentIdea.trim().length > 0;
  const selectedBlogType = blogTypes.find(t => t.value === formData.blogType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            Blog Writing Templates
          </CardTitle>
          <CardDescription>
            Access proven blog post templates for different content types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Idea/Title */}
          <div className="space-y-2">
            <Label htmlFor="contentIdea" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Content Idea or Title *
            </Label>

            {/* Content Ideas Quick Select */}
            {contentIdeasSuggestions.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span className="text-xs font-medium text-slate-700 dark:text-amber-400">
                    From your recent content:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contentIdeasSuggestions.slice(0, 5).map((idea) => (
                    <Button
                      key={idea.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto py-1 px-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-amber-300 dark:hover:border-slate-700"
                      onClick={() => setFormData(prev => ({ ...prev, contentIdea: idea.title }))}
                      title={idea.title}
                    >
                      💡 {idea.title.length > 40 ? idea.title.substring(0, 40) + '...' : idea.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Input
              id="contentIdea"
              value={formData.contentIdea}
              onChange={(e) => setFormData(prev => ({ ...prev, contentIdea: e.target.value }))}
              placeholder="e.g., How to Build a Social Media Strategy"
              required
            />
            <div className="text-sm text-gray-500">
              What's the topic or title of your blog post?
            </div>
          </div>

          {/* Blog Type */}
          <div className="space-y-2">
            <Label htmlFor="blogType" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Blog Type
            </Label>
            <Select
              value={formData.blogType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, blogType: value }))}
            >
              <SelectTrigger id="blogType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blogTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBlogType && (
              <div className="text-sm text-gray-500">
                {selectedBlogType.description}
              </div>
            )}
          </div>

          {/* Target Word Count */}
          <div className="space-y-2">
            <Label htmlFor="targetWordCount" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Target Word Count: {formData.targetWordCount} words
            </Label>
            <input
              id="targetWordCount"
              type="range"
              min="500"
              max="3000"
              step="100"
              value={formData.targetWordCount}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                targetWordCount: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>500 words</span>
              <span>1500 words (recommended)</span>
              <span>3000 words</span>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Template Options
            </Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeStructure"
                checked={formData.includeStructure}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  includeStructure: !!checked
                }))}
              />
              <Label
                htmlFor="includeStructure"
                className="cursor-pointer text-sm font-normal"
              >
                Include detailed structure & outline
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeExamples"
                checked={formData.includeExamples}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  includeExamples: !!checked
                }))}
              />
              <Label
                htmlFor="includeExamples"
                className="cursor-pointer text-sm font-normal"
              >
                Include writing examples for each section
              </Label>
            </div>
          </div>

          {/* Template Preview Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">Template Summary</h4>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-slate-700 font-medium">Type:</span>{' '}
                <span className="text-slate-800">{selectedBlogType?.label}</span>
              </div>
              <div>
                <span className="text-slate-700 font-medium">Target Length:</span>{' '}
                <span className="text-slate-800">{formData.targetWordCount} words</span>
              </div>
              <div>
                <span className="text-slate-700 font-medium">Estimated Reading Time:</span>{' '}
                <span className="text-slate-800">{Math.ceil(formData.targetWordCount / 200)} minutes</span>
              </div>
              {formData.includeStructure && (
                <div className="text-slate-700 text-xs">✓ Detailed structure included</div>
              )}
              {formData.includeExamples && (
                <div className="text-slate-700 text-xs">✓ Writing examples included</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || !isFormValid}
          size="lg"
        >
          {isLoading ? 'Generating Template...' : 'Generate Blog Template'}
        </Button>
      </div>
    </form>
  );
}
