from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_content_part import OpenAiChatContentPart
    from .open_ai_function_call import OpenAiFunctionCall
    from .open_ai_tool_call import OpenAiToolCall


@dataclass
class OpenAiChatMessage:
    """OpenAI-compatible open ai chat message schema exposed by Claw Router."""
    role: str
    content: Optional[str] = None
    function_call: Optional[OpenAiFunctionCall] = None
    name: Optional[str] = None
    refusal: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[List[OpenAiToolCall]] = None
