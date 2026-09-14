import {
  Lightbulb, // Strategy
  Users, // Persona
  Edit3, // Content
  TrendingUp, // Analytics
  Rocket, // Campaign Execution
  Target, // Competitive Intelligence
  Award // Client Success
} from 'lucide-react';
import i18next from 'i18next';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';
export type AgentType =
  | 'strategy'
  | 'persona'
  | 'marketing_strategy'
  | 'content'
  | 'campaign_planning'
  | 'competitive_intelligence'
  | 'client_success'
  | 'performance_intelligence'  // Replaces analytics, roi_budget, quick_wins
  | 'quick_start';

interface ToolHint {
  // Display label (what user sees) - Keep under 50 chars for mobile
  trigger: string;

  // Full contextual prompt sent to agent - 150-300 chars with specific scenario
  fullPrompt?: string;

  // Tooltip explanation of what this suggestion does
  tooltip?: string;

  // Visual elements
  icon?: string;           // Emoji: 🎯 📊 👥 💼 📝 🚀
  estimatedTime?: string;  // "5 min", "10-15 min"
  framework?: string;      // "SWOT", "Porter's Five Forces", "Multi-framework"

  // Org-specific label overrides
  smeLabel?: string;       // Override trigger for SME users
  agencyLabel?: string;    // Override trigger for Agency users

  // Deprecated: Legacy field for backward compatibility
  description: string;
  expectedTool?: string;
}

interface AgentIdentity {
  icon: any;
  color: string;
  name: string;
  description: string;
  greeting: string;
  hints: {
    beginner: ToolHint[];
    intermediate: ToolHint[];
    expert: ToolHint[];
  };
}

