from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingVideoGenerationRequest:
    """Kling-compatible kling video generation request schema exposed by Claw Router vendor routing."""
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    cfg_scale: Optional[float] = None
    duration: Optional[int] = None
    image: Optional[str] = None
    image_tail: Optional[str] = None
    mode: Optional[str] = None
    model: Optional[str] = None
    negative_prompt: Optional[str] = None
