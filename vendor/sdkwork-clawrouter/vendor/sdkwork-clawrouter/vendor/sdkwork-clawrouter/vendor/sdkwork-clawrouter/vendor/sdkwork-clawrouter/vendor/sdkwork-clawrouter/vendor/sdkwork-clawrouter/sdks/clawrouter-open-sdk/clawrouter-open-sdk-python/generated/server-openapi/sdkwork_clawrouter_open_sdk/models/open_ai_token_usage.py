from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_completion_tokens_details import OpenAiCompletionTokensDetails
    from .open_ai_prompt_tokens_details import OpenAiPromptTokensDetails


@dataclass
class OpenAiTokenUsage:
    """OpenAI-compatible open ai token usage schema exposed by Claw Router."""
    completion_tokens: int
    prompt_tokens: int
    total_tokens: int
    completion_tokens_details: Optional[OpenAiCompletionTokensDetails] = None
    prompt_tokens_details: Optional[OpenAiPromptTokensDetails] = None