export const AGENT_IDENTITIES: Record<AgentType, AgentIdentity> = {
  strategy: {
    icon: Lightbulb,
    color: 'indigo',
    name: 'Strategy Agent',
    description: 'Your strategic planning specialist',
    greeting: 'Welcome! Let\'s tackle your business challenges together. I can help you find clarity and build a winning strategy using proven frameworks like SWOT, Porter\'s Five Forces, Three Horizons of Growth, or Blue Ocean Strategy. What\'s on your mind today? We can explore strategic questions, analyze competitive landscapes, or simply start with what\'s most important to you right now.',
    hints: {
      beginner: [
        {
          trigger: "Should I expand or specialize?",
          smeLabel: "Should I expand or specialize?",
          agencyLabel: "Should my client expand or specialize?",
          fullPrompt: "I'm running a [business type] with [revenue/size]. My challenge is [specific issue]. Should I expand into new markets or specialize deeper in my current niche? Help me analyze this using strategic frameworks.",
          tooltip: "Porter's Five Forces + VRIO analysis for growth decisions",
          description: "Strategic growth direction analysis",
          icon: "🎯",
          estimatedTime: "5-7 min",
          framework: "Multi-framework"
        },
        {
          trigger: "Run SWOT for my pricing",
          smeLabel: "Run SWOT for my pricing",
          agencyLabel: "Run SWOT for client pricing",
          fullPrompt: "Analyze my current pricing strategy using SWOT. I'm [B2B/B2C], charging [$X/month], competing with [competitors]. What are my strengths, weaknesses, opportunities, and threats in pricing?",
          tooltip: "Pricing-focused SWOT with actionable recommendations",
          description: "Pricing strategy analysis",
          icon: "💰",
          estimatedTime: "4-6 min",
          framework: "SWOT"
        }
      ],
      intermediate: [
        {
          trigger: "BCG Matrix: Evaluate 3 product lines",
          smeLabel: "BCG Matrix: Evaluate my 3 products",
          agencyLabel: "BCG Matrix: Evaluate client's 3 products",
          fullPrompt: "I have 3 product lines: [Product A with growth/revenue], [Product B with growth/revenue], [Product C with growth/revenue]. Use BCG Growth-Share Matrix to analyze which are Stars, Cash Cows, Question Marks, or Dogs. Help me decide resource allocation.",
          tooltip: "Portfolio analysis with investment recommendations",
          description: "Product portfolio management",
          icon: "📊",
          estimatedTime: "6-8 min",
          framework: "BCG Matrix"
        },
        {
          trigger: "Blue Ocean: Find untapped market",
          smeLabel: "Blue Ocean: Find my market gap",
          agencyLabel: "Blue Ocean: Find client's market gap",
          fullPrompt: "My industry is crowded with competitors offering [similar features/services]. Use Blue Ocean Strategy to help me find uncontested market space. What value can I eliminate, reduce, raise, or create?",
          tooltip: "Strategic differentiation using ERRC Grid",
          description: "Market differentiation strategy",
          icon: "🌊",
          estimatedTime: "7-10 min",
          framework: "Blue Ocean"
        },
        {
          trigger: "VRIO: Analyze competitive advantages",
          smeLabel: "VRIO: What are my advantages?",
          agencyLabel: "VRIO: Client competitive advantages",
          fullPrompt: "Analyze my key resources and capabilities using VRIO framework: [list 3-5 resources like technology, team, brand, process]. Which provide sustainable competitive advantage (Valuable, Rare, Inimitable, Organized)?",
          tooltip: "Resource-based competitive advantage assessment",
          description: "Competitive advantage analysis",
          icon: "💎",
          estimatedTime: "5-7 min",
          framework: "VRIO"
        },
        {
          trigger: "Three Horizons: Balance growth",
          smeLabel: "Three Horizons: My growth plan",
          agencyLabel: "Three Horizons: Client growth plan",
          fullPrompt: "Help me balance my growth strategy across Three Horizons: H1 (core business optimization), H2 (emerging opportunities), H3 (future innovation). Current revenue: [$ amount], industry: [industry], stage: [startup/growth/mature].",
          tooltip: "Balanced growth planning framework",
          description: "Growth horizon planning",
          icon: "📈",
          estimatedTime: "8-10 min",
          framework: "Three Horizons"
        }
      ],
      expert: [
        {
          trigger: "Complete strategic framework suite",
          smeLabel: "Complete strategy analysis for my business",
          agencyLabel: "Complete strategy analysis for client",
          fullPrompt: "Run comprehensive strategic analysis: SWOT → Porter's Five Forces → VRIO → Three Horizons. I'm a [company description with ARR/revenue], [market position], facing [growth challenges]. Provide integrated recommendations with prioritized actions.",
          tooltip: "4-framework analysis with synthesized insights",
          description: "Comprehensive multi-framework analysis",
          icon: "🎯",
          estimatedTime: "15-20 min",
          framework: "Multi-framework"
        },
        {
          trigger: "McKinsey 7S: Organizational alignment",
          smeLabel: "McKinsey 7S: Align my organization",
          agencyLabel: "McKinsey 7S: Align client organization",
          fullPrompt: "Analyze organizational effectiveness using McKinsey 7S: Strategy, Structure, Systems, Shared Values, Style, Staff, Skills. We have [# employees], [organizational structure], and are [scaling/restructuring/stabilizing]. What's misaligned?",
          tooltip: "Organizational effectiveness assessment",
          description: "Org alignment framework",
          icon: "🏢",
          estimatedTime: "10-12 min",
          framework: "McKinsey 7S"
        },
        {
          trigger: "Strategic OKRs for next quarter",
          smeLabel: "Set my strategic OKRs for Q[X]",
          agencyLabel: "Set client strategic OKRs for Q[X]",
          fullPrompt: "Help me set strategic OKRs for [quarter/year]. Company goal: [primary objective like reach $XM ARR, expand to Y market]. Create 3-5 objectives with measurable key results that cascade from strategy to execution.",
          tooltip: "Goal-setting with measurable outcomes",
          description: "Strategic OKR framework",
          icon: "🎯",
          estimatedTime: "8-10 min",
          framework: "OKRs"
        }
      ]
    }
  },
  
  persona: {
    icon: Users,
    color: 'purple',
    name: 'Persona Agent',
    description: 'Your customer insight specialist',
    greeting: 'I help you understand your ideal customers deeply. I can create detailed personas, map buyer journeys, and generate interview questions.',
    hints: {
      beginner: [
        {
          trigger: "Who should I target first?",
          smeLabel: "Who should I target first?",
          agencyLabel: "Who should this client target?",
          fullPrompt: "I'm selling [product/service] at [$X price point]. I currently have customers in [industries/segments], but need to focus. Help me identify my most valuable target persona: their role, company size, pain points, and buying behavior.",
          tooltip: "Primary persona with demographics + psychographics",
          description: "Identify ideal customer profile",
          icon: "👥",
          estimatedTime: "5-7 min"
        },
        {
          trigger: "Map my customer's buying journey",
          smeLabel: "Map my customer's buying journey",
          agencyLabel: "Map client's customer journey",
          fullPrompt: "For [product type] at [$X price point], what does the customer journey look like from awareness to purchase? Map the stages (Awareness → Consideration → Decision → Retention), key touchpoints, decision criteria, and objections at each stage.",
          tooltip: "Journey map with stage-specific tactics",
          description: "Buyer journey mapping",
          icon: "🗺️",
          estimatedTime: "6-8 min"
        }
      ],
      intermediate: [
        {
          trigger: "Create persona for [specific role/industry]",
          smeLabel: "Create detailed persona for [role]",
          agencyLabel: "Create client's target persona",
          fullPrompt: "I'm targeting [job title/role] at [company size/industry] for my [product/service] at [$X pricing]. Create detailed persona: demographics (age, education, seniority), psychographics (values, motivations), pain points, goals, objections, and how they currently solve these problems.",
          tooltip: "Industry-specific persona with buying psychology",
          description: "Detailed persona development",
          icon: "📋",
          estimatedTime: "7-10 min"
        },
        {
          trigger: "Generate customer interview questions",
          smeLabel: "Interview questions for my customers",
          agencyLabel: "Interview questions for client's customers",
          fullPrompt: "Generate 15-20 customer interview questions to validate my persona assumptions for [target segment]. Cover: demographics, pain points, current solutions, decision process, budget, and what would make them switch. Group by discovery themes.",
          tooltip: "Validation questions organized by theme",
          description: "Interview question generation",
          icon: "❓",
          estimatedTime: "4-6 min"
        }
      ],
      expert: [
        {
          trigger: "Multi-persona segmentation strategy",
          smeLabel: "Create 3-persona segmentation strategy",
          agencyLabel: "Create client's persona segments",
          fullPrompt: "I serve multiple customer segments. Create 3 distinct personas covering [Segment A: description], [Segment B: description], [Segment C: description]. For each: demographics, psychographics, pain points, journey differences, and messaging angles. Prioritize by revenue potential.",
          tooltip: "Multiple personas with differentiation matrix",
          description: "Multi-persona strategy",
          icon: "👥",
          estimatedTime: "12-15 min"
        },
        {
          trigger: "Jobs-to-be-Done persona analysis",
          smeLabel: "JTBD analysis for my customers",
          agencyLabel: "JTBD analysis for client's customers",
          fullPrompt: "Analyze my customer personas using Jobs-to-be-Done framework. Target: [persona/segment]. What job are they 'hiring' my product to do? Functional jobs, emotional jobs, and social jobs. What are they 'firing' (current solution)? What progress are they trying to make?",
          tooltip: "JTBD framework for deeper motivation insights",
          description: "Jobs-to-be-Done analysis",
          icon: "💼",
          estimatedTime: "8-10 min"
        }
      ]
    }
  },

  marketing_strategy: {
    icon: Target,
    color: 'purple',
    name: 'Marketing Strategy Agent',
    description: 'Your go-to-market specialist',
    greeting: 'I\'m your Marketing Strategy Agent, ready to create a comprehensive marketing plan tailored to your business. I\'ll analyze your business context, personas, and goals to develop actionable strategies with messaging frameworks, channel recommendations, and budget optimization.',
    hints: {
      beginner: [
        {
          trigger: "Which channels should I focus on?",
          smeLabel: "Which channels should I focus on?",
          agencyLabel: "Which channels should client prioritize?",
          fullPrompt: "I'm [business type] selling [product/service] at [$X price point] to [target persona]. With limited resources, which 2-3 marketing channels should I prioritize? Recommend channels based on: audience fit, cost-effectiveness, and expected ROI. Include tactical next steps for each.",
          tooltip: "Data-driven channel selection with priorities",
          description: "Channel selection strategy",
          icon: "🎯",
          estimatedTime: "5-7 min",
          expectedTool: "channel_strategy"
        },
        {
          trigger: "Create go-to-market plan for new product",
          smeLabel: "Create go-to-market plan for my new product",
          agencyLabel: "Create go-to-market plan for client launch",
          fullPrompt: "I'm launching [product/service] for [target persona] at [$X]. Create a go-to-market plan including: (1) positioning statement, (2) key messaging, (3) launch channels (3-4 recommendations), (4) 90-day timeline, (5) success metrics. Budget: [range if known].",
          tooltip: "Complete GTM strategy with timeline and metrics",
          description: "Get a complete strategy quickly",
          icon: "🚀",
          estimatedTime: "8-10 min",
          expectedTool: "quick_strategy"
        }
      ],
      intermediate: [
        {
          trigger: "Build messaging framework (Value Pyramid)",
          smeLabel: "Build messaging framework for my offering",
          agencyLabel: "Build messaging framework for client",
          fullPrompt: "Create a Value Pyramid messaging framework for [product/service] targeting [persona]. Include: (1) Functional benefits (what it does), (2) Emotional benefits (how it makes them feel), (3) Identity/life-changing benefits (who they become). Then provide: tagline, elevator pitch (30 sec), key messages (3-5), and objection handling.",
          tooltip: "Complete messaging architecture with objection handling",
          description: "Value props and key messages",
          icon: "💬",
          estimatedTime: "10-12 min",
          framework: "Value Pyramid",
          expectedTool: "messaging_framework"
        },
        {
          trigger: "Allocate $X/month budget (70-20-10)",
          smeLabel: "Allocate my $X/month marketing budget",
          agencyLabel: "Allocate client's $X/month budget",
          fullPrompt: "I have [$X/month] marketing budget for [business type] targeting [persona]. Apply 70-20-10 rule: 70% proven channels, 20% promising experiments, 10% new ideas. Recommend specific allocation across channels with expected outcomes and monthly spend breakdown.",
          tooltip: "Budget optimization with ROI projections",
          description: "70-20-10 budget optimization",
          icon: "💰",
          estimatedTime: "7-9 min",
          framework: "70-20-10",
          expectedTool: "budget_allocation"
        }
      ],
      expert: [
        {
          trigger: "Zero-budget growth tactics ($0 spend)",
          smeLabel: "Zero-budget growth tactics for my business",
          agencyLabel: "Zero-budget growth tactics for client",
          fullPrompt: "With $0 marketing budget, create growth strategy for [business type] targeting [persona]. Focus on: (1) Organic content (SEO, social), (2) Community building, (3) Partnerships/co-marketing, (4) Product-led growth tactics, (5) Referral mechanics. Provide 10-15 specific, actionable tactics ranked by effort vs impact.",
          tooltip: "Comprehensive $0 growth playbook (12-15 min)",
          description: "Marketing without spending",
          icon: "🌱",
          estimatedTime: "12-15 min",
          expectedTool: "zero_budget_tactics"
        },
        {
          trigger: "Integrated multi-channel campaign",
          smeLabel: "Multi-channel campaign for my [goal]",
          agencyLabel: "Multi-channel campaign for client [goal]",
          fullPrompt: "Design integrated campaign for [specific goal - e.g., product launch, lead gen, brand awareness]. Target: [persona]. Channels: [3-5 channels]. Create: (1) Campaign theme and core message, (2) Channel-specific tactics and content, (3) Cross-channel touchpoint map, (4) Week-by-week execution timeline, (5) KPIs per channel. Budget: [$X if known].",
          tooltip: "Complete campaign with touchpoint orchestration (15-18 min)",
          description: "Complex campaign planning",
          icon: "🎪",
          estimatedTime: "15-18 min",
          framework: "Multi-channel",
          expectedTool: "campaign_strategy"
        }
      ]
    }
  },

  content: {
    icon: Edit3,
    color: 'green',
    name: 'Content Agent',
    description: 'Your content creation specialist',
    greeting: 'I help you create engaging content that converts. I can generate content ideas, draft blog posts, create social media content, and plan content calendars.',
    hints: {
      beginner: [
        {
          trigger: "Write SEO blog post on [topic]",
          smeLabel: "Write SEO blog post on [topic]",
          agencyLabel: "Write SEO blog for client on [topic]",
          fullPrompt: "Write a 1,200-word SEO-optimized blog post about [topic] for [target persona - e.g., construction ops managers, B2B SaaS buyers]. Include: H2/H3 structure, primary keyword placement, meta description, internal link opportunities, and strong CTA. Make it engaging and actionable.",
          tooltip: "Complete blog draft with SEO optimization",
          description: "Create your first blog post",
          icon: "📝",
          estimatedTime: "8-10 min",
          expectedTool: "blog_post"
        },
        {
          trigger: "Generate 5 LinkedIn post ideas",
          smeLabel: "Generate 5 LinkedIn post ideas for my business",
          agencyLabel: "Generate 5 LinkedIn post ideas for client",
          fullPrompt: "I'm targeting [persona] in [industry] with [product/service]. Generate 5 LinkedIn post ideas (mix: thought leadership, educational, and engagement-focused). For each idea, provide: hook, key points, and suggested hashtags.",
          tooltip: "Ready-to-use LinkedIn content ideas",
          description: "Get content ideas for LinkedIn",
          icon: "💼",
          estimatedTime: "4-5 min",
          expectedTool: "content_ideas"
        }
      ],
      intermediate: [
        {
          trigger: "30-day content calendar for [platform]",
          smeLabel: "30-day content calendar for my [platform]",
          agencyLabel: "30-day content calendar for client's [platform]",
          fullPrompt: "Create a 30-day content calendar for [LinkedIn/Instagram/Twitter] targeting [persona]. Mix post types: thought leadership (40%), educational (30%), promotional (20%), engagement (10%). Include post themes, suggested hooks, optimal posting times, and hashtag strategy.",
          tooltip: "Full month of content planned with themes + hooks",
          description: "Monthly content schedule",
          icon: "📅",
          estimatedTime: "10-12 min",
          expectedTool: "content_calendar"
        },
        {
          trigger: "Write email nurture sequence (5 emails)",
          smeLabel: "Write email nurture sequence for my leads",
          agencyLabel: "Write email nurture sequence for client leads",
          fullPrompt: "Create a 5-email nurture sequence for [persona] who downloaded [lead magnet]. Goals: educate about [pain point], build trust, drive to [desired action]. Include subject lines, preview text, body copy, and CTAs. Space emails 3-5 days apart.",
          tooltip: "Complete email drip campaign with timing",
          description: "Email automation sequence",
          icon: "📧",
          estimatedTime: "12-15 min",
          expectedTool: "email_sequence"
        }
      ],
      expert: [
        {
          trigger: "Multi-channel launch content package",
          smeLabel: "Multi-channel content for my product launch",
          agencyLabel: "Multi-channel content for client launch",
          fullPrompt: "I'm launching [product/feature] for [persona]. Create coordinated launch content across: (1) Blog announcement post, (2) 5 LinkedIn posts (teaser, launch, benefits, testimonial, closing), (3) Email to existing customers, (4) Email to prospects. All content should amplify [key message] and drive to [landing page].",
          tooltip: "Complete launch content suite across 3 channels (20-25 min)",
          description: "Complete content strategy",
          icon: "🚀",
          estimatedTime: "20-25 min",
          framework: "Multi-channel",
          expectedTool: "content_campaign"
        },
        {
          trigger: "Thought leadership series (4-part)",
          smeLabel: "Thought leadership series to establish my authority",
          agencyLabel: "Thought leadership series to position client",
          fullPrompt: "Create a 4-part thought leadership series on [industry topic/trend] to position [me/client] as an expert. Each piece: (1) LinkedIn long-form article, (2) Twitter thread, (3) Key visual/infographic concept. Build narrative arc: Problem → Context → Solution → Call to Action. Target: [decision-maker persona].",
          tooltip: "Multi-format series with narrative arc (18-22 min)",
          description: "Multi-part content campaign",
          icon: "💡",
          estimatedTime: "18-22 min",
          framework: "Storytelling Arc",
          expectedTool: "content_series"
        }
      ]
    }
  },

  // DEPRECATED: analytics, roi_budget merged into performance_intelligence (Oct 2025)

  campaign_planning: {
    icon: Rocket,
    color: 'teal',
    name: 'Campaign Planning Agent',
    description: 'Your deployment intelligence specialist',
    greeting: 'I help you plan campaign deployment with strategic frameworks and optimization strategies. I provide deployment plans, A/B testing frameworks, and multi-channel coordination intelligence - not execution.',
    hints: {
      beginner: [
        {
          trigger: "Plan launch for [campaign]",
          smeLabel: "Plan launch for my [campaign]",
          agencyLabel: "Plan launch for client [campaign]",
          fullPrompt: "I'm launching [campaign type - e.g., product launch, lead gen campaign] for [target persona]. Budget: [$X if known]. Create deployment plan including: (1) Pre-launch checklist (1-2 weeks before), (2) Launch day sequence, (3) Post-launch monitoring (first 48 hours), (4) Key metrics to watch, (5) Common issues and fixes.",
          tooltip: "Complete launch checklist with timing and monitoring",
          description: "Basic deployment plan",
          icon: "🚀",
          estimatedTime: "6-8 min",
          expectedTool: "deployment_plan"
        },
        {
          trigger: "What should I A/B test first?",
          smeLabel: "What should I A/B test first?",
          agencyLabel: "What should client A/B test first?",
          fullPrompt: "For [campaign type - e.g., email campaign, landing page, ad creative] targeting [persona], what should I test first? Recommend 3-5 high-impact test ideas ranked by: ease of implementation, potential impact, and statistical significance timeline. Include what to measure for each test.",
          tooltip: "Prioritized A/B test recommendations with metrics",
          description: "Simple A/B test ideas",
          icon: "🧪",
          estimatedTime: "5-7 min",
          expectedTool: "ab_test"
        }
      ],
      intermediate: [
        {
          trigger: "Multi-channel campaign deployment plan",
          smeLabel: "Multi-channel deployment for my campaign",
          agencyLabel: "Multi-channel deployment for client",
          fullPrompt: "Create coordinated deployment plan for [campaign goal] across [list channels - e.g., email, LinkedIn, Google Ads, landing page]. Target: [persona]. Budget: [$X]. Include: (1) Channel-specific launch timing, (2) Message coordination strategy, (3) Cross-channel tracking setup, (4) Week 1-4 optimization schedule, (5) Resource allocation per channel.",
          tooltip: "Coordinated deployment with timing and tracking",
          description: "Coordinated deployment",
          icon: "🎯",
          estimatedTime: "10-12 min",
          expectedTool: "multi_channel"
        },
        {
          trigger: "Design A/B test variants",
          smeLabel: "Design A/B test variants for [element]",
          agencyLabel: "Design A/B test variants for client",
          fullPrompt: "For [specific element to test - e.g., email subject lines, landing page headline, CTA button], create A/B test design: (1) Variant A and B with rationale, (2) Hypothesis for why B might win, (3) Success metrics and statistical significance threshold, (4) Minimum sample size needed, (5) Test duration estimate. Context: [campaign goal, persona, current baseline performance if known].",
          tooltip: "Complete test design with statistical rigor",
          description: "Test optimization",
          icon: "📊",
          estimatedTime: "8-10 min",
          expectedTool: "ab_test_variants"
        }
      ],
      expert: [
        {
          trigger: "Orchestrate complex campaign",
          smeLabel: "Orchestrate my [complex campaign]",
          agencyLabel: "Orchestrate client [complex campaign]",
          fullPrompt: "Design campaign orchestration for [campaign - e.g., product launch, rebranding, market expansion]. Channels: [4-6 channels]. Timeline: [duration]. Budget: [$X]. Create: (1) Master timeline with channel dependencies, (2) Touchpoint sequencing strategy, (3) Audience segmentation and messaging variations, (4) Risk mitigation plan, (5) Daily monitoring dashboard structure, (6) Optimization triggers and decision rules.",
          tooltip: "Enterprise-grade orchestration with risk management (15-20 min)",
          description: "Complex campaign management",
          icon: "🎪",
          estimatedTime: "15-20 min",
          framework: "Orchestration",
          expectedTool: "campaign_orchestration"
        },
        {
          trigger: "Multivariate testing strategy",
          smeLabel: "Multivariate testing for [campaign element]",
          agencyLabel: "Multivariate testing for client",
          fullPrompt: "Design multivariate test for [campaign element - e.g., landing page with headline, image, CTA]. Test variables: [list 3-4 elements]. Create: (1) Full factorial design (combinations matrix), (2) Traffic allocation strategy, (3) Statistical power analysis (sample size, duration), (4) Success metrics hierarchy, (5) Analysis plan with interaction effects, (6) Implementation roadmap for winning variant.",
          tooltip: "Advanced testing with statistical modeling (12-15 min)",
          description: "Advanced testing framework",
          icon: "🔬",
          estimatedTime: "12-15 min",
          framework: "Multivariate",
          expectedTool: "multivariate_test"
        }
      ]
    }
  },

  // DEPRECATED: quick_wins merged into performance_intelligence (Oct 2025)

  competitive_intelligence: {
    icon: Target,
    color: 'amber',
    name: 'Competitive Intelligence Agent',
    description: 'Your market analysis specialist',
    greeting: 'I help you understand your competitive landscape. I can analyze competitors, identify market gaps, and spot strategic opportunities.',
    hints: {
      beginner: [
        {
          trigger: "Who are my main competitors?",
          smeLabel: "Who are my main competitors?",
          agencyLabel: "Who are client's main competitors?",
          fullPrompt: "I'm [business type] in [industry] selling [product/service] at [$X price point] to [target persona]. Identify my top 3-5 direct competitors. For each, provide: company name, positioning, pricing, key strengths, and weaknesses. Include 1-2 indirect competitors (alternative solutions).",
          tooltip: "Competitor breakdown with strengths/weaknesses",
          description: "Basic competitor analysis",
          icon: "🔍",
          estimatedTime: "6-8 min",
          expectedTool: "competitor_analysis"
        },
        {
          trigger: "What makes me different?",
          smeLabel: "What makes me different from competitors?",
          agencyLabel: "What makes client different?",
          fullPrompt: "Compare [my/client's business] with [list 2-3 competitors]. What's our unique differentiation? Analyze across: product features, pricing, target market, brand positioning, customer experience. Identify: (1) Clear differentiators, (2) Areas of parity, (3) Gaps we need to address. Recommend positioning statement.",
          tooltip: "Differentiation analysis with positioning recommendation",
          description: "Find your unique value",
          icon: "⭐",
          estimatedTime: "7-9 min",
          expectedTool: "differentiation"
        }
      ],
      intermediate: [
        {
          trigger: "Deep dive: [competitor] strategy",
          smeLabel: "Analyze [competitor]'s strategy",
          agencyLabel: "Analyze competitor's strategy for client",
          fullPrompt: "Conduct deep analysis of [competitor name]. Research and analyze: (1) Business model and revenue streams, (2) Target market and positioning, (3) Marketing and sales strategy, (4) Product/service strengths and gaps, (5) Recent moves (funding, launches, partnerships), (6) Vulnerabilities we can exploit. Provide strategic recommendations.",
          tooltip: "Comprehensive competitor teardown with strategic insights",
          description: "Deep competitive analysis",
          icon: "📊",
          estimatedTime: "10-15 min",
          expectedTool: "strategy_analysis"
        },
        {
          trigger: "Find market gaps to exploit",
          smeLabel: "Find market gaps I can exploit",
          agencyLabel: "Find market gaps for client",
          fullPrompt: "In [industry/market], identify unmet needs and market gaps. Context: [brief business description, target persona, competitors]. Look for: (1) Underserved customer segments, (2) Feature/service gaps competitors miss, (3) Pricing/positioning white space, (4) Emerging trends competitors haven't addressed. For top 3 gaps, provide: opportunity size estimate, barriers to entry, and go-to-market approach.",
          tooltip: "Opportunity identification with GTM recommendations",
          description: "Opportunity identification",
          icon: "🎯",
          estimatedTime: "10-12 min",
          expectedTool: "market_gaps"
        }
      ],
      expert: [
        {
          trigger: "Competitive landscape analysis",
          smeLabel: "Full competitive landscape for my market",
          agencyLabel: "Full competitive landscape for client",
          fullPrompt: "Create comprehensive competitive landscape analysis for [market/industry]. Include: (1) Market size and growth trends, (2) Competitive tiers (leaders, challengers, niche players), (3) Porter's Five Forces analysis, (4) Technology and business model disruptions, (5) Consolidation and M&A activity, (6) Regulatory/macro factors, (7) Strategic implications and opportunities for [my/client's business].",
          tooltip: "Market intelligence report with strategic implications (15-20 min)",
          description: "Comprehensive market analysis",
          icon: "🗺️",
          estimatedTime: "15-20 min",
          framework: "Porter's Five Forces",
          expectedTool: "landscape_analysis"
        },
        {
          trigger: "Competitive positioning matrix",
          smeLabel: "Build positioning matrix for my market",
          agencyLabel: "Build positioning matrix for client",
          fullPrompt: "Create competitive positioning matrix for [market]. Plot [my/client's business] and [list 4-6 competitors] on 2x2 matrix. Axes: [dimension 1 - e.g., price/quality, features/ease] vs [dimension 2 - e.g., SME/enterprise, generalist/specialist]. For each competitor: positioning rationale, market share estimate, strategic direction. Recommend: optimal positioning for [us/client], repositioning strategy if needed, competitive moves to anticipate.",
          tooltip: "Visual positioning strategy with competitive moves (12-15 min)",
          description: "Strategic positioning",
          icon: "📈",
          estimatedTime: "12-15 min",
          framework: "Positioning Matrix",
          expectedTool: "positioning_matrix"
        }
      ]
    }
  },

  client_success: {
    icon: Award,
    color: 'emerald',
    name: 'Client Success Agent',
    description: 'Your retention specialist',
    greeting: 'I help you keep clients happy and growing. I can assess client health, create retention strategies, and identify expansion opportunities.',
    hints: {
      beginner: [
        {
          trigger: "Check health of [client]",
          fullPrompt: "Assess the health of [client name] relationship. Current context: [months working together, services provided, recent interactions]. Evaluate: (1) Engagement level (responsiveness, meeting attendance), (2) Results delivered vs expectations, (3) Budget/value perception, (4) Relationship quality, (5) Warning signs. Provide health score (Green/Yellow/Red) and recommended actions.",
          tooltip: "Client health scorecard with action items",
          description: "Client health check",
          icon: "💚",
          estimatedTime: "5-7 min",
          expectedTool: "health_report"
        },
        {
          trigger: "How do I keep [client] happy?",
          fullPrompt: "For [client name - or 'my clients' in general], what are the key retention drivers? Context: [service type, typical client profile, current retention rate if known]. Provide: (1) Top 5 retention best practices for this client type, (2) Common reasons clients leave, (3) Proactive check-in schedule, (4) Value demonstration tactics, (5) Red flags to monitor.",
          tooltip: "Retention playbook with proactive tactics",
          description: "Basic retention tips",
          icon: "🤝",
          estimatedTime: "6-8 min",
          expectedTool: "retention_basics"
        }
      ],
      intermediate: [
        {
          trigger: "Build retention strategy",
          fullPrompt: "Create systematic retention strategy for [agency type - e.g., marketing agency, consulting firm] with [X clients]. Current churn rate: [% if known]. Design: (1) Client lifecycle touchpoint map (onboarding → renewal), (2) Health scoring system (what to measure, thresholds), (3) Early warning system (churn indicators), (4) Intervention playbooks per health stage, (5) Success milestone celebrations. Goal: reduce churn to [target %].",
          tooltip: "Complete retention system with metrics",
          description: "Systematic retention plan",
          icon: "📊",
          estimatedTime: "12-15 min",
          expectedTool: "retention_strategy"
        },
        {
          trigger: "Which clients are at risk?",
          fullPrompt: "Among [my X clients / specific client portfolio], identify at-risk accounts. For each client (or pattern), assess: (1) Engagement drop-off (slower responses, missed meetings), (2) Performance issues (results not meeting expectations), (3) Budget concerns (questioning value, requesting discounts), (4) Competitive threats (considering alternatives), (5) Internal changes (champion left, budget cuts). Rank by risk level and recommend save tactics.",
          tooltip: "Churn risk analysis with intervention plan",
          description: "Churn prediction",
          icon: "⚠️",
          estimatedTime: "10-12 min",
          expectedTool: "risk_assessment"
        }
      ],
      expert: [
        {
          trigger: "Success plan for [client]",
          fullPrompt: "Create comprehensive success plan for [client name]. Context: [services, tenure, current state, goals]. Include: (1) 90-day success milestones, (2) Quarterly Business Review (QBR) agenda and cadence, (3) Stakeholder engagement strategy (champion, influencers, decision-makers), (4) Value demonstration framework (metrics, reporting), (5) Expansion pathway (services to upsell, timeline), (6) Risk mitigation plan (potential issues, contingencies).",
          tooltip: "Complete client success roadmap with QBR structure (15-18 min)",
          description: "Comprehensive success strategy",
          icon: "🎯",
          estimatedTime: "15-18 min",
          framework: "Client Success",
          expectedTool: "success_plan"
        },
        {
          trigger: "Find expansion opportunities",
          fullPrompt: "Analyze account expansion opportunities across [my client portfolio / specific client]. For expansion candidates, identify: (1) Current services and spend, (2) Unused services they could benefit from, (3) Cross-sell opportunities based on business goals, (4) Upsell timing triggers (growth milestones, renewals), (5) Champion mapping (who to approach), (6) ROI case for additional services, (7) Expansion proposal template. Prioritize by: likelihood to close, revenue potential, strategic value.",
          tooltip: "Revenue expansion playbook with prioritization (12-15 min)",
          description: "Growth identification",
          icon: "📈",
          estimatedTime: "12-15 min",
          framework: "Account Expansion",
          expectedTool: "expansion_analysis"
        }
      ]
    }
  },

  performance_intelligence: {
    icon: TrendingUp,
    color: 'cyan',
    name: 'Performance Intelligence Agent',
    description: 'Your performance tracking specialist',
    greeting: 'I help you track and analyze marketing performance across campaigns. I can aggregate metrics, identify trends, and provide actionable insights.',
    hints: {
      beginner: [
        {
          trigger: "What's my [campaign] performance?",
          smeLabel: "What's my [campaign] performance?",
          agencyLabel: "What's [client] campaign performance?",
          fullPrompt: "Summarize performance for [campaign name or 'all campaigns']. Context: [channels used, goals, date range]. Report: (1) Top-level metrics (reach, engagement, conversions, cost), (2) Performance vs goals, (3) Best and worst performing channels/assets, (4) Key insights (what's working, what's not), (5) Top 3 optimization recommendations.",
          tooltip: "Performance snapshot with actionable insights",
          description: "Overview of campaign metrics",
          icon: "📊",
          estimatedTime: "5-7 min",
          expectedTool: "performance_overview"
        },
        {
          trigger: "Which metrics should I track?",
          smeLabel: "Which metrics should I track for [campaign type]?",
          agencyLabel: "Which metrics for client [campaign type]?",
          fullPrompt: "For [campaign type - e.g., lead gen, brand awareness, product launch] targeting [persona] via [channels], what metrics matter most? Recommend: (1) North Star metric (primary success indicator), (2) 3-5 key supporting metrics, (3) Vanity metrics to ignore, (4) Tracking setup needed (tools, dashboards), (5) Reporting cadence (daily/weekly/monthly).",
          tooltip: "KPI framework with tracking setup",
          description: "Key performance indicators",
          icon: "🎯",
          estimatedTime: "6-8 min",
          expectedTool: "kpi_recommendations"
        }
      ],
      intermediate: [
        {
          trigger: "Compare [campaign A] vs [campaign B]",
          smeLabel: "Compare my campaigns",
          agencyLabel: "Compare client campaigns",
          fullPrompt: "Compare performance of [Campaign A] vs [Campaign B] (or 'last 3 campaigns'). Dimensions: (1) Efficiency (cost per result, ROI), (2) Scale (reach, volume), (3) Quality (conversion rate, engagement rate), (4) Speed (time to goal). Identify: what worked better in each, why, and which elements to replicate or avoid in future campaigns.",
          tooltip: "Side-by-side comparison with learnings",
          description: "Cross-campaign analysis",
          icon: "⚖️",
          estimatedTime: "8-10 min",
          expectedTool: "campaign_comparison"
        },
        {
          trigger: "Analyze performance trends",
          smeLabel: "Analyze my performance trends",
          agencyLabel: "Analyze client performance trends",
          fullPrompt: "Analyze performance trends over [time period - e.g., last 6 months, Q3-Q4]. Campaigns: [all or specific set]. Identify: (1) Upward trends (improving metrics), (2) Downward trends (declining performance), (3) Seasonality patterns, (4) Anomalies (spikes or drops), (5) Leading indicators (early signals), (6) Trend implications and recommended actions.",
          tooltip: "Time-series analysis with predictive signals",
          description: "Trend analysis over time",
          icon: "📈",
          estimatedTime: "10-12 min",
          expectedTool: "trend_analysis"
        }
      ],
      expert: [
        {
          trigger: "Build performance dashboard",
          smeLabel: "Build comprehensive performance dashboard",
          agencyLabel: "Build client performance dashboard",
          fullPrompt: "Design performance intelligence dashboard for [business/client]. Scope: [campaigns, channels, time range]. Include: (1) Executive summary (top 5 metrics), (2) Channel performance breakdown, (3) Campaign ROI leaderboard, (4) Funnel conversion analysis, (5) Cohort/segment performance, (6) Budget pacing and efficiency, (7) Alerts and thresholds (what triggers action). Provide dashboard structure and metric definitions.",
          tooltip: "Complete dashboard architecture with alerting (15-18 min)",
          description: "Comprehensive metrics view",
          icon: "📊",
          estimatedTime: "15-18 min",
          framework: "Dashboard Design",
          expectedTool: "full_dashboard"
        },
        {
          trigger: "Forecast performance",
          smeLabel: "Forecast my future performance",
          agencyLabel: "Forecast client performance",
          fullPrompt: "Create predictive performance model for [campaigns/channels]. Historical data: [describe what's available - e.g., 6 months of campaign data]. Model: (1) Baseline forecast (if we continue current approach), (2) Scenario analysis (if we increase budget by X%, change targeting, etc.), (3) Confidence intervals (best/worst case), (4) Leading indicators to monitor, (5) Assumptions and limitations. Forecast period: [next quarter/6 months].",
          tooltip: "Predictive modeling with scenario planning (12-15 min)",
          description: "Forecast future performance",
          icon: "🔮",
          estimatedTime: "12-15 min",
          framework: "Predictive Analytics",
          expectedTool: "predictive_modeling"
        }
      ]
    }
  },

  quick_start: {
    icon: Lightbulb,
    color: 'purple',
    name: 'Quick Start Agent',
    description: 'Your comprehensive onboarding specialist',
    greeting: 'Welcome! I\'m here to help you get started quickly. In just 5 minutes, I\'ll generate a comprehensive foundation for your marketing: strategy analysis, customer personas, and a complete marketing plan. Let\'s turn your answers into actionable intelligence!',
    hints: {
      beginner: [
        {
          trigger: "Generate marketing foundation in 5 min",
          smeLabel: "Generate my marketing foundation in 5 min",
          agencyLabel: "Generate client marketing foundation",
          fullPrompt: "Using my Quick Start answers (or ask me 5-7 key questions if I haven't completed it), generate comprehensive marketing foundation: (1) Business situation analysis (SWOT), (2) 2-3 customer personas with demographics and pain points, (3) Go-to-market strategy with channel recommendations, (4) 30-day action plan, (5) Success metrics to track. Make it immediately actionable.",
          tooltip: "Complete marketing intelligence in 5 minutes",
          description: "Create complete strategy + personas + marketing plan",
          icon: "⚡",
          estimatedTime: "5-7 min",
          expectedTool: "comprehensive_onboarding"
        },
        {
          trigger: "What should I focus on first?",
          smeLabel: "What should I focus on first?",
          agencyLabel: "What should client focus on first?",
          fullPrompt: "Based on [Quick Start answers / business context: describe situation, goals, constraints], what are my top 3-5 priorities? For each priority: (1) Why it matters (impact vs effort), (2) What success looks like, (3) First 3 concrete actions to take this week, (4) Common pitfalls to avoid. Rank by: immediate impact, resource efficiency, and strategic importance.",
          tooltip: "Prioritized action plan with quick wins",
          description: "Get prioritized recommendations",
          icon: "🎯",
          estimatedTime: "6-8 min",
          expectedTool: "prioritization_guide"
        }
      ],
      intermediate: [
        {
          trigger: "Analyze my Quick Start foundation",
          smeLabel: "Analyze my Quick Start answers",
          agencyLabel: "Analyze client Quick Start answers",
          fullPrompt: "Review my Quick Start responses (or upload/paste answers). Analyze: (1) Clarity of business positioning, (2) Target market definition (too broad/too narrow?), (3) Competitive awareness, (4) Resource constraints vs ambitions, (5) Blind spots or missing context, (6) Assumptions that need validation. Provide: strategic recommendations, questions to clarify, and foundation gaps to fill.",
          tooltip: "Strategic review with gap identification",
          description: "Analyze onboarding responses",
          icon: "🔍",
          estimatedTime: "8-10 min",
          expectedTool: "answer_analysis"
        },
        {
          trigger: "Extend my marketing foundation",
          smeLabel: "Build on my Quick Start foundation",
          agencyLabel: "Build on client foundation",
          fullPrompt: "Starting from Quick Start foundation (or describe what I have: [strategy, personas, channels]), extend it with: (1) Deeper persona research (3-5 personas with JTBD), (2) Competitive positioning refinement, (3) Messaging framework (value prop, key messages), (4) Content strategy (topics, formats, calendar), (5) Measurement framework (KPIs, tracking). Transform foundation into execution-ready intelligence.",
          tooltip: "Foundation to execution-ready strategy",
          description: "Extend initial intelligence",
          icon: "🚀",
          estimatedTime: "12-15 min",
          expectedTool: "foundation_extension"
        }
      ],
      expert: [
        {
          trigger: "Generate complete marketing intelligence",
          smeLabel: "Generate complete marketing intelligence",
          agencyLabel: "Generate complete client intelligence",
          fullPrompt: "Create comprehensive marketing intelligence system. Inputs: [Quick Start data or describe business: industry, offering, stage, goals]. Generate: (1) Strategic analysis (SWOT, Porter's, VRIO), (2) Market research (TAM/SAM/SOM, trends), (3) Complete persona system (4-6 personas with segmentation), (4) Positioning and messaging architecture, (5) Multi-channel GTM plan, (6) Content and campaign calendar (90 days), (7) Performance dashboard design, (8) Resource and budget recommendations.",
          tooltip: "Enterprise-grade marketing intelligence system (20-25 min)",
          description: "Full strategic framework generation",
          icon: "🧠",
          estimatedTime: "20-25 min",
          framework: "Complete Intelligence",
          expectedTool: "complete_intelligence"
        },
        {
          trigger: "Build 90-day roadmap",
          smeLabel: "Build my 90-day marketing roadmap",
          agencyLabel: "Build client 90-day roadmap",
          fullPrompt: "Create detailed 90-day marketing roadmap from Quick Start foundation (or describe starting point: [what's in place]). Structure by weeks: Week 1-4 (Foundation), Week 5-8 (Build), Week 9-12 (Scale). For each phase: (1) Key objectives and milestones, (2) Specific tactics and deliverables, (3) Resource requirements (time, budget, tools), (4) Dependencies and risks, (5) Success metrics per milestone, (6) Decision gates (go/no-go criteria). Include: quick wins, learning experiments, and scale triggers.",
          tooltip: "Detailed execution roadmap with milestones (15-20 min)",
          description: "Actionable timeline from foundation",
          icon: "📅",
          estimatedTime: "15-20 min",
          framework: "90-Day Roadmap",
          expectedTool: "roadmap_generation"
        }
      ]
    }
  }
};

