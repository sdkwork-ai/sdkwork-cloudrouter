from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiResponseInputTokensDetails:
    """OpenAI-compatible open ai response input tokens details schema exposed by Cloud Router."""
    cached_tokens: Optional[int] = None
