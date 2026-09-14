"""
Intelligent Session Title Generation Service
Generates meaningful session titles based on conversation content.
"""
import logging
from typing import Optional, List, Dict, Any
from google import genai
import os

from apps.api.config.gemini_models import DEFAULT_MODEL
import re
from apps.api.config.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

class SessionTitleGenerator:
    """
    Service to generate intelligent session titles from conversation content.
    Uses Gemini AI to create concise, meaningful titles based on user messages.
    """

    def __init__(self):
        self.model = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)

    @property
    def client(self) -> genai.Client:
        """
        Lazily create the Gemini client.

        Creating it in __init__ meant that constructing this service required
        GOOGLE_API_KEY, and these services are built by module-level singletons
        — so importing the application crashed without a key.
        """
        return get_gemini_client()

    async def generate_title_from_conversation(
        self,
        messages: List[Dict[str, Any]],
        agent_type: str,
        max_length: int = 50
    ) -> Optional[str]:
        """
        Generate a meaningful session title from conversation messages.

        Args:
            messages: List of conversation messages with role and content
            agent_type: Type of agent (strategy, persona, content, etc.)
            max_length: Maximum title length

        Returns:
            Generated title or None if generation fails
        """
        try:
            # Extract user messages (ignore system/assistant messages for title generation)
            user_messages = [
                msg["content"] for msg in messages
                if msg.get("role") == "user" and msg.get("content", "").strip()
            ]

            if not user_messages:
                return None

            # Take first 2-3 user messages to understand conversation context
            context_messages = user_messages[:3]
            combined_context = " ".join(context_messages)

            # Limit context length to avoid token limits
            if len(combined_context) > 500:
                combined_context = combined_context[:500] + "..."

            # Generate title using Gemini
            prompt = f"""
Based on this {agent_type} conversation, create a concise, descriptive session title.

Conversation context:
{combined_context}

Requirements:
- Maximum {max_length} characters
- Focus on the main topic or business challenge discussed
- Be specific and actionable (e.g., "Vietnam Market Strategy" not "Strategy Discussion")
- Use business terminology appropriate for {agent_type} context
- No quotes or special formatting

Title:"""

            response = self.client.models.generate_content(
                model=self.model,
                contents=[{"role": "user", "parts": [{"text": prompt}]}]
            )

            if response.text:
                # Clean up the generated title
                title = self._clean_title(response.text.strip(), max_length)
                logger.info(f"Generated session title: {title}")
                return title

        except Exception as e:
            logger.warning(f"Failed to generate session title: {str(e)}")
            return None

    def _clean_title(self, title: str, max_length: int) -> str:
        """
        Clean and format the generated title.
        """
        # Remove quotes and extra whitespace
        title = re.sub(r'^["\']|["\']$', '', title.strip())

        # Remove common prefixes that AI might add
        prefixes_to_remove = [
            "Session Title:", "Title:", "Session:",
            "Discussion about", "Analysis of", "Strategy for"
        ]

        for prefix in prefixes_to_remove:
            if title.lower().startswith(prefix.lower()):
                title = title[len(prefix):].strip()

        # Ensure proper capitalization
        title = title.strip()
        if title:
            title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()

        # Truncate if too long
        if len(title) > max_length:
            title = title[:max_length-3].rstrip() + "..."

        return title

    def generate_fallback_title(self, agent_type: str, user_message: str = None) -> str:
        """
        Generate a simple fallback title when AI generation fails.
        Uses keyword extraction and business context to create meaningful titles.
        """
        if user_message and len(user_message.strip()) > 5:
            # Clean and analyze the user message for business keywords
            message = user_message.strip().lower()

            # Business and strategy keywords
            business_keywords = {
                'strategy': ['strategy', 'strategic', 'plan', 'planning', 'approach'],
                'market': ['market', 'marketing', 'customer', 'audience', 'competition', 'competitive'],
                'analysis': ['analysis', 'analyze', 'review', 'assessment', 'evaluation'],
                'performance': ['performance', 'metrics', 'kpi', 'roi', 'revenue', 'growth'],
                'campaign': ['campaign', 'promotion', 'advertising', 'ads', 'marketing'],
                'product': ['product', 'service', 'offering', 'solution'],
                'challenge': ['challenge', 'problem', 'issue', 'difficulty', 'struggling'],
                'opportunity': ['opportunity', 'potential', 'expansion', 'growth']
            }

            # Find relevant business context
            found_keywords = []
            for category, keywords in business_keywords.items():
                if any(keyword in message for keyword in keywords):
                    found_keywords.append(category)

            # Look for specific business terms or geographic regions
            if 'vietnam' in message:
                return "Vietnam Market Strategy"
            elif 'competition' in message or 'competitor' in message:
                return "Competitive Analysis"
            elif 'churn' in message or 'acquisition' in message:
                return "Customer Retention & Acquisition"
            elif found_keywords:
                primary = found_keywords[0].title()
                return f"{primary} Discussion"
            else:
                # Extract meaningful words (skip common ones)
                words = user_message.strip().split()
                meaningful_words = [w for w in words if len(w) > 3 and
                                 w.lower() not in ['what', 'how', 'why', 'when', 'where', 'can', 'you', 'the', 'and', 'for', 'with']][:4]
                if meaningful_words:
                    title = " ".join(meaningful_words).title()
                    return title[:47] + "..." if len(title) > 50 else title

        # Agent-specific fallbacks with timestamp to make unique
        from datetime import datetime
        timestamp = datetime.now().strftime("%m/%d")

        fallbacks = {
            "strategy": f"Strategic Analysis {timestamp}",
            "persona": f"Persona Research {timestamp}",
            "marketing_strategy": f"Marketing Planning {timestamp}",
            "content": f"Content Strategy {timestamp}",
            "analytics": f"Performance Analysis {timestamp}",
            "roi_budget": f"ROI Planning {timestamp}",
            "campaign_planning": f"Campaign Planning {timestamp}",
            "quick_wins": f"Quick Wins Strategy {timestamp}",
            "competitive_intelligence": f"Market Analysis {timestamp}",
            "client_success": f"Client Strategy {timestamp}"
        }

        return fallbacks.get(agent_type, f"{agent_type.title()} Session {timestamp}")


# Global service instance
_session_title_generator = None

def get_session_title_generator() -> SessionTitleGenerator:
    """Get singleton instance of session title generator."""
    global _session_title_generator
    if _session_title_generator is None:
        _session_title_generator = SessionTitleGenerator()
    return _session_title_generator