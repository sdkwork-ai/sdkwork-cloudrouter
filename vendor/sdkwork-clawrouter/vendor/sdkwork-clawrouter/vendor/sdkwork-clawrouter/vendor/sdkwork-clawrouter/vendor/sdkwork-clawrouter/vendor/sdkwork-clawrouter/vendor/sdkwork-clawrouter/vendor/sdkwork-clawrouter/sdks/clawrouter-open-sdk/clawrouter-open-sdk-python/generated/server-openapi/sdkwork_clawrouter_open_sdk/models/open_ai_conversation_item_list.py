from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_item import OpenAiConversationItem


@dataclass
class OpenAiConversationItemList:
    """OpenAI-compatible open ai conversation item list schema exposed by Claw Router."""
    data: List[OpenAiConversationItem]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
