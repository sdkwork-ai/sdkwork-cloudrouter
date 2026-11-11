from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StabilityImageGenerationResponse:
    """Stability AI image generation response."""
    finish_reason: Optional[str] = None
    image: Optional[str] = None
    seed: Optional[int] = None
