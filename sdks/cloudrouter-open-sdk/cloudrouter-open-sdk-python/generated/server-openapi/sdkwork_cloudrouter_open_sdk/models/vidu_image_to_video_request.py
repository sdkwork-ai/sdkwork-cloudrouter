from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduImageToVideoRequest:
    """Vidu vidu image to video request schema exposed by Cloud Router vendor routing."""
    images: List[str]
    model: str
    audio: Optional[bool] = None
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    is_rec: Optional[bool] = None
    meta_data: Optional[str] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
    watermark: Optional[bool] = None
    wm_position: Optional[int] = None
    wm_url: Optional[str] = None