// Helper function to get hints based on user expertise and org type
export function getHintsForLevel(
  agentType: AgentType,
  level: ExpertiseLevel,
  orgType?: 'SME' | 'AGENCY'
): ToolHint[] {
  const baseHints = AGENT_IDENTITIES[agentType].hints[level];

  // If no orgType provided, return base hints
  if (!orgType) return baseHints;

  // Map hints to use org-specific labels when available
  return baseHints.map(hint => {
    const isSME = orgType === 'SME';
    const labelOverride = isSME ? hint.smeLabel : hint.agencyLabel;

    return {
      ...hint,
      trigger: labelOverride || hint.trigger
    };
  });
}

// Helper function to get agent identity
export function getAgentIdentity(agentType: AgentType): AgentIdentity {
  return AGENT_IDENTITIES[agentType];
}

/**
 * Get localized agent identity using i18next
 * Returns agent identity with translated name, description, and greeting
 */
export function getLocalizedAgentIdentity(agentType: AgentType): AgentIdentity {
  const baseIdentity = AGENT_IDENTITIES[agentType];

  // Try to get translations, fall back to base values
  const name = i18next.t(`agents:${agentType}.name`, { defaultValue: baseIdentity.name });
  const description = i18next.t(`agents:${agentType}.description`, { defaultValue: baseIdentity.description });
  const greeting = i18next.t(`agents:${agentType}.greeting`, { defaultValue: baseIdentity.greeting });

  return {
    ...baseIdentity,
    name,
    description,
    greeting
  };
}

