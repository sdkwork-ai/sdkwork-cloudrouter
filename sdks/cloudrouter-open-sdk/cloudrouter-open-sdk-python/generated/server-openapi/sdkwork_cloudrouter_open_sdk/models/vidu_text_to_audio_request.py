from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTextToAudioRequest:
    """Vidu text-to-audio request (`POST /ent/v2/text2audio`)."""
    model: str
    prompt: str
    bgm: Optional[bool] = None
    callback_url: Optional[str] = None
    duration: Optional[float] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    seed: Optional[int] = None
