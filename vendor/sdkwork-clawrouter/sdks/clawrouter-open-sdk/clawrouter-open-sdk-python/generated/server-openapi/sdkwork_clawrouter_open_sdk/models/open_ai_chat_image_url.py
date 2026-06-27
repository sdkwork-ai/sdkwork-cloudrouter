from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiChatImageUrl:
    """OpenAI-compatible open ai chat image url schema exposed by Claw Router."""
    url: str
    detail: Optional[str] = None
