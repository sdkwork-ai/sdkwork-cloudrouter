from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StabilityImageGenerationRequest:
    """Stability AI Stable Image generation request (union of the `core`, `ultra`, and `sd3` multipart variants)."""
    prompt: str
    aspect_ratio: Optional[str] = None
    cfg_scale: Optional[float] = None
    image: Optional[str] = None
    mode: Optional[str] = None
    model: Optional[str] = None
    negative_prompt: Optional[str] = None
    output_format: Optional[str] = None
    seed: Optional[int] = None
    strength: Optional[float] = None
    style_preset: Optional[str] = None
