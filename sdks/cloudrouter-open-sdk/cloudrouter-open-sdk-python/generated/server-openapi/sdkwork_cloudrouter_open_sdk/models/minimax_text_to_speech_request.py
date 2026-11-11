from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .minimax_stream_options import MinimaxStreamOptions
    from .minimax_timbre_weight import MinimaxTimbreWeight
    from .minimax_voice_modify import MinimaxVoiceModify


@dataclass
class MinimaxTextToSpeechRequest:
    """MiniMax T2A v2 speech synthesis request (`POST /v1/t2a_v2`)."""
    model: str
    text: str
    audio_setting: Optional[Dict[str, str]] = None
    language_boost: Optional[str] = None
    output_format: Optional[str] = None
    pronunciation_dict: Optional[Dict[str, str]] = None
    stream: Optional[bool] = None
    stream_options: Optional[MinimaxStreamOptions] = None
    subtitle_enable: Optional[bool] = None
    subtitle_type: Optional[str] = None
    text_normalization_mode: Optional[str] = None
    timbre_weights: Optional[List[MinimaxTimbreWeight]] = None
    voice_modify: Optional[MinimaxVoiceModify] = None
    voice_setting: Optional[Dict[str, str]] = None
