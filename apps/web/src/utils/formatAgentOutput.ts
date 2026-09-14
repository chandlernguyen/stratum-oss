/**
 * Utility to format JSON agent outputs for human-readable display
 * Maintains structured data in database while providing clean UI presentation
 */

export interface FormattedOutput {
  summary: string;
  fullText: string;
  highlights?: string[];
}

/**
 * Format agent JSON output into human-readable text
 * @param content - Raw JSON string from agent
 * @param maxLength - Maximum length for summary (optional)
 * @returns Formatted output with summary and full text
 */
export function formatAgentOutput(content: string, maxLength: number = 150): FormattedOutput {
  try {
    const parsed = JSON.parse(content);
    
    // Strategy Agent output
    if (parsed.analysis_summary || parsed.key_challenges || parsed.recommendations) {
      const summary = parsed.analysis_summary 
        ? parsed.analysis_summary.substring(0, maxLength) + '...'
        : parsed.key_challenges?.[0] || 'Strategic analysis completed';
      
      const fullText = formatStrategyOutput(parsed);
      
      return {
        summary,
        fullText,
        highlights: parsed.key_challenges?.slice(0, 3)
      };
    }
    
    // Persona Agent output
    if (parsed.persona_name || parsed.demographics || parsed.psychographics) {
      const summary = parsed.persona_name 
        ? `${parsed.persona_name}: ${parsed.demographics?.job_title || 'Customer Persona'}`
        : 'Persona profile created';
      
      const fullText = formatPersonaOutput(parsed);
      
      return {
        summary,
        fullText,
        highlights: parsed.pain_points?.slice(0, 3)
      };
    }
    
    // Content Agent output
    if (parsed.content_piece || parsed.content_strategy || parsed.content_calendar) {
      const summary = parsed.content_strategy?.objective
        ? parsed.content_strategy.objective.substring(0, maxLength) + '...'
        : parsed.content_piece?.substring(0, maxLength) + '...' || 'Content created';
      
      const fullText = formatContentOutput(parsed);
      
      return {
        summary,
        fullText,
        highlights: parsed.key_messages?.slice(0, 3)
      };
    }
    
    // Analytics Agent output
    if (parsed.performance_summary || parsed.metrics || parsed.insights) {
      const summary = parsed.performance_summary
        ? parsed.performance_summary.substring(0, maxLength) + '...'
        : parsed.insights?.[0]?.insight || 'Analytics report generated';
      
      const fullText = formatAnalyticsOutput(parsed);
      
      return {
        summary,
        fullText,
        highlights: parsed.insights?.slice(0, 3).map((i: any) => i.insight)
      };
    }
    
    // Fallback for unknown format
    return {
      summary: content.substring(0, maxLength) + '...',
      fullText: content,
      highlights: []
    };
    
  } catch (error) {
    // If not JSON, return as-is
    return {
      summary: content.substring(0, maxLength) + '...',
      fullText: content,
      highlights: []
    };
  }
}

function formatStrategyOutput(data: any): string {
  const parts: string[] = [];
  
  if (data.analysis_summary) {
    parts.push(`**Strategic Analysis**\n${data.analysis_summary}`);
  }
  
  if (data.key_challenges?.length > 0) {
    parts.push(`**Key Challenges**\n${data.key_challenges.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`);
  }
  
  if (data.opportunities?.length > 0) {
    parts.push(`**Opportunities**\n${data.opportunities.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`);
  }
  
  if (data.recommendations?.length > 0) {
    parts.push(`**Strategic Recommendations**`);
    data.recommendations.forEach((rec: any, i: number) => {
      const priority = rec.priority ? ` (${rec.priority.toUpperCase()})` : '';
      parts.push(`\n${i + 1}. **${rec.action}**${priority}`);
      if (rec.reasoning) parts.push(`   *Reasoning:* ${rec.reasoning}`);
      if (rec.timeline) parts.push(`   *Timeline:* ${rec.timeline}`);
    });
  }
  
  if (data.next_steps?.length > 0) {
    parts.push(`**Next Steps**\n${data.next_steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`);
  }
  
  if (data.confidence_score) {
    parts.push(`**Confidence:** ${Math.round(data.confidence_score * 100)}%`);
  }
  
  return parts.join('\n\n');
}

