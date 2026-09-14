"""
PII Detection Service using LLM
Detects personally identifiable information using Gemini's contextual understanding
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import json
import logging
import os
from google import genai

from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)

class PIILocation(BaseModel):
    """Location of PII within text"""
    type: str
    value: str = Field(description="Masked version of the PII")
    start_pos: Optional[int] = None
    end_pos: Optional[int] = None
    
class PIIDetectionResult(BaseModel):
    """Result of PII detection analysis"""
    contains_pii: bool
    pii_types: List[str] = Field(default_factory=list)
    pii_locations: List[PIILocation] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    masked_text: str
    explanation: str
    
class PIIDetectionService:
    """LLM-powered PII detection service using Gemini"""
    
    def __init__(self):
        """Initialize the PII detection service"""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        self.client = genai.Client(api_key=api_key)
        self.model_name = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)
        
        self.system_prompt = """You are a PII (Personally Identifiable Information) detection specialist.
        
Your task is to identify and classify sensitive personal information in text while understanding context.

PII Categories to detect:
1. **Personal Identifiers**
   - Full names of private individuals (not public figures or company representatives)
   - Email addresses
   - Phone numbers
   - Physical home addresses (not business addresses)
   
2. **Government IDs**
   - Social Security Numbers
   - Driver's license numbers
   - Passport numbers
   - National ID numbers
   
3. **Financial Information**
   - Credit card numbers
   - Bank account numbers
   - Financial account details
   
4. **Medical Information**
   - Health conditions
   - Medical record numbers
   - Prescription information
   
5. **Authentication Data**
   - Passwords
   - API keys
   - Security questions/answers

Context Rules:
- Public figures (CEOs, celebrities) are NOT PII
- Company information (addresses, phone numbers) are NOT PII
- Generic titles without names are NOT PII
- Published contact info for businesses is NOT PII

Output Format:
Return a JSON object with:
{
  "contains_pii": boolean,
  "pii_types": ["email", "phone", etc],
  "pii_locations": [{"type": "email", "value": "****@****.com", "start_pos": 10, "end_pos": 25}],
  "confidence": 0.0-1.0,
  "masked_text": "text with PII replaced by ****",
  "explanation": "brief explanation"
}"""

    async def detect_pii(
        self, 
        text: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> PIIDetectionResult:
        """
        Detect PII in text using LLM understanding
        
        Args:
            text: The text to analyze
            context: Additional context about the text source
            
        Returns:
            PIIDetectionResult with detection details
        """
        try:
            # Prepare the prompt
            context_str = ""
            if context:
                context_str = f"\nContext: {json.dumps(context)}"
            
            prompt = f"""Analyze this text for PII:{context_str}

Text to analyze:
{text}

Remember to:
1. Consider context (public vs private individuals)
2. Mask PII in the output
3. Provide specific locations if possible
4. Explain your reasoning

Return ONLY a valid JSON object."""

            # Generate response using Gemini
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    {"role": "user", "parts": [{"text": self.system_prompt}]},
                    {"role": "model", "parts": [{"text": "I understand. I will analyze text for PII, considering context, and return structured JSON results."}]},
                    {"role": "user", "parts": [{"text": prompt}]}
                ],
                config={
                    "temperature": 1.0,  # Gemini 3 recommended default
                    "top_p": 0.95,
                    "max_output_tokens": 2048
                }
            )
            
            # Parse the response
            response_text = response.text.strip()
            
            # Clean up response if it has markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            # Parse JSON response
            result_data = json.loads(response_text.strip())
            
            # Convert to PIIDetectionResult
            pii_locations = [
                PIILocation(**loc) if isinstance(loc, dict) else loc
                for loc in result_data.get("pii_locations", [])
            ]
            
            return PIIDetectionResult(
                contains_pii=result_data.get("contains_pii", False),
                pii_types=result_data.get("pii_types", []),
                pii_locations=pii_locations,
                confidence=result_data.get("confidence", 0.0),
                masked_text=result_data.get("masked_text", text),
                explanation=result_data.get("explanation", "")
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            # Return safe default
            return PIIDetectionResult(
                contains_pii=False,
                pii_types=[],
                pii_locations=[],
                confidence=0.0,
                masked_text=text,
                explanation="Error in PII detection - treating as safe"
            )
        except Exception as e:
            logger.error(f"PII detection error: {e}")
            # Return safe default on error
            return PIIDetectionResult(
                contains_pii=False,
                pii_types=[],
                pii_locations=[],
                confidence=0.0,
                masked_text=text,
                explanation=f"Detection error: {str(e)}"
            )
    
    async def detect_pii_batch(
        self,
        texts: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[PIIDetectionResult]:
        """
        Detect PII in multiple texts efficiently
        
        Args:
            texts: List of texts to analyze
            context: Additional context
            
        Returns:
            List of PIIDetectionResult
        """
        # For now, process sequentially
        # TODO: Implement batching for better performance
        results = []
        for text in texts:
            result = await self.detect_pii(text, context)
            results.append(result)
        return results
    
    def mask_pii(self, text: str, pii_types: List[str]) -> str:
        """
        Simple PII masking helper
        
        Args:
            text: Text containing PII
            pii_types: Types of PII to mask
            
        Returns:
            Text with PII masked
        """
        # This is a fallback - the LLM should handle masking
        masked = text
        
        # Basic patterns for common PII types
        import re
        
        if "email" in pii_types:
            masked = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '****@****.***', masked)
        
        if "phone" in pii_types:
            masked = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '***-***-****', masked)
            
        if "ssn" in pii_types:
            masked = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '***-**-****', masked)
            
        return masked


# Singleton instance
_pii_service: Optional[PIIDetectionService] = None

def get_pii_detection_service() -> PIIDetectionService:
    """Get or create the PII detection service singleton"""
    global _pii_service
    if _pii_service is None:
        _pii_service = PIIDetectionService()
    return _pii_service