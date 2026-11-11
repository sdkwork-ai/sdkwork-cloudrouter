from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTemplateRequest:
    """Vidu scene-template request (`POST /ent/v2/template`)."""
    images: List[str]
    template: str
    area: Optional[str] = None
    aspect_ratio: Optional[str] = None
    beast: Optional[str] = None
    bgm: Optional[bool] = None
    callback_url: Optional[str] = None
    meta_data: Optional[str] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    prompt: Optional[str] = None
    seed: Optional[int] = None
    video_urls: Optional[List[str]] = None
    watermark: Optional[bool] = None
    wm_position: Optional[int] = None
    wm_url: Optional[str] = None
