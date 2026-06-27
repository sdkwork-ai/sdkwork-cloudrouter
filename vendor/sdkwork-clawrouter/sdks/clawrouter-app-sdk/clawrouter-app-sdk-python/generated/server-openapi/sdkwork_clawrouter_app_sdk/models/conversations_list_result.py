from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_conversation_list_response import ChatConversationListResponse


@dataclass
class ConversationsListResult:
    """Conversations list result schema exposed by Claw Router."""
    code: str
    data: Optional[ChatConversationListResponse] = None
    msg: Optional[str] = None
