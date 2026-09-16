from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MiniMaxMusicAudioSetting:
    """Mini max music audio setting schema exposed by Cloud Router."""
    bitrate: Optional[int] = None
    format: Optional[str] = None
    sample_rate: Optional[int] = None
