from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleCachedContentUsageMetadata:
    """Google Gemini google cached content usage metadata schema exposed by Claw Router vendor routing."""
    total_token_count: Optional[int] = None
