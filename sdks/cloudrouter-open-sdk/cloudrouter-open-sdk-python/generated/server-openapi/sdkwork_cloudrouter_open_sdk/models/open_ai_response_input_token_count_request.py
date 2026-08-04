from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_item import OpenAiResponseInputItem


@dataclass
class OpenAiResponseInputTokenCountRequest:
    """OpenAI-compatible request to count tokens for a Responses API input."""
    input: str
    model: str
    instructions: Optional[str] = None
    tools: Optional[List[str]] = None