/**
 * Get localized placeholder for agent chat input
 */
export function getLocalizedAgentPlaceholder(agentType: AgentType): string {
  // Default placeholders as fallback
  const defaultPlaceholders: Record<AgentType, string> = {
    strategy: "Ask about business strategy, SWOT analysis... (e.g., 'run a swot analysis')",
    persona: "Ask about customer profiles, buyer journeys... (e.g., 'create a customer persona')",
    marketing_strategy: "Describe your business, target audience, and marketing goals...",
    content: "Ask about content ideas, blog posts... (e.g., 'generate blog post ideas')",
    campaign_planning: "Ask about deployment planning, A/B testing... (e.g., 'create deployment plan')",
    competitive_intelligence: "Ask about competitors, market analysis... (e.g., 'analyze competitors')",
    client_success: "Ask about retention strategies, client health... (e.g., 'retention strategies')",
    performance_intelligence: "Ask about data analysis, metrics... (e.g., 'analyze campaign performance')",
    quick_start: "Tell me about your business to get started..."
  };

  return i18next.t(`agents:${agentType}.placeholder`, { defaultValue: defaultPlaceholders[agentType] });
}

/**
 * Get localized tool display name
 */
export function getLocalizedToolName(toolName: string): string {
  return i18next.t(`agents:tools.${toolName}`, { defaultValue: toolName });
}

/**
 * Get localized hint for a specific agent
 */
export function getLocalizedHint(
  agentType: AgentType,
  level: ExpertiseLevel,
  hintKey: string,
  field: 'trigger' | 'smeLabel' | 'agencyLabel' | 'tooltip' | 'description'
): string | undefined {
  const translationKey = `agents:${agentType}.hints.${level}.${hintKey}.${field}`;
  const result = i18next.t(translationKey, { defaultValue: '' });
  return result || undefined;
}