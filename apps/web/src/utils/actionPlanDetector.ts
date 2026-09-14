// Action Plan Detection Utility
// Intelligently detects action plans in Strategy Agent responses

export interface ActionPlanItem {
  text: string;
  timeframe?: string;
  category: 'research' | 'marketing' | 'sales' | 'product' | 'general';
  suggestedAgent?: string;
  confidence: number;
}

export interface DetectedActionPlan {
  items: ActionPlanItem[];
  overallTimeframe?: string;
  hasActionableTasks: boolean;
}

// Smart categorization based on keywords
const categoryKeywords: Record<string, string[]> = {
  research: ['research', 'validation', 'interview', 'analysis', 'audit', 'TAM', 'competitor', 'survey', 'study', 'investigate'],
  marketing: ['marketing', 'messaging', 'value proposition', 'campaign', 'brand', 'content', 'promotion', 'advertising', 'positioning'],
  sales: ['sales', 'enablement', 'scripts', 'pipeline', 'conversion', 'leads', 'outreach', 'pitch', 'close'],
  product: ['product', 'feature', 'development', 'build', 'MVP', 'prototype', 'design', 'implementation', 'technical'],
};

// Agent mapping based on task type
const agentMapping: Record<string, string> = {
  research: 'persona',
  marketing: 'content',
  sales: 'campaign_planning',
  product: 'quick_wins',
  general: 'quick_wins'
};

// Detect category from text
export function detectCategory(text: string): 'research' | 'marketing' | 'sales' | 'product' | 'general' {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category as any;
    }
  }
  
  return 'general';
}

// Calculate confidence score for action item
export function calculateConfidence(text: string, category: string): number {
  // Base confidence from category match
  let confidence = category !== 'general' ? 0.6 : 0.3;
  
  // Boost confidence for specific action verbs
  const actionVerbs = ['conduct', 'create', 'develop', 'analyze', 'build', 'implement', 'execute', 'launch', 'design', 'establish'];
  if (actionVerbs.some(verb => text.toLowerCase().includes(verb))) {
    confidence += 0.2;
  }
  
  // Boost for timeframe presence
  if (text.match(/\d+\s*(week|month|day|quarter)/i)) {
    confidence += 0.1;
  }
  
  // Boost for specificity (longer, detailed tasks)
  if (text.split(' ').length > 10) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1);
}

// Check if text is actionable
export function isActionable(text: string): boolean {
  // Exclude common false positives
  const excludePatterns = [
    /^(Note|Remember|Consider|Keep in mind)/i,
    /historical|past|previous/i,
    /already completed|has been done/i,
    /example:|for instance/i,
    /currently|existing|present/i
  ];
  
  return !excludePatterns.some(pattern => text.match(pattern));
}

// Extract overall timeframe from content
export function extractOverallTimeframe(content: string): string | undefined {
  // Look for patterns like "(1-2 months)" or "(2 weeks)"
  const match = content.match(/\((\d+[-\d]*\s*(?:weeks?|months?|days?|quarters?))\)/);
  return match ? match[1] : undefined;
}

// Main detection function
export function detectActionPlan(content: string): DetectedActionPlan | null {
  if (!content || content.length < 50) return null;
  
  // Pattern matching for different action plan formats
  const patterns = {
    // Numbered items with optional timeframe: "1. Deep Market Validation (1-2 months):"
    numbered: /^(\d+)\.\s+([^:\n]+?)(?:\s*\(([^)]+)\))?:?/gm,
    // Bulleted items with optional timeframe: "- Marketing Strategy (2 weeks):"
    bulleted: /^[\•\-\*]\s+([^:\n]+?)(?:\s*\(([^)]+)\))?:?/gm,
    // Heading-based sections: "## Marketing & Sales Re-alignment (1-3 months)"
    headings: /^#{2,3}\s+(.+?)(?:\s*\(([^)]+)\))?$/gm,
    // Keywords that indicate action plans
    keywords: /(?:Action Plan|Implementation Steps|Next Steps|Roadmap|Strategy|Recommended Actions|Key Initiatives)/i
  };

  const items: ActionPlanItem[] = [];
  
  // Check if content likely contains an action plan
  const hasActionPlanKeywords = patterns.keywords.test(content);
  if (!hasActionPlanKeywords) {
    // Secondary check for numbered/bulleted lists with timeframes
    const hasTimeframes = /\(\d+[-\d]*\s*(?:weeks?|months?|days?)\)/i.test(content);
    if (!hasTimeframes) return null;
  }
  
  // Extract numbered action items
  let match;
  const processedTexts = new Set<string>(); // Avoid duplicates
  
  // Process numbered items
  patterns.numbered.lastIndex = 0;
  while ((match = patterns.numbered.exec(content)) !== null) {
    const [, , text, timeframe] = match;
    const cleanText = text.trim();
    
    if (cleanText && !processedTexts.has(cleanText) && isActionable(cleanText)) {
      const category = detectCategory(cleanText);
      items.push({
        text: cleanText,
        timeframe: timeframe?.trim(),
        category,
        suggestedAgent: agentMapping[category],
        confidence: calculateConfidence(cleanText, category)
      });
      processedTexts.add(cleanText);
    }
  }
  
  // Process bulleted items if no numbered items found
  if (items.length === 0) {
    patterns.bulleted.lastIndex = 0;
    while ((match = patterns.bulleted.exec(content)) !== null) {
      const [, text, timeframe] = match;
      const cleanText = text.trim();
      
      if (cleanText && !processedTexts.has(cleanText) && isActionable(cleanText)) {
        const category = detectCategory(cleanText);
        items.push({
          text: cleanText,
          timeframe: timeframe?.trim(),
          category,
          suggestedAgent: agentMapping[category],
          confidence: calculateConfidence(cleanText, category)
        });
        processedTexts.add(cleanText);
      }
    }
  }
  
  // Process heading-based sections if still no items
  if (items.length === 0) {
    patterns.headings.lastIndex = 0;
    while ((match = patterns.headings.exec(content)) !== null) {
      const [, heading, timeframe] = match;
      const cleanText = heading.trim();
      
      if (cleanText && !processedTexts.has(cleanText) && isActionable(cleanText)) {
        const category = detectCategory(cleanText);
        items.push({
          text: cleanText,
          timeframe: timeframe?.trim(),
          category,
          suggestedAgent: agentMapping[category],
          confidence: calculateConfidence(cleanText, category)
        });
        processedTexts.add(cleanText);
      }
    }
  }
  
  // Only return if we have high confidence this is an action plan
  const hasHighConfidenceItems = items.some(item => item.confidence > 0.7);
  if (items.length > 0 && hasHighConfidenceItems) {
    return {
      items: items.filter(item => item.confidence > 0.5), // Filter out low confidence items
      overallTimeframe: extractOverallTimeframe(content),
      hasActionableTasks: true
    };
  }
  
  return null;
}

