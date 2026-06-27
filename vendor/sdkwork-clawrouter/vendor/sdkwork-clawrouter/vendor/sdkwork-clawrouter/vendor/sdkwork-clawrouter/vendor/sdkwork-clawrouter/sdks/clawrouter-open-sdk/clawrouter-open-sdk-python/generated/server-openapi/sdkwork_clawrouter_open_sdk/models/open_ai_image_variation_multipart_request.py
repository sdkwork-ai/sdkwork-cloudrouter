from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageVariationMultipartRequest:
    """OpenAI-compatible open ai image variation multipart request schema exposed by Claw Router."""
    image: str
    model: str
    size: Optional[str] = None
