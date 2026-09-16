from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .mini_max_music_audio_setting import MiniMaxMusicAudioSetting


@dataclass
class MiniMaxMusicGenerationRequest:
    """MiniMax music generation request payload."""
    model: str
    prompt: Optional[str] = None
    lyrics: Optional[str] = None
    stream: Optional[bool] = None
    output_format: Optional[str] = None
    is_instrumental: Optional[bool] = None
    lyrics_optimizer: Optional[bool] = None
    audio_setting: Optional[MiniMaxMusicAudioSetting] = None
