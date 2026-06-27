from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTextToVideoRequest:
    """Vidu vidu text to video request schema exposed by Claw Router vendor routing."""
    model: str
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    movement_amplitude: Optional[str] = None
    payload: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
