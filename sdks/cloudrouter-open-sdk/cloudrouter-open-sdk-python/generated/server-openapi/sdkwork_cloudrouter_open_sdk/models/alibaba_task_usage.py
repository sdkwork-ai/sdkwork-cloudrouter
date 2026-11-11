from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AlibabaTaskUsage:
    """DashScope task usage counters."""
    sr: Optional[int] = None
    duration: Optional[float] = None
    image_count: Optional[int] = None
    input_video_duration: Optional[int] = None
    output_video_duration: Optional[int] = None
    ratio: Optional[str] = None
