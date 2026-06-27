from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoRemixRequest:
    """OpenAI-compatible request to remix a video."""
    image: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    seconds: Optional[int] = None
    size: Optional[str] = None
    video: Optional[str] = None
