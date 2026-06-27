from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_content_part import OpenAiConversationContentPart


@dataclass
class OpenAiConversationItemCreateRequest:
    """OpenAI-compatible open ai conversation item create request schema exposed by Claw Router."""
    type: str
    content: Optional[List[OpenAiConversationContentPart]] = None
    metadata: Optional[Dict[str, str]] = None
    role: Optional[str] = None
