from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiModerationResult:
    """Single OpenAI-compatible moderation classification result."""
    categories: Optional[Dict[str, str]] = None
    category_scores: Optional[Dict[str, float]] = None
    flagged: Optional[bool] = None
