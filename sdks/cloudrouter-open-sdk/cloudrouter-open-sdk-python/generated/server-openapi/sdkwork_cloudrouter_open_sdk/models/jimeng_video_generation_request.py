from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class JimengVideoGenerationRequest:
    """Jimeng video generation request."""
    model: str
    prompt: str
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    fps: Optional[int] = None
    image: Optional[str] = None
    ratio: Optional[str] = None
    seed: Optional[int] = None
