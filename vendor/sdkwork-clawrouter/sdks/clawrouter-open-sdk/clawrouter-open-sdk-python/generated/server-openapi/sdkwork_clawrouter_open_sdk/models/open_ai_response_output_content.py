from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_annotation import OpenAiAnnotation


@dataclass
class OpenAiResponseOutputContent:
    """OpenAI-compatible open ai response output content schema exposed by Claw Router."""
    type: str
    annotations: Optional[List[OpenAiAnnotation]] = None
    refusal: Optional[str] = None
    text: Optional[str] = None
