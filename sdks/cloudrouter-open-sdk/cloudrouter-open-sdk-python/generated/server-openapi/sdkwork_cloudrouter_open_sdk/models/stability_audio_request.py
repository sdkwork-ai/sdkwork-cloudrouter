from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StabilityAudioRequest:
    """Stability AI Stable Audio text-to-audio request, sent as multipart/form-data."""
    prompt: str
    cfg_scale: Optional[float] = None
    duration: Optional[float] = None
    model: Optional[str] = None
    output_format: Optional[str] = None
    seed: Optional[int] = None
    steps: Optional[int] = None
