from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleUsageMetadata:
    """Google Gemini google usage metadata schema exposed by Claw Router vendor routing."""
    cached_content_token_count: Optional[int] = None
    candidates_token_count: Optional[int] = None
    prompt_token_count: Optional[int] = None
    thoughts_token_count: Optional[int] = None
    total_token_count: Optional[int] = None
