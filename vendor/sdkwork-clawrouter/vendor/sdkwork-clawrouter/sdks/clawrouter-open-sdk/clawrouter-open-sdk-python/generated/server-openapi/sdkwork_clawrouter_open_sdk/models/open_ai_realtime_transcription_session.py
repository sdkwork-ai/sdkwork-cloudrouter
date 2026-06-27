from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_realtime_client_secret_value import OpenAiRealtimeClientSecretValue


@dataclass
class OpenAiRealtimeTranscriptionSession:
    """OpenAI-compatible realtime transcription session object."""
    id: str
    object: str
    client_secret: Optional[OpenAiRealtimeClientSecretValue] = None
    input_audio_format: Optional[str] = None
    input_audio_transcription: Optional[str] = None
