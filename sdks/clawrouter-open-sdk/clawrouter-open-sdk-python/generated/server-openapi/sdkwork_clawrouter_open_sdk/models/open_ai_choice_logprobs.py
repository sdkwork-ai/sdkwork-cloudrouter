from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_token_logprob import OpenAiTokenLogprob


@dataclass
class OpenAiChoiceLogprobs:
    """OpenAI-compatible open ai choice logprobs schema exposed by Claw Router."""
    content: Optional[List[OpenAiTokenLogprob]] = None
    refusal: Optional[List[OpenAiTokenLogprob]] = None
