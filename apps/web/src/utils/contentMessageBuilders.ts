import type {
  SEOBlogFormData,
  ThoughtLeadershipFormData,
  USPContentFormData,
  EmailDripCampaignData,
  SocialMediaCalendarData,
  ContentPlanFormData,
  ContentIdeationFormData,
  BlogTemplatesFormData,
  ContentAnalysisFormData
} from '@/components/content';

// Build tool-specific initial message based on form data (SEO Blog)
export function buildSEOBlogMessage(data: SEOBlogFormData): string {
  let message = `Please generate an SEO-optimized blog post with the following specifications:

**Topic:** ${data.topic}
**Target Keywords:** ${data.keywords.join(', ')}
**Word Count:** ${data.wordCount} words
**Tone:** ${data.tone}
**Content Goal:** ${data.contentGoal}
**Target Audience:** ${data.targetAudience}`;

  if (data.includeMetaDescription) {
    message += '\n\n**Include:** SEO meta description (155-160 characters)';
  }

  if (data.includeOutline) {
    message += '\n**Include:** Detailed content outline with H2/H3 structure';
  }

  if (data.competitorUrls && data.competitorUrls.length > 0) {
    message += `\n\n**Competitor References:** ${data.competitorUrls.join(', ')}
Please ensure our content is differentiated and provides unique value.`;
  }

  message += '\n\nPlease use the generate_seo_blog_post tool to create this content.';

  return message;
}

// Build thought leadership message
export function buildThoughtLeadershipMessage(data: ThoughtLeadershipFormData): string {
  let message = `Please create thought leadership content with the following specifications:

**Topic:** ${data.topic}
**Expertise Area:** ${data.expertise}
**Format:** ${data.format.replace('-', ' ')}
**Number of Parts:** ${data.numberOfParts}
**Target Outcome:** ${data.targetOutcome}`;

  if (data.seriesTitle) {
    message += `\n**Series Title:** ${data.seriesTitle}`;
  }

  if (data.keyInsights.length > 0) {
    message += `\n\n**Key Insights to Include:**\n${data.keyInsights.map(i => `- ${i}`).join('\n')}`;
  }

  if (data.dataPoints.length > 0) {
    message += `\n\n**Supporting Data:**\n${data.dataPoints.map(d => `- ${d}`).join('\n')}`;
  }

  if (data.includeVisuals) {
    message += '\n**Include:** Visual recommendations and infographic suggestions';
  }

  if (data.includeQuotes) {
    message += '\n**Include:** Expert quotes and industry insights';
  }

  message += `\n\n**Call to Action:** ${data.callToAction}`;
  message += '\n\nPlease use the create_thought_leadership_piece tool to generate this content.';

  return message;
}

// Build USP-focused content message
export function buildUSPMessage(data: USPContentFormData): string {
  let message = `Please create USP-focused content with the following specifications:

**Product/Service:** ${data.productService}
**Primary USP:** ${data.primaryUSP}
**Content Type:** ${data.contentType.replace('-', ' ')}
**Target Pain Point:** ${data.targetPainPoint}`;

  if (data.supportingUSPs.length > 0) {
    message += `\n\n**Supporting USPs:**\n${data.supportingUSPs.map(u => `- ${u}`).join('\n')}`;
  }

  if (data.competitorComparison && data.competitors.length > 0) {
    message += `\n\n**Competitor Comparison Against:**\n${data.competitors.map(c => `- ${c}`).join('\n')}`;
  }

  if (data.customerProof.length > 0) {
    message += `\n\n**Customer Proof Points:**\n${data.customerProof.map(p => `- ${p}`).join('\n')}`;
  }

  if (data.valueMetrics.length > 0) {
    message += `\n\n**Value Metrics:**\n${data.valueMetrics.map(m => `- ${m}`).join('\n')}`;
  }

  if (data.emotionalHook) {
    message += `\n**Emotional Hook:** ${data.emotionalHook}`;
  }

  if (data.includeTestimonials) {
    message += '\n**Include:** Customer testimonials and success stories';
  }

  if (data.includeStats) {
    message += '\n**Include:** Statistics and data-driven insights';
  }

  message += `\n\n**Call to Action:** ${data.callToAction}`;
  message += '\n\nPlease use the generate_usp_focused_content tool to create this content.';

  return message;
}

// Build email drip campaign message
export function buildEmailDripCampaignMessage(data: EmailDripCampaignData): string {
  let message = `Please design an email drip campaign with the following specifications:

**Campaign Name:** ${data.campaignName}
**Target Audience:** ${data.targetAudience}
**Campaign Goal:** ${data.campaignGoal}
**Number of Emails:** ${data.numberOfEmails}
**Send Frequency:** ${data.sendFrequency}`;

  message += '\n\nPlease use the design_email_drip_campaign tool to create this email sequence.';

  return message;
}

// Build social media calendar message
export function buildSocialMediaCalendarMessage(data: SocialMediaCalendarData): string {
  let message = `Please create a social media calendar with the following specifications:

**Duration:** ${data.durationWeeks} weeks
**Platforms:** ${data.platforms.join(', ')}`;

  if (data.contentThemes.length > 0) {
    message += `\n**Content Themes:**\n${data.contentThemes.map(t => `- ${t}`).join('\n')}`;
  }

  message += '\n\n**Posting Frequency:**';
  Object.entries(data.postingFrequency).forEach(([platform, frequency]) => {
    message += `\n- ${platform}: ${frequency} posts per week`;
  });

  message += '\n\nPlease use the create_social_media_calendar tool to generate this content calendar.';

  return message;
}

// Build content plan message
export function buildContentPlanMessage(data: ContentPlanFormData): string {
  let message = `Please create a comprehensive content plan with the following specifications:

**Topic/Theme:** ${data.topic}
**Duration:** ${data.durationWeeks} weeks
**Content Types:** ${data.contentTypes.join(', ')}
**Target Audience:** ${data.targetAudience}
**Primary Goal:** ${data.primaryGoal}
**Publication Frequency:** ${data.publicationFrequency} posts per week

Please use the generate_content_plan tool to create this comprehensive content strategy.`;

  return message;
}

// Build content ideation message
export function buildContentIdeationMessage(data: ContentIdeationFormData): string {
  let message = `Generate ${data.count} content ideas for topic: ${data.topic}

**Preferred Formats:** ${data.contentFormats.join(', ')}
${data.includeKeywords ? '**Include:** SEO keywords for each idea' : ''}
${data.includeOutlines ? '**Include:** Brief outlines for each piece' : ''}

Please use the get_content_ideation_templates tool to create creative content ideas.`;

  return message;
}

// Build blog templates message
export function buildBlogTemplatesMessage(data: BlogTemplatesFormData): string {
  let message = `Create a detailed blog writing template for: "${data.contentIdea}"

**Blog Type:** ${data.blogType}
**Target Word Count:** ${data.targetWordCount} words
${data.includeStructure ? '**Include:** Detailed structure and outline for each section' : ''}
${data.includeExamples ? '**Include:** Writing examples and sample paragraphs' : ''}

Please use the get_blog_writing_template tool to create this template.`;

  return message;
}

// Build content analysis message
export function buildContentAnalysisMessage(data: ContentAnalysisFormData): string {
  let message = `Perform a comprehensive content strategy analysis:

**Analysis Type:** ${data.analysisType}
**Timeframe:** ${data.timeframe}
**Focus Areas:** ${data.focusAreas.join(', ')}
${data.includeRecommendations ? '**Include:** Actionable recommendations and next steps' : ''}

Please use the analyze_content_needs tool to provide insights and recommendations.`;

  return message;
}
