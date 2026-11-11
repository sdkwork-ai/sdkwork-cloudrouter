from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .alibaba_speech_input import AlibabaSpeechInput


@dataclass
class AlibabaSpeechRequest:
    """Alibaba DashScope Qwen-Audio-TTS / CosyVoice speech synthesis request."""
    input: AlibabaSpeechInput
    model: str
    parameters: Optional[Dict[str, str]] = None
