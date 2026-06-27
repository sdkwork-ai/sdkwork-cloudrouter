from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_cached_content import GoogleCachedContent


@dataclass
class GoogleCachedContentListResponse:
    """Google Gemini google cached content list response schema exposed by Claw Router vendor routing."""
    cached_contents: Optional[List[GoogleCachedContent]] = None
    next_page_token: Optional[str] = None
