from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_safety_rating import GoogleSafetyRating


@dataclass
class GooglePromptFeedback:
    """Google Gemini google prompt feedback schema exposed by Claw Router vendor routing."""
    block_reason: Optional[str] = None
    safety_ratings: Optional[List[GoogleSafetyRating]] = None
