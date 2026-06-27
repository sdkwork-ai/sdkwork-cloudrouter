from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_citation_metadata import GoogleCitationMetadata
    from .google_content import GoogleContent
    from .google_safety_rating import GoogleSafetyRating


@dataclass
class GoogleCandidate:
    """Google Gemini google candidate schema exposed by Claw Router vendor routing."""
    citation_metadata: Optional[GoogleCitationMetadata] = None
    content: Optional[GoogleContent] = None
    finish_reason: Optional[str] = None
    index: Optional[int] = None
    safety_ratings: Optional[List[GoogleSafetyRating]] = None
    token_count: Optional[int] = None
