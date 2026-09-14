import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AgentChat } from '@/components/agents/AgentChat';
import { ToolTabLayout } from './ToolTabLayout';
import { SEOBlogForm, type SEOBlogFormData } from './SEOBlogForm';
import { ThoughtLeadershipForm, type ThoughtLeadershipFormData } from './ThoughtLeadershipForm';
import { USPContentForm, type USPContentFormData } from './USPContentForm';
import { EmailDripCampaignDesigner, type EmailDripCampaignData } from './EmailDripCampaignDesigner';
import { SocialMediaCalendarView, type SocialMediaCalendarData } from './SocialMediaCalendarView';
import { ContentPlanView, type ContentPlanFormData } from './ContentPlanView';
import { ContentIdeationView, type ContentIdeationFormData } from './ContentIdeationView';
import { BlogTemplatesView, type BlogTemplatesFormData } from './BlogTemplatesView';
import { ContentAnalysisView, type ContentAnalysisFormData } from './ContentAnalysisView';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { useUserIdentity } from '@/hooks/data/useUserIdentity'; // CORRECT: Use canonical hook
import { useClientContext } from '@/contexts/ClientContext';
import { useFormPrefillData } from '@/hooks/data/useFormPrefillData'; // Database-First: Single RPC call for all pre-fill data
import { useSaveOutput } from '@/hooks/data/useAgentOutputs'; // Universal save hook
import { useMutation } from '@tanstack/react-query';
import { authFetch } from '@/lib/authService';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { exportToText, exportToPDF, copyToClipboard } from '@/utils/exportUtils';
import { API_BASE_URL } from '@/lib/api';
import { extractToolParams } from '@/utils/wildcardRouteParams';
import {
  buildSEOBlogMessage,
  buildThoughtLeadershipMessage,
  buildUSPMessage,
  buildEmailDripCampaignMessage,
  buildSocialMediaCalendarMessage,
  buildContentPlanMessage,
  buildContentIdeationMessage,
  buildBlogTemplatesMessage,
  buildContentAnalysisMessage
} from '@/utils/contentMessageBuilders';

interface ContentToolChatProps {
  selectedSession?: any;
  onSessionCreated?: (session: any) => void;
  navigationState?: any; // State from recommendation click navigation
}

