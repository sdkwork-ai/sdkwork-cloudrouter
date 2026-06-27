from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiResponseInputContentPart:
    """OpenAI-compatible open ai response input content part schema exposed by Claw Router."""
    type: str
    detail: Optional[str] = None
    file_data: Optional[str] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
    image_url: Optional[str] = None
    text: Optional[str] = None
