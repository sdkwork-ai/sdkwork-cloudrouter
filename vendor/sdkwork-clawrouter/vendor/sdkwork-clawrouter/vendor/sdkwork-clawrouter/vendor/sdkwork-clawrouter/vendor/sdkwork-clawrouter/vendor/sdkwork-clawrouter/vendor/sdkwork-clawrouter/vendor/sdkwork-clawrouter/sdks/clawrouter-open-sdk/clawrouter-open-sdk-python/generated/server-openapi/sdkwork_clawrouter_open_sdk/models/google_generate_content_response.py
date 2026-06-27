from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_candidate import GoogleCandidate
    from .google_prompt_feedback import GooglePromptFeedback
    from .google_usage_metadata import GoogleUsageMetadata


@dataclass
class GoogleGenerateContentResponse:
    """Google Gemini google generate content response schema exposed by Claw Router vendor routing."""
    candidates: Optional[List[GoogleCandidate]] = None
    model_version: Optional[str] = None
    prompt_feedback: Optional[GooglePromptFeedback] = None
    response_id: Optional[str] = None
    usage_metadata: Optional[GoogleUsageMetadata] = None
