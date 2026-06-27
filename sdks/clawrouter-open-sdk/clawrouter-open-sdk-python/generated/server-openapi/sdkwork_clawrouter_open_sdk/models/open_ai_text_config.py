from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_format import OpenAiResponseFormat


@dataclass
class OpenAiTextConfig:
    """OpenAI-compatible open ai text config schema exposed by Claw Router."""
    format: Optional[OpenAiResponseFormat] = None