export function ContentToolChat({ selectedSession, onSessionCreated }: ContentToolChatProps) {
  // Use wildcard route params extraction for both SME (/content/*) and Agency (/clients/[slug]/content/tool/*) routes
  const params = useParams<{ '*': string }>();
  const { tool } = extractToolParams(params['*']);
  const [activeTab, setActiveTab] = useState<'form' | 'generation'>('form');  // Removed 'chat' tab
  const [formData, setFormData] = useState<ContentPlanFormData | ContentIdeationFormData | BlogTemplatesFormData | ContentAnalysisFormData | SEOBlogFormData | ThoughtLeadershipFormData | USPContentFormData | EmailDripCampaignData | SocialMediaCalendarData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | undefined>();
  const { session } = useAuthStore();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const { clientId } = useClientContext(); // Get client context for agency users

  // Database-First: Use single RPC call for all pre-fill data
  const { data: prefillData } = useFormPrefillData(orgId);

  // Universal save hook - handles all agents
  const saveOutputMutation = useSaveOutput();

  // Extract suggestions from pre-fill data (now from database function)
  const suggestedTopics = prefillData?.content_pillars || [
    "Industry best practices and insights",
    "How-to guides and tutorials",
    "Case studies and success stories"
  ];

  const suggestedKeywords = prefillData?.keywords || [];

  const initialValues = {
    targetAudience: prefillData?.target_persona_name && prefillData?.target_persona_title
      ? `${prefillData.target_persona_name} - ${prefillData.target_persona_title}`
      : ''
  };

  // Content type mapping for different tools
  const getContentTypeFromTool = (toolName?: string): string => {
    const contentTypeMap: Record<string, string> = {
      'seo-blog': 'blog_post',
      'thought-leadership': 'thought_leadership_content',
      'usp-content': 'usp_content',
      'email-drip': 'email_sequence',
      'social-calendar': 'social_content',
      'content-plan': 'content_plan',
      'content-ideation': 'content_ideation',
      'blog-templates': 'blog_template',
      'content-analysis': 'content_analysis'
    };
    return contentTypeMap[toolName || ''] || 'generic_content';
  };

  // Extract title from form data
  const getTitleFromFormData = (): string => {
    if (!formData) return 'Content Output';

    if ('topic' in formData) return formData.topic;
    if ('campaignName' in formData) return formData.campaignName;
    if ('productService' in formData) return formData.productService;

    return 'Content Output';
  };

  // Content generation mutation with SSE streaming
  const generateContentMutation = useMutation({
    mutationFn: async (data: any) => {
      setSaveStatus(undefined); // Clear save status for new generation
      setGeneratedContent(null); // Clear previous content
      setActiveTab('generation'); // Switch to generation tab immediately to show progress

      // Build the message based on tool type
      let message = '';
      switch (tool) {
        case 'seo-blog':
          message = buildSEOBlogMessage(data as SEOBlogFormData);
          break;
        case 'thought-leadership':
          message = buildThoughtLeadershipMessage(data as ThoughtLeadershipFormData);
          break;
        case 'usp-content':
          message = buildUSPMessage(data as USPContentFormData);
          break;
        case 'email-drip':
          message = buildEmailDripCampaignMessage(data as EmailDripCampaignData);
          break;
        case 'social-calendar':
          message = buildSocialMediaCalendarMessage(data as SocialMediaCalendarData);
          break;
        case 'content-plan':
          message = buildContentPlanMessage(data as ContentPlanFormData);
          break;
        case 'content-ideation':
          message = buildContentIdeationMessage(data as ContentIdeationFormData);
          break;
        case 'blog-templates':
          message = buildBlogTemplatesMessage(data as BlogTemplatesFormData);
          break;
        case 'content-analysis':
          message = buildContentAnalysisMessage(data as ContentAnalysisFormData);
          break;
      }

      // If this is a refinement request, append the feedback
      if (data._refinementFeedback) {
        message += `\n\n**REFINEMENT REQUEST:**\nThe previous version of this content needs the following improvements:\n${data._refinementFeedback}\n\nPlease regenerate the complete content incorporating these changes.`;
      }

      // First create a session
      const sessionResponse = await authFetch(`${API_BASE_URL}/api/v1/direct-agents/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          agent_type: 'content',
          ...(clientId && { client_id: clientId }) // Include client_id for agency users
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const { session_id: sessionId } = await sessionResponse.json();

      // Use SSE streaming for content generation
      const { fetchEventSource } = await import('@microsoft/fetch-event-source');

      return new Promise((resolve, reject) => {
        let streamContent = '';
        let structuredData: any = null;

        const ctrl = new AbortController();
        const headers = getLocaleHeaders();
        headers['Content-Type'] = 'application/json';
        headers.Authorization = `Bearer ${session?.access_token}`;

        // Use fetchEventSource with manual auth headers
        fetchEventSource(`${API_BASE_URL}/api/v1/direct-agents/content/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            session_id: sessionId,
            user_id: session?.user?.id,
            agent_type: 'content'
          }),
          signal: ctrl.signal,
          async onopen(response: Response) {
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
              console.log('SSE connection opened for content generation');
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          },
          onmessage(event: any) {
            if (event.event === 'text_chunk') {
              const parsed = JSON.parse(event.data);
              streamContent += parsed.token;
              // Update preview in real-time
              setGeneratedContent({
                content: streamContent,
                isStreaming: true
              });
            } else if (event.event === 'tool_result') {
              structuredData = JSON.parse(event.data);
            } else if (event.event === 'stream_end') {
              // Final content with structured data
              const finalContent = {
                content: streamContent,
                structured_data: structuredData,
                session_id: sessionId,
                isStreaming: false
              };
              setGeneratedContent(finalContent);
              // Don't auto-save - user must click "Save to Library" button
              ctrl.abort();
              resolve(finalContent);
            } else if (event.event === 'error') {
              const parsed = JSON.parse(event.data);
              reject(new Error(parsed.message || 'Stream error occurred'));
            }
          },
          onerror(err: any) {
            console.error('SSE connection error:', err);
            reject(err);
            ctrl.abort();
          }
        });
      });
    },
    onSuccess: (data) => {
      console.log('Content generated successfully:', data);
    },
    onError: (error) => {
      console.error('Content generation failed:', error);
      setActiveTab('form'); // Switch back to form on error to allow retry
    }
  });

  const handleFormSubmit = (data: ContentPlanFormData | ContentIdeationFormData | BlogTemplatesFormData | ContentAnalysisFormData | SEOBlogFormData | ThoughtLeadershipFormData | USPContentFormData | EmailDripCampaignData | SocialMediaCalendarData) => {
    setFormData(data);
    generateContentMutation.mutate(data);
  };

  // Universal save handler using the shared hook
  const handleSaveContent = () => {
    if (!generatedContent) {
      console.error('No content to save');
      return;
    }

    setSaveStatus('saving');

    // Use universal save hook with extracted utility functions
    // Store the content in a structure that transformOutput can understand
    saveOutputMutation.mutate(
      {
        agent_type: 'content',
        output_type: getContentTypeFromTool(tool),
        title: getTitleFromFormData(),
        summary: `${tool?.replace('-', ' ')} content: ${getTitleFromFormData()}`,
        content: {
          content_data: {
            title: getTitleFromFormData(),
            content: generatedContent.content,
            tool_type: tool,
            structured_data: generatedContent.structured_data
          },
          raw_output: generatedContent
        },
        session_id: generatedContent.session_id,
        metadata: {
          tool_type: tool,
          form_data: formData
        },
        client_id: clientId ?? undefined
      },
      {
        onSuccess: () => {
          setSaveStatus('saved');
        },
        onError: () => {
          setSaveStatus('error');
        }
      }
    );
  };

  const handleExport = (format: string) => {
    if (!generatedContent?.content) {
      console.error('No content to export');
      return;
    }

    // Extract title from formData based on form type
    let title = 'content';
    if (formData) {
      if ('topic' in formData) {
        title = formData.topic;
      } else if ('campaignName' in formData) {
        title = formData.campaignName;
      } else if ('productService' in formData) {
        title = formData.productService;
      }
    }
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

    if (format === 'text') {
      exportToText(generatedContent.content, filename, tool || 'content');
    } else if (format === 'pdf') {
      exportToPDF(generatedContent.content, filename, tool || 'content');
    } else if (format === 'docs') {
      // Google Docs export - copy to clipboard and provide instructions
      copyToClipboard(generatedContent.content);
      alert('Content copied to clipboard! Paste it into a new Google Doc.');
    }
  };

  const handleRefine = (feedback: string) => {
    if (!formData || !generatedContent) {
      console.error('No content or form data to refine');
      return;
    }

    // Store the refinement feedback in formData so mutation can access it
    const refinedFormData = {
      ...formData,
      _refinementFeedback: feedback
    };

    // Trigger regeneration with updated formData
    generateContentMutation.mutate(refinedFormData);
  };

  // Determine which UI to show based on the tool
  const renderToolInterface = () => {
    // Common props for ToolTabLayout
    const commonProps = {
      activeTab,
      onTabChange: setActiveTab,
      generatedContent,
      tool: tool || 'content',
      formData,
      onExport: handleExport,
      onRefine: handleRefine,
      onSave: handleSaveContent,
      isGenerating: generateContentMutation.isPending,
      saveStatus,
      error: generateContentMutation.error?.message
    };

    switch (tool) {
      case 'seo-blog':
        return (
          <ToolTabLayout
            {...commonProps}
            formComponent={
              <SEOBlogForm
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
                initialValues={initialValues}
                suggestedTopics={suggestedTopics}
                suggestedKeywords={suggestedKeywords}
              />
            }
          />
        );

      case 'thought-leadership':
        return (
          <ToolTabLayout
            {...commonProps}
            formComponent={
              <ThoughtLeadershipForm
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
                suggestedTopics={suggestedTopics}
                expertiseAreas={[
                  prefillData?.primary_usp || 'Industry Expert',
                  'Digital Transformation Leader',
                  'Innovation Strategist'
                ]}
              />
            }
          />
        );

      case 'usp-content':
        return (
          <ToolTabLayout
            {...commonProps}
            formComponent={
              <USPContentForm
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
                initialValues={{
                  productService: prefillData?.primary_product || '',
                  primaryUSP: prefillData?.primary_usp || '',
                  targetPainPoint: prefillData?.primary_pain_point || '',
                }}
                suggestedUSPs={[]}
                knownCompetitors={[]}
              />
            }
          />
        );

      case 'email-drip':
        return (
          <ToolTabLayout
            {...commonProps}
            formComponent={
              <EmailDripCampaignDesigner
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
                initialValues={{
                  campaignName: prefillData?.company_name
                    ? `${prefillData.company_name} Nurture Series`
                    : 'Lead Nurture Campaign',
                  targetAudience: prefillData?.target_persona_name && prefillData?.target_persona_title
                    ? `${prefillData.target_persona_name} (${prefillData.target_persona_title})`
                    : 'Key decision makers in your target market',
                  campaignGoal: prefillData?.value_proposition || 'Lead nurturing and qualification',
                  numberOfEmails: 5,
                  sendFrequency: 'weekly'
                }}
                suggestedAudiences={prefillData?.target_persona_name ? [
                  `${prefillData.target_persona_name} - ${prefillData.target_persona_title || 'Target Persona'}`
                ] : []}
                suggestedGoals={[
                  'Product onboarding and adoption',
                  'Lead nurturing and qualification',
                  'Customer retention and upselling'
                ]}
              />
            }
          />
        );

      case 'social-calendar':
        return (
          <ToolTabLayout
            {...commonProps}
            formComponent={
              <SocialMediaCalendarView
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
                suggestedThemes={prefillData?.content_pillars || []}
              />
            }
          />
        );

      case 'content-plan':
        return (
          <ToolTabLayout
            {...commonProps}
            generationLabel="Content Plan"
            formComponent={
              <ContentPlanView
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
              />
            }
          />
        );

      case 'content-ideation':
        return (
          <ToolTabLayout
            {...commonProps}
            generationLabel="Content Ideas"
            formComponent={
              <ContentIdeationView
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
              />
            }
          />
        );

      case 'blog-templates':
        return (
          <ToolTabLayout
            {...commonProps}
            generationLabel="Blog Template"
            formComponent={
              <BlogTemplatesView
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
              />
            }
          />
        );

      case 'content-analysis':
        return (
          <ToolTabLayout
            {...commonProps}
            generationLabel="Analysis Results"
            formComponent={
              <ContentAnalysisView
                onSubmit={handleFormSubmit}
                isLoading={generateContentMutation.isPending}
              />
            }
          />
        );

      case 'chat':
      default:
        return (
          <Card className="min-h-[600px]">
            <CardContent className="p-6">
              <AgentChat
                agentType="content"
                agentName="Content Agent"
                selectedSession={selectedSession}
                onSessionCreated={onSessionCreated}
                placeholder="Describe the content you need..."
              />
            </CardContent>
          </Card>
        );
    }
  };

  return renderToolInterface();
}
