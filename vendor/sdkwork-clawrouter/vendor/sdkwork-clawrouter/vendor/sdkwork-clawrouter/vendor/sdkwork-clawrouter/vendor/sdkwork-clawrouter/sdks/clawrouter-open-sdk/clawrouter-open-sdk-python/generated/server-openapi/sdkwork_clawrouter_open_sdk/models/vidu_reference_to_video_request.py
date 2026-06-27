from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduReferenceToVideoRequest:
    """Vidu vidu reference to video request schema exposed by Claw Router vendor routing."""
    images: List[str]
    model: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    movement_amplitude: Optional[str] = None
    payload: Optional[str] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
