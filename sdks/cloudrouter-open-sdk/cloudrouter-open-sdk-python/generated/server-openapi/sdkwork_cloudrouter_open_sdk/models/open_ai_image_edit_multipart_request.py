from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImageEditMultipartRequest:
    """OpenAI-compatible open ai image edit multipart request schema exposed by Cloud Router."""
    image: bytes
    model: str
    prompt: str
    mask: Optional[bytes] = None
