from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsTextToSpeechResponse:
    """Eleven labs text to speech response schema exposed by Cloud Router."""
    audio_url: Optional[str] = None
    id: Optional[str] = None
    status: Optional[str] = None
    url: Optional[str] = None
