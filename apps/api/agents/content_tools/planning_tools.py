"""Planning tools for content strategy and campaign management."""

from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from .base import ContentToolBase

logger = logging.getLogger(__name__)


class ContentPlanningTools(ContentToolBase):
    """Tools for content planning, campaign design, and strategic scheduling."""

    async def generate_content_plan(
        self,
        duration_weeks: int = 4,
        content_goals: Optional[List[str]] = None,
        preferred_channels: Optional[List[str]] = None,
        budget_range: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive content plan based on business context, marketing strategies, and personas.
        Analyzes all available intelligence to create a coherent, strategic content roadmap.

        Args:
            duration_weeks: How many weeks to plan for (default 4)
            content_goals: Specific goals for the content (e.g., "brand awareness", "lead generation")
            preferred_channels: Channels to focus on (e.g., "blog", "social", "email")
            budget_range: Budget constraints (e.g., "low", "medium", "high", "$1000-$5000")

        Returns:
            Comprehensive content plan with pillars, calendar, channel distribution, and content types
        """
        logger.info(f"[ContentAgent] Generating strategic content plan for {duration_weeks} weeks")

        # Gather all context
        context = await self.agent.get_cross_agent_context("content planning") if hasattr(self.agent, 'get_cross_agent_context') else {}
        brand_guidelines = await self.agent.check_brand_guidelines("all") if hasattr(self.agent, 'check_brand_guidelines') else {}

        # Build plan structure based on intelligence
        plan_data = {
            "plan_metadata": {
                "duration_weeks": duration_weeks,
                "content_goals": content_goals or ["brand awareness", "thought leadership", "lead generation"],
                "preferred_channels": preferred_channels or ["blog", "social media", "email"],
                "budget_range": budget_range or "flexible",
                "generated_date": datetime.now().isoformat()
            },
            "business_context": {},
            "content_pillars": [],
            "content_calendar": {},
            "channel_distribution": {},
            "content_types": {},
            "success_metrics": {}
        }

        # Extract business context
        if hasattr(self.agent, 'context') and self.agent.context:
            if self.agent.context.get('company'):
                company = self.agent.context['company']
                plan_data['business_context'] = {
                    'company_name': company.get('company_name'),
                    'industry': company.get('industry'),
                    'target_markets': company.get('target_market', [])[:3],
                    'unique_value_proposition': company.get('unique_value_proposition')
                }

            # Define content pillars based on marketing strategy
            if self.agent.context.get('strategies'):
                active_strategies = [s for s in self.agent.context['strategies'] if s.get('status') == 'active']
                if active_strategies:
                    strategy = active_strategies[0]

                    # Extract content pillars from strategy
                    if strategy.get('content_pillars'):
                        plan_data['content_pillars'] = strategy['content_pillars']
                    else:
                        # Generate default pillars based on business
                        plan_data['content_pillars'] = [
                            "Industry Expertise & Insights",
                            "Product Innovation & Features",
                            "Customer Success Stories",
                            "Thought Leadership & Trends"
                        ]

                    # Add positioning context
                    if strategy.get('positioning_statement'):
                        plan_data['positioning_statement'] = strategy['positioning_statement']

            # Ensure we always have content pillars
            if not plan_data['content_pillars']:
                plan_data['content_pillars'] = [
                    "Industry Expertise & Insights",
                    "Product Innovation & Features",
                    "Customer Success Stories",
                    "Thought Leadership & Trends"
                ]

            # Analyze personas for content preferences
            if self.agent.context.get('personas'):
                persona_insights = []
                for persona in self.agent.context['personas'][:3]:
                    insights = {
                        'name': persona.get('name'),
                        'preferred_content': [],
                        'pain_points': persona.get('pain_points', [])[:2],
                        'goals': persona.get('goals', [])[:2]
                    }

                    # Infer content preferences
                    if persona.get('preferred_channels'):
                        insights['preferred_channels'] = persona['preferred_channels']

                    persona_insights.append(insights)

                plan_data['target_personas'] = persona_insights

        # Build content calendar structure
        plan_data['content_calendar'] = {
            'weekly_cadence': {
                'monday': 'Educational content - Start week with value',
                'wednesday': 'Product/Feature spotlight',
                'friday': 'Community engagement or success stories'
            },
            'monthly_themes': [],
            'content_mix': {
                'educational': 40,  # 40% educational
                'promotional': 20,  # 20% promotional
                'community': 20,    # 20% community/engagement
                'entertainment': 20  # 20% entertainment/culture
            }
        }

        # Generate monthly themes based on duration
        for week_num in range(1, min(duration_weeks + 1, 5)):
            if week_num == 1:
                theme = "Foundation - Establish expertise and introduce value props"
            elif week_num == 2:
                theme = "Education - Deep dive into problems and solutions"
            elif week_num == 3:
                theme = "Social Proof - Success stories and testimonials"
            else:
                theme = "Innovation - Future vision and thought leadership"

            plan_data['content_calendar']['monthly_themes'].append({
                f'week_{week_num}': theme
            })

        # Define channel distribution based on preferences
        all_channels = preferred_channels or ["blog", "social media", "email", "website"]
        plan_data['channel_distribution'] = {
            'owned_media': [],
            'earned_media': [],
            'paid_media': []
        }

        # Categorize channels
        for channel in all_channels:
            if channel in ["blog", "website", "email"]:
                plan_data['channel_distribution']['owned_media'].append(channel)
            elif channel in ["pr", "guest_posts", "partnerships"]:
                plan_data['channel_distribution']['earned_media'].append(channel)
            elif channel in ["ads", "sponsored_content", "paid_social"]:
                plan_data['channel_distribution']['paid_media'].append(channel)
            else:
                # Default to owned for general "social media"
                plan_data['channel_distribution']['owned_media'].append(channel)

        # Calculate content type distribution
        total_pieces = duration_weeks * 3  # Assume 3 pieces per week average
        plan_data['content_types'] = {
            'blog_posts': max(1, total_pieces // 3),
            'social_posts': total_pieces,
            'email_campaigns': max(1, duration_weeks),
            'case_studies': max(1, duration_weeks // 4),
            'infographics': max(1, duration_weeks // 2)
        }

        # Add brand voice if available
        if brand_guidelines.get('has_guidelines'):
            plan_data['brand_voice'] = brand_guidelines.get('tone_guidance', {})
            plan_data['content_rules'] = brand_guidelines.get('content_rules', {})

        # Define success metrics
        plan_data['success_metrics'] = {
            'engagement_metrics': [
                'Content engagement rate (likes, shares, comments)',
                'Email open and click rates',
                'Blog time on page and bounce rate'
            ],
            'conversion_metrics': [
                'Content-to-lead conversion rate',
                'Content-attributed pipeline value',
                'Customer acquisition from content'
            ],
            'brand_metrics': [
                'Brand mention sentiment',
                'Share of voice in industry',
                'Thought leadership recognition'
            ]
        }

        # Add AI recommendations
        plan_data['ai_recommendations'] = []

        if not brand_guidelines.get('has_guidelines'):
            plan_data['ai_recommendations'].append(
                "Establish brand voice guidelines before content creation for consistency"
            )

        if content_goals and "lead_generation" in content_goals:
            plan_data['ai_recommendations'].append(
                "Focus on educational content with clear CTAs and lead magnets"
            )

        if budget_range and "low" in str(budget_range).lower():
            plan_data['ai_recommendations'].append(
                "Prioritize organic content and repurposing to maximize budget efficiency"
            )

        if plan_data['content_pillars']:
            plan_data['ai_recommendations'].append(
                f"Start with '{plan_data['content_pillars'][0]}' pillar for immediate impact"
            )

        logger.info(f"[ContentAgent] Generated content plan with {len(plan_data['content_pillars'])} pillars")

        return {
            "success": True,
            "message": "Content plan generated successfully based on your business context",
            "plan": plan_data,
            "next_steps": [
                "Review and customize the content pillars",
                "Adjust the content calendar to your team capacity",
                "Set up tracking for success metrics",
                "Begin creating content for Week 1"
            ]
        }

    async def analyze_content_needs(
        self,
        include_prerequisites: bool = True,
        max_recommendations: int = 5
    ) -> Dict[str, Any]:
        """
        Analyze marketing strategy and recommend next content actions.
        Uses progressive loading to efficiently gather context and generate intelligent recommendations.

        Args:
            include_prerequisites: Check for missing prerequisites
            max_recommendations: Maximum number of recommendations to return

        Returns:
            Prioritized list of content to create with tool recommendations
        """
        logger.info(f"[ContentAgent] Analyzing content needs for organization")

        # Get org_id from the agent (now properly stored in __init__)
        org_id = self.agent.org_id

        if not org_id:
            logger.error("[ContentAgent] No org_id available for content analysis")
            return {
                "success": False,
                "needs_setup": True,
                "message": "Organization context not available",
                "prerequisites": ["Login with organization account"],
                "next_action": "/login"
            }

        # Use progressive learning context service (always fresh, no caching)
        from apps.api.services.progressive_learning_context_service import ProgressiveLearningContextService
        context_service = ProgressiveLearningContextService(org_id=org_id)

        # Load context progressively
        context = await context_service.get_progressive_context(
            agent_type='content',
            query_complexity='agent_specific'  # Don't load deep analysis initially
        )

        recommendations = []

        # Check prerequisites first
        if include_prerequisites:
            if not context.get('company') or not context.get('company', {}).get('company_name'):
                return {
                    "success": False,
                    "needs_setup": True,
                    "message": "Let's start by setting up your business profile",
                    "prerequisites": ["Complete business profile"],
                    "next_action": "/profile/business-context"
                }

            if not context.get('personas') or len(context.get('personas', [])) == 0:
                return {
                    "success": False,
                    "needs_setup": True,
                    "message": "First, let's define your target audience",
                    "prerequisites": ["Create at least one customer persona"],
                    "next_action": "/persona"
                }

            if not context.get('strategies') or len(context.get('strategies', [])) == 0:
                return {
                    "success": False,
                    "needs_setup": True,
                    "message": "You need a marketing strategy before creating content",
                    "prerequisites": ["Define marketing strategy"],
                    "next_action": "/marketing-strategy"
                }

        # Analyze marketing strategy for content needs
        active_strategies = [s for s in context.get('strategies', []) if s.get('status') == 'active']
        if active_strategies:
            strategy = active_strategies[0]

            # Extract content needs from strategy
            if strategy.get('content_pillars'):
                for pillar in strategy.get('content_pillars', [])[:2]:  # Top 2 pillars
                    recommendations.append({
                        "id": f"blog_{pillar.lower().replace(' ', '_')}",
                        "task": f"Create blog post about {pillar}",
                        "tool": "seo-blog",
                        "toolName": "SEO Blog Post Generator",
                        "priority": "high",
                        "reason": f"Aligns with your content pillar: {pillar}",
                        "category": "thought-leadership",
                        "estimatedTime": "30 minutes",
                        "status": "ready"
                    })

            # Check channel strategy
            channels = strategy.get('channel_distribution', {})
            if channels.get('owned', []) and 'Email' in str(channels.get('owned')):
                recommendations.append({
                    "id": "email_nurture",
                    "task": "Design email nurture sequence",
                    "tool": "email-drip",
                    "toolName": "Email Drip Campaign Designer",
                    "priority": "medium",
                    "reason": "Email is a key channel in your strategy",
                    "category": "email",
                    "estimatedTime": "45 minutes",
                    "status": "ready"
                })

            if channels.get('earned', []) and 'Social Media' in str(channels.get('earned')):
                recommendations.append({
                    "id": "social_calendar",
                    "task": "Plan social media content calendar",
                    "tool": "social-calendar",
                    "toolName": "Social Media Calendar",
                    "priority": "medium",
                    "reason": "Social media is part of your earned media strategy",
                    "category": "social",
                    "estimatedTime": "30 minutes",
                    "status": "ready"
                })

        # Check for USP-focused needs
        if context.get('company', {}).get('unique_value_proposition'):
            recommendations.append({
                "id": "usp_content",
                "task": "Create USP-focused content piece",
                "tool": "usp-content",
                "toolName": "USP-Focused Content",
                "priority": "low",
                "reason": "Differentiate from competitors with your unique value",
                "category": "differentiation",
                "estimatedTime": "25 minutes",
                "status": "ready"
            })

        # Limit recommendations
        recommendations = recommendations[:max_recommendations]

        # Calculate progress
        total_possible = 10  # Arbitrary total for progress calculation
        completed = len(context.get('content_outputs', []))
        progress = min(100, (completed / total_possible) * 100)

        return {
            "success": True,
            "recommendations": recommendations,
            "progress": {
                "percentage": progress,
                "completed": completed,
                "message": f"{completed} content pieces created"
            },
            "context_summary": {
                "has_strategy": bool(active_strategies),
                "has_personas": bool(context.get('personas')),
                "has_brand_guidelines": bool(context.get('brand_guidelines')),
                "content_pillars": active_strategies[0].get('content_pillars', []) if active_strategies else []
            }
        }

    async def save_content_plan(
        self,
        title: str,
        executive_summary: str,
        content_pillars: List[str],
        content_calendar: Dict[str, Any],
        channel_distribution: Dict[str, Any],
        content_types: Optional[Dict[str, int]] = None,
        target_metrics: Optional[Dict[str, Any]] = None,
        make_active: bool = False
    ) -> Dict[str, Any]:
        """
        Save a strategic content plan for future execution.

        Args:
            title: Plan title
            executive_summary: Executive summary of the plan
            content_pillars: List of content themes/pillars
            content_calendar: Publishing schedule (weekly, monthly, etc.)
            channel_distribution: Distribution strategy across channels
            content_types: Mix of content types (blog_posts: 4, social: 20, etc.)
            target_metrics: Success metrics and KPIs
            make_active: Whether to make this the active plan

        Returns:
            Confirmation of saved plan with ID
        """
        logger.info(f"[ContentAgent] Saving content plan: {title}")

        try:
            from apps.api.services.content_output_service import ContentOutputService
            service = ContentOutputService()

            # Save to database
            result = await service.save_content_plan(
                org_id=self.org_id,
                user_id=self.user_id,
                title=title,
                executive_summary=executive_summary,
                content_pillars=content_pillars,
                content_calendar=content_calendar,
                channel_distribution=channel_distribution,
                campaign_id=self.campaign_id,
                session_id=self.current_session_id,
                content_types=content_types,
                target_metrics=target_metrics,
                is_active=make_active,
                client_id=self.client_id
            )

            return {
                "success": True,
                "plan_id": result.get('id'),
                "message": f"Content plan '{title}' saved successfully",
                "is_active": result.get('is_active', False),
                "status": result.get('status', 'draft')
            }

        except Exception as e:
            logger.error(f"Failed to save content plan: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to save content plan. Please try again."
            }

    async def get_active_content_plan(self) -> Dict[str, Any]:
        """
        Retrieve the active content plan for the current campaign.

        Returns:
            Active content plan details or indication that no plan exists
        """
        logger.info(f"[ContentAgent] Retrieving active content plan")

        try:
            from apps.api.services.content_output_service import ContentOutputService
            service = ContentOutputService()

            plan = await service.get_active_content_plan(
                org_id=self.org_id,
                campaign_id=self.campaign_id
            )

            if plan:
                return {
                    "has_active_plan": True,
                    "plan": plan,
                    "message": f"Active plan: {plan.get('title', 'Untitled')}"
                }
            else:
                return {
                    "has_active_plan": False,
                    "plan": None,
                    "message": "No active content plan found. Would you like to create one?"
                }

        except Exception as e:
            logger.error(f"Failed to retrieve active content plan: {str(e)}")
            return {
                "has_active_plan": False,
                "error": str(e),
                "message": "Failed to retrieve content plan"
            }

    async def design_email_drip_campaign(
        self,
        campaign_name: str,
        target_audience: str,
        campaign_goal: str,
        number_of_emails: int = 5,
        send_frequency: str = "weekly"
    ) -> Dict[str, Any]:
        """
        Designs a complete email drip campaign with strategic sequencing and personalization.

        Args:
            campaign_name: Name of the drip campaign
            target_audience: Description of target recipients
            campaign_goal: Primary objective (nurture, convert, onboard, etc.)
            number_of_emails: Number of emails in the sequence
            send_frequency: Timing between emails (daily, weekly, biweekly)

        Returns:
            Complete email campaign structure with content and automation rules
        """
        logger.info(f"[ContentAgent] Designing email drip campaign: {campaign_name}")

        # Get context for personalization
        context = await self.agent.get_cross_agent_context(f"email campaign for {target_audience}") if hasattr(self.agent, 'get_cross_agent_context') else {}
        brand_guidelines = await self.agent.check_brand_guidelines("messaging") if hasattr(self.agent, 'check_brand_guidelines') else {}

        return {
            "campaign_name": campaign_name,
            "target_audience": target_audience,
            "campaign_goal": campaign_goal,
            "send_frequency": send_frequency,
            "brand_voice": brand_guidelines.get('tone_guidance', {}),
            "cross_agent_context": context,
            "email_sequence": {
                "email_1_welcome": {
                    "timing": "Immediately after signup",
                    "subject_line": "Welcome! Here's what to expect",
                    "purpose": "Set expectations and deliver immediate value",
                    "content_blocks": [
                        "Personal welcome message",
                        "What they'll learn/gain",
                        "Quick win or valuable resource",
                        "Clear next steps"
                    ],
                    "cta": "Primary action to engage"
                },
                "email_2_education": {
                    "timing": f"Day 3-4 after email 1",
                    "subject_line": "The secret to [solving their problem]",
                    "purpose": "Educate and build trust",
                    "content_blocks": [
                        "Educational content addressing pain point",
                        "Case study or success story",
                        "Actionable tips they can implement",
                        "Soft product mention"
                    ],
                    "cta": "Learn more or explore resources"
                },
                "email_3_social_proof": {
                    "timing": f"Day 7 after email 2",
                    "subject_line": "How [Company] achieved [Result]",
                    "purpose": "Build credibility through proof",
                    "content_blocks": [
                        "Customer success story",
                        "Specific metrics and results",
                        "Behind-the-scenes insights",
                        "How reader can achieve similar results"
                    ],
                    "cta": "See how it works"
                },
                "email_4_objection_handling": {
                    "timing": f"Day 10-14 after email 3",
                    "subject_line": "Is [common objection] holding you back?",
                    "purpose": "Address concerns and objections",
                    "content_blocks": [
                        "Acknowledge common concern",
                        "Myth-busting or clarification",
                        "Risk reversal (guarantee, trial, etc.)",
                        "FAQ section"
                    ],
                    "cta": "Start risk-free trial"
                },
                "email_5_conversion": {
                    "timing": f"Day 14-21 after email 4",
                    "subject_line": "Ready to [achieve desired outcome]?",
                    "purpose": "Drive conversion decision",
                    "content_blocks": [
                        "Recap of value proposition",
                        "Limited-time offer or bonus",
                        "Strong urgency/scarcity element",
                        "Clear call to action"
                    ],
                    "cta": "Get started today"
                }
            },
            "personalization_strategy": {
                "merge_tags": ["First name", "Company", "Industry", "Pain point"],
                "dynamic_content": "Adjust examples based on industry/role",
                "behavioral_triggers": "Adapt based on email engagement",
                "segmentation": "Different paths for different personas"
            },
            "automation_rules": {
                "trigger_conditions": "Form submission, download, or signup",
                "engagement_based_timing": "Delay next email if previous unopened",
                "re_engagement_logic": "Alternative path for non-engagers",
                "conversion_tracking": "Tag and segment based on actions"
            },
            "success_metrics": {
                "open_rate_target": "35-45% for B2B",
                "click_rate_target": "7-10% for engaged segments",
                "conversion_rate_target": "2-5% overall campaign",
                "list_health": "< 2% unsubscribe rate"
            }
        }

    async def create_social_media_calendar(
        self,
        duration_weeks: int = 4,
        platforms: Optional[List[str]] = None,
        content_themes: Optional[List[str]] = None,
        posting_frequency: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """
        Creates a strategic social media content calendar with platform-specific content.

        Args:
            duration_weeks: Number of weeks to plan content for
            platforms: List of social platforms (LinkedIn, Twitter, Instagram, etc.)
            content_themes: Key themes or pillars to cover
            posting_frequency: Posts per week per platform

        Returns:
            Complete social media calendar with content ideas and posting schedule
        """
        logger.info(f"[ContentAgent] Creating {duration_weeks}-week social media calendar")

        # Default values
        if not platforms:
            platforms = ["LinkedIn", "Twitter", "Instagram"]
        if not content_themes:
            content_themes = await self._get_content_themes_from_strategy()
        if not posting_frequency:
            posting_frequency = {
                "LinkedIn": 3,
                "Twitter": 5,
                "Instagram": 4
            }

        # Get context
        context = await self.agent.get_cross_agent_context("social media strategy") if hasattr(self.agent, 'get_cross_agent_context') else {}
        brand_guidelines = await self.agent.check_brand_guidelines("voice") if hasattr(self.agent, 'check_brand_guidelines') else {}

        # Generate calendar structure
        calendar = {}
        for week in range(1, duration_weeks + 1):
            week_key = f"week_{week}"
            calendar[week_key] = {
                "theme_focus": content_themes[(week - 1) % len(content_themes)],
                "posts": {}
            }

            for platform in platforms:
                platform_posts = []
                posts_this_week = posting_frequency.get(platform, 3)

                for post_num in range(1, posts_this_week + 1):
                    platform_posts.append({
                        "day": self._calculate_post_day(post_num, posts_this_week),
                        "content_type": self._get_platform_content_type(platform),
                        "hook": f"Engaging opener for {platform}",
                        "main_content": "Core message adapted for platform",
                        "hashtags": self._get_platform_hashtags(platform),
                        "cta": "Platform-appropriate call to action",
                        "visual": "Image/video recommendation"
                    })

                calendar[week_key]["posts"][platform] = platform_posts

        return {
            "duration_weeks": duration_weeks,
            "platforms": platforms,
            "content_themes": content_themes,
            "posting_frequency": posting_frequency,
            "brand_voice": brand_guidelines.get('tone_guidance', {}),
            "calendar": calendar,
            "platform_best_practices": {
                "LinkedIn": {
                    "optimal_times": "Tuesday-Thursday, 8-10am and 5-6pm",
                    "content_mix": "60% educational, 30% company updates, 10% promotional",
                    "format_preference": "Native video > images > links",
                    "engagement_tactics": "Ask questions, share insights, tag relevant people"
                },
                "Twitter": {
                    "optimal_times": "Monday-Friday, 9am-3pm",
                    "content_mix": "40% sharing/curating, 40% original, 20% promotional",
                    "format_preference": "Threads > single tweets with images > links",
                    "engagement_tactics": "Join conversations, use trending hashtags, quick responses"
                },
                "Instagram": {
                    "optimal_times": "Monday-Friday, 11am-1pm and 7-9pm",
                    "content_mix": "70% visual storytelling, 20% behind-scenes, 10% promotional",
                    "format_preference": "Reels > carousels > single images",
                    "engagement_tactics": "Stories for engagement, IGTV for depth, consistent aesthetic"
                }
            },
            "content_batching_strategy": {
                "planning_day": "Plan all content on Mondays",
                "creation_days": "Batch create on Tuesdays",
                "scheduling": "Schedule week's content on Wednesdays",
                "engagement": "Daily 15-minute engagement sessions"
            },
            "performance_tracking": {
                "metrics_to_track": ["Reach", "Engagement rate", "Click-through rate", "Conversions"],
                "weekly_review": "Analyze what worked and adjust",
                "a_b_testing": "Test different formats, times, and messages",
                "reporting": "Monthly performance summary"
            }
        }

    def _calculate_post_day(self, post_num: int, total_posts: int) -> str:
        """Calculate optimal day for post distribution."""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        if total_posts >= 5:
            return days[post_num - 1] if post_num <= 5 else "Saturday"
        else:
            # Distribute evenly across weekdays
            interval = 5 // total_posts
            return days[(post_num - 1) * interval]

    def _get_platform_content_type(self, platform: str) -> str:
        """Get appropriate content type for platform."""
        content_types = {
            "LinkedIn": ["Article share", "Native video", "Poll", "Industry insight", "Case study"],
            "Twitter": ["Thread", "Quick tip", "Industry news", "Quote tweet", "Poll"],
            "Instagram": ["Carousel", "Reel", "Story", "IGTV", "Quote graphic"]
        }
        import random
        return random.choice(content_types.get(platform, ["Text post"]))

    def _get_platform_hashtags(self, platform: str) -> List[str]:
        """Get platform-appropriate hashtags."""
        hashtag_counts = {
            "LinkedIn": 3,  # 3-5 hashtags optimal
            "Twitter": 2,   # 1-2 hashtags optimal
            "Instagram": 10  # 10-30 hashtags optimal
        }
        count = hashtag_counts.get(platform, 5)
        return [f"#relevant_hashtag_{i+1}" for i in range(count)]

    async def _get_content_themes_from_strategy(self) -> List[str]:
        """Get content themes from marketing strategy if available."""
        try:
            # Try to get from context
            if hasattr(self.agent, 'context') and self.agent.context:
                strategies = self.agent.context.get('marketing_strategies', [])
                if strategies and strategies[0].get('content_pillars'):
                    return strategies[0]['content_pillars']
        except:
            pass

        # Return defaults if no strategy found
        return [
            "Industry insights",
            "Product features",
            "Customer success",
            "Company culture"
        ]