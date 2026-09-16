from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MiniMaxMusicAudioSetting:
    """MiniMax music generation audio setting."""
    sample_rate: Optional[int] = None
    bitrate: Optional[int] = None
    format: Optional[str] = None
