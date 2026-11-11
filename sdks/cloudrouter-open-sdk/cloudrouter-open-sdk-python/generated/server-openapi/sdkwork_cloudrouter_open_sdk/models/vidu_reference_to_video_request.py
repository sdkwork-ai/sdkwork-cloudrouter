from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduReferenceToVideoRequest:
    """Vidu vidu reference to video request schema exposed by Cloud Router vendor routing."""
    images: List[str]
    model: str
    aspect_ratio: Optional[str] = None
    audio: Optional[bool] = None
    auto_subjects: Optional[bool] = None
    bgm: Optional[bool] = None
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    meta_data: Optional[str] = None
    movement_amplitude: Optional[str] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    prompt: Optional[str] = None
    resolution: Optional[str] = None
    seed: Optional[int] = None
    sounds: Optional[List[Dict[str, str]]] = None
    subjects: Optional[List[Dict[str, str]]] = None
    watermark: Optional[bool] = None
    wm_position: Optional[int] = None
    wm_url: Optional[str] = None
