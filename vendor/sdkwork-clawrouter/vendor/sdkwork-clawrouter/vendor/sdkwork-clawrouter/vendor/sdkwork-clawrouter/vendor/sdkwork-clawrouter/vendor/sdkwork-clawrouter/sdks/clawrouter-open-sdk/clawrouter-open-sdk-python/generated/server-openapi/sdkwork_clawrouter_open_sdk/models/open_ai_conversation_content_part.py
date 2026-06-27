from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiConversationContentPart:
    """OpenAI-compatible open ai conversation content part schema exposed by Claw Router."""
    type: str
    file_id: Optional[str] = None
    image_url: Optional[str] = None
    text: Optional[str] = None
