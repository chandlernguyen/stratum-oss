/**
 * Test fixtures for agent tool responses
 * Used across E2E and unit tests
 */

export const SWOT_FIXTURE = {
  strengths: [
    'Strong technical team with diverse expertise',
    'Innovative product with unique features',
    'Established customer base',
    'Positive brand reputation'
  ],
  weaknesses: [
    'Limited marketing budget',
    'Small sales team',
    'Geographic concentration',
    'Dependency on key suppliers'
  ],
  opportunities: [
    'Growing market demand',
    'Digital transformation trends',
    'Partnership opportunities',
    'International expansion'
  ],
  threats: [
    'Intense competition',
    'Economic uncertainty',
    'Regulatory changes',
    'Technology disruption'
  ]
};

export const PERSONA_FIXTURE = {
  name: 'Tech-Savvy Professional',
  age: '28-35',
  occupation: 'Product Manager',
  income: '$80,000-120,000',
  goals: [
    'Increase productivity',
    'Stay ahead of trends',
    'Advance career'
  ],
  pain_points: [
    'Time management',
    'Information overload',
    'Work-life balance'
  ],
  preferred_channels: ['LinkedIn', 'Email', 'Webinars'],
  buying_behavior: 'Research-driven, seeks peer reviews'
};

export const PORTERS_FORCES_FIXTURE = {
  threat_of_new_entrants: 'Medium - Barriers exist but can be overcome with sufficient capital',
  bargaining_power_of_suppliers: 'Low - Multiple suppliers available',
  bargaining_power_of_buyers: 'High - Customers have many alternatives',
  threat_of_substitutes: 'Medium - Some alternatives exist but not perfect substitutes',
  industry_rivalry: 'High - Intense competition among existing players'
};

export const BUSINESS_CANVAS_FIXTURE = {
  key_partners: ['Technology providers', 'Distribution channels', 'Marketing agencies'],
  key_activities: ['Product development', 'Customer support', 'Marketing'],
  key_resources: ['Technical team', 'IP/Patents', 'Brand'],
  value_propositions: ['Time savings', 'Cost efficiency', 'Superior quality'],
  customer_segments: ['SMEs', 'Enterprise', 'Startups'],
  customer_relationships: ['Personal assistance', 'Self-service', 'Communities'],
  channels: ['Direct sales', 'Online platform', 'Partners'],
  cost_structure: ['Development costs', 'Marketing', 'Operations'],
  revenue_streams: ['Subscriptions', 'Professional services', 'Licensing']
};

export const CONTENT_IDEAS_FIXTURE = [
  {
    title: '10 Ways to Boost Your Marketing ROI',
    description: 'Practical tips for maximizing marketing investment returns',
    format: 'Blog post',
    target_audience: 'Marketing managers'
  },
  {
    title: 'The Future of AI in Marketing',
    description: 'Exploring upcoming AI trends and their impact',
    format: 'Webinar',
    target_audience: 'C-suite executives'
  },
  {
    title: 'Customer Success Stories',
    description: 'Case studies showcasing real client wins',
    format: 'Video series',
    target_audience: 'Prospects'
  }
];

export const ANALYSIS_REPORT_FIXTURE = {
  summary: 'Campaign performance exceeded expectations with 150% ROI',
  metrics: {
    impressions: 1000000,
    clicks: 50000,
    conversions: 500,
    conversion_rate: '1%',
    cost_per_conversion: '$20',
    roi: '150%'
  },
  insights: [
    'Mobile traffic outperformed desktop by 2:1',
    'Best performing ad creative featured customer testimonials',
    'Peak conversion times were weekday evenings'
  ],
  recommendations: [
    'Increase mobile ad spend by 30%',
    'Create more testimonial-based content',
    'Schedule campaigns for evening delivery'
  ]
};

export const OPTIMIZATION_FIXTURE = [
  {
    priority: 'high',
    action: 'Improve page load speed',
    impact: 'Could increase conversions by 20%',
    effort: 'medium'
  },
  {
    priority: 'high',
    action: 'Add social proof elements',
    impact: 'Expected 15% lift in trust metrics',
    effort: 'low'
  },
  {
    priority: 'medium',
    action: 'A/B test pricing display',
    impact: 'Potential 10% revenue increase',
    effort: 'low'
  }
];

// Mock response generators
export function mockToolResponse(toolType: string, data: any) {
  return {
    content: `Here's the ${toolType} analysis you requested:`,
    structured_data: data,
    session_id: 'test-session-123',
    message_id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

export function mockTextResponse(content: string) {
  return {
    content,
    structured_data: null,
    session_id: 'test-session-123',
    message_id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

// Agent-specific response builders
export const AGENT_RESPONSES = {
  strategy: {
    greeting: mockTextResponse("Hello! I'm your Strategy Agent. I help you see the big picture and plan for growth. I can perform SWOT analyses, Porter's Five Forces, and create business model canvases."),
    swot: mockToolResponse('swot', SWOT_FIXTURE),
    porters: mockToolResponse('porters', PORTERS_FORCES_FIXTURE),
    canvas: mockToolResponse('canvas', BUSINESS_CANVAS_FIXTURE)
  },
  persona: {
    greeting: mockTextResponse("I help you understand your ideal customers deeply. I can create detailed personas, map buyer journeys, and generate interview questions."),
    persona: mockToolResponse('persona', PERSONA_FIXTURE)
  },
  content: {
    greeting: mockTextResponse("I help you create engaging content that converts. I can generate content ideas, draft blog posts, create social media content, and plan content calendars."),
    ideas: mockToolResponse('content_ideas', CONTENT_IDEAS_FIXTURE)
  },
  analytics: {
    greeting: mockTextResponse("I help you understand your marketing performance through data. I can analyze campaigns, identify optimization opportunities, and forecast trends."),
    report: mockToolResponse('analysis_report', ANALYSIS_REPORT_FIXTURE),
    optimizations: mockToolResponse('optimizations', OPTIMIZATION_FIXTURE)
  }
};