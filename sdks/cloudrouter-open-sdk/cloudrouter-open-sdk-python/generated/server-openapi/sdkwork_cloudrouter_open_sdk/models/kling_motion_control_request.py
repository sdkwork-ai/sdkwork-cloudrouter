from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingMotionControlRequest:
    """Kling-compatible kling motion control request schema exposed by Cloud Router vendor routing."""
    image: str
    video: str
    callback_url: Optional[str] = None
    model_name: Optional[str] = None
    prompt: Optional[str] = None
