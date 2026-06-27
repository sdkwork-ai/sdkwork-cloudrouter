from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_conversation_response import ChatConversationResponse


@dataclass
class ConversationsCreateResult:
    """Conversations create result schema exposed by Claw Router."""
    code: str
    data: Optional[ChatConversationResponse] = None
    msg: Optional[str] = None
