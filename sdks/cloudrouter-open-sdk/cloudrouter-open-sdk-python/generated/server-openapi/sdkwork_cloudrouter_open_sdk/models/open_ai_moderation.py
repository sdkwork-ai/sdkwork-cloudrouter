from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_moderation_result import OpenAiModerationResult


@dataclass
class OpenAiModeration:
    """OpenAI-compatible moderation response."""
    id: str
    model: str
    results: List[OpenAiModerationResult]
