from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoExtendRequest:
    """OpenAI-compatible request to extend a video."""
    image: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    seconds: Optional[int] = None
    size: Optional[str] = None
    video: Optional[str] = None
