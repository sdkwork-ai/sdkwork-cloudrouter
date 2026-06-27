from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_content_part import OpenAiResponseInputContentPart


@dataclass
class OpenAiResponseInputItem:
    """OpenAI-compatible open ai response input item schema exposed by Claw Router."""
    content: Optional[str] = None
    id: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
