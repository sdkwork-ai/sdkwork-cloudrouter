from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_content_part import OpenAiChatContentPart


@dataclass
class OpenAiPredictionConfig:
    """OpenAI-compatible open ai prediction config schema exposed by Claw Router."""
    type: str
    content: Optional[str] = None
