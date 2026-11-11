from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTextToVideoRequest:
    """Vidu vidu text to video request schema exposed by Cloud Router vendor routing."""
    model: str
    prompt: str
    aspect_ratio: Optional[str] = None
    audio: Optional[bool] = None
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    meta_data: Optional[str] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
    watermark: Optional[bool] = None
    wm_position: Optional[int] = None
    wm_url: Optional[str] = None
