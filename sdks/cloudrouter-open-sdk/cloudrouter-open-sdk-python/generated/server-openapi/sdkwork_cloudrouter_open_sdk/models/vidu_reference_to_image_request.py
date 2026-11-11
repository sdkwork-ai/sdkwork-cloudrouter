from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduReferenceToImageRequest:
    """Vidu vidu reference to image request schema exposed by Cloud Router vendor routing."""
    model: str
    prompt: str
    aspect_ratio: Optional[str] = None
    bgm: Optional[bool] = None
    callback_url: Optional[str] = None
    images: Optional[List[str]] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
