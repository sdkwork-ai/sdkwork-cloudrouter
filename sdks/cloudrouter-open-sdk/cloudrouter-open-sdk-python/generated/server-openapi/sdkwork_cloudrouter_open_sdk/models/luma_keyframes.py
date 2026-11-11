from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .luma_keyframe import LumaKeyframe


@dataclass
class LumaKeyframes:
    """Luma first and last keyframes."""
    frame0: Optional[LumaKeyframe] = None
    frame1: Optional[LumaKeyframe] = None
