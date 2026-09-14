"""
Query Complexity Classifier for Dynamic Model Routing
Analyzes user queries to determine optimal Gemini model selection.

Uses lightweight heuristics to classify queries as:
- SIMPLE: Quick facts, metrics, straightforward questions
- STANDARD: Typical agent workflows
- COMPLEX: Multi-step reasoning, framework analysis
- ENTERPRISE: High-stakes, comprehensive analysis
"""
import re
from typing import List, Dict
from apps.api.config.gemini_models import QueryComplexity


class QueryComplexityClassifier:
    """
    Classifies query complexity using keyword analysis and structural patterns.

    Design: Fast heuristic-based classification to avoid additional API calls.
    Uses pattern matching instead of LLM calls to minimize latency.
    """

    # Keywords indicating simple queries (Flash-Lite)
    SIMPLE_INDICATORS = {
        "quick", "fast", "summary", "tldr", "overview", "what is", "how many",
        "list", "show me", "give me", "calculate", "compute", "metric", "stats",
        "count", "total", "average", "sum", "percent", "ratio"
    }

    # Keywords indicating complex analysis (Flash-Preview)
    COMPLEX_INDICATORS = {
        "analyze", "evaluate", "assess", "compare", "contrast", "framework",
        "strategy", "swot", "porter", "competitive", "market analysis",
        "comprehensive", "detailed", "in-depth", "thorough", "deep dive",
        "multi", "cross", "integrated", "holistic", "systematic"
    }

    # Keywords indicating enterprise-grade needs (Pro)
    ENTERPRISE_INDICATORS = {
        "enterprise", "executive", "board", "c-suite", "strategic plan",
        "multi-year", "transformation", "roadmap", "business case",
        "investment", "acquisition", "merger", "partnership", "expansion",
        "high-stakes", "mission-critical", "company-wide"
    }

    # Question patterns indicating complexity
    COMPLEX_PATTERNS = [
        r"how (should|can|do) (we|i) .{20,}",  # Long strategic questions
        r"what (are|is) the (best|optimal|recommended) (way|approach|strategy)",
        r"help me (develop|create|design|build) .{15,}",  # Multi-step requests
        r"(multiple|several|various) .{10,} (options|strategies|approaches)",
    ]

    @staticmethod
    def classify(query: str, agent_type: str = None) -> QueryComplexity:
        """
        Classify query complexity to determine optimal model.

        Args:
            query: User's input query
            agent_type: Optional agent type for context-aware classification

        Returns:
            QueryComplexity enum value
        """
        query_lower = query.lower()

        # Count indicators in query
        simple_count = sum(1 for indicator in QueryComplexityClassifier.SIMPLE_INDICATORS
                          if indicator in query_lower)
        complex_count = sum(1 for indicator in QueryComplexityClassifier.COMPLEX_INDICATORS
                           if indicator in query_lower)
        enterprise_count = sum(1 for indicator in QueryComplexityClassifier.ENTERPRISE_INDICATORS
                              if indicator in query_lower)

        # Check for complex patterns
        pattern_matches = sum(1 for pattern in QueryComplexityClassifier.COMPLEX_PATTERNS
                            if re.search(pattern, query_lower))

        # Enterprise indicators take highest priority
        if enterprise_count >= 2 or (enterprise_count >= 1 and len(query) > 200):
            return QueryComplexity.ENTERPRISE

        # Multiple complex indicators or pattern matches
        if complex_count >= 3 or pattern_matches >= 2:
            return QueryComplexity.COMPLEX

        # Agent-specific complexity adjustments
        if agent_type:
            agent_complexity = QueryComplexityClassifier._get_agent_base_complexity(agent_type)

            # If agent itself is complex and query shows some complexity, upgrade
            if agent_complexity == QueryComplexity.COMPLEX and (complex_count >= 1 or pattern_matches >= 1):
                return QueryComplexity.COMPLEX

        # Simple indicators dominate and query is short
        if simple_count >= 2 and len(query) < 100:
            return QueryComplexity.SIMPLE

        # Check query length as a factor
        if len(query) > 300:
            return QueryComplexity.COMPLEX
        elif len(query) < 50 and simple_count > 0:
            return QueryComplexity.SIMPLE

        # Default to STANDARD for typical queries
        return QueryComplexity.STANDARD

    @staticmethod
    def _get_agent_base_complexity(agent_type: str) -> QueryComplexity:
        """
        Get the base complexity level for an agent type.
        Some agents inherently require more sophisticated models.

        Args:
            agent_type: Agent identifier

        Returns:
            Base QueryComplexity for this agent
        """
        # Agents that typically need complex reasoning
        complex_agents = {"strategy", "campaign", "competitive", "client_success"}

        # Agents that can use simpler models
        simple_agents = {"analytics", "quick_wins"}

        if agent_type in complex_agents:
            return QueryComplexity.COMPLEX
        elif agent_type in simple_agents:
            return QueryComplexity.SIMPLE
        else:
            return QueryComplexity.STANDARD

    @staticmethod
    def get_classification_explanation(query: str, complexity: QueryComplexity) -> Dict[str, any]:
        """
        Provide detailed explanation of why a query was classified at a certain level.
        Useful for debugging and transparency.

        Args:
            query: User's input query
            complexity: Assigned complexity level

        Returns:
            Dictionary with classification details
        """
        query_lower = query.lower()

        simple_matches = [indicator for indicator in QueryComplexityClassifier.SIMPLE_INDICATORS
                         if indicator in query_lower]
        complex_matches = [indicator for indicator in QueryComplexityClassifier.COMPLEX_INDICATORS
                          if indicator in query_lower]
        enterprise_matches = [indicator for indicator in QueryComplexityClassifier.ENTERPRISE_INDICATORS
                             if indicator in query_lower]
        pattern_matches = [pattern for pattern in QueryComplexityClassifier.COMPLEX_PATTERNS
                          if re.search(pattern, query_lower)]

        return {
            "complexity": complexity.value,
            "query_length": len(query),
            "simple_indicators": simple_matches,
            "complex_indicators": complex_matches,
            "enterprise_indicators": enterprise_matches,
            "complex_patterns": [p for p in pattern_matches],
            "reasoning": QueryComplexityClassifier._get_reasoning(
                len(query), simple_matches, complex_matches, enterprise_matches, pattern_matches
            )
        }

    @staticmethod
    def _get_reasoning(query_len: int, simple: List, complex: List, enterprise: List, patterns: List) -> str:
        """Generate human-readable reasoning for classification"""
        reasons = []

        if enterprise:
            reasons.append(f"Enterprise keywords: {', '.join(enterprise[:3])}")
        if complex:
            reasons.append(f"Complex analysis keywords: {', '.join(complex[:3])}")
        if patterns:
            reasons.append(f"Matched {len(patterns)} complex patterns")
        if simple:
            reasons.append(f"Simple query keywords: {', '.join(simple[:3])}")
        if query_len > 300:
            reasons.append(f"Long query ({query_len} chars)")
        elif query_len < 50:
            reasons.append(f"Short query ({query_len} chars)")

        return " | ".join(reasons) if reasons else "Default classification"


# Convenience function for quick classification
def classify_query(query: str, agent_type: str = None, explain: bool = False) -> QueryComplexity | Dict:
    """
    Quick classification function for use throughout the codebase.

    Args:
        query: User's input query
        agent_type: Optional agent type for context
        explain: If True, return detailed explanation dict

    Returns:
        QueryComplexity enum or explanation dict if explain=True
    """
    classifier = QueryComplexityClassifier()
    complexity = classifier.classify(query, agent_type)

    if explain:
        return classifier.get_classification_explanation(query, complexity)

    return complexity
