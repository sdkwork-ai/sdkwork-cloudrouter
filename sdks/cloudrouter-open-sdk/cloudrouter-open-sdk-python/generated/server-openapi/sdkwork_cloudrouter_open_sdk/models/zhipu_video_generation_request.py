from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ZhipuVideoGenerationRequest:
    """Zhipu CogVideoX video generation request (`POST /api/paas/v4/videos/generations`). `prompt` or `image_url` must be supplied."""
    model: str
    duration: Optional[int] = None
    fps: Optional[int] = None
    image_url: Optional[str] = None
    prompt: Optional[str] = None
    quality: Optional[str] = None
    request_id: Optional[str] = None
    size: Optional[str] = None
    user_id: Optional[str] = None
    watermark_enabled: Optional[bool] = None
    with_audio: Optional[bool] = None
