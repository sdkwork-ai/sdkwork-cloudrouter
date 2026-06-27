from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class NanoBananaImageGenerationRequest:
    """Nano Banana compatible nano banana image generation request schema exposed by Claw Router vendor routing."""
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    images: Optional[List[str]] = None
    model: Optional[str] = None
    seed: Optional[int] = None
    size: Optional[str] = None
