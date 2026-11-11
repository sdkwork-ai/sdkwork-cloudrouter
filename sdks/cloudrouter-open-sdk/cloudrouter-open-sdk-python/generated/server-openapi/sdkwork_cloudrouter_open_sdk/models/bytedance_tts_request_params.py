from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .bytedance_tts_audio_params import BytedanceTtsAudioParams


@dataclass
class BytedanceTtsRequestParams:
    """ByteDance Seed TTS synthesis parameters."""
    audio_params: BytedanceTtsAudioParams
    speaker: str
    text: str
    additions: Optional[str] = None
    model: Optional[str] = None
    pronunciation_dict: Optional[Dict[str, str]] = None
    ssml: Optional[str] = None
    tone: Optional[List[str]] = None
