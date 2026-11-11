from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class PixverseVideoGenerationRequest:
    """PixVerse text-to-video generation request (`POST /openapi/v2/video/text/generate`)."""
    aspect_ratio: str
    duration: int
    model: str
    prompt: str
    quality: str
    generate_audio_switch: Optional[bool] = None
    generate_multi_clip_switch: Optional[bool] = None
    seed: Optional[int] = None
    webhook_id: Optional[str] = None
