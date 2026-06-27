from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_image_reference_input import OpenAiImageReferenceInput
    from .open_ai_image_reference_input_list import OpenAiImageReferenceInputList


@dataclass
class OpenAiImageEditRequest:
    """OpenAI-compatible open ai image edit request schema exposed by Claw Router."""
    model: str
    prompt: str
    image: Optional[OpenAiImageReferenceInputList] = None
    mask: Optional[OpenAiImageReferenceInput] = None
