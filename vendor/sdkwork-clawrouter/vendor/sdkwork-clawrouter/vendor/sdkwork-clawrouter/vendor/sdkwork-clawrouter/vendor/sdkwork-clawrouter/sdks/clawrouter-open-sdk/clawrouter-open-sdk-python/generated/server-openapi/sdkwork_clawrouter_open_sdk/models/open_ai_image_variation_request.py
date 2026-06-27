from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_image_reference_input import OpenAiImageReferenceInput


@dataclass
class OpenAiImageVariationRequest:
    """OpenAI-compatible open ai image variation request schema exposed by Claw Router."""
    image: OpenAiImageReferenceInput
    model: str
    size: Optional[str] = None
