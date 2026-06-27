from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiTopLogprob:
    """OpenAI-compatible open ai top logprob schema exposed by Claw Router."""
    logprob: float
    token: str
    bytes: Optional[List[int]] = None
