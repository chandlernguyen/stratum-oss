"""Utility tools for content agent including brand guidelines and cross-agent context."""

from typing import Dict, Any, List, Optional
import logging
from apps.api.utils.database import get_supabase_client
from .base import ContentToolBase

logger = logging.getLogger(__name__)


class ContentUtilityTools(ContentToolBase):
    """Utility tools for brand guidelines checking, cross-agent context, and content management."""

    async def check_brand_guidelines(self, check_type: str = "all") -> Dict[str, Any]:
        """
        Check and retrieve structured brand guidelines to ensure content consistency.
        Enhanced to work with the new structured brand guidelines schema.

        Args:
            check_type: What to check - "all", "voice", "messaging", "strategy", "visual"

        Returns:
            Dictionary with structured brand guidelines and detailed recommendations for content creation
        """
        logger.info(f"[ContentAgent] Checking structured brand guidelines (type: {check_type})")

        guidelines_data = {
            'has_guidelines': False,
            'brand_voice': {},
            'messaging': {},
            'brand_strategy': {},
            'visual_identity': {},
            'content_recommendations': [],
            'tone_guidance': {},
            'messaging_framework': {},
            'content_rules': {}
        }

        # Check enterprise context for structured brand guidelines
        if hasattr(self.agent, 'context') and self.agent.context and self.agent.context.get('brand_guidelines'):
            guidelines = self.agent.context['brand_guidelines']
            guidelines_data['has_guidelines'] = True
            logger.info(f"[ContentAgent] Found brand guidelines in context")

            # Extract Brand Voice (PRIMARY for Content Agent)
            if check_type in ["all", "voice"] and guidelines.get('brand_voice'):
                brand_voice = guidelines['brand_voice']
                guidelines_data['brand_voice'] = brand_voice

                # Extract tone guidance for easy access
                if brand_voice.get('tone_of_voice'):
                    tone = brand_voice['tone_of_voice']
                    guidelines_data['tone_guidance'] = {
                        'primary_tone': tone.get('primary', ''),
                        'characteristics': tone.get('characteristics', []),
                        'avoid': tone.get('avoid', [])
                    }
                    guidelines_data['content_recommendations'].append(
                        f"Maintain {tone.get('primary', 'consistent')} tone throughout all content"
                    )

                    if tone.get('characteristics'):
                        guidelines_data['content_recommendations'].append(
                            f"Emphasize these characteristics: {', '.join(tone.get('characteristics', []))}"
                        )

                    if tone.get('avoid'):
                        guidelines_data['content_recommendations'].append(
                            f"Avoid these tones: {', '.join(tone.get('avoid', []))}"
                        )

                # Extract personality traits
                if brand_voice.get('personality_traits'):
                    personality = brand_voice['personality_traits']
                    if personality.get('archetype'):
                        guidelines_data['content_recommendations'].append(
                            f"Write as '{personality['archetype']}' brand archetype"
                        )
                    if personality.get('attributes'):
                        guidelines_data['content_recommendations'].append(
                            f"Reflect these brand attributes: {', '.join(personality.get('attributes', []))}"
                        )

                # Extract writing style
                if brand_voice.get('writing_style'):
                    writing_style = brand_voice['writing_style']
                    style_tips = []

                    if writing_style.get('sentence_length'):
                        style_tips.append(f"Sentence length: {writing_style['sentence_length']}")
                    if writing_style.get('vocabulary'):
                        style_tips.append(f"Vocabulary: {writing_style['vocabulary']}")
                    if writing_style.get('perspective'):
                        style_tips.append(f"Perspective: {writing_style['perspective']}")
                    if writing_style.get('formatting'):
                        style_tips.append(f"Formatting: {', '.join(writing_style.get('formatting', []))}")

                    if style_tips:
                        guidelines_data['content_recommendations'].append(
                            f"Writing style: {'; '.join(style_tips)}"
                        )

            # Extract Messaging Framework (CRITICAL for Content Agent)
            if check_type in ["all", "messaging"] and guidelines.get('messaging'):
                messaging = guidelines['messaging']
                guidelines_data['messaging'] = messaging

                # Extract key messages
                if messaging.get('key_messages'):
                    key_msgs = messaging['key_messages']
                    guidelines_data['messaging_framework']['key_messages'] = key_msgs

                    if key_msgs.get('primary'):
                        guidelines_data['content_recommendations'].append(
                            f"Lead with primary message: {key_msgs['primary']}"
                        )

                    if key_msgs.get('supporting'):
                        guidelines_data['content_recommendations'].append(
                            f"Incorporate supporting messages: {', '.join(key_msgs.get('supporting', []))}"
                        )

                    if key_msgs.get('differentiation'):
                        guidelines_data['content_recommendations'].append(
                            f"Highlight differentiation: {key_msgs['differentiation']}"
                        )

                # Extract value propositions
                if messaging.get('value_propositions'):
                    value_props = messaging['value_propositions']
                    guidelines_data['messaging_framework']['value_propositions'] = value_props

                    if value_props.get('functional'):
                        guidelines_data['content_recommendations'].append(
                            f"Functional benefit: {value_props['functional']}"
                        )
                    if value_props.get('emotional'):
                        guidelines_data['content_recommendations'].append(
                            f"Emotional benefit: {value_props['emotional']}"
                        )
                    if value_props.get('social'):
                        guidelines_data['content_recommendations'].append(
                            f"Social benefit: {value_props['social']}"
                        )

                # Extract content rules (ESSENTIAL for Content Agent)
                if messaging.get('content_rules'):
                    content_rules = messaging['content_rules']
                    guidelines_data['content_rules'] = content_rules

                    if content_rules.get('always_do'):
                        guidelines_data['content_recommendations'].append(
                            f"Always do: {', '.join(content_rules.get('always_do', []))}"
                        )

                    if content_rules.get('never_do'):
                        guidelines_data['content_recommendations'].append(
                            f"Never do: {', '.join(content_rules.get('never_do', []))}"
                        )

                    if content_rules.get('prohibited_words'):
                        guidelines_data['content_recommendations'].append(
                            f"Prohibited words: {', '.join(content_rules.get('prohibited_words', []))}"
                        )

                    if content_rules.get('required_elements'):
                        guidelines_data['content_recommendations'].append(
                            f"Required elements: {', '.join(content_rules.get('required_elements', []))}"
                        )

            # Extract Brand Strategy (CONTEXT for Content Agent)
            if check_type in ["all", "strategy"] and guidelines.get('brand_strategy'):
                brand_strategy = guidelines['brand_strategy']
                guidelines_data['brand_strategy'] = brand_strategy

                if brand_strategy.get('mission'):
                    guidelines_data['content_recommendations'].append(
                        f"Align content with mission: {brand_strategy['mission']}"
                    )

                if brand_strategy.get('values'):
                    guidelines_data['content_recommendations'].append(
                        f"Reflect brand values: {', '.join(brand_strategy.get('values', []))}"
                    )

                if brand_strategy.get('target_audience'):
                    guidelines_data['content_recommendations'].append(
                        f"Target audience: {brand_strategy['target_audience']}"
                    )

            # Extract Visual Identity (REFERENCE for Content Agent)
            if check_type in ["all", "visual"] and guidelines.get('visual_identity'):
                visual_identity = guidelines['visual_identity']
                guidelines_data['visual_identity'] = visual_identity

                if visual_identity.get('color_palette'):
                    guidelines_data['content_recommendations'].append(
                        f"Brand colors: {', '.join(visual_identity.get('color_palette', []))}"
                    )

        # Fallback: Check marketing strategies for tone/voice if no brand guidelines
        if not guidelines_data['has_guidelines'] and hasattr(self.agent, 'context') and self.agent.context:
            if self.agent.context.get('strategies'):
                for strategy in self.agent.context['strategies']:
                    if strategy.get('tone_of_voice'):
                        guidelines_data['tone_guidance']['primary_tone'] = strategy['tone_of_voice']
                        guidelines_data['has_guidelines'] = True
                        guidelines_data['content_recommendations'].append(
                            "Using tone of voice from marketing strategy (consider creating dedicated brand guidelines)"
                        )
                        break

        # Provide guidance if no guidelines found
        if not guidelines_data['has_guidelines']:
            guidelines_data['content_recommendations'] = [
                "🚨 No brand guidelines found! Creating consistent content without brand voice guidelines is challenging.",
                "💡 RECOMMENDED: Create structured brand guidelines with:",
                "   • Brand Voice (tone, personality, writing style)",
                "   • Messaging Framework (key messages, value propositions)",
                "   • Content Rules (do's, don'ts, required elements)",
                "📝 This ensures all content sounds like it comes from the same company.",
                "🔧 Use the brand guidelines section in your profile to get started."
            ]
        else:
            # Add summary for existing guidelines
            guidelines_data['content_recommendations'].insert(0,
                f"✅ Found structured brand guidelines! Using them to ensure content consistency."
            )

        logger.info(f"[ContentAgent] Brand guidelines check complete. Found guidelines: {guidelines_data['has_guidelines']}")
        return guidelines_data

    async def get_cross_agent_context(self, query: str = "") -> Dict[str, Any]:
        """
        Retrieves relevant context from Strategy and Persona agents to inform content creation.
        ENHANCED: Now also checks for brand guidelines and marketing strategies.
        """
        logger.info(f"Retrieving cross-agent context for: {query[:50]}...")
        try:
            supabase = get_supabase_client()

            # Use enterprise context if available
            org_id = self.org_id or getattr(self.agent, 'current_org_id', None)
            campaign_id = self.campaign_id or getattr(self.agent, 'current_campaign_id', None)

            context = {
                'strategy': None,
                'personas': [],
                'campaign': None,
                'marketing_strategy': None,
                'brand_guidelines': None,
                'has_brand_voice': False
            }

            # Use enterprise context if available
            if hasattr(self.agent, 'context') and self.agent.context:
                # Get strategy outputs from enterprise context
                if self.agent.context.get('strategy_outputs'):
                    for output in self.agent.context['strategy_outputs']:
                        if output.get('output_type') == 'swot':
                            context['strategy'] = {
                                'strengths': output.get('strengths', []),
                                'weaknesses': output.get('weaknesses', []),
                                'opportunities': output.get('opportunities', []),
                                'threats': output.get('threats', []),
                                'key_insights': output.get('key_insights', []),
                                'recommendations': output.get('recommendations', [])
                            }
                            logger.info("Retrieved strategy context from enterprise context")
                            break
            elif org_id:
                # 🚀 NUCLEAR: Fallback to direct query from agent_outputs table
                strategy_query = supabase.table('agent_outputs').select('*').eq('agent_type', 'strategy')
                if campaign_id:
                    strategy_query = strategy_query.contains('metadata', {'campaign_id': campaign_id})
                else:
                    strategy_query = strategy_query.eq('org_id', org_id)

                strategy_result = strategy_query.eq('output_type', 'swot').order('created_at', desc=True).limit(1).execute()

                if strategy_result.data:
                    strategy = strategy_result.data[0]
                    # 🚀 NUCLEAR: Extract SWOT data from content field
                    content = strategy.get('content', {})
                    context['strategy'] = {
                        'strengths': content.get('strengths', []),
                        'weaknesses': content.get('weaknesses', []),
                        'opportunities': content.get('opportunities', []),
                        'threats': content.get('threats', []),
                        'key_insights': content.get('key_insights', []),
                        'recommendations': content.get('recommendations', [])
                    }
                    logger.info("Retrieved strategy context from database")

            # Get personas from enterprise context or database
            if hasattr(self.agent, 'context') and self.agent.context and self.agent.context.get('personas'):
                for persona in self.agent.context['personas'][:3]:
                    context['personas'].append({
                        'name': persona.get('name'),
                        'title': persona.get('title'),
                        'company_name': persona.get('company_name'),
                        'industry': persona.get('industry'),
                        'demographics': persona.get('demographics', {}),
                        'pain_points': persona.get('pain_points', []),
                        'goals': persona.get('goals', []),
                        'preferred_channels': persona.get('preferred_channels', [])
                    })
                logger.info(f"Retrieved {len(context['personas'])} personas from enterprise context")
            elif org_id:
                # Fallback: query agent_outputs directly (nuclear migration)
                persona_result = supabase.table('agent_outputs') \
                    .select('*') \
                    .eq('org_id', org_id) \
                    .eq('agent_type', 'persona') \
                    .eq('output_type', 'persona') \
                    .is_('archived_at', 'null') \
                    .order('created_at', desc=True) \
                    .limit(3) \
                    .execute()

                if persona_result.data:
                    for item in persona_result.data:
                        content = item.get('content', {})
                        context['personas'].append({
                            'name': content.get('name'),
                            'title': content.get('title'),
                            'company_name': content.get('company_name'),
                            'industry': content.get('industry'),
                            'demographics': content.get('demographics', {}),
                            'pain_points': content.get('pain_points', []),
                            'goals': content.get('goals', []),
                            'preferred_channels': content.get('preferred_channels', [])
                        })
                    logger.info(f"Retrieved {len(context['personas'])} personas from database")

            # Get marketing strategy from enterprise context or database
            if hasattr(self.agent, 'context') and self.agent.context and self.agent.context.get('strategies'):
                active_strategies = [s for s in self.agent.context['strategies'] if s.get('status') == 'active']
                if active_strategies:
                    ms = active_strategies[0]
                    context['marketing_strategy'] = {
                        'value_propositions': ms.get('value_propositions', {}),
                        'key_messages': ms.get('key_messages', {}),
                        'tone_of_voice': ms.get('tone_of_voice', {}),
                        'brand_personality': ms.get('brand_personality', []),
                        'messaging_framework': ms.get('messaging_framework', {})
                    }

                    # Check if brand voice is defined
                    if ms.get('tone_of_voice') or ms.get('brand_personality'):
                        context['has_brand_voice'] = True
                        context['brand_guidelines'] = {
                            'tone': ms.get('tone_of_voice', {}),
                            'personality': ms.get('brand_personality', []),
                            'key_messages': ms.get('key_messages', {}),
                            'value_props': ms.get('value_propositions', {})
                        }

                    logger.info(f"Retrieved marketing strategy from enterprise context with brand voice: {context['has_brand_voice']}")
            elif org_id:
                marketing_query = supabase.table('marketing_strategies').select('*')
                if campaign_id:
                    marketing_query = marketing_query.eq('campaign_id', campaign_id)
                else:
                    marketing_query = marketing_query.eq('org_id', org_id)

                marketing_result = marketing_query.eq('status', 'active').order('created_at', desc=True).limit(1).execute()

                if marketing_result.data:
                    ms = marketing_result.data[0]
                    context['marketing_strategy'] = {
                        'value_propositions': ms.get('value_propositions', {}),
                        'key_messages': ms.get('key_messages', {}),
                        'tone_of_voice': ms.get('tone_of_voice', {}),
                        'brand_personality': ms.get('brand_personality', []),
                        'messaging_framework': ms.get('messaging_framework', {})
                    }

                    # Check if brand voice is defined
                    if ms.get('tone_of_voice') or ms.get('brand_personality'):
                        context['has_brand_voice'] = True
                        context['brand_guidelines'] = {
                            'tone': ms.get('tone_of_voice', {}),
                            'personality': ms.get('brand_personality', []),
                            'key_messages': ms.get('key_messages', {}),
                            'value_props': ms.get('value_propositions', {})
                        }

                    logger.info(f"Retrieved marketing strategy from database with brand voice: {context['has_brand_voice']}")

            # Get campaign details if available
            if campaign_id:
                campaign_result = supabase.table('campaigns').select('*').eq('id', campaign_id).execute()
                if campaign_result.data:
                    campaign = campaign_result.data[0]
                    context['campaign'] = {
                        'name': campaign.get('name'),
                        'objectives': campaign.get('objectives', {}),
                        'metrics': campaign.get('metrics', {})
                    }
                    logger.info("Retrieved campaign context")

            return context

        except Exception as e:
            logger.error(f"Failed to retrieve cross-agent context: {str(e)}")
            return {
                'strategy': None,
                'personas': [],
                'campaign': None,
                'marketing_strategy': None,
                'brand_guidelines': None,
                'has_brand_voice': False
            }

    async def save_content_output(
        self,
        title: str,
        content_type: str,
        content: Dict[str, Any],
        summary: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        tone: Optional[str] = None,
        word_count: Optional[int] = None,
        meta_description: Optional[str] = None,
        target_audience: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Save generated content to the database for future reference and management.

        Args:
            title: Title of the content piece
            content_type: Type of content (blog_post, social_media, email, etc.)
            content: The actual content with structure (headlines, body, sections, etc.)
            summary: Brief summary of the content
            keywords: SEO keywords used
            tone: Tone of the content
            word_count: Word count of the content
            meta_description: SEO meta description
            target_audience: Target audience description

        Returns:
            Confirmation of saved content with ID
        """
        logger.info(f"[ContentAgent] Saving content output: {title}")

        try:
            # 🚀 NUCLEAR: Use universal output service
            from apps.api.services.universal_output_service import get_universal_output_service
            service = get_universal_output_service()

            # Prepare complete content with ZERO data loss
            complete_content = {
                "title": title,
                "content_type": content_type,
                "content_body": content,  # Complete content preserved
                "metadata": {
                    'tone': tone,
                    'word_count': word_count,
                    'target_audience': target_audience,
                    'keywords': keywords or []
                },
                "seo_data": {
                    'meta_description': meta_description,
                    'target_keywords': keywords or []
                } if (meta_description or keywords) else None
            }

            # Universal save with complete data preservation
            result = await service.save_agent_output(
                agent_type="content",
                output_type=content_type,
                content=complete_content,  # COMPLETE content preserved
                title=title,
                summary=summary or f"Content piece: {title}",
                org_id=self.org_id,
                user_id=self.user_id,
                client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                session_id=self.current_session_id,
                campaign_id=self.campaign_id,
                metadata={
                    'content_type': content_type,
                    'has_seo': bool(meta_description or keywords)
                },
                confidence_score=0.9
            )

            logger.info(f"✅ Content saved via nuclear: {result['id']}")

            return {
                "success": True,
                "content_id": result.get('id'),
                "message": f"Content '{title}' saved successfully",
                "content_type": content_type,
                "status": result.get('status', 'draft')
            }

        except Exception as e:
            logger.error(f"Failed to save content output: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to save content. Please try again."
            }

    async def get_recent_content_outputs(self, content_type: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        """
        Retrieve recent content outputs for reference or continuation.

        Args:
            content_type: Filter by specific content type
            limit: Maximum number of outputs to retrieve

        Returns:
            List of recent content outputs
        """
        logger.info(f"[ContentAgent] Retrieving recent content outputs")

        try:
            from apps.api.services.content_output_service import ContentOutputService
            service = ContentOutputService()

            outputs = await service.get_content_outputs(
                org_id=self.org_id,
                campaign_id=self.campaign_id,
                content_type=content_type,
                limit=limit
            )

            return {
                "count": len(outputs),
                "outputs": outputs,
                "message": f"Found {len(outputs)} recent content pieces"
            }

        except Exception as e:
            logger.error(f"Failed to retrieve content outputs: {str(e)}")
            return {
                "count": 0,
                "outputs": [],
                "error": str(e),
                "message": "Failed to retrieve content outputs"
            }

    async def _fetch_existing_content(self) -> List[Dict[str, Any]]:
        """Fetch existing content pieces from the database."""
        try:
            from apps.api.services.content_output_service import ContentOutputService
            service = ContentOutputService()

            # Use the new content_outputs table instead of content_pieces
            outputs = await service.get_content_outputs(
                org_id=self.org_id,
                limit=10
            )

            # Transform to expected format
            return [
                {
                    'title': output.get('title'),
                    'content_type': output.get('content_type'),
                    'status': output.get('status'),
                    'created_at': output.get('created_at')
                }
                for output in outputs
            ]
        except Exception as e:
            logger.error(f"Failed to fetch existing content: {e}")
            return []