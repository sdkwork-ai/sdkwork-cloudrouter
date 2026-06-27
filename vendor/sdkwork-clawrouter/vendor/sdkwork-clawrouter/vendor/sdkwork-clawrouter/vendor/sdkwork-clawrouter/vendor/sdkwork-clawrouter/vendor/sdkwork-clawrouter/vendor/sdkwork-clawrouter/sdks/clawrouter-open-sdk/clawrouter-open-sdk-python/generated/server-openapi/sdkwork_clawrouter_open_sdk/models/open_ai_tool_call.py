from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_function_call import OpenAiFunctionCall


@dataclass
class OpenAiToolCall:
    """OpenAI-compatible open ai tool call schema exposed by Claw Router."""
    id: str
    type: str
    function: Optional[OpenAiFunctionCall] = None
