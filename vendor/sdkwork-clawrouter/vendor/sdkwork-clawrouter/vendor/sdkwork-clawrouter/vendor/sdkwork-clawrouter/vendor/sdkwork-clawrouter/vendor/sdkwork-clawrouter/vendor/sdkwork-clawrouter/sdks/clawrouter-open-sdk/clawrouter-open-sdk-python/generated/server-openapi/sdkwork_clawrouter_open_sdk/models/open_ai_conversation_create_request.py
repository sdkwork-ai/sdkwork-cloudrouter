from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_item_create_request import OpenAiConversationItemCreateRequest


@dataclass
class OpenAiConversationCreateRequest:
    """OpenAI-compatible open ai conversation create request schema exposed by Claw Router."""
    items: Optional[List[OpenAiConversationItemCreateRequest]] = None
    metadata: Optional[Dict[str, str]] = None
