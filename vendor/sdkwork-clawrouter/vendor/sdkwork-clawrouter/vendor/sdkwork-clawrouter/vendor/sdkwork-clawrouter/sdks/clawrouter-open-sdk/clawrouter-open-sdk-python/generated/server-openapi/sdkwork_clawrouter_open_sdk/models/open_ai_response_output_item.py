from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_output_content import OpenAiResponseOutputContent


@dataclass
class OpenAiResponseOutputItem:
    """OpenAI-compatible open ai response output item schema exposed by Claw Router."""
    type: str
    content: Optional[List[OpenAiResponseOutputContent]] = None
    id: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
