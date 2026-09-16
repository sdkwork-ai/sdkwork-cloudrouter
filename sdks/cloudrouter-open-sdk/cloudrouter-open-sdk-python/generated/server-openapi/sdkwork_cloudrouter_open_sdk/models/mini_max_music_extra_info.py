from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MiniMaxMusicExtraInfo:
    """Mini max music extra info schema exposed by Cloud Router."""
    bitrate: Optional[int] = None
    music_channel: Optional[int] = None
    music_duration: Optional[float] = None
    music_sample_rate: Optional[int] = None
    music_size: Optional[int] = None
