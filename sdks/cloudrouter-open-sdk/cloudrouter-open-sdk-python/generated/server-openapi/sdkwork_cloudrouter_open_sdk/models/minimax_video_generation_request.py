from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxVideoGenerationRequest:
    """MiniMax Hailuo video generation task request."""
    model: str
    prompt: str
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    fast_pretreatment: Optional[bool] = None
    first_frame_image: Optional[str] = None
    last_frame_image: Optional[str] = None
    prompt_optimizer: Optional[bool] = None
    resolution: Optional[str] = None
