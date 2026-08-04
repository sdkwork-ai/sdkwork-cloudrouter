from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .create_completion_choice import CreateCompletionChoice
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class OpenAiCompletion:
    """OpenAI-compatible legacy text completion response."""
    choices: List[CreateCompletionChoice]
    created: int
    id: str
    model: str
    object: str
    system_fingerprint: Optional[str] = None
    usage: Optional[OpenAiTokenUsage] = None
