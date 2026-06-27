from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageEditMultipartRequest:
    """OpenAI-compatible open ai image edit multipart request schema exposed by Claw Router."""
    image: str
    model: str
    prompt: str
    mask: Optional[str] = None
