import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SaveStatusIndicator } from '@/components/agents/SaveStatusIndicator';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Download,
  Copy,
  FileImage,
  CheckCircle,
  Eye,
  Code,
  Loader2,
  MessageSquare,
  Save,
  Send
} from 'lucide-react';
import { SimpleCollapsibleMarkdown } from '@/components/agents/messages/SimpleCollapsibleMarkdown';

interface ContentGenerationViewProps {
  formData?: any;  // Made optional since we don't use it yet
  tool: string;
  onExport: (format: string) => void;
  onRefine?: (feedback: string) => void;  // Now takes feedback string
  onSave?: () => void;
  generatedContent?: any;
  isGenerating?: boolean;
  saveStatus?: 'saving' | 'saved' | 'error';
  error?: string;
}

const GENERATION_STEPS = [
  { label: 'Analyzing requirements', duration: 2000 },
  { label: 'Researching topic', duration: 3000 },
  { label: 'Generating content', duration: 5000 },
  { label: 'Optimizing for SEO', duration: 2000 },
  { label: 'Finalizing', duration: 1000 }
];

export function ContentGenerationView({
  tool,
  onExport,
  onRefine,
  onSave,
  generatedContent,
  isGenerating = false,
  saveStatus,
  error
}: ContentGenerationViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState('preview');
  const [refinementFeedback, setRefinementFeedback] = useState('');

  // Simulate generation progress
  useEffect(() => {
    if (isGenerating && currentStep < GENERATION_STEPS.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setProgress((currentStep + 1) / GENERATION_STEPS.length * 100);
      }, GENERATION_STEPS[currentStep].duration);

      return () => clearTimeout(timer);
    }
  }, [isGenerating, currentStep]);

  const handleCopy = async () => {
    if (generatedContent?.content) {
      try {
        await navigator.clipboard.writeText(
          typeof generatedContent.content === 'string'
            ? generatedContent.content
            : JSON.stringify(generatedContent.content, null, 2)
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleRefineSubmit = () => {
    if (!refinementFeedback.trim() || !onRefine) return;
    onRefine(refinementFeedback);
    setRefinementFeedback(''); // Clear input after submission
  };

  const getContentPreview = () => {
    if (!generatedContent) return null;

    // Handle different content types
    switch (tool) {
      case 'seo-blog':
        return (
          <div>
            {generatedContent.meta_description && (
              <Alert className="mb-6">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Meta Description:</strong> {generatedContent.meta_description}
                </AlertDescription>
              </Alert>
            )}
            <SimpleCollapsibleMarkdown
              content={generatedContent.content || generatedContent.blog_post || ''}
            />
          </div>
        );

      case 'email-drip':
        // Handle both structured email data and plain text content
        if (generatedContent.emails?.length > 0) {
          // Structured email data format
          return (
            <div className="space-y-4">
              {generatedContent.emails.map((email: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Email {index + 1}: {email.subject}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Badge variant="outline">Send Day: {email.send_day || index * 7}</Badge>
                      </div>
                      <SimpleCollapsibleMarkdown content={email.content || email.body} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        } else if (generatedContent.content) {
          // Plain text/markdown content format
          return <SimpleCollapsibleMarkdown content={generatedContent.content} />;
        }
        return null;

      case 'social-media':
        // Handle both structured social media data and plain text content
        if (generatedContent.posts?.length > 0) {
          // Structured social media posts format
          return (
            <div className="grid gap-4">
              {generatedContent.posts.map((post: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{post.platform}</CardTitle>
                      <Badge>{post.date || `Day ${index + 1}`}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{post.content || post.text}</p>
                    {post.hashtags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.hashtags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        } else if (generatedContent.content) {
          // Plain text/markdown content format
          return <SimpleCollapsibleMarkdown content={generatedContent.content} />;
        }
        return null;

      case 'content-plan':
      case 'social-calendar':
      case 'content-ideation':
      case 'blog-templates':
      case 'content-analysis':
        // Content plan, calendar, ideation, blog templates, and analysis - render markdown content
        return <SimpleCollapsibleMarkdown content={generatedContent.content || generatedContent.plan || generatedContent.ideas || generatedContent.template || generatedContent.analysis || ''} />;

      default:
        const defaultContent = typeof generatedContent === 'string'
          ? generatedContent
          : generatedContent.content || JSON.stringify(generatedContent, null, 2);
        return <SimpleCollapsibleMarkdown content={defaultContent} />;
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-gold" />
              <h3 className="text-lg font-semibold mb-2">Generating Your Content</h3>
              <p className="text-sm text-muted-foreground">
                {GENERATION_STEPS[Math.min(currentStep, GENERATION_STEPS.length - 1)].label}...
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {GENERATION_STEPS.map((_, index) => (
                <div key={index} className="flex items-center gap-1">
                  {index < currentStep && <CheckCircle className="h-3 w-3 text-brand-success" />}
                  {index === currentStep && <Loader2 className="h-3 w-3 animate-spin" />}
                  {index > currentStep && <div className="h-3 w-3 rounded-full bg-muted" />}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!generatedContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Action Bar - Mobile optimized with stacked layout */}
      <Card>
        <CardContent className="py-3 md:py-4">
          {/* Mobile: Stacked layout, Desktop: Horizontal layout */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            {/* Heading and Status - Mobile: Smaller text */}
            <div className="flex items-center gap-2 md:gap-4">
              <h3 className="text-sm md:text-base font-semibold">Your Content is Ready!</h3>
              {saveStatus && (
                <SaveStatusIndicator
                  status={saveStatus}
                  className="text-xs md:text-sm"
                />
              )}
            </div>

            {/* Action Buttons - Mobile: Wrap in grid, Desktop: Horizontal flex */}
            <div className="grid grid-cols-2 md:flex md:items-center gap-2">
              {/* Save to Library Button - Full width on mobile */}
              {onSave && saveStatus !== 'saved' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  className="bg-green-600 hover:bg-green-700 min-h-10 md:min-h-8"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">Save...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Save to Library</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
              )}
              {saveStatus === 'saved' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="text-brand-success border-green-600 min-h-10 md:min-h-8"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Saved
                </Button>
              )}

              {/* Separator only on desktop and if save button is shown */}
              {onSave && <div className="hidden md:block h-6 w-px bg-border" />}

              {/* Export Options - Grid on mobile, flex on desktop */}
              <Button
                variant="default"
                size="sm"
                onClick={() => onExport('text')}
                className="min-h-10 md:min-h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Text
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                className="min-h-10 md:min-h-8"
              >
                <FileImage className="h-4 w-4 mr-1" />
                PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('docs')}
                className="min-h-10 md:min-h-8"
              >
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Google Docs</span>
                <span className="sm:hidden">Docs</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="min-h-10 md:min-h-8"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Preview - Mobile: Stacked header, Desktop: Horizontal */}
      <Card className="min-h-[500px]">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <CardTitle className="text-base md:text-lg">Content Preview</CardTitle>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="preview" className="flex-1 md:flex-none">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Preview</span>
                  <span className="sm:hidden">View</span>
                </TabsTrigger>
                <TabsTrigger value="raw" className="flex-1 md:flex-none">
                  <Code className="h-4 w-4 mr-1" />
                  Raw
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {selectedTab === 'preview' ? (
            <div className="bg-background rounded-lg p-6 border">
              {getContentPreview()}
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-xs overflow-auto">
                <code>
                  {JSON.stringify(generatedContent, null, 2)}
                </code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Metrics - Mobile: 2x2 grid, Desktop: 4 columns */}
      {tool === 'seo-blog' && generatedContent.content && (
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold">
                  {generatedContent.content.split(' ').length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Words</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold">
                  {(generatedContent.content.match(/#{1,6} /g) || []).length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Headings</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold">
                  {Math.ceil(generatedContent.content.split(' ').length / 200)}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Min Read</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-brand-success">95</div>
                <div className="text-xs md:text-sm text-muted-foreground">SEO Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refinement Chat Box - Always visible when content is generated */}
      {onRefine && (
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 dark:from-amber-900/20 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-gold" />
              Refine this content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="Type your refinement instructions here... (e.g., 'Make it more conversational', 'Add more examples', 'Shorten to 500 words')"
                value={refinementFeedback}
                onChange={(e) => setRefinementFeedback(e.target.value)}
                disabled={isGenerating}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleRefineSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
                </p>
                <Button
                  onClick={handleRefineSubmit}
                  disabled={!refinementFeedback.trim() || isGenerating}
                  size="sm"
                  className="bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}