from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_conversation_item import ChatConversationItem


@dataclass
class ConversationsRetrieveResult:
    """Conversations retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[ChatConversationItem] = None
    msg: Optional[str] = None
