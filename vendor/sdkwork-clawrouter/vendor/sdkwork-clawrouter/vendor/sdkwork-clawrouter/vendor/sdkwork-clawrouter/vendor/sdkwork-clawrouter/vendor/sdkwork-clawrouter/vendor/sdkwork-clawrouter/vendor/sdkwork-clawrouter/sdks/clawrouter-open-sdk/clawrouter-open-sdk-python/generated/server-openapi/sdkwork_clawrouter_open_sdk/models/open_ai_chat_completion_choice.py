from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_chat_message import OpenAiChatMessage
    from .open_ai_choice_logprobs import OpenAiChoiceLogprobs


@dataclass
class OpenAiChatCompletionChoice:
    """OpenAI-compatible open ai chat completion choice schema exposed by Claw Router."""
    index: int
    message: OpenAiChatMessage
    finish_reason: Optional[str] = None
    logprobs: Optional[OpenAiChoiceLogprobs] = None
