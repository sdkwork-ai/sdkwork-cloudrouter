from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoCreateRequest:
    """OpenAI-compatible request to create a video."""
    model: str
    prompt: str
    image: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    seconds: Optional[int] = None
    size: Optional[str] = None
    video: Optional[str] = None
