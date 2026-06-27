from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduReferenceToImageRequest:
    """Vidu vidu reference to image request schema exposed by Claw Router vendor routing."""
    images: List[str]
    model: str
    prompt: str
    aspect_ratio: Optional[str] = None
    callback_url: Optional[str] = None
    payload: Optional[str] = None
    seed: Optional[int] = None
    style: Optional[str] = None
