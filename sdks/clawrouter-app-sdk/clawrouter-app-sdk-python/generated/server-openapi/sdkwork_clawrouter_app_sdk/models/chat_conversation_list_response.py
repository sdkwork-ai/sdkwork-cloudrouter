from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_conversation_item import ChatConversationItem


@dataclass
class ChatConversationListResponse:
    """Chat conversation list response schema exposed by Claw Router."""
    items: List[ChatConversationItem]
