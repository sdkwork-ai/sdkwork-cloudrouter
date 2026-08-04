from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeTranscriptionSessionCreateRequest:
    """OpenAI-compatible request to create a realtime transcription session."""
    input_audio_format: Optional[str] = None
    input_audio_transcription: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    turn_detection: Optional[str] = None
