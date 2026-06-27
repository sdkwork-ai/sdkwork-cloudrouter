from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiResponseOutputTokensDetails:
    """OpenAI-compatible open ai response output tokens details schema exposed by Claw Router."""
    reasoning_tokens: Optional[int] = None
