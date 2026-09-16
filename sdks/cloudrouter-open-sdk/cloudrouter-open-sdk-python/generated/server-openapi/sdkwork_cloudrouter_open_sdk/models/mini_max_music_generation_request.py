from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .mini_max_music_audio_setting import MiniMaxMusicAudioSetting


@dataclass
class MiniMaxMusicGenerationRequest:
    """Mini max music generation request schema exposed by Cloud Router."""
    model: str
    audio_setting: Optional[MiniMaxMusicAudioSetting] = None
    is_instrumental: Optional[bool] = None
    lyrics: Optional[str] = None
    lyrics_optimizer: Optional[bool] = None
    output_format: Optional[str] = None
    prompt: Optional[str] = None
    stream: Optional[bool] = None
