from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_content_part import OpenAiConversationContentPart


@dataclass
class OpenAiConversationItem:
    """OpenAI-compatible open ai conversation item schema exposed by Claw Router."""
    id: str
    object: str
    type: str
    content: Optional[List[OpenAiConversationContentPart]] = None
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    role: Optional[str] = None
    status: Optional[str] = None
