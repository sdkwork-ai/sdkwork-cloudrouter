from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingMotionControlRequest:
    """Kling motion control (motion mimicry) video generation request schema exposed by Cloud Router vendor routing."""
    image: str
    video: str
    model_name: Optional[str] = None
    prompt: Optional[str] = None
    callback_url: Optional[str] = None
