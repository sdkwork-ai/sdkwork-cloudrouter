from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class LumaKeyframe:
    """One Luma keyframe: an image URL (`type=image`) or another generation id (`type=generation`)."""
    type: str
    id: Optional[str] = None
    url: Optional[str] = None
