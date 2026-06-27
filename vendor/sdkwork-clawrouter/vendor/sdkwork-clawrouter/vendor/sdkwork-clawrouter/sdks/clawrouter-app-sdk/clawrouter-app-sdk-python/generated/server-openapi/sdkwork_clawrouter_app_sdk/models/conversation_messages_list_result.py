from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_message_list_response import ChatMessageListResponse


@dataclass
class ConversationMessagesListResult:
    """Conversation messages list result schema exposed by Claw Router."""
    code: str
    data: Optional[ChatMessageListResponse] = None
    msg: Optional[str] = None
