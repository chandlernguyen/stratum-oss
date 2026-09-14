"""
Security module for STRAŦUM API

Simplified security approach leveraging Google Gemini 2.5's built-in protections:
- Model fine-tuned for prompt injection resistance (47% attack reduction)
- Content classifiers and safety filters (4 harm categories)
- Application-specific output validation for credential leakage

Modules:
- prompt_injection: Security reinforcement + output validation (simplified)
"""
from .prompt_injection import (
    PromptInjectionDefense,
    SecurityCheckResult,
    prompt_injection_defense,
)

__all__ = [
    'PromptInjectionDefense',
    'SecurityCheckResult',
    'prompt_injection_defense',
]
