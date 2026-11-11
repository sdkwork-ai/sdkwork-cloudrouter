from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ViduTimingToAudioRequest:
    """Vidu timing-to-audio request (`POST /ent/v2/timing2audio`)."""
    model: str
    timing_prompts: List[Dict[str, str]]
    bgm: Optional[bool] = None
    callback_url: Optional[str] = None
    duration: Optional[float] = None
    off_peak: Optional[bool] = None
    payload: Optional[str] = None
    seed: Optional[int] = None
