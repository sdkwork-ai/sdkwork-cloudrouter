from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleCountTokensResponse:
    """Google Gemini google count tokens response schema exposed by Claw Router vendor routing."""
    cached_content_token_count: Optional[int] = None
    total_tokens: Optional[int] = None
