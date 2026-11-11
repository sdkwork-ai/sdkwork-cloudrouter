from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingWatermarkInfo:
    """Watermark configuration for a Kling generation."""
    enabled: Optional[bool] = None
