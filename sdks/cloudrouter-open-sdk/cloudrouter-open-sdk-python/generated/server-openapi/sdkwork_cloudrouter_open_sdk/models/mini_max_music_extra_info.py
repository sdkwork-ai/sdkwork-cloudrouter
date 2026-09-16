from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MiniMaxMusicExtraInfo:
    """MiniMax music generation extra metadata."""
    music_duration: Optional[float] = None
    music_sample_rate: Optional[int] = None
    music_channel: Optional[int] = None
    bitrate: Optional[int] = None
    music_size: Optional[int] = None
