"""
LLM-Based Similarity Detection Service
Uses Gemini to intelligently detect similar or duplicate content across different resource types.
"""
from typing import List, Dict, Any, Tuple, Optional
from google import genai
from pydantic import BaseModel, Field

from apps.api.config.gemini_models import DEFAULT_MODEL
import os
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class SimilarityResult(BaseModel):
    """Result of similarity comparison between two items"""
    similarity_score: float = Field(description="Similarity score from 0.0 to 1.0")
    is_duplicate: bool = Field(description="Whether items are duplicates (score > 0.85)")
    is_similar: bool = Field(description="Whether items are similar (score > 0.70)")
    reasoning: str = Field(description="Explanation of the similarity assessment")
    key_differences: List[str] = Field(default_factory=list, description="Key differences if not identical")
    key_similarities: List[str] = Field(default_factory=list, description="Key similar aspects")

class ItemGroup(BaseModel):
    """Group of similar items"""
    primary_id: str = Field(description="ID of the primary/representative item")
    item_ids: List[str] = Field(description="All item IDs in this group")
    similarity_type: str = Field(description="Type of similarity: duplicate, near_duplicate, similar")
    group_reasoning: str = Field(description="Why these items are grouped")

class SimilarityDetectionService:
    """
    Service for detecting similar and duplicate content using LLM.
    More intelligent than simple string matching - understands semantic similarity.
    """

    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")

        self.client = genai.Client(api_key=api_key)
        self.model_name = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)

        # Define prompts for different resource types
        self.similarity_prompts = {
            'brand_guidelines': """
                Compare these two brand guidelines and assess their similarity:

                Guidelines 1:
                {item1}

                Guidelines 2:
                {item2}

                Consider:
                - Brand voice and tone
                - Key messages and value propositions
                - Visual identity elements
                - Target audience
                - Content rules and guidelines

                Rate similarity from 0.0 (completely different) to 1.0 (identical).
                Identify if they're duplicates (>0.85), near-duplicates (>0.70), or just similar (>0.50).
            """,

            'marketing_strategy': """
                Compare these two marketing strategies:

                Strategy 1:
                {item1}

                Strategy 2:
                {item2}

                Consider:
                - Value propositions
                - Key messages
                - Target personas
                - Channel mix
                - Campaign objectives

                Rate similarity from 0.0 to 1.0 and identify key similarities and differences.
            """,

            'personas': """
                Compare these two customer personas:

                Persona 1:
                {item1}

                Persona 2:
                {item2}

                Consider:
                - Demographics
                - Psychographics
                - Pain points and goals
                - Behavioral patterns
                - Journey stage

                Determine if these represent the same or similar customer segments.
            """,

            'generic': """
                Compare these two items and assess their similarity:

                Item 1:
                {item1}

                Item 2:
                {item2}

                Rate similarity from 0.0 (completely different) to 1.0 (identical).
                Identify key similarities and differences.
            """
        }

    async def compare_items(
        self,
        item1: Dict[str, Any],
        item2: Dict[str, Any],
        resource_type: str = 'generic'
    ) -> SimilarityResult:
        """
        Compare two items using LLM to detect similarity.

        Args:
            item1: First item to compare
            item2: Second item to compare
            resource_type: Type of resource (brand_guidelines, marketing_strategy, etc.)

        Returns:
            SimilarityResult with score and analysis
        """
        try:
            # Get appropriate prompt template
            prompt_template = self.similarity_prompts.get(
                resource_type,
                self.similarity_prompts['generic']
            )

            # Format items as JSON for comparison
            item1_str = json.dumps(item1, indent=2, default=str)
            item2_str = json.dumps(item2, indent=2, default=str)

            prompt = prompt_template.format(item1=item1_str, item2=item2_str)

            # Call Gemini for similarity analysis
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=genai.GenerateContentConfig(
                    temperature=1.0,  # Gemini 3 recommended default
                    max_output_tokens=1000,
                    response_schema=SimilarityResult,
                    response_mime_type="application/json"
                )
            )

            # Parse the response
            result_data = json.loads(response.text)
            return SimilarityResult(**result_data)

        except Exception as e:
            logger.error(f"Error comparing items: {e}")
            # Fallback to simple comparison
            return self._simple_comparison(item1, item2)

    async def find_duplicates(
        self,
        items: List[Dict[str, Any]],
        resource_type: str = 'generic',
        similarity_threshold: float = 0.70
    ) -> List[ItemGroup]:
        """
        Find groups of similar/duplicate items in a list.

        Args:
            items: List of items to analyze
            resource_type: Type of resource
            similarity_threshold: Minimum similarity score to group items

        Returns:
            List of ItemGroups containing similar items
        """
        if len(items) < 2:
            return []

        groups: List[ItemGroup] = []
        processed_ids = set()

        for i, item1 in enumerate(items):
            if item1['id'] in processed_ids:
                continue

            current_group = ItemGroup(
                primary_id=item1['id'],
                item_ids=[item1['id']],
                similarity_type='unique',
                group_reasoning='No similar items found'
            )

            for j, item2 in enumerate(items[i + 1:], start=i + 1):
                if item2['id'] in processed_ids:
                    continue

                # Compare items
                result = await self.compare_items(item1, item2, resource_type)

                if result.similarity_score >= similarity_threshold:
                    current_group.item_ids.append(item2['id'])
                    processed_ids.add(item2['id'])

                    # Update group type based on highest similarity
                    if result.is_duplicate:
                        current_group.similarity_type = 'duplicate'
                        current_group.group_reasoning = f"Duplicate items: {result.reasoning}"
                    elif result.is_similar and current_group.similarity_type != 'duplicate':
                        current_group.similarity_type = 'near_duplicate'
                        current_group.group_reasoning = f"Near duplicates: {result.reasoning}"

            # Only add groups with multiple items
            if len(current_group.item_ids) > 1:
                processed_ids.add(item1['id'])
                groups.append(current_group)

        return groups

    async def check_active_guidelines_conflict(
        self,
        guidelines: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Check if there are multiple active brand guidelines and if they conflict.

        Args:
            guidelines: List of brand guidelines

        Returns:
            Alert information if issues found, None otherwise
        """
        active_guidelines = [g for g in guidelines if g.get('archived_at') is None]

        if len(active_guidelines) <= 1:
            return None

        # Check for duplicates among active guidelines
        duplicate_groups = await self.find_duplicates(
            active_guidelines,
            resource_type='brand_guidelines',
            similarity_threshold=0.85
        )

        alerts = {
            'type': 'warning',
            'title': 'Multiple Active Brand Guidelines Detected',
            'issues': []
        }

        if duplicate_groups:
            alerts['issues'].append({
                'type': 'duplicate_active',
                'message': f"You have {len(active_guidelines)} active brand guidelines, and some appear to be duplicates.",
                'recommendation': "Archive or deactivate duplicate guidelines to avoid confusion.",
                'duplicate_groups': [
                    {
                        'ids': group.item_ids,
                        'reason': group.group_reasoning
                    } for group in duplicate_groups
                ]
            })
        else:
            alerts['issues'].append({
                'type': 'multiple_active',
                'message': f"You have {len(active_guidelines)} active brand guidelines.",
                'recommendation': "Consider consolidating or archiving older versions to maintain consistency.",
                'active_ids': [g['id'] for g in active_guidelines]
            })

        return alerts

    def _simple_comparison(self, item1: Dict[str, Any], item2: Dict[str, Any]) -> SimilarityResult:
        """
        Fallback simple comparison when LLM is unavailable.
        Uses basic string matching and structural comparison.
        """
        try:
            # Convert to JSON strings for comparison
            str1 = json.dumps(item1, sort_keys=True, default=str)
            str2 = json.dumps(item2, sort_keys=True, default=str)

            # Check for exact match
            if str1 == str2:
                return SimilarityResult(
                    similarity_score=1.0,
                    is_duplicate=True,
                    is_similar=True,
                    reasoning="Items are identical",
                    key_similarities=["All fields match exactly"]
                )

            # Calculate basic similarity (shared keys, similar values)
            shared_keys = set(item1.keys()) & set(item2.keys())
            total_keys = set(item1.keys()) | set(item2.keys())

            if not total_keys:
                score = 0.0
            else:
                # Check value similarity for shared keys
                matching_values = sum(
                    1 for k in shared_keys
                    if str(item1.get(k)) == str(item2.get(k))
                )
                score = (matching_values + len(shared_keys)) / (2 * len(total_keys))

            return SimilarityResult(
                similarity_score=score,
                is_duplicate=score > 0.85,
                is_similar=score > 0.70,
                reasoning=f"Items share {len(shared_keys)} of {len(total_keys)} fields",
                key_similarities=[f"Shared fields: {', '.join(shared_keys)}"] if shared_keys else [],
                key_differences=[f"Unique to item1: {', '.join(set(item1.keys()) - shared_keys)}",
                               f"Unique to item2: {', '.join(set(item2.keys()) - shared_keys)}"]
            )

        except Exception as e:
            logger.error(f"Error in simple comparison: {e}")
            return SimilarityResult(
                similarity_score=0.0,
                is_duplicate=False,
                is_similar=False,
                reasoning="Could not compare items",
                key_differences=["Comparison failed"]
            )