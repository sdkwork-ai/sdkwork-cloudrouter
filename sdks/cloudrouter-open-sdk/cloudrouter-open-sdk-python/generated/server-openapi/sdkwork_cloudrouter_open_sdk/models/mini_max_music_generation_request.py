from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .mini_max_music_audio_setting import MiniMaxMusicAudioSetting


@dataclass
class MiniMaxMusicGenerationRequest:
    """MiniMax music generation request (`POST /v1/music_generation`)."""
    model: str
    audio_base64: Optional[str] = None
    audio_setting: Optional[MiniMaxMusicAudioSetting] = None
    audio_url: Optional[str] = None
    cover_feature_id: Optional[str] = None
    is_instrumental: Optional[bool] = None
    lyrics: Optional[str] = None
    lyrics_optimizer: Optional[bool] = None
    output_format: Optional[str] = None
    prompt: Optional[str] = None
    stream: Optional[bool] = None
