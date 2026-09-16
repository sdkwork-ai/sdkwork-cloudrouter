from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .mini_max_music_base_resp import MiniMaxMusicBaseResp
    from .mini_max_music_data import MiniMaxMusicData


@dataclass
class MiniMaxMusicGenerationResponse:
    """MiniMax music generation response exposed by Cloud Router."""
    base_resp: Optional[MiniMaxMusicBaseResp] = None
    data: Optional[MiniMaxMusicData] = None
    trace_id: Optional[str] = None
