from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiPromptTokensDetails:
    """OpenAI-compatible open ai prompt tokens details schema exposed by Claw Router."""
    audio_tokens: Optional[int] = None
    cached_tokens: Optional[int] = None
