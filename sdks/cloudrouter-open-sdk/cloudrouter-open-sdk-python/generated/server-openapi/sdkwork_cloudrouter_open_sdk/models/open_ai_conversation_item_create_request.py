from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_conversation_content_part import OpenAiConversationContentPart


@dataclass
class OpenAiConversationItemCreateRequest:
    """OpenAI-compatible request to add items to a conversation (`POST /v1/conversations/{conversation_id}/items`)."""
    items: List[Dict[str, str]]