function formatPersonaOutput(data: any): string {
  const parts: string[] = [];
  
  if (data.persona_name) {
    parts.push(`**Persona:** ${data.persona_name}`);
  }
  
  if (data.demographics) {
    const demo = data.demographics;
    const demoLines: string[] = ['**Demographics**'];
    if (demo.age_range) demoLines.push(`• Age: ${demo.age_range}`);
    if (demo.location) demoLines.push(`• Location: ${demo.location}`);
    if (demo.income_level) demoLines.push(`• Income: ${demo.income_level}`);
    if (demo.education) demoLines.push(`• Education: ${demo.education}`);
    if (demo.job_title) demoLines.push(`• Job Title: ${demo.job_title}`);
    parts.push(demoLines.join('\n'));
  }
  
  if (data.psychographics) {
    const psycho = data.psychographics;
    const psychoLines: string[] = ['**Psychographics**'];
    if (psycho.values?.length > 0) psychoLines.push(`• Values: ${psycho.values.join(', ')}`);
    if (psycho.interests?.length > 0) psychoLines.push(`• Interests: ${psycho.interests.join(', ')}`);
    if (psycho.lifestyle) psychoLines.push(`• Lifestyle: ${psycho.lifestyle}`);
    if (psycho.personality_traits?.length > 0) psychoLines.push(`• Traits: ${psycho.personality_traits.join(', ')}`);
    parts.push(psychoLines.join('\n'));
  }
  
  if (data.pain_points?.length > 0) {
    parts.push(`**Pain Points**\n${data.pain_points.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`);
  }
  
  if (data.motivations?.length > 0) {
    parts.push(`**Motivations**\n${data.motivations.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}`);
  }
  
  if (data.recommended_messaging) {
    parts.push(`**Recommended Messaging**\n${data.recommended_messaging}`);
  }
  
  return parts.join('\n\n');
}

function formatContentOutput(data: any): string {
  const parts: string[] = [];
  
  if (data.content_strategy) {
    const strategy = data.content_strategy;
    if (strategy.objective) parts.push(`**Objective:** ${strategy.objective}`);
    if (strategy.target_audience) parts.push(`**Target Audience:** ${strategy.target_audience}`);
  }
  
  if (data.content_piece) {
    parts.push(`**Content**\n${data.content_piece}`);
  }
  
  if (data.key_messages?.length > 0) {
    parts.push(`**Key Messages**\n${data.key_messages.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}`);
  }
  
  if (data.content_calendar?.length > 0) {
    parts.push(`**Content Calendar**`);
    data.content_calendar.forEach((item: any) => {
      parts.push(`\n• ${item.date}: ${item.topic} (${item.format})`);
    });
  }
  
  if (data.seo_keywords?.length > 0) {
    parts.push(`**SEO Keywords:** ${data.seo_keywords.join(', ')}`);
  }
  
  return parts.join('\n\n');
}

function formatAnalyticsOutput(data: any): string {
  const parts: string[] = [];
  
  if (data.performance_summary) {
    parts.push(`**Performance Summary**\n${data.performance_summary}`);
  }
  
  if (data.metrics) {
    const metrics = data.metrics;
    const metricLines: string[] = ['**Key Metrics**'];
    Object.entries(metrics).forEach(([key, value]) => {
      metricLines.push(`• ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`);
    });
    parts.push(metricLines.join('\n'));
  }
  
  if (data.insights?.length > 0) {
    parts.push(`**Insights**`);
    data.insights.forEach((insight: any, i: number) => {
      parts.push(`\n${i + 1}. ${insight.insight}`);
      if (insight.recommendation) parts.push(`   → ${insight.recommendation}`);
    });
  }
  
  if (data.action_items?.length > 0) {
    parts.push(`**Action Items**\n${data.action_items.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}`);
  }
  
  return parts.join('\n\n');
}

/**
 * Format agent output for context injection
 * Provides clean, readable context for other agents
 */
export function formatOutputForContext(content: string, agentType: string, title: string): string {
  const formatted = formatAgentOutput(content);
  
  return `[Previous ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Analysis: ${title}]

${formatted.fullText}

---`;
}