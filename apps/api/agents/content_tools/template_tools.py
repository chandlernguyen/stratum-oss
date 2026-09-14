"""Template tools for content ideation and structure templates."""

from typing import Dict, Any, List
import logging
from datetime import datetime, timedelta
from .base import ContentToolBase

logger = logging.getLogger(__name__)


class ContentTemplateTools(ContentToolBase):
    """Tools for providing content templates and structures."""

    async def get_content_ideation_templates(self, topic: str, count: int = 5) -> Dict[str, Any]:
        """
        Provides content ideation templates and frameworks for brainstorming.
        Returns templates and data for the model to use, not generated content.
        """
        logger.info(f"Gathering content ideation templates for topic: {topic[:50]}...")

        # Get existing content ideas if any
        existing_content = await self._fetch_existing_content() if hasattr(self.agent, '_fetch_existing_content') else []

        # Get cross-agent context to inform recommendations
        context = await self.agent.get_cross_agent_context(topic) if hasattr(self.agent, 'get_cross_agent_context') else {}

        return {
            "topic": topic,
            "requested_count": count,
            "existing_content": existing_content,
            "cross_agent_context": context,
            "ideation_frameworks": {
                "problem_solution_framework": {
                    "description": "Create content around problems your audience faces and solutions you provide",
                    "template": "Problem: [audience pain point] → Solution: [your approach] → Outcome: [desired result]",
                    "examples": ["How to reduce customer churn", "5 ways to improve team productivity", "Common mistakes in [industry]"]
                },
                "educational_framework": {
                    "description": "Teach your audience valuable skills or knowledge",
                    "template": "Learn: [skill/concept] → Apply: [practical steps] → Master: [advanced tips]",
                    "examples": ["Complete guide to [topic]", "Step-by-step tutorial", "[Topic] for beginners"]
                },
                "trending_topics": {
                    "description": "Leverage current trends and seasonal interests",
                    "template": "Trend: [current event/season] → Relevance: [connection to business] → Value: [unique insight]",
                    "examples": ["Industry predictions for 2025", "Year-end review", "New regulation impact"]
                },
                "customer_story": {
                    "description": "Share success stories and case studies",
                    "template": "Challenge: [customer problem] → Process: [your solution] → Results: [quantified outcomes]",
                    "examples": ["Customer success story", "Case study breakdown", "Before and after analysis"]
                },
                "contrarian_takes": {
                    "description": "Challenge conventional wisdom in your industry",
                    "template": "Common belief: [standard approach] → Why it fails: [problems] → Better way: [your approach]",
                    "examples": ["Why [common practice] doesn't work", "Unpopular opinion about [topic]", "The truth about [industry myth]"]
                }
            },
            "content_formats": {
                "blog_posts": {
                    "best_for": "Thought leadership, SEO, detailed explanations",
                    "typical_length": "1,500-3,000 words",
                    "engagement_level": "High depth, medium reach"
                },
                "video_content": {
                    "best_for": "Tutorials, product demos, personal connection",
                    "typical_length": "2-10 minutes",
                    "engagement_level": "High engagement, high reach"
                },
                "infographics": {
                    "best_for": "Data visualization, quick tips, shareability",
                    "typical_length": "5-10 key points",
                    "engagement_level": "Medium depth, high shareability"
                },
                "social_posts": {
                    "best_for": "Quick tips, engagement, brand awareness",
                    "typical_length": "50-280 characters",
                    "engagement_level": "High frequency, medium depth"
                },
                "podcasts": {
                    "best_for": "Interviews, discussions, thought leadership",
                    "typical_length": "20-60 minutes",
                    "engagement_level": "High depth, loyal audience"
                }
            },
            "target_persona_considerations": {
                "persona_alignment": "Match content angle to persona pain points and goals",
                "channel_preferences": "Consider where each persona consumes content",
                "content_complexity": "Adjust depth and technical level to persona expertise",
                "engagement_style": "Adapt tone and format to persona communication preferences"
            },
            "seo_considerations": {
                "keyword_research": "Include primary and secondary keywords naturally",
                "search_intent": "Match content to informational, navigational, or transactional intent",
                "content_clusters": "Create topic clusters around pillar content",
                "featured_snippets": "Structure content to win featured snippet positions"
            },
            "idea_validation_criteria": [
                "Relevance to target audience pain points",
                "Alignment with business objectives",
                "Uniqueness in the market",
                "Potential for engagement and shares",
                "SEO and discoverability potential",
                "Resource requirements vs expected ROI"
            ]
        }

    async def get_blog_writing_templates(self, content_idea_title: str) -> Dict[str, Any]:
        """
        Provides blog writing templates, SEO guidelines, and writing best practices.
        Returns templates and data for the model to use, not generated content.
        """
        logger.info(f"Gathering blog writing templates for: {content_idea_title[:50]}...")

        # Get cross-agent context
        context = await self.agent.get_cross_agent_context(content_idea_title) if hasattr(self.agent, 'get_cross_agent_context') else {}

        return {
            "content_idea_title": content_idea_title,
            "cross_agent_context": context,
            "blog_post_structures": {
                "how_to_structure": {
                    "sections": [
                        "Compelling headline with benefit/outcome",
                        "Problem-focused introduction (hook + problem + solution preview)",
                        "Step-by-step process with detailed explanations",
                        "Real examples or case studies",
                        "Common mistakes to avoid",
                        "Clear call-to-action"
                    ],
                    "word_count": "1,500-2,500 words",
                    "best_for": "Educational content, tutorials, guides"
                },
                "listicle_structure": {
                    "sections": [
                        "Number-based headline with clear benefit",
                        "Brief introduction explaining the list value",
                        "Individual list items with detailed explanations",
                        "Brief conclusion summarizing key takeaways",
                        "Related resources or next steps"
                    ],
                    "word_count": "1,200-2,000 words",
                    "best_for": "Tips, tools, resources, comparisons"
                },
                "case_study_structure": {
                    "sections": [
                        "Challenge-focused headline",
                        "Company/situation background",
                        "The problem and its impact",
                        "Solution approach and implementation",
                        "Results with specific metrics",
                        "Key lessons and takeaways"
                    ],
                    "word_count": "1,000-2,000 words",
                    "best_for": "Success stories, proof of concept, credibility building"
                },
                "opinion_structure": {
                    "sections": [
                        "Bold, stance-taking headline",
                        "Current state/common belief overview",
                        "Why the current approach fails",
                        "Your alternative perspective with evidence",
                        "Implications and predictions",
                        "Call for discussion or action"
                    ],
                    "word_count": "1,200-1,800 words",
                    "best_for": "Thought leadership, debate, industry commentary"
                }
            },
            "seo_optimization_checklist": {
                "keyword_optimization": [
                    "Include primary keyword in title (front-loaded)",
                    "Use primary keyword in first 100 words",
                    "Include 2-3 secondary keywords naturally",
                    "Use semantic variations and related terms",
                    "Maintain 1-2% keyword density"
                ],
                "on_page_elements": [
                    "Compelling meta description (150-160 characters)",
                    "H1 tag with primary keyword",
                    "H2/H3 subheadings with secondary keywords",
                    "Alt text for images with descriptive keywords",
                    "Internal links to related content"
                ],
                "content_structure": [
                    "Short paragraphs (2-3 sentences max)",
                    "Bullet points and numbered lists",
                    "Images every 300-500 words",
                    "Clear section breaks with subheadings",
                    "Table of contents for long posts"
                ]
            },
            "engagement_elements": {
                "hook_formulas": [
                    "Surprising statistic + problem + solution preview",
                    "Common mistake + consequences + better approach",
                    "Bold statement + context + what you'll learn",
                    "Question + pain point + promise"
                ],
                "call_to_actions": [
                    "Download related resource (lead magnet)",
                    "Book consultation or demo",
                    "Share thoughts in comments",
                    "Subscribe to newsletter",
                    "Contact for custom solution"
                ],
                "social_proof_elements": [
                    "Client testimonials and quotes",
                    "Data and research citations",
                    "Industry expert opinions",
                    "Social media mentions",
                    "Awards or recognition"
                ]
            },
            "writing_best_practices": {
                "tone_and_style": [
                    "Match brand voice and personality",
                    "Write in second person (you) for engagement",
                    "Use active voice for clarity",
                    "Vary sentence length for rhythm",
                    "Include industry-specific terms appropriately"
                ],
                "readability": [
                    "Aim for 8th-grade reading level",
                    "Use transition words between sections",
                    "Include examples and analogies",
                    "Break up text with visual elements",
                    "End with clear next steps"
                ],
                "credibility_builders": [
                    "Cite authoritative sources",
                    "Include original research or data",
                    "Add author bio and credentials",
                    "Link to relevant case studies",
                    "Update publish date regularly"
                ]
            },
            "content_promotion_strategy": {
                "social_media": "Create 3-5 promotional posts across platforms",
                "email_marketing": "Include in newsletter with compelling subject line",
                "internal_linking": "Link from 2-3 existing relevant blog posts",
                "guest_posting": "Repurpose key points for guest articles",
                "community_sharing": "Share in relevant industry groups"
            }
        }

    async def get_social_media_templates(self, content_idea_title: str, platforms: List[str]) -> Dict[str, Any]:
        """
        Provides platform-specific social media templates and engagement strategies.
        Returns templates and data for the model to use, not generated content.
        """
        logger.info(f"Gathering social media templates for: {content_idea_title[:50]} on {platforms}")

        # Get cross-agent context
        context = await self.agent.get_cross_agent_context(content_idea_title) if hasattr(self.agent, 'get_cross_agent_context') else {}

        return {
            "content_idea_title": content_idea_title,
            "target_platforms": platforms,
            "cross_agent_context": context,
            "platform_specifications": {
                "linkedin": {
                    "character_limit": "3,000 characters",
                    "optimal_length": "150-300 characters",
                    "best_posting_times": "Weekdays 8-10 AM, 12-2 PM, 5-6 PM",
                    "content_types": ["Professional insights", "Industry news", "Career tips", "Company updates"],
                    "hashtag_strategy": "3-5 relevant professional hashtags",
                    "engagement_style": "Professional, educational, thought-leadership"
                },
                "twitter": {
                    "character_limit": "280 characters",
                    "optimal_length": "120-160 characters",
                    "best_posting_times": "Weekdays 9 AM, 1-3 PM",
                    "content_types": ["Quick tips", "News commentary", "Questions", "Thread breakdowns"],
                    "hashtag_strategy": "1-3 trending or niche hashtags",
                    "engagement_style": "Conversational, timely, personality-driven"
                },
                "facebook": {
                    "character_limit": "63,206 characters",
                    "optimal_length": "100-250 characters",
                    "best_posting_times": "Weekdays 9-10 AM, 2-4 PM",
                    "content_types": ["Community discussion", "Behind-the-scenes", "Customer stories", "Educational posts"],
                    "hashtag_strategy": "1-2 broad hashtags",
                    "engagement_style": "Community-focused, personal, storytelling"
                },
                "instagram": {
                    "character_limit": "2,200 characters",
                    "optimal_length": "125-150 characters",
                    "best_posting_times": "Weekdays 6-9 AM, 7-9 PM",
                    "content_types": ["Visual storytelling", "Behind-the-scenes", "User-generated content", "Inspirational quotes"],
                    "hashtag_strategy": "10-30 mix of popular and niche hashtags",
                    "engagement_style": "Visual-first, lifestyle-oriented, inspirational"
                },
                "youtube": {
                    "title_limit": "100 characters",
                    "description_optimal": "200-300 characters",
                    "best_posting_times": "Weekdays 2-4 PM, weekends 9-11 AM",
                    "content_types": ["Tutorials", "Interviews", "Product demos", "Thought leadership"],
                    "hashtag_strategy": "3-5 descriptive hashtags in description",
                    "engagement_style": "Educational, entertaining, in-depth"
                },
                "tiktok": {
                    "character_limit": "4,000 characters",
                    "optimal_length": "100-150 characters",
                    "best_posting_times": "Weekdays 6-10 AM, 7-9 PM",
                    "content_types": ["Quick tips", "Trends", "Behind-the-scenes", "Educational content"],
                    "hashtag_strategy": "3-5 trending hashtags",
                    "engagement_style": "Casual, trendy, authentic, entertaining"
                }
            },
            "post_templates": {
                "educational_tip": {
                    "structure": "Hook + Tip + Context + CTA",
                    "example": "💡 Pro tip: [tip] \n\nWhy this works: [explanation]\n\nTry this and let me know your results! 👇",
                    "best_for": ["LinkedIn", "Twitter", "Instagram"]
                },
                "question_engagement": {
                    "structure": "Question + Context + Call for responses",
                    "example": "Quick question: [question]?\n\nI've been thinking about [context]\n\nWhat's your experience? Share below 👇",
                    "best_for": ["LinkedIn", "Facebook", "Twitter"]
                },
                "behind_the_scenes": {
                    "structure": "Scene setting + Process + Insight + Relatability",
                    "example": "Behind the scenes: [activity]\n\n[Process description]\n\nKey insight: [learning]\n\nAnyone else struggle with this? 😅",
                    "best_for": ["Instagram", "Facebook", "LinkedIn"]
                },
                "success_story": {
                    "structure": "Achievement + Context + Process + Encouragement",
                    "example": "🎉 [Achievement]!\n\nA few months ago: [starting point]\n\nWhat changed: [process]\n\nYou can do this too! [encouragement]",
                    "best_for": ["LinkedIn", "Instagram", "Facebook"]
                },
                "controversial_take": {
                    "structure": "Bold statement + Reasoning + Evidence + Discussion prompt",
                    "example": "Unpopular opinion: [statement]\n\nHere's why: [reasoning]\n\nEvidence: [supporting info]\n\nChange my mind 👇",
                    "best_for": ["LinkedIn", "Twitter"]
                }
            },
            "visual_content_suggestions": {
                "image_types": [
                    "Quote graphics with brand colors",
                    "Data visualizations and charts",
                    "Behind-the-scenes photos",
                    "Product screenshots or demos",
                    "Team photos and culture content"
                ],
                "video_ideas": [
                    "Quick tip tutorials (30-60 seconds)",
                    "Day-in-the-life content",
                    "Product demonstration",
                    "Customer testimonials",
                    "Industry commentary"
                ],
                "graphic_elements": [
                    "Consistent brand colors and fonts",
                    "Logo placement (subtle, not overwhelming)",
                    "High-contrast text for readability",
                    "Mobile-optimized dimensions",
                    "Consistent visual style across posts"
                ]
            },
            "engagement_strategies": {
                "posting_frequency": {
                    "linkedin": "1-2 posts per day",
                    "twitter": "3-5 posts per day",
                    "facebook": "3-5 posts per week",
                    "instagram": "1 post + 3-5 stories per day",
                    "youtube": "1-2 videos per week"
                },
                "community_building": [
                    "Respond to comments within 2-4 hours",
                    "Ask follow-up questions in responses",
                    "Share and comment on others' content",
                    "Create conversation-starter posts",
                    "Host live Q&As or discussions"
                ],
                "hashtag_research": [
                    "Use platform-specific hashtag tools",
                    "Mix popular and niche hashtags",
                    "Create branded hashtags for campaigns",
                    "Monitor hashtag performance",
                    "Stay current with trending topics"
                ]
            }
        }

    async def get_content_calendar_templates(self, content_idea_titles: List[str], duration_days: int = 30) -> Dict[str, Any]:
        """
        Provides content calendar planning templates and scheduling strategies.
        Returns templates and data for the model to use, not generated content.
        """
        logger.info(f"Gathering content calendar templates for {len(content_idea_titles)} ideas over {duration_days} days")

        # Calculate date range
        start_date = datetime.now()
        end_date = start_date + timedelta(days=duration_days)

        # Get cross-agent context
        context = await self.agent.get_cross_agent_context() if hasattr(self.agent, 'get_cross_agent_context') else {}

        return {
            "content_ideas": content_idea_titles,
            "duration_days": duration_days,
            "date_range": {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d")
            },
            "cross_agent_context": context,
            "calendar_frameworks": {
                "content_pillars": {
                    "educational": {
                        "percentage": "40%",
                        "description": "How-to guides, tutorials, industry insights",
                        "goal": "Establish expertise and provide value",
                        "frequency": "2-3 times per week"
                    },
                    "promotional": {
                        "percentage": "20%",
                        "description": "Product features, case studies, testimonials",
                        "goal": "Drive conversions and showcase value",
                        "frequency": "1-2 times per week"
                    },
                    "entertaining": {
                        "percentage": "20%",
                        "description": "Behind-the-scenes, team content, industry humor",
                        "goal": "Build brand personality and engagement",
                        "frequency": "1-2 times per week"
                    },
                    "community": {
                        "percentage": "20%",
                        "description": "User-generated content, discussions, Q&As",
                        "goal": "Foster community and gather feedback",
                        "frequency": "1-2 times per week"
                    }
                },
                "posting_schedules": {
                    "b2b_optimal": {
                        "monday": "Educational content (start week strong)",
                        "tuesday": "Industry news/commentary",
                        "wednesday": "Product/service spotlight",
                        "thursday": "Educational content/case study",
                        "friday": "Community content/lighter topics"
                    },
                    "b2c_optimal": {
                        "monday": "Motivational/inspirational",
                        "tuesday": "Educational tips",
                        "wednesday": "Product showcase",
                        "thursday": "Customer stories",
                        "friday": "Entertainment/behind-the-scenes"
                    }
                }
            },
            "platform_scheduling_strategy": {
                "linkedin": {
                    "best_times": "Weekdays 8-10 AM, 12-2 PM",
                    "frequency": "Daily",
                    "content_mix": "70% educational, 20% promotional, 10% entertainment"
                },
                "twitter": {
                    "best_times": "Weekdays 9 AM, 1-3 PM",
                    "frequency": "3-5 times daily",
                    "content_mix": "50% educational, 30% community, 20% promotional"
                },
                "facebook": {
                    "best_times": "Weekdays 9-10 AM, 2-4 PM",
                    "frequency": "3-5 times weekly",
                    "content_mix": "40% community, 30% educational, 30% entertainment"
                },
                "instagram": {
                    "best_times": "Weekdays 6-9 AM, 7-9 PM",
                    "frequency": "Daily posts + stories",
                    "content_mix": "40% entertainment, 30% educational, 30% community"
                }
            },
            "content_themes_by_week": [
                "Week 1: Foundation - Core value propositions and expertise",
                "Week 2: Education - Teaching and thought leadership",
                "Week 3: Community - Engagement and social proof",
                "Week 4: Growth - Forward-looking and aspirational content"
            ],
            "seasonal_considerations": {
                "january": "New year planning, goal setting, fresh starts",
                "february": "Relationship building, partnerships, love theme",
                "march": "Growth, spring cleaning, productivity",
                "april": "Innovation, creativity, taxes/business planning",
                "may": "Growth, outdoor themes, Memorial Day",
                "june": "Summer planning, mid-year reviews, Father's Day",
                "july": "Independence, freedom themes, summer content",
                "august": "Back-to-school preparation, late summer",
                "september": "New beginnings, fall planning, productivity",
                "october": "Halloween creativity, Q4 planning, autumn themes",
                "november": "Gratitude, Thanksgiving, Black Friday prep",
                "december": "Year-end reflection, holiday themes, planning ahead"
            },
            "content_repurposing_strategy": {
                "long_form_to_short": "Blog post → Social posts → Email newsletter",
                "video_to_multi": "Video → Audio podcast → Blog transcript → Social clips",
                "data_to_visuals": "Research → Infographic → Social graphics → Presentation",
                "success_stories": "Case study → Social proof posts → Email sequences → Sales materials"
            },
            "measurement_framework": {
                "engagement_metrics": [
                    "Likes, comments, shares per post",
                    "Click-through rates to website",
                    "Time spent viewing content",
                    "User-generated content mentions"
                ],
                "conversion_metrics": [
                    "Lead generation from content",
                    "Demo requests or consultations",
                    "Email newsletter signups",
                    "Product/service inquiries"
                ],
                "brand_metrics": [
                    "Brand mention frequency",
                    "Sentiment analysis scores",
                    "Share of voice in industry",
                    "Brand recall surveys"
                ]
            }
        }

    async def _fetch_existing_content(self) -> List[Dict[str, Any]]:
        """Helper method to fetch existing content for reference."""
        if hasattr(self.agent, '_fetch_existing_content'):
            return await self.agent._fetch_existing_content()
        return []