// Generate suggested prompt for the next agent
export function generatePromptForAgent(agent: string, items: ActionPlanItem[]): string {
  const taskList = items.map(item => `- ${item.text}${item.timeframe ? ` (${item.timeframe})` : ''}`).join('\n');
  
  const prompts: Record<string, string> = {
    persona: `Based on our strategic analysis, help me create detailed buyer personas for the following market validation tasks:\n\n${taskList}\n\nFocus on understanding their pain points, decision-making process, and preferred communication channels.`,
    
    content: `We need to develop marketing materials for the following strategic initiatives:\n\n${taskList}\n\nPlease create content that aligns with our repositioning strategy and resonates with our target audience.`,
    
    campaign_planning: `Help me execute a campaign plan for these strategic priorities:\n\n${taskList}\n\nInclude specific channels, timelines, budget allocation, and success metrics for each initiative.`,
    
    quick_wins: `Identify quick wins we can implement immediately from these action items:\n\n${taskList}\n\nPrioritize actions that can show measurable results within 2 weeks and require minimal resources.`
  };
  
  return prompts[agent] || `Help me work on the following strategic tasks:\n\n${taskList}`;
}

// Extract relevant insights from strategy output for the target agent
export function extractRelevantInsights(strategyOutput: any, targetAgent: string): any {
  if (!strategyOutput) return {};
  
  const insights: any = {};
  
  switch (targetAgent) {
    case 'persona':
      if (strategyOutput.swot) {
        insights.targetMarket = strategyOutput.swot.opportunities?.[0];
        insights.marketWeaknesses = strategyOutput.swot.weaknesses;
      }
      if (strategyOutput.business_model_canvas) {
        insights.customerSegments = strategyOutput.business_model_canvas.customer_segments;
        insights.valueProposition = strategyOutput.business_model_canvas.value_proposition;
      }
      if (strategyOutput.jobs_to_be_done) {
        insights.customerJobs = strategyOutput.jobs_to_be_done.jobs;
      }
      break;
      
    case 'content':
      if (strategyOutput.business_model_canvas) {
        insights.valueProposition = strategyOutput.business_model_canvas.value_proposition;
        insights.channels = strategyOutput.business_model_canvas.channels;
      }
      if (strategyOutput.blue_ocean) {
        insights.differentiators = strategyOutput.blue_ocean.create;
        insights.eliminateFeatures = strategyOutput.blue_ocean.eliminate;
      }
      if (strategyOutput.porters_five_forces) {
        insights.competitiveLandscape = strategyOutput.porters_five_forces;
      }
      break;
      
    case 'campaign_planning':
      if (strategyOutput.ice_prioritization) {
        insights.priorities = strategyOutput.ice_prioritization.tasks;
      }
      if (strategyOutput.okr_framework) {
        insights.goals = strategyOutput.okr_framework.goals;
        insights.keyResults = strategyOutput.okr_framework.goals.flatMap((o: any) => o.key_results);
      }
      if (strategyOutput.three_horizons) {
        insights.horizons = strategyOutput.three_horizons;
      }
      break;
      
    case 'quick_wins':
      if (strategyOutput.three_horizons) {
        insights.immediateActions = strategyOutput.three_horizons.horizon1;
      }
      if (strategyOutput.ice_prioritization) {
        // Get high impact, low effort items
        insights.quickWins = strategyOutput.ice_prioritization.tasks
          ?.filter((t: any) => t.impact >= 8 && t.ease >= 7)
          ?.slice(0, 5);
      }
      break;
  }
  
  return insights;
}