from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_top_logprob import OpenAiTopLogprob


@dataclass
class OpenAiTokenLogprob:
    """OpenAI-compatible open ai token logprob schema exposed by Claw Router."""
    logprob: float
    token: str
    bytes: Optional[List[int]] = None
    top_logprobs: Optional[List[OpenAiTopLogprob]] = None
