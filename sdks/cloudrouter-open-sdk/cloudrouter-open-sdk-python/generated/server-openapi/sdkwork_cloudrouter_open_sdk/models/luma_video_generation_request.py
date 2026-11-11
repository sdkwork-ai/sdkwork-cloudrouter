from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .luma_concept import LumaConcept
    from .luma_keyframes import LumaKeyframes


@dataclass
class LumaVideoGenerationRequest:
    """Luma Dream Machine video generation request (`POST /dream-machine/v1/generations/video`)."""
    model: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    concepts: Optional[List[LumaConcept]] = None
    duration: Optional[str] = None
    generation_type: Optional[str] = None
    keyframes: Optional[LumaKeyframes] = None
    loop: Optional[bool] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
