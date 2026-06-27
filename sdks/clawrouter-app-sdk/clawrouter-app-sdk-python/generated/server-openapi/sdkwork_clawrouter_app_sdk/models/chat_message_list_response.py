from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .chat_message_item import ChatMessageItem


@dataclass
class ChatMessageListResponse:
    """Chat message list response schema exposed by Claw Router."""
    items: List[ChatMessageItem]
