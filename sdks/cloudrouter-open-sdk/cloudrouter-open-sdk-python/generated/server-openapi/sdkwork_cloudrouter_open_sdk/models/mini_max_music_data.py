from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .mini_max_music_extra_info import MiniMaxMusicExtraInfo


@dataclass
class MiniMaxMusicData:
    """MiniMax music generation data payload."""
    status: Optional[int] = None
    audio: Optional[str] = None
    extra_info: Optional[MiniMaxMusicExtraInfo] = None
