from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ArkVideoTaskContent:
    """Video output content of an Ark content generation task."""
    last_frame_url: Optional[str] = None
    video_url: Optional[str] = None
