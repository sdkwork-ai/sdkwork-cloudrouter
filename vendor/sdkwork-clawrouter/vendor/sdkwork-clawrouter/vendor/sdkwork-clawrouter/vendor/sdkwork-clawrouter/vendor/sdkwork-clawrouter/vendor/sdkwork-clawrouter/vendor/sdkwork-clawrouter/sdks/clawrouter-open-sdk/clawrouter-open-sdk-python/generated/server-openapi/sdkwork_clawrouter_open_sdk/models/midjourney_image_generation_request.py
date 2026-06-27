from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MidjourneyImageGenerationRequest:
    """Midjourney-compatible midjourney image generation request schema exposed by Claw Router vendor routing."""
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    model: Optional[str] = None
    seed: Optional[int] = None
    style: Optional[str] = None
