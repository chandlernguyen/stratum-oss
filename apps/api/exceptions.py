"""
Custom exceptions for direct Gemini API integration
"""

class GeminiAPIError(Exception):
    """Raised when Gemini API calls fail"""
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class DatabaseError(Exception):
    """Raised when database operations fail"""
    def __init__(self, message: str, operation: str = None):
        self.message = message
        self.operation = operation
        super().__init__(self.message)

class ConversationError(Exception):
    """Raised when conversation management fails"""
    pass