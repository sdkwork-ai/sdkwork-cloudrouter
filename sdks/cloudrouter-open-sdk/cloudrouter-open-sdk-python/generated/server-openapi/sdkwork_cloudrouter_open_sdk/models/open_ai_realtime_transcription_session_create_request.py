from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeTranscriptionSessionCreateRequest:
    """OpenAI-compatible request to create a realtime transcription session (`POST /v1/realtime/transcription_sessions`)."""
    include: Optional[List[str]] = None
    input_audio_format: Optional[str] = None
    input_audio_noise_reduction: Optional[Dict[str, str]] = None
    input_audio_transcription: Optional[Dict[str, str]] = None
    turn_detection: Optional[Dict[str, str]] = None
