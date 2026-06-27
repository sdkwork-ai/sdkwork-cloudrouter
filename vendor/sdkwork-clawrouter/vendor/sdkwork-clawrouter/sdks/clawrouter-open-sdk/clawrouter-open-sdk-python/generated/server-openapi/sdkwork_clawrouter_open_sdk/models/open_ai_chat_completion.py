from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_completion_choice import OpenAiChatCompletionChoice
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class OpenAiChatCompletion:
    """OpenAI-compatible open ai chat completion schema exposed by Claw Router."""
    choices: List[OpenAiChatCompletionChoice]
    created: int
    id: str
    model: str
    object: str
    request_id: Optional[str] = None
    service_tier: Optional[str] = None
    system_fingerprint: Optional[str] = None
    usage: Optional[OpenAiTokenUsage] = None
