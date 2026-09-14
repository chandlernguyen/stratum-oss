"""Content generation tools for creating various types of content."""

from typing import Dict, Any, List, Optional
import logging
from .base import ContentToolBase

logger = logging.getLogger(__name__)


class ContentGenerationTools(ContentToolBase):
    """Tools for generating various types of content including SEO blogs, thought leadership, and USP-focused content."""

    async def generate_seo_blog_post(self, topic: str, keywords: Optional[List[str]] = None, word_count: int = 1500) -> Dict[str, Any]:
        """
        Professional SEO-optimized blog post generator with keyword integration and competitive analysis.
        Returns comprehensive blog structure with SEO elements for the model to use.
        """
        logger.info(f"[ContentAgent] Generating SEO blog post for topic: {topic[:100]}...")

        # Get cross-agent context for informed content creation
        context = await self.agent.get_cross_agent_context(topic) if hasattr(self.agent, 'get_cross_agent_context') else {}

        # Get brand guidelines to ensure consistency
        brand_guidelines = await self.agent.check_brand_guidelines("all") if hasattr(self.agent, 'check_brand_guidelines') else {}

        return {
            "topic": topic,
            "target_keywords": keywords or [],
            "target_word_count": word_count,
            "brand_context": {
                "has_guidelines": brand_guidelines.get('has_guidelines', False),
                "tone_guidance": brand_guidelines.get('tone_guidance', {}),
                "messaging_framework": brand_guidelines.get('messaging_framework', {}),
                "content_rules": brand_guidelines.get('content_rules', {})
            },
            "cross_agent_intelligence": context,
            "seo_structure": {
                "title_formula": {
                    "primary": f"[Number] [Adjective] Ways to {topic}",
                    "alternatives": [
                        f"The Complete Guide to {topic} [Year]",
                        f"How to {topic}: Expert Strategies That Work",
                        f"{topic}: What You Need to Know in [Year]"
                    ],
                    "requirements": [
                        "Include primary keyword in first 60 characters",
                        "Keep under 70 characters total",
                        "Use power words and emotional triggers",
                        "Include year for freshness signal"
                    ]
                },
                "meta_description": {
                    "template": f"Discover proven strategies for {topic}. Learn [benefit 1], [benefit 2], and [benefit 3] from industry experts.",
                    "requirements": [
                        "150-160 characters maximum",
                        "Include primary keyword naturally",
                        "Clear value proposition",
                        "Include call-to-action"
                    ]
                },
                "introduction": {
                    "hook_patterns": [
                        "Surprising statistic + problem + solution preview",
                        "Question + pain point amplification + promise",
                        "Story/scenario + relatability + what you'll learn",
                        "Bold statement + context + transformation"
                    ],
                    "structure": [
                        "Hook (1-2 sentences)",
                        "Problem statement (2-3 sentences)",
                        "Solution preview (1-2 sentences)",
                        "Article roadmap (what reader will learn)"
                    ],
                    "word_count_target": "150-200 words"
                },
                "body_sections": {
                    "optimal_count": "5-8 main sections",
                    "section_structure": {
                        "h2_heading": "Clear, keyword-optimized section title",
                        "introduction": "1-2 sentences introducing the concept",
                        "main_content": "2-3 paragraphs with detailed explanation",
                        "supporting_elements": [
                            "Statistics or data points",
                            "Real-world examples",
                            "Expert quotes or citations",
                            "Actionable tips"
                        ],
                        "subsections": "2-3 H3 headings for complex topics"
                    },
                    "content_patterns": [
                        "Problem → Solution → Implementation → Results",
                        "Theory → Practice → Examples → Application",
                        "Overview → Deep Dive → Case Study → Takeaways",
                        "Current State → Challenges → Opportunities → Action Steps"
                    ]
                },
                "seo_optimization": {
                    "keyword_placement": {
                        "title": "Primary keyword in first 60 characters",
                        "url_slug": "Primary keyword with hyphens",
                        "introduction": "Primary keyword in first 100 words",
                        "body": "1-2% keyword density throughout",
                        "headings": "Keywords in 30-50% of H2/H3 tags",
                        "conclusion": "Primary keyword in final paragraph"
                    },
                    "semantic_seo": {
                        "lsi_keywords": "Related terms and synonyms throughout",
                        "entity_mentions": "People, places, things related to topic",
                        "question_targeting": "Answer 'People Also Ask' questions",
                        "topic_clusters": "Link to related content pieces"
                    },
                    "technical_seo": {
                        "image_alt_text": "Descriptive alt text with keywords",
                        "internal_links": "3-5 relevant internal links",
                        "external_links": "2-3 authoritative sources",
                        "schema_markup": "FAQ or HowTo schema suggestions"
                    }
                },
                "engagement_elements": {
                    "formatting": [
                        "Short paragraphs (2-3 sentences max)",
                        "Bullet points for lists",
                        "Numbered steps for processes",
                        "Bold text for key concepts",
                        "Block quotes for expert insights"
                    ],
                    "visual_suggestions": [
                        "Hero image at top",
                        "Infographic for data/statistics",
                        "Screenshots for tutorials",
                        "Charts/graphs for comparisons",
                        "Custom graphics every 300-500 words"
                    ],
                    "interactive_elements": [
                        "Table of contents with jump links",
                        "Expandable FAQ sections",
                        "Downloadable resources/templates",
                        "Social sharing buttons",
                        "Related posts recommendations"
                    ]
                },
                "conclusion": {
                    "structure": [
                        "Summary of key points (bullet list)",
                        "Main takeaway reinforcement",
                        "Forward-looking statement",
                        "Clear call-to-action"
                    ],
                    "cta_options": [
                        "Download related resource",
                        "Book consultation/demo",
                        "Subscribe to newsletter",
                        "Share on social media",
                        "Explore related services"
                    ],
                    "word_count_target": "150-200 words"
                }
            },
            "competitive_differentiation": {
                "unique_angles": [
                    "Proprietary data or research",
                    "Contrarian viewpoint with evidence",
                    "Comprehensive depth beyond competitors",
                    "Unique framework or methodology",
                    "Industry-specific application"
                ],
                "content_upgrades": [
                    "Downloadable checklist or template",
                    "Video summary or tutorial",
                    "Podcast episode on topic",
                    "Email course expansion",
                    "Interactive calculator or tool"
                ]
            },
            "performance_targets": {
                "engagement_metrics": {
                    "average_time_on_page": "4-6 minutes",
                    "scroll_depth": "70%+ completion",
                    "social_shares": "Industry average x2",
                    "comments": "5+ meaningful discussions"
                },
                "seo_metrics": {
                    "organic_traffic": "500+ visits/month within 6 months",
                    "keyword_rankings": "Page 1 for primary keyword",
                    "featured_snippet": "Optimized for position 0",
                    "backlinks": "5-10 natural links"
                }
            }
        }

    async def create_thought_leadership_piece(self, topic: str, expertise_area: str, audience: str = "industry professionals") -> Dict[str, Any]:
        """
        Creates thought leadership content that establishes authority and drives industry conversations.
        Returns comprehensive structure and strategic elements for the model to use.
        """
        logger.info(f"[ContentAgent] Creating thought leadership piece on: {topic[:100]}...")

        # Get strategic context
        context = await self.agent.get_cross_agent_context(topic) if hasattr(self.agent, 'get_cross_agent_context') else {}
        brand_guidelines = await self.agent.check_brand_guidelines("voice") if hasattr(self.agent, 'check_brand_guidelines') else {}

        return {
            "topic": topic,
            "expertise_area": expertise_area,
            "target_audience": audience,
            "brand_voice": brand_guidelines.get('tone_guidance', {}),
            "cross_agent_context": context,
            "thought_leadership_framework": {
                "positioning_strategy": {
                    "unique_perspective": "What contrarian or forward-thinking view to present",
                    "credibility_builders": [
                        "Years of experience in field",
                        "Proprietary research or data",
                        "Client success stories",
                        "Industry recognition",
                        "Published work or speaking"
                    ],
                    "differentiation": "How this perspective differs from mainstream thinking"
                },
                "content_architecture": {
                    "narrative_arc": {
                        "opening": "Provocative question or bold statement",
                        "context_setting": "Industry landscape and current challenges",
                        "problem_exploration": "Deep dive into root causes",
                        "paradigm_shift": "Introduction of new thinking",
                        "evidence_presentation": "Data, examples, case studies",
                        "implementation_pathway": "How to apply new approach",
                        "vision_casting": "Future state and possibilities"
                    },
                    "intellectual_depth": {
                        "theoretical_foundation": "Academic or research backing",
                        "practical_application": "Real-world implementation",
                        "industry_implications": "Broader impact analysis",
                        "future_predictions": "Where industry is heading"
                    }
                },
                "authority_building_elements": {
                    "expertise_signals": [
                        "Industry-specific terminology (appropriately used)",
                        "Reference to little-known but important details",
                        "Historical context and evolution",
                        "Cross-industry parallels and lessons"
                    ],
                    "credibility_enhancers": [
                        "Original research or survey data",
                        "Exclusive interviews or quotes",
                        "Behind-the-scenes insights",
                        "Predictive modeling or forecasts"
                    ]
                },
                "engagement_strategies": {
                    "controversy_management": {
                        "challenging_assumptions": "Question industry sacred cows respectfully",
                        "backed_arguments": "Support all claims with evidence",
                        "acknowledge_complexity": "Show nuanced understanding",
                        "invite_dialogue": "Encourage thoughtful debate"
                    },
                    "shareability_factors": [
                        "Quotable insights (tweetable moments)",
                        "Memorable frameworks or models",
                        "Surprising statistics or facts",
                        "Clear visual concepts"
                    ]
                },
                "distribution_strategy": {
                    "primary_channels": [
                        "Company blog with SEO optimization",
                        "LinkedIn article for professional reach",
                        "Industry publications for authority",
                        "Email to subscriber list"
                    ],
                    "amplification_tactics": [
                        "Executive team sharing",
                        "Employee advocacy",
                        "Industry influencer outreach",
                        "Speaking opportunities",
                        "Podcast interviews"
                    ]
                }
            },
            "series_potential": {
                "follow_up_topics": "Related areas to explore in subsequent pieces",
                "content_formats": [
                    "Long-form articles",
                    "Executive brief (condensed version)",
                    "Webinar or presentation",
                    "Podcast series",
                    "White paper expansion"
                ],
                "engagement_continuity": "How to maintain audience interest across series"
            }
        }

    async def generate_usp_focused_content(self, product_service: str, unique_selling_points: List[str], content_type: str = "landing_page") -> Dict[str, Any]:
        """
        Generates content that highlights unique selling propositions and differentiation.
        Returns structured content strategy focused on competitive advantages.
        """
        logger.info(f"[ContentAgent] Generating USP-focused content for: {product_service[:100]}...")

        # Get competitive context
        context = await self.agent.get_cross_agent_context(f"differentiation for {product_service}") if hasattr(self.agent, 'get_cross_agent_context') else {}
        brand_guidelines = await self.agent.check_brand_guidelines("messaging") if hasattr(self.agent, 'check_brand_guidelines') else {}

        return {
            "product_service": product_service,
            "unique_selling_points": unique_selling_points,
            "content_type": content_type,
            "messaging_foundation": brand_guidelines.get('messaging_framework', {}),
            "competitive_context": context,
            "usp_content_framework": {
                "differentiation_strategy": {
                    "primary_differentiator": "Main USP to lead with",
                    "supporting_differentiators": "Secondary USPs to reinforce",
                    "proof_points": {
                        "quantifiable_benefits": "Specific metrics and improvements",
                        "customer_testimonials": "Real success stories",
                        "competitive_comparisons": "How you outperform alternatives",
                        "unique_features": "Capabilities only you offer"
                    }
                },
                "messaging_hierarchy": {
                    "headline": {
                        "formula": "[Unique Outcome] + [Differentiator] + [Target Audience]",
                        "examples": [
                            "The Only [Solution] That [Unique Benefit]",
                            "[Achieve Result] With [Unique Approach]",
                            "Unlike [Competitors], We [Unique Value]"
                        ]
                    },
                    "subheadline": {
                        "purpose": "Expand on unique value and create curiosity",
                        "structure": "Specific benefit + How it's different + Result"
                    },
                    "body_copy_flow": [
                        "Problem acknowledgment (they understand you)",
                        "Common solution limitations (why others fail)",
                        "Unique approach introduction (your differentiator)",
                        "Benefit elaboration (what this means for them)",
                        "Proof presentation (evidence it works)",
                        "Clear next step (specific action)"
                    ]
                },
                "content_variations_by_type": {
                    "landing_page": {
                        "sections": [
                            "Hero with primary USP",
                            "Problem/solution with differentiation",
                            "Features focusing on unique capabilities",
                            "Comparison table highlighting advantages",
                            "Social proof emphasizing unique results",
                            "FAQ addressing differentiation questions"
                        ]
                    },
                    "email_campaign": {
                        "sequence": [
                            "Problem awareness (what's not working)",
                            "Solution exploration (why we're different)",
                            "Benefit deep dive (unique advantages)",
                            "Social proof (others who chose differently)",
                            "Urgency/scarcity (limited availability)"
                        ]
                    },
                    "sales_presentation": {
                        "slides": [
                            "Current state challenges",
                            "Why traditional approaches fail",
                            "Our unique methodology",
                            "Proprietary process/technology",
                            "Exclusive results/case studies",
                            "Implementation differentiators"
                        ]
                    }
                },
                "competitive_positioning": {
                    "direct_comparison": {
                        "approach": "Position against specific competitors or categories",
                        "messaging": "While [Competitor] focuses on X, we deliver Y",
                        "proof": "Specific examples where our approach wins"
                    },
                    "category_creation": {
                        "approach": "Define new category you lead",
                        "messaging": "The first/only [New Category] solution",
                        "education": "Why this new approach matters"
                    }
                },
                "trust_building": {
                    "credibility_elements": [
                        "Industry certifications unique to you",
                        "Proprietary methodologies",
                        "Exclusive partnerships",
                        "Patents or innovations",
                        "Industry-first achievements"
                    ],
                    "risk_reversal": [
                        "Unique guarantees others don't offer",
                        "Exclusive trial terms",
                        "Superior support promises",
                        "Migration assistance competitors lack"
                    ]
                }
            },
            "conversion_optimization": {
                "cta_strategy": {
                    "primary_cta": "Main action tied to USP",
                    "secondary_cta": "Alternative for not-ready buyers",
                    "microcopy": "Reinforce unique value in button text"
                },
                "urgency_tactics": [
                    "Limited availability of unique feature",
                    "Exclusive pricing for differentiator",
                    "Time-sensitive unique bonus",
                    "First-mover advantage messaging"
                ]
            }
        